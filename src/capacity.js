import {makeCycle} from './cell.js';

export const configurations=[[1,1],[2,1],[2,2],[3,1],[3,2],[4,2]];
const seeds=[17,83,131,269,457];
const serviceSeconds=20;
export const productionDefaults={kitCapacity:2,deliveryInterval:0,outputCapacity:2,pickupInterval:0,reworkPercent:0,reworkSeconds:60};

function validateProduction(input) {
  const limits={kitCapacity:[1,12],deliveryInterval:[0,3600],outputCapacity:[1,12],
    pickupInterval:[0,3600],reworkPercent:[0,100],reworkSeconds:[1,3600]};
  for (const [key,[min,max]] of Object.entries(limits)) {
    if (!Number.isInteger(input[key])||input[key]<min||input[key]>max) throw new RangeError('Invalid '+key);
  }
}

export function simulateShift({cells,operators,seconds,auto,seed,variation,production={},capture=false}) {
  production={...productionDefaults,...production};
  validateProduction(production);
  let rng=seed;
  const draw=()=>{
    rng=(Math.imul(rng,1664525)+1013904223)>>>0;
    return rng/2**32;
  };
  const steps=makeCycle(auto);
  const route=[];
  for (let index=0;index<steps.length;index++) {
    const step=steps[index];
    if (step.key!=='enter') {
      route.push(step);
      continue;
    }
    // One worker remains assigned from entry through exit/reset/restart authorization.
    let duration=0,outputAt=null;
    while (index<steps.length) {
      const current=steps[index];
      duration+=current.duration;
      if (current.key==='unload') outputAt=duration;
      if (current.key==='authorize') break;
      index++;
    }
    route.push({key:'operatorVisit',resource:'operator',duration,outputAt});
  }
  const states=Array.from({length:cells},()=>({time:0,step:0,good:0,wait:0,kits:production.kitCapacity,nextDelivery:production.deliveryInterval,outputs:[],acceptedTimes:[],firstPass:0,inspected:0,reworked:0,rework:false,repairDone:false,started:0,starved:0,blocked:0,history:[]}));
  const staff=Array(operators).fill(0);
  let work=0, events=0;
  function waiting(cell,start,end,reason) {
    const duration=Math.max(0,Math.min(end,seconds)-start);
    cell[reason]+=duration;
    if (capture && duration>0) cell.history.push({start,end:Math.min(end,seconds),kind:reason});
  }
  while (true) {
    const cell=states.reduce((a,b)=>a.time<=b.time?a:b);
    if(cell.time>=seconds) break;
    if(++events>150000) throw new RangeError('Simulation event limit reached');
    if (production.deliveryInterval>0 && cell.time>=cell.nextDelivery) {
      cell.kits=production.kitCapacity;
      cell.nextDelivery=(Math.floor(cell.time/production.deliveryInterval)+1)*production.deliveryInterval;
    }
    if (cell.step===0 && cell.kits===0 && production.deliveryInterval>0) {
      const delivery=Math.max(cell.time,cell.nextDelivery);
      waiting(cell,cell.time,delivery,'starved');
      cell.time=Math.min(delivery,seconds);
      if (delivery>=seconds) continue;
      cell.kits=production.kitCapacity;
      cell.nextDelivery=delivery+production.deliveryInterval;
    }
    const servicing=cell.step===route.length;
    const repairing=!servicing && route[cell.step].key==='undock' && cell.rework && !cell.repairDone;
    const op=servicing?{resource:'operator',duration:serviceSeconds,key:'service'}:
      repairing?{resource:'operator',duration:production.reworkSeconds,key:'repair'}:route[cell.step];
    const duration=op.duration*(1+(draw()*2-1)*variation);
    let start=cell.time;
    const outputOffset=op.key==='unload'?duration:
      op.outputAt===null||op.outputAt===undefined?null:op.outputAt*duration/op.duration;
    if (outputOffset!==null && production.pickupInterval>0) {
      const lastPickup=Math.floor(start/production.pickupInterval)*production.pickupInterval;
      const occupied=cell.outputs.filter(time=>time>lastPickup).length;
      if (occupied>=production.outputCapacity) {
        const nextPickup=lastPickup+production.pickupInterval;
        waiting(cell,start,nextPickup,'blocked');
        start=nextPickup;
      }
    }
    const resourceReady=start;
    if(op.resource==='operator') {
      const worker=staff.indexOf(Math.min(...staff));
      start=Math.max(start,staff[worker]);
      staff[worker]=start+duration;
      const queued=resourceReady;
      // Blocked output time has already been attributed separately.
      cell.wait+=Math.max(0,Math.min(start,seconds)-queued);
      if (capture && start>resourceReady) cell.history.push({start:resourceReady,end:Math.min(start,seconds),kind:'staff-wait'});
      work+=Math.max(0,Math.min(duration,seconds-start));
    }
    const end=start+duration;
    if (capture && start<seconds) cell.history.push({start,end:Math.min(end,seconds),kind:op.key,resource:op.resource});
    if (outputOffset!==null && start+outputOffset<=seconds+1e-9) {
      cell.good++;
      cell.outputs.push(start+outputOffset);
      cell.acceptedTimes.push(start+outputOffset);
    }
    cell.time=Math.min(end,seconds);
    if(end>seconds) continue;
    if (servicing) {
      if (production.deliveryInterval===0) cell.kits=production.kitCapacity;
      if (production.pickupInterval===0) cell.outputs=[];
      cell.step=0;
    } else if (repairing) {
      cell.repairDone=true;
      cell.reworked++;
    } else {
      if (cell.step===0) {
        cell.kits--;
        cell.started++;
        cell.rework=draw()<production.reworkPercent/100;
        cell.repairDone=false;
      }
      if (op.key==='inspect') {
        cell.inspected++;
        if (!cell.rework) cell.firstPass++;
      }
      if (++cell.step===route.length) {
        const refill=production.deliveryInterval===0 && cell.kits===0;
        const emptyOutput=production.pickupInterval===0 && cell.outputs.length>=production.outputCapacity;
        if (!refill && !emptyOutput) cell.step=0;
      }
    }
  }
  const bays=states.map(cell=>({good:cell.good,wait:cell.wait,starved:cell.starved,blocked:cell.blocked,
    started:cell.started,wip:cell.started-cell.good,firstPass:cell.firstPass,inspected:cell.inspected,
    reworked:cell.reworked,history:cell.history,outputs:cell.acceptedTimes}));
  const total=key=>bays.reduce((sum,bay)=>sum+bay[key],0);
  return {good:total('good'),wait:total('wait'),starved:total('starved'),blocked:total('blocked'),
    wip:total('wip'),started:total('started'),firstPass:total('firstPass'),inspected:total('inspected'),
    reworked:total('reworked'),work,events,bays};
}

