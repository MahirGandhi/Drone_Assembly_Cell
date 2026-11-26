import { makeCycle } from './cell.js';
import { stages } from './product.js';

export const defaultLine = {
  minutes:420, target:145, release:115, buffer:3, cells:1, operators:1,
  kit:20, prep:45, inspection:32, reject:8, rework:90, auto:true,
};

export const lineLimits = {
  minutes:[1,720], target:[1,2000], release:[10,600], buffer:[1,12],
  cells:[1,4], operators:[1,4], kit:[5,900], prep:[5,900],
  inspection:[5,900], reject:[0,100], rework:[5,900],
};

function validate(config) {
  for (const [key,[low,high]] of Object.entries(lineLimits)) {
    if (!Number.isInteger(config[key]) || config[key]<low || config[key]>high) {
      throw new RangeError(`${key} must be an integer from ${low} to ${high}`);
    }
  }
  if (typeof config.auto !== 'boolean') throw new TypeError('Handling mode is required');
}

function phases(config) {
  const operation = (duration, worker) => ({duration,worker});
  const assembly = [];
  for (const step of makeCycle(config.auto)) {
    const worker = step.resource === 'operator';
    const prior = assembly.at(-1);
    if (prior?.worker === worker) prior.duration += step.duration;
    else assembly.push(operation(step.duration,worker));
  }
  return {
    kit:[operation(config.kit,true)],
    prep:[operation(config.prep,true)],
    assembly,
    inspection:[operation(config.inspection,false)],
    rework:[operation(config.rework,true)],
  };
}

