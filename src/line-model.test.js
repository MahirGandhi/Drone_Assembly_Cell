import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultLineInputs,simulateLine,lineSnapshot,studyLine,designMetrics} from './line-model.js';

function tiny() {
  const input=defaultLineInputs();
  Object.assign(input,{seconds:60,arrival:1,kits:60,outputCapacity:100,pickupInterval:3600,operators:3});
  input.stages=input.stages.map(stage=>({...stage,seconds:1,touch:0}));
  return input;
}
test('library scheduler preserves exact horizon, product conservation and playback totals',async()=>{
  const input=tiny(),run=await simulateLine(input);
  assert.equal(run.good,56);
  assert.equal(run.started,run.good+run.scrap+run.wip);
  assert.equal(lineSnapshot(run,60).good,run.good);
  assert.equal(lineSnapshot(run,60).wip,run.wip);
  assert.equal(lineSnapshot(run,4.99).good,0);
  for(const event of run.events) assert.ok(event.start<=event.end&&event.end<=60);
});
test('failed rework scraps material; repair consumes labor and cannot manufacture acceptance',async()=>{
  const input=tiny();input.stages[0].defect=100;input.maxReworks=2;input.reworkSeconds=1;input.repairSuccess=0;
  const run=await simulateLine(input);
  assert.equal(run.good,0);assert.ok(run.scrap>0);assert.equal(run.firstPassYield,0);
  assert.ok(run.reworkAttempts>=run.scrap*2);
  assert.equal(run.started,run.good+run.scrap+run.wip);
  assert.ok(run.operatorWork>0&&run.operatorWork<=input.seconds*input.operators);
});
test('yield excludes unfinished rework from the final-disposition cohort',async()=>{
  const input=tiny();input.stages[0].defect=100;input.reworkSeconds=120;input.repairSuccess=0;
  const run=await simulateLine(input);
  assert.ok(run.firstFailures>0&&run.wip>0);
  assert.equal(run.good+run.scrap,0);assert.equal(run.firstPassYield,null);
});
test('downtime, repair queues, planned stops and blocked output consume real station time',async()=>{
  const input=tiny(),base=await simulateLine(input);
  const stopped=await simulateLine({...input,stopAt:10,stopSeconds:30});
  const failed=await simulateLine({...input,mtbf:3,repairSeconds:5,technicians:1});
  const blocked=await simulateLine({...input,outputCapacity:1});
  assert.ok(stopped.good<base.good&&stopped.stations.some(stage=>stage.planned>0));
  assert.ok(failed.good<base.good&&failed.repairs>0&&failed.stations.some(stage=>stage.down>0));
  assert.ok(blocked.good<base.good&&blocked.stations.some(stage=>stage.blocked>0));
  const repairs=failed.events.filter(event=>event.resource==='technician').sort((a,b)=>a.start-b.start);
  for(let index=1;index<repairs.length;index++) assert.ok(repairs[index].start>=repairs[index-1].end-EPS);
  for(const run of [stopped,failed,blocked]) for(const station of run.stations) {
    assert.ok(station.occupied<=station.count*input.seconds+EPS);
    assert.ok(station.busy+station.staffWait+station.blocked+station.down+station.planned<=station.occupied+EPS);
  }
});
const EPS=1e-5;
test('shared operators never overlap beyond capacity, including rework and unfinished visits',async()=>{
  const input=tiny();input.operators=1;input.stages=input.stages.map(stage=>({...stage,touch:.8}));
  const run=await simulateLine(input);
  const changes=run.events.filter(event=>event.resource==='operator').flatMap(event=>[{at:event.start,delta:1},{at:event.end,delta:-1}]).sort((a,b)=>a.at-b.at||a.delta-b.delta);
  let busy=0;for(const change of changes) {busy+=change.delta;assert.ok(busy<=1&&busy>=0);}
  assert.ok(run.operatorWork<=input.seconds+EPS);
  assert.deepEqual(await simulateLine(input),run);
});
test('public manual variation is an explicit reproducible analog scenario',async()=>{
  const input=tiny();input.timingProfile='public-manual';input.stages=input.stages.map(stage=>({...stage,touch:.7}));
  const a=await simulateLine(input,{seed:83}),b=await simulateLine(input,{seed:83});assert.deepEqual(a,b);
  assert.ok(a.good>0);assert.equal(a.started,a.good+a.scrap+a.wip);
  await assert.rejects(simulateLine({...input,operators:0}),RangeError);
  await assert.rejects(simulateLine({...input,stages:input.stages.map(stage=>({...stage,touch:2}))}),RangeError);
});
test('bounded design search adds resources at the constrained station and respects limits',async()=>{
  const input=tiny();input.seconds=120;input.target=70;input.kits=120;input.outputCapacity=100;
  input.stages[2].seconds=3;
  const base=await simulateLine(input),study=await studyLine(input,{search:true});
  assert.ok(study.nominal.good>base.good);
  assert.ok(study.input.stages[2].count>1);
  assert.ok(study.designs.length<=24&&designMetrics(study.input).withinLimits);
  assert.equal(study.conditionalTargetInterval,null);
  assert.ok(!study.seeds.includes(17));
});