export function compare(target,minutes,auto,production={}) {
  if((target!==null&&(!Number.isInteger(target)||target<1||target>2000))||
     !Number.isInteger(minutes)||minutes<1||minutes>720) throw new RangeError('Invalid demand or shift time');
  return configurations.map(([cells,operators])=>{
    const input={cells,operators,seconds:minutes*60,auto,production};
    const nominal=simulateShift({...input,seed:seeds[0],variation:0,capture:true});
    const runs=seeds.map(seed=>simulateShift({...input,seed,variation:.15}).good);
    return {cells,operators,nominal:nominal.good,min:Math.min(...runs),max:Math.max(...runs),
      shortfall:target===null ? null : Math.max(0,target-Math.min(...runs)),
      goodFramesPerHour:nominal.good/(minutes/60),
      wip:nominal.wip,started:nominal.started,firstPassYield:nominal.inspected?nominal.firstPass/nominal.inspected:null,
      reworked:nominal.reworked,starvedMinutes:nominal.starved/60,blockedMinutes:nominal.blocked/60,
      laborMinutesPerGood:nominal.good?nominal.work/60/nominal.good:null,
      operatorUtilization:nominal.work/(operators*input.seconds),
      waitingMinutes:nominal.wait/60,bays:nominal.bays};
  });
}

// The catalogue is ordered by cell count, then shared-operator count.
export function chooseLayout(rows) {
  return rows.find(row=>row.shortfall===0) ??
    rows.reduce((best,row)=>row.shortfall<best.shortfall ? row : best);
}
