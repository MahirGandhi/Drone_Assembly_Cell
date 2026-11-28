import {Simulation,Entity,Queue} from 'simscript-runtime';
import {makeCycle} from './cell.js';
import publicData from '../data/public-process-evidence.json' with {type:'json'};

const EPS=1e-7;
export const lineEngine={name:'SimScript',version:'1.0.37',source:'https://github.com/Bernardo-Castilho/SimScript'};
export const lineStages=[
  {id:'prepare',name:'Lower-frame preparation',seconds:75,touch:75,area:4,requirement:'Correct rails, landing gear and power-board installation before frame closure.'},
  {id:'frame',name:'Frame assembly',seconds:192.6,touch:36,area:30,requirement:'Correct arm seating, protected wiring and sixteen accepted joint records.'},
  {id:'avionics',name:'Avionics integration',seconds:180,touch:180,area:4,requirement:'Correct controller orientation, mounting and identified electrical connections.'},
  {id:'test',name:'Configuration and bench checks',seconds:150,touch:30,area:4,requirement:'Correct configuration and completed bench-check record before propeller installation.'},
  {id:'finish',name:'Final assembly and inspection',seconds:90,touch:90,area:4,requirement:'Correct final hardware and inspection record; flight qualification remains outside this model.'},
];
export function defaultLineInputs() {
  return {seconds:25200,target:105,operators:3,technicians:1,arrival:60,kits:500,buffer:2,
    outputCapacity:8,pickupInterval:900,mtbf:0,repairSeconds:180,reworkSeconds:60,
    repairSuccess:90,maxReworks:2,stopAt:12600,stopSeconds:0,variation:0,
    timingProfile:'assumed',auto:true,maxResources:12,maxOperators:6,maxArea:160,
    weights:{equipment:1,labor:1,space:1},stages:lineStages.map(stage=>({...stage,count:1,defect:0,cost:0}))};
}
export function validateLine(input) {
  const ranges={seconds:[60,43200],target:[1,2000],operators:[1,6],technicians:[1,3],arrival:[1,3600],kits:[1,2000],buffer:[0,12],outputCapacity:[1,100],pickupInterval:[1,7200],mtbf:[0,86400],repairSeconds:[1,7200],reworkSeconds:[1,3600],repairSuccess:[0,100],maxReworks:[0,5],stopAt:[0,43200],stopSeconds:[0,7200],variation:[0,.5],maxResources:[5,20],maxOperators:[1,6],maxArea:[1,1000]};
  for(const [key,[min,max]] of Object.entries(ranges)) if(!Number.isFinite(input[key])||input[key]<min||input[key]>max) throw new RangeError('Invalid '+key);
  for(const key of ['target','operators','technicians','kits','buffer','outputCapacity','maxReworks','maxResources','maxOperators']) if(!Number.isInteger(input[key])) throw new RangeError('Expected integer '+key);
  if(!['assumed','public-manual'].includes(input.timingProfile)) throw new RangeError('Invalid timing profile');
  if(typeof input.auto!=='boolean') throw new RangeError('Invalid handling mode');
  if(!Array.isArray(input.stages)||input.stages.length!==lineStages.length) throw new RangeError('Invalid route');
  input.stages.forEach((stage,index)=>{
    if(stage.id!==lineStages[index].id||!Number.isInteger(stage.count)||stage.count<1||stage.count>4||!Number.isFinite(stage.seconds)||stage.seconds<1||stage.seconds>3600||!Number.isFinite(stage.touch)||stage.touch<0||stage.touch>stage.seconds||!Number.isFinite(stage.defect)||stage.defect<0||stage.defect>100||!Number.isFinite(stage.area)||stage.area<1||stage.area>200||!Number.isFinite(stage.cost)||stage.cost<0||stage.cost>1e7) throw new RangeError('Invalid station '+index);
  });
  for(const key of ['equipment','labor','space']) if(!Number.isFinite(input.weights[key])||input.weights[key]<0||input.weights[key]>10) throw new RangeError('Invalid objective weight');
}

