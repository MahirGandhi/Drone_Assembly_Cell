import test from 'node:test';
import assert from 'node:assert/strict';
import {Cell,faults,makeCycle} from './cell.js';
import {chooseLayout,compare,simulateShift} from './capacity.js';

test('both handling routes transfer exactly one frame with 16 distinct accepted joints',()=>{
  for(const auto of [true,false]) {
    const cell=new Cell({auto});
    assert.equal(cell.start(),true);
    assert.equal(cell.start(),false);
    cell.tick(1000);
    assert.equal(cell.status,'complete');
    assert.equal(cell.output,1);
    assert.equal(cell.accepted.size,16);
    assert.equal(cell.stock.screws,16);
    assert.equal(cell.stock.nuts,16);
    assert.equal(cell.stock.frames,1);
    assert.ok(Math.abs(cell.time-makeCycle(auto).reduce((s,o)=>s+o.duration,0))<1e-6);
  }
});

test('guidance requires explicit authorization and command completes only following elapsed time',()=>{
  const cell=new Cell({guided:true});
  cell.start();cell.tick(20);
  assert.equal(cell.status,'waiting');
  assert.equal(cell.stock.nuts,32);
  assert.equal(cell.confirm(),true);
  cell.tick(1);
  assert.equal(cell.stock.nuts,32);
  cell.tick(7);
  assert.equal(cell.stock.nuts,16);
});

test('fault holds material and requires controlled recovery and deliberate restart',()=>{
  for(const fault of Object.keys(faults)){
    const c=new Cell({fault});c.start();c.tick(1000);
    assert.equal(c.status,'held',fault);
    assert.equal(c.output,0);
    assert.equal(c.start(),false);
    assert.equal(c.recover(),false);
    assert.equal(c.openAccess(),true);
    assert.equal(c.recover(),true);
    assert.equal(c.start(),false);
    c.closeAccess();
    assert.equal(c.status,'paused');
    c.start();c.tick(1000);
    assert.equal(c.status,'complete',fault);
    assert.equal(c.output,1);
    assert.equal(c.accepted.size,16);
    assert.equal(32-c.stock.screws,16+c.scrap);
    assert.equal(32-c.stock.nuts,16+c.lostNuts);
    assert.ok(c.nuts.every(nut=>nut==='joint'));
  }
});

test('emergency stop retains completed joints and requires acknowledgement plus restart',()=>{
  const c=new Cell();c.start();c.tick(85);
  const before=c.accepted.size;
  c.emergencyStop();c.tick(500);
  assert.equal(c.accepted.size,before);
  assert.equal(c.start(),false);
  assert.equal(c.acknowledgeStop(),true);
  assert.equal(c.status,'paused');
  assert.equal(c.start(),true);
  c.tick(1000);assert.equal(c.status,'complete');
});

test('capacity respects exact horizon, contention, infeasible demand and fixed seeds',()=>{
  const seconds=makeCycle(true).reduce((s,o)=>s+o.duration,0);
  assert.equal(simulateShift({cells:1,operators:1,seconds:seconds-.1,auto:true,seed:17,variation:0}).good,0);
  const low=compare(1,420,true);
  assert.equal(low[0].shortfall,0);
  assert.ok(low[1].waitingMinutes>0);
  assert.deepEqual(low,compare(1,420,true));
  assert.ok(compare(2000,420,true).every(r=>r.shortfall>0));
  assert.throws(()=>compare(0,420,true),RangeError);
});

test('shift layouts carry per-cell output and choose the first configuration that meets demand',()=>{
  const low=compare(120,420,true);
  assert.equal(chooseLayout(low).cells,1);
  const high=compare(300,420,true);
  const chosen=chooseLayout(high);
  assert.ok(chosen.cells>1);
  assert.equal(chosen.shortfall,0);
  assert.equal(chosen.bays.length,chosen.cells);
  assert.equal(chosen.bays.reduce((sum,bay)=>sum+bay.good,0),chosen.nominal);
  assert.equal(chosen.bays.reduce((sum,bay)=>sum+bay.wait,0)/60,chosen.waitingMinutes);
  const impossible=compare(2000,420,true);
  assert.equal(chooseLayout(impossible).shortfall,Math.min(...impossible.map(row=>row.shortfall)));
  assert.ok(compare(120,420,false)[0].nominal<low[0].nominal);
  const estimate=compare(null,420,true)[0];
  assert.equal(estimate.nominal,low[0].nominal);
  assert.equal(estimate.shortfall,null);
});
