import test from 'node:test';
import assert from 'node:assert/strict';
import {Cell,faults,gripFraction,makeCycle} from './cell.js';
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

test('guided work requires stopped access, entry, confirmation and exit before automatic work',()=>{
  const cell=new Cell({guided:true});
  cell.start();cell.tick(10);
  assert.equal(cell.status,'waiting');
  assert.equal(cell.op.key,'enter');
  assert.equal(cell.accessOpen,false);
  cell.confirm();cell.tick(10);
  assert.equal(cell.status,'waiting');
  assert.equal(cell.op.key,'prepare');
  assert.equal(cell.accessOpen,true);
  assert.equal(cell.closeAccess(),false);
  cell.confirm();cell.tick(1);
  assert.equal(cell.stock.nuts,32);
  cell.stop();const time=cell.time;cell.tick(50);
  assert.equal(cell.time,time);
  cell.start();cell.tick(7);
  assert.equal(cell.stock.nuts,16);
  assert.equal(cell.op.key,'exit');
  assert.equal(cell.status,'waiting');
  cell.confirm();cell.tick(10);
  assert.equal(cell.accessOpen,false);
  assert.equal(cell.op.resource,'robot');
  assert.equal(cell.status,'running'); // Robot handling proceeds before the next access block.
});
test('pause holds elapsed work, material and joint records until deliberate resume',()=>{
  const cell=new Cell();
  cell.start();
  assert.equal(cell.inFlight,true);
  assert.equal(cell.op.key,'park');
  const firstMove=cell.cycle.findIndex(op=>op.key==='move');
  const beforeMove=cell.cycle.slice(0,firstMove).reduce((sum,op)=>sum+op.duration,0);
  cell.tick(beforeMove+1);
  assert.equal(cell.op.key,'move');
  assert.equal(cell.screw,0);
  const time=cell.time, elapsed=cell.elapsed;
  cell.stop();
  const frozen=JSON.stringify(cell.report());
  cell.tick(86400);
  assert.equal(JSON.stringify(cell.report()),frozen);
  assert.equal(cell.elapsed,elapsed);
  assert.equal(cell.time,time);
  assert.equal(cell.inFlight,true);
  cell.start();
  assert.equal(cell.elapsed,elapsed);
  cell.tick(1.1);
  assert.equal(cell.op.key,'run');
  assert.equal(cell.history.filter(e=>e.type==='command' && e.text==='Approach joint').length,1);
  cell.tick(1000);
  assert.equal(cell.output,1);
  assert.equal(cell.attempts.length,16);
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

test('unload requires an available pallet, then grip confirmation before the fixture opens',()=>{
  for (const auto of [true,false]) {
    const cell=new Cell({auto});
    const unloadIndex=cell.cycle.findIndex(op=>op.key==='unload');
    const beforeUnload=cell.cycle.slice(0,unloadIndex).reduce((sum,op)=>sum+op.duration,0);
    cell.start();cell.tick(beforeUnload+.1);
    assert.equal(cell.op.key,'unload');
    assert.equal(cell.clamped,true);
    assert.ok(Object.values(cell.parts).every(owner=>owner==='fixture'));
    cell.tick(cell.op.duration*gripFraction);
    assert.equal(cell.clamped,false);
    assert.ok(Object.values(cell.parts).every(owner=>owner===cell.op.resource));
    assert.equal(cell.output,0);
    cell.stop();cell.tick(100);cell.start();cell.tick(100);
    assert.equal(cell.output,1);
    assert.ok(Object.values(cell.parts).every(owner=>owner==='output'));

    const blocked=new Cell({auto,fault:'output'});
    blocked.start();blocked.tick(1000);
    assert.ok(Math.abs(blocked.time-beforeUnload)<1e-6);
    assert.equal(blocked.status,'held');
    assert.equal(blocked.inFlight,false);
    assert.equal(blocked.clamped,true);
    assert.ok(Object.values(blocked.parts).every(owner=>owner==='fixture'));
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
  const nominal=simulateShift({cells:chosen.cells,operators:chosen.operators,seconds:420*60,auto:true,seed:17,variation:0});
  assert.equal(chosen.goodFramesPerHour,chosen.nominal/7);
  assert.equal(chosen.operatorUtilization,nominal.work/(chosen.operators*420*60));
  const impossible=compare(2000,420,true);
  assert.equal(chooseLayout(impossible).shortfall,Math.min(...impossible.map(row=>row.shortfall)));
  assert.ok(compare(120,420,false)[0].nominal<low[0].nominal);
  const estimate=compare(null,420,true)[0];
  assert.equal(estimate.nominal,low[0].nominal);
  assert.equal(estimate.shortfall,null);
});

test('automatic commands only follow exit and operator work can resume after a stop',()=>{
  const cell=new Cell();
  cell.start();cell.tick(5);
  assert.equal(cell.accessOpen,true);
  cell.emergencyStop();
  cell.closeAccess();
  assert.equal(cell.acknowledgeStop(),true);
  cell.start();
  assert.equal(cell.accessOpen,true);
  cell.tick(1000);
  assert.equal(cell.status,'complete');
  let access=false;
  for (const event of cell.history) {
    if (event.type==='access') {
      if (event.text.includes('permits operator')||event.text.includes('re-entry')) access=true;
      if (event.text.includes('gate-closed')||event.text==='Gate closed') access=false;
    }
    if (event.type==='command') {
      const op=cell.cycle.find(step=>step.label===event.text);
      if (op.resource!=='operator') assert.equal(access,false,event.text);
    }
  }
});