function framePhases(input,stage) {
  const raw=makeCycle(input.auto), visits=[];
  for(let i=0;i<raw.length;i++) {
    let step=raw[i];
    if(step.key==='enter') {
      let seconds=0;
      while(i<raw.length) {const current=raw[i];seconds+=current.duration;if(current.key==='authorize') break;i++;}
      step={resource:'operator',duration:seconds};
    }
    const resource=step.resource==='operator'?'operator':'machine';
    if(visits.at(-1)?.resource===resource) visits.at(-1).seconds+=step.duration;
    else visits.push({resource,seconds:step.duration});
  }
  const manual=visits.filter(p=>p.resource==='operator').reduce((n,p)=>n+p.seconds,0);
  const machine=visits.filter(p=>p.resource==='machine').reduce((n,p)=>n+p.seconds,0);
  return visits.map(p=>({...p,seconds:p.seconds*(p.resource==='operator'?stage.touch/manual:(stage.seconds-stage.touch)/machine)}));
}

export async function simulateLine(input,{seed=17,capture=true}={}) {
  validateLine(input);
  let rng=seed>>>0;
  const draw=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return (rng+.5)/2**32;};
  const untilFailure=()=>input.mtbf===0?Infinity:-Math.log(1-draw())*input.mtbf;
  const sim=new Simulation({timeEnd:input.seconds+EPS,yieldInterval:Infinity});
  const staff=new Queue('Assembly operators',input.operators), maintenance=new Queue('Maintenance technicians',input.technicians), output=new Queue('Accepted output',input.outputCapacity);
  const stations=input.stages.map(stage=>({spec:stage,admission:new Queue(stage.id+' occupancy',stage.count+input.buffer),servers:new Queue(stage.id+' resources',stage.count),units:Array.from({length:stage.count},()=>({occupied:false,remaining:untilFailure()})),busy:0,occupied:0,staffWait:0,blocked:0,down:0,planned:0,repairs:0,completed:0}));
  const parts=[],events=[];
  let good=0,scrap=0,firstGood=0,firstFailed=0,repairs=0,reworkAttempts=0,operatorWork=0,technicianWork=0,eventCount=0;
  let rejectRun;
  const done=new Promise((resolve,reject)=>{rejectRun=reject;sim.finished.addEventListener(resolve);});
  const activate=entity=>sim.activate(entity).catch(error=>{sim.stop();rejectRun(error);});
  const spent=(start,end)=>Math.max(0,Math.min(input.seconds,end)-start);
  function interval(part,index,unit,start,end,kind,resource) {
    const duration=spent(start,end);
    if(duration<=0) return;
    if(++eventCount>150000) throw new RangeError('Line study event limit exceeded; reduce the window or extreme loss settings');
    const station=stations[index];
    if(kind==='working'||kind==='rework'||kind==='scrap-handling') station.busy+=duration;
    if(kind==='staff-wait') station.staffWait+=duration;
    if(kind==='blocked') station.blocked+=duration;
    if(kind==='repair'||kind==='repair-wait') station.down+=duration;
    if(kind==='planned-stop') station.planned+=duration;
    if(resource==='operator'&&['working','rework','scrap-handling'].includes(kind)) operatorWork+=duration;
    if(resource==='technician'&&kind==='repair') technicianWork+=duration;
    if(capture) events.push({job:part.id,stage:index,unit,start,end:Math.min(end,input.seconds),kind,resource});
  }
  function trace(part,stage,unit,state) {part.current={time:sim.timeNow,stage,unit,state};if(capture) part.trace.push(part.current);}
  class Product extends Entity {
    constructor(id) {super();this.part={id,entered:null,accepted:null,scrapped:null,trace:[],failed:false};parts.push(this.part);}
    async work(index,unit,duration,resource,kind='working') {
      const p=this.part,station=stations[index],machine=station.units[unit];
      let left=duration;
      while(left>EPS) {
        if(sim.timeNow>=input.seconds) {await this.delay(1);continue;}
        const breakEnd=Math.min(input.seconds,input.stopAt+input.stopSeconds);
        if(input.stopSeconds>0&&sim.timeNow>=input.stopAt&&sim.timeNow<breakEnd) {
          const start=sim.timeNow;trace(p,index,unit,'planned-stop');interval(p,index,unit,start,breakEnd,'planned-stop');await this.delay(breakEnd-start);continue;
        }
        if(machine.remaining<=EPS) {
          station.repairs++;repairs++;
          const start=sim.timeNow;trace(p,index,unit,'repair-wait');await this.enterQueue(maintenance);
          interval(p,index,unit,start,sim.timeNow,'repair-wait');
          trace(p,index,unit,'repair');interval(p,index,unit,sim.timeNow,sim.timeNow+input.repairSeconds,'repair','technician');
          await this.delay(input.repairSeconds);this.leaveQueue(maintenance);machine.remaining=untilFailure();continue;
        }
        if(resource==='operator') {
          const start=sim.timeNow;trace(p,index,unit,'staff-wait');await this.enterQueue(staff);
          interval(p,index,unit,start,sim.timeNow,'staff-wait');
          if(input.stopSeconds>0&&sim.timeNow>=input.stopAt&&sim.timeNow<breakEnd) {this.leaveQueue(staff);continue;}
        }
        let slice=Math.min(left,machine.remaining);
        if(input.stopSeconds>0&&sim.timeNow<input.stopAt) slice=Math.min(slice,input.stopAt-sim.timeNow);
        trace(p,index,unit,kind);interval(p,index,unit,sim.timeNow,sim.timeNow+slice,kind,resource);
        await this.delay(slice);
        if(resource==='operator') this.leaveQueue(staff);
        left-=slice;machine.remaining-=slice;
      }
    }
    async script() {
      const p=this.part;
      await this.enterQueue(stations[0].admission);
      if(sim.timeNow>=input.seconds) {this.leaveQueue(stations[0].admission);return;}
      p.entered=sim.timeNow;
      for(let index=0;index<stations.length;index++) {
        const station=stations[index],spec=station.spec;
        trace(p,index,null,'queued');await this.enterQueue(station.servers);
        const unit=station.units.findIndex(item=>!item.occupied),occupiedAt=sim.timeNow;
        station.units[unit].occupied=true;
        const phases=spec.id==='frame'?framePhases(input,spec):[{resource:'operator',seconds:spec.touch},{resource:'machine',seconds:spec.seconds-spec.touch}];
        for(const phase of phases) {
          if(phase.seconds<=EPS) continue;
          let factor=1+(draw()*2-1)*input.variation;
          if(input.timingProfile==='public-manual'&&phase.resource==='operator') factor=publicData.manualMultipliers[Math.floor(draw()*publicData.manualMultipliers.length)];
          await this.work(index,unit,phase.seconds*factor,phase.resource);
        }
        if(draw()<spec.defect/100) {
          if(!p.failed) {p.failed=true;firstFailed++;}
          let recovered=false;
          for(let attempt=0;attempt<input.maxReworks;attempt++) {
            reworkAttempts++;await this.work(index,unit,input.reworkSeconds,'operator','rework');
            if(draw()<input.repairSuccess/100) {recovered=true;break;}
          }
          if(!recovered) {
            await this.work(index,unit,15,'operator','scrap-handling');
            p.scrapped=Math.min(input.seconds,sim.timeNow);scrap++;trace(p,index,unit,'scrapped');
            station.occupied+=spent(occupiedAt,sim.timeNow);station.units[unit].occupied=false;
            this.leaveQueue(station.servers);this.leaveQueue(station.admission);return;
          }
        }
        station.completed++;
        const waitStart=sim.timeNow;
        trace(p,index,unit,'blocked');
        await this.enterQueue(index+1<stations.length?stations[index+1].admission:output);
        interval(p,index,unit,waitStart,sim.timeNow,'blocked');
        station.occupied+=spent(occupiedAt,sim.timeNow);station.units[unit].occupied=false;
        this.leaveQueue(station.servers);this.leaveQueue(station.admission);
      }
      p.accepted=Math.min(input.seconds,sim.timeNow);good++;if(!p.failed) firstGood++;
      trace(p,stations.length,null,'accepted');
      const pickup=(Math.floor(sim.timeNow/input.pickupInterval)+1)*input.pickupInterval;
      await this.delay(pickup-sim.timeNow);this.leaveQueue(output);
    }
  }
  class Source extends Entity {async script(){for(let id=1;id<=input.kits&&sim.timeNow<input.seconds;id++){activate(new Product(id));await this.delay(input.arrival);}}}
  class Horizon extends Entity {async script(){await this.delay(input.seconds+EPS);}}
  sim.started.addEventListener(()=>{activate(new Source());activate(new Horizon());});
  await sim.start();await done;
  for(const p of parts) if(p.current?.unit!==null&&['staff-wait','blocked','repair-wait'].includes(p.current?.state)) interval(p,p.current.stage,p.current.unit,p.current.time,input.seconds,p.current.state);
  // Resource holders may be unfinished at the horizon. Their recorded intervals are clipped.
  stations.forEach(station=>{for(const [entity,item] of station.servers.items) station.occupied+=spent(item.timeIn,input.seconds);});
  const entered=parts.filter(p=>p.entered!==null).length;
  const result={engine:lineEngine,seed,good,scrap,started:entered,wip:entered-good-scrap,firstFailures:firstFailed,firstPassYield:good+scrap?firstGood/(good+scrap):null,
    repairs,reworkAttempts,operatorWork,technicianWork,operatorUtilization:operatorWork/(input.operators*input.seconds),
    laborMinutesPerGood:good?operatorWork/60/good:null,leadSeconds:good?parts.filter(p=>p.accepted!==null).reduce((n,p)=>n+p.accepted-p.entered,0)/good:null,
    stations:stations.map((station,index)=>({id:station.spec.id,count:station.spec.count,busy:station.busy,occupied:station.occupied,unoccupied:Math.max(0,station.spec.count*input.seconds-station.occupied),staffWait:station.staffWait,blocked:station.blocked,down:station.down,planned:station.planned,repairs:station.repairs,completed:station.completed,utilization:station.busy/(station.spec.count*input.seconds),index})),
    events:capture?events:[],parts:capture?parts.filter(p=>p.entered!==null):[]};
  return result;
}

