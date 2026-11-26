import {makeCycle} from './cell.js';

const configurations=[[1,1],[2,1],[2,2],[3,1],[3,2],[4,2]];
const seeds=[17,83,131,269,457];
const serviceEvery=2;
const serviceSeconds=20;

export function simulateShift({cells,operators,seconds,auto,seed,variation}) {
  let rng=seed;
  const draw=()=>{
    rng=(Math.imul(rng,1664525)+1013904223)>>>0;
    return rng/2**32;
  };
  const route=makeCycle(auto);
  const states=Array.from({length:cells},()=>({time:0,step:0,good:0}));
  const staff=Array(operators).fill(0);
  let wait=0, work=0, events=0;
  while (true) {
    const cell=states.reduce((a,b)=>a.time<=b.time?a:b);
    if(cell.time>=seconds) break;
    if(++events>150000) throw new RangeError('Simulation event limit reached');
    const servicing=cell.step===route.length;
    const op=servicing?{resource:'operator',duration:serviceSeconds}:route[cell.step];
    const duration=op.duration*(1+(draw()*2-1)*variation);
    let start=cell.time;
    if(op.resource==='operator') {
      const worker=staff.indexOf(Math.min(...staff));
      start=Math.max(start,staff[worker]);
      staff[worker]=start+duration;
      wait+=Math.max(0,Math.min(start,seconds)-cell.time);
      work+=Math.max(0,Math.min(duration,seconds-start));
    }
    const end=start+duration;
    cell.time=Math.min(end,seconds);
    if(end>seconds) continue;
    if(servicing) cell.step=0;
    else if(++cell.step===route.length) {
      cell.good++;
      if(cell.good%serviceEvery!==0) cell.step=0;
    }
  }
  return {good:states.reduce((total,c)=>total+c.good,0),wait,work,events};
}

export function compare(target,minutes,auto) {
  if(!Number.isInteger(target)||target<1||target>2000||
     !Number.isInteger(minutes)||minutes<1||minutes>720) throw new RangeError('Invalid demand or shift time');
  return configurations.map(([cells,operators])=>{
    const input={cells,operators,seconds:minutes*60,auto};
    const nominal=simulateShift({...input,seed:seeds[0],variation:0});
    const runs=seeds.map(seed=>simulateShift({...input,seed,variation:.15}).good);
    return {cells,operators,nominal:nominal.good,min:Math.min(...runs),max:Math.max(...runs),
      shortfall:Math.max(0,target-Math.min(...runs)),waitingMinutes:nominal.wait/60};
  });
}