export function simulateLine(config) {
  validate(config);
  const horizon = config.minutes*60;
  const route = phases(config);
  const destinations = {kit:'prep',prep:'assembly',assembly:'inspection',inspection:null,rework:null};
  const stageById = Object.fromEntries(stages.map(({id}) => [id,{
    id, queue:[], slots:Array.from({length:id==='assembly' ? config.cells : 1}, () => ({
      job:null, phase:0, finish:null, destination:null, worker:false,
    })),
    started:0, completed:0, peak:0, queueSeconds:0, busy:0, wait:0, blocked:0,
  }]));
  // Downstream operations get first access to shared staff at equal timestamps.
  const priority = ['rework','inspection','assembly','prep','kit'].map(id => stageById[id]);
  let clock = 0;
  let nextRelease = 0;
  let releaseSlots = 0;
  let released = 0;
  let working = 0;
  let laborSeconds = 0;
  let accepted = 0;
  let inspected = 0;
  let rejected = 0;
  let reworked = 0;
  let rejectionCredit = 0;
  let acceptedLeadSeconds = 0;
  const epsilon = 1e-8;

  function dispatch(allowStart) {
    let moved;
    do {
      moved = false;
      for (const stage of priority) {
        for (const slot of stage.slots) {
          const steps = route[stage.id];
          if (slot.job && slot.phase===steps.length) {
            const next = stageById[slot.destination];
            if (next && next.queue.length>=config.buffer) continue;
            stage.completed++;
            if (next) next.queue.push(slot.job);
            else {
              accepted++;
              acceptedLeadSeconds += clock-slot.job.released;
              if (stage.id==='rework') reworked++;
            }
            slot.job = null;
            moved = true;
          }
          if (allowStart && !slot.job && stage.queue.length) {
            slot.job = stage.queue.shift();
            slot.phase = 0;
            stage.started++;
            moved = true;
          }
        }
      }
    } while (moved);

    if (!allowStart) return;
    for (const stage of priority) {
      for (const slot of stage.slots) {
        if (!slot.job || slot.finish!==null) continue;
        const step = route[stage.id][slot.phase];
        if (!step || (step.worker && working>=config.operators)) continue;
        slot.worker = step.worker;
        if (step.worker) working++;
        slot.finish = clock+step.duration;
      }
    }
  }

  function completePhases() {
    for (const stage of priority) {
      for (const slot of stage.slots) {
        if (slot.finish===null || slot.finish>clock+epsilon) continue;
        slot.finish = null;
        if (slot.worker) working--;
        slot.worker = false;
        slot.phase++;
        if (slot.phase!==route[stage.id].length) continue;
        slot.destination = destinations[stage.id];
        if (stage.id==='inspection') {
          inspected++;
          rejectionCredit += config.reject;
          if (rejectionCredit>=100) {
            rejectionCredit -= 100;
            rejected++;
            slot.destination = 'rework';
          }
        }
      }
    }
  }

  while (true) {
    completePhases();
    const duringShift = clock<horizon-epsilon;
    dispatch(duringShift);
    if (!duringShift) break;
    if (nextRelease<=clock+epsilon) {
      const input = stageById.kit.queue;
      releaseSlots++;
      if (input.length<config.buffer) {
        released++;
        input.push({released:clock});
        dispatch(true);
      }
      nextRelease += config.release;
    }
    let next = Math.min(nextRelease,horizon);
    for (const stage of priority) {
      stage.peak = Math.max(stage.peak,stage.queue.length);
      for (const slot of stage.slots) {
        if (slot.finish!==null) next = Math.min(next,slot.finish);
      }
    }
    const duration = next-clock;
    laborSeconds += working*duration;
    for (const stage of priority) {
      stage.queueSeconds += stage.queue.length*duration;
      for (const slot of stage.slots) {
        if (!slot.job) continue;
        if (slot.finish!==null) stage.busy += duration;
        else if (slot.phase===route[stage.id].length) stage.blocked += duration;
        else stage.wait += duration;
      }
    }
    clock = next;
  }

  const stationRows = stages.map(({id,name}) => {
    const row = stageById[id];
    return {
      id,name,started:row.started,completed:row.completed,maxQueue:row.peak,
      avgQueue:row.queueSeconds/horizon,utilization:row.busy/(horizon*row.slots.length),
      waitMinutes:row.wait/60,blockedMinutes:row.blocked/60,
      endingWip:row.queue.length+row.slots.filter(slot => slot.job).length,
    };
  });
  const perFrame = id => route[id].reduce((sum,phase) => sum+phase.duration,0);
  const assemblyLabor = route.assembly.reduce((sum,phase) => sum+(phase.worker ? phase.duration : 0),0);
  const reworkLoad = config.rework*config.reject/100;
  const constraints = [
    {name:'Kit release', seconds:config.release},
    {name:'Kitting', seconds:config.kit},
    {name:'Preparation', seconds:config.prep},
    {name:'Assembly cell', seconds:perFrame('assembly')/config.cells},
    {name:'Outgoing inspection', seconds:config.inspection},
    {name:'Rework & recheck', seconds:reworkLoad},
    {name:'Shared operators', seconds:(config.kit+config.prep+assemblyLabor+reworkLoad)/config.operators},
  ].sort((a,b) => b.seconds-a.seconds);
  return {
    accepted, released, inspected, rejected, reworked,
    skippedReleases:releaseSlots-released,
    wip:stationRows.reduce((sum,row) => sum+row.endingWip,0),
    yield:inspected ? (inspected-rejected)/inspected : null,
    averageLeadMinutes:accepted ? acceptedLeadSeconds/(accepted*60) : null,
    operatorUtilization:laborSeconds/(horizon*config.operators),
    goodPerHour:accepted/config.minutes*60,
    stationRows,
    constraints:constraints.filter(option => Math.abs(option.seconds-constraints[0].seconds)<epsilon),
  };
}

export function findLinePlan(config) {
  validate(config);
  let best;
  for (let cells=1;cells<=lineLimits.cells[1];cells++) {
    for (let operators=1;operators<=lineLimits.operators[1];operators++) {
      const candidate = {cells,operators,result:simulateLine({...config,cells,operators})};
      if (candidate.result.accepted>=config.target) return {feasible:true,...candidate};
      if (!best || candidate.result.accepted>best.result.accepted) best = candidate;
    }
  }
  return {feasible:false,...best};
}