export function lineSnapshot(result,time) {
  const stations=result.stations.map(stage=>({id:stage.id,queued:0,units:Array.from({length:stage.count},()=>({state:'idle',job:null})),completed:0}));
  let good=0,scrap=0,wip=0;
  for(const part of result.parts) {
    if(part.entered>time) continue;
    for(const station of stations) if(part.trace.some(item=>item.stage===stations.indexOf(station)&&item.state==='blocked'&&item.time<=time+EPS)) station.completed++;
    if(part.accepted!==null&&part.accepted<=time) {good++;continue;}
    if(part.scrapped!==null&&part.scrapped<=time) {scrap++;continue;}
    wip++;
    const event=part.trace.findLast(item=>item.time<=time);
    if(!event||event.stage>=stations.length) continue;
    if(event.unit===null) stations[event.stage].queued++;
    else stations[event.stage].units[event.unit]={state:event.state,job:part.id};
  }
  return {good,scrap,wip,stations};
}

export function designMetrics(input) {
  const equipment=input.stages.reduce((n,stage)=>n+stage.count,0);
  const area=input.stages.reduce((n,stage)=>n+stage.count*stage.area,0);
  const pricedCapital=input.stages.reduce((n,stage)=>n+stage.count*stage.cost,0),allPriced=input.stages.every(stage=>stage.cost>0);
  const capitalBase=input.stages.reduce((n,stage)=>n+stage.cost,0);
  const score=input.weights.equipment*(allPriced?pricedCapital/capitalBase:equipment/5)+input.weights.labor*input.operators/3+input.weights.space*area/46;
  return {equipment,area,pricedCapital,allPriced,score,withinLimits:equipment<=input.maxResources&&input.operators<=input.maxOperators&&area<=input.maxArea};
}

