import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateShift,compare} from './capacity.js';
import {Cell,makeCycle} from './cell.js';

const config={cells:2,operators:1,seconds:420*60,auto:true,seed:17,variation:0,capture:true};
test('material limits and repairs produce attributable capacity losses',()=>{
  const base=simulateShift(config);
  const starved=simulateShift({...config,production:{kitCapacity:1,deliveryInterval:600}});
  const blocked=simulateShift({...config,production:{outputCapacity:1,pickupInterval:600}});
  const repair=simulateShift({...config,production:{reworkPercent:100,reworkSeconds:90}});
  assert.ok(starved.good<base.good);
  assert.ok(starved.starved>0);
  assert.ok(blocked.good<base.good);
  assert.ok(blocked.blocked>0);
  assert.ok(repair.good<base.good);
  assert.equal(repair.firstPass,0);
  assert.ok(repair.reworked>0);
  for (const result of [base,starved,blocked,repair]) {
    assert.equal(result.started,result.good+result.wip);
    assert.ok(result.work<=config.seconds*config.operators);
    assert.deepEqual(result,simulateShift({...config,production:result===starved?{kitCapacity:1,deliveryInterval:600}:result===blocked?{outputCapacity:1,pickupInterval:600}:result===repair?{reworkPercent:100,reworkSeconds:90}:{}}));
  }
});

test('one shared worker is reserved for the full access visit and repairs',()=>{
  const run=simulateShift({...config,production:{reworkPercent:30}});
  const assignments=run.bays.flatMap(bay=>bay.history.filter(event=>event.resource==='operator')).sort((a,b)=>a.start-b.start);
  for(let index=1;index<assignments.length;index++) assert.ok(assignments[index].start>=assignments[index-1].end-1e-7);
});

test('single-cell shift counts output at the same unload instant as the cell engine',()=>{
  for(const auto of [true,false]) {
    const route=makeCycle(auto);
    const unload=route.findIndex(step=>step.key==='unload');
    const acceptedAt=route.slice(0,unload+1).reduce((sum,step)=>sum+step.duration,0);
    for(const seconds of [acceptedAt-.01,acceptedAt+.01]) {
      const cell=new Cell({auto});cell.start();cell.tick(seconds);
      const run=simulateShift({...config,cells:1,auto,seconds});
      assert.equal(run.good,cell.output);
    }
  }
  assert.throws(()=>compare(100,420,true,{outputCapacity:0}),RangeError);
});
