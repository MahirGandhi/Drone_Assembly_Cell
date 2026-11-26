import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLine, simulateLine, findLinePlan } from './line.js';
import { components, stages } from './product.js';

test('bounded queues conserve frames and route first-pass rejects through rework', () => {
  for (const changes of [{}, {reject:0}, {reject:100,rework:240}, {buffer:1,cells:4}, {auto:false}, {minutes:1}]) {
    const config = {...defaultLine,...changes};
    const run = simulateLine(config);
    assert.deepEqual(run,simulateLine(config));
    assert.equal(run.released,run.accepted+run.wip);
    assert.ok(run.reworked<=run.rejected);
    assert.equal(run.accepted,run.inspected-run.rejected+run.reworked);
    assert.equal(run.rejected,Math.floor(run.inspected*config.reject/100));
    assert.ok(run.operatorUtilization>=0 && run.operatorUtilization<=1);
    for (const row of run.stationRows) {
      assert.ok(row.avgQueue<=row.maxQueue && row.maxQueue<=config.buffer);
      assert.ok(row.utilization>=0 && row.utilization<=1);
      assert.ok(row.completed<=row.started);
    }
  }
});

test('assembly expansion and inspection time shift the modeled line constraint', () => {
  const base = simulateLine(defaultLine);
  const extraCell = simulateLine({...defaultLine,cells:2});
  const slowInspection = simulateLine({...defaultLine,inspection:280});
  assert.equal(base.constraints[0].name,'Assembly cell');
  assert.equal(extraCell.constraints[0].name,'Kit release');
  assert.equal(slowInspection.constraints[0].name,'Outgoing inspection');
  assert.ok(extraCell.accepted>base.accepted);
  assert.ok(extraCell.stationRows[2].avgQueue<base.stationRows[2].avgQueue);
  assert.ok(slowInspection.stationRows[2].blockedMinutes>0);
  assert.ok(slowInspection.accepted<base.accepted);
});

test('target planning returns the smallest feasible staffing or bounded best output', () => {
  const plan = findLinePlan(defaultLine);
  assert.equal(plan.feasible,true);
  assert.deepEqual([plan.cells,plan.operators],[2,1]);
  assert.equal(plan.result.accepted,simulateLine({...defaultLine,cells:2}).accepted);
  const unreachable = findLinePlan({...defaultLine,minutes:1});
  assert.equal(unreachable.feasible,false);
  assert.equal(unreachable.result.accepted,0);
  assert.throws(() => simulateLine({...defaultLine,buffer:0}),RangeError);
});

test('exploded BOM uses unique part families with valid station trace IDs', () => {
  const stageIds = new Set(stages.map(stage => stage.id));
  assert.equal(new Set(components.map(component => component.id)).size,components.length);
  const byId = new Map(components.map(component => [component.id,component]));
  assert.equal(byId.get('screws').quantity,16);
  assert.equal(byId.get('nuts').quantity,16);
  for (const part of components) {
    assert.ok(part.route.every(id => stageIds.has(id)));
    assert.equal(part.route.length===0,part.scope==='Downstream installation');
  }
});