export async function studyLine(input,{onProgress=()=>{},search=false}={}) {
  validateLine(input);
  const designs=[],seen=new Set();
  async function evaluate(candidate) {
    const key=candidate.operators+':'+candidate.stages.map(stage=>stage.count).join(':');
    if(seen.has(key)||designs.length>=24||!designMetrics(candidate).withinLimits) return null;
    seen.add(key);
    const result=await simulateLine(candidate,{capture:false});
    const row={input:candidate,good:result.good,metrics:designMetrics(candidate),result};
    designs.push(row);onProgress(designs.length);
    await new Promise(resolve=>setTimeout(resolve,0));
    return row;
  }
  let current=await evaluate(structuredClone(input));
  if(!current) throw new RangeError('Current layout exceeds the resource, staffing or footprint limits');
  // Bounded local search: compare single additions and one-resource reductions.
  // This is a feasible-design search, not a proof of a globally optimal factory.
  for(let iteration=0;search&&iteration<4&&designs.length<24;iteration++) {
    const candidates=[];
    for(let index=-1;index<input.stages.length;index++) {
      const next=structuredClone(current.input);
      if(index<0) next.operators++;
      else if(next.stages[index].count<4) next.stages[index].count++;
      else continue;
      if(next.operators>6) continue;
      const row=await evaluate(next);if(row) candidates.push(row);
    }
    if(!candidates.length) break;
    candidates.sort((a,b)=>Math.max(0,input.target-a.good)-Math.max(0,input.target-b.good)||a.metrics.score-b.metrics.score||b.good-a.good);
    const next=candidates[0];
    if(next.good<=current.good) break;
    if(current.good>=input.target&&next.metrics.score>=current.metrics.score) break;
    current=next;
    if(current.good>=input.target) break;
  }
  if(search) {
    for(let index=-1;index<input.stages.length;index++) {
      const next=structuredClone(current.input);
      if(index<0) next.operators--;else next.stages[index].count--;
      if(next.operators<1||next.stages.some(stage=>stage.count<1)) continue;
      await evaluate(next);
    }
  }
  const feasible=designs.filter(row=>row.good>=input.target).sort((a,b)=>a.metrics.score-b.metrics.score||b.good-a.good);
  const chosen=feasible[0]??designs.sort((a,b)=>b.good-a.good||a.metrics.score-b.metrics.score)[0];
  const nominal=await simulateLine(chosen.input);
  const stochastic=input.variation>0||input.timingProfile==='public-manual'||input.mtbf>0||input.stages.some(stage=>stage.defect>0&&stage.defect<100||(stage.defect>0&&input.maxReworks>0&&input.repairSuccess>0&&input.repairSuccess<100));
  // Selection uses seed 17. Evaluation streams are held out from adaptive search.
  const seeds=stochastic?[1013,2081,4099,6151,8089,10037,12007,14011]:[1013];
  const samples=[];
  for(const seed of seeds) {samples.push((await simulateLine(chosen.input,{seed,capture:false})).good);await new Promise(resolve=>setTimeout(resolve,0));}
  const met=samples.filter(value=>value>=input.target).length,n=samples.length,z=1.96,p=met/n;
  const center=(p+z*z/(2*n))/(1+z*z/n),half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n);
  return {schemaVersion:1,createdAt:new Date().toISOString(),engine:lineEngine,input:chosen.input,nominal,
    designs:designs.map(row=>({counts:row.input.stages.map(stage=>stage.count),operators:row.input.operators,good:row.good,...row.metrics})),
    samples,seeds,targetMet:met,sampleRange:[Math.min(...samples),Math.max(...samples)],
    conditionalTargetInterval:stochastic?[Math.max(0,center-half),Math.min(1,center+half)]:null,
    evidence:'Uncalibrated scenario model. The Wilson interval describes simulation sampling only; it excludes parameter uncertainty and is not factory validation.',
    benchmark:input.timingProfile==='public-manual'?{source:publicData.source,doi:publicData.doi,method:publicData.method,limits:publicData.limits}:null};
}
