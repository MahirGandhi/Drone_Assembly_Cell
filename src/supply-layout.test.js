import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkSupplyPlacement,operatorAccess,supplyPositions} from './supply-layout.js';

const {browser}=JSON.parse(readFileSync(new URL('../data/asset-manifest.json',import.meta.url),'utf8'));

test('recorded bin position clears the assumed access envelope and obstruction control fails',()=>{
  const rear=checkSupplyPlacement(browser.bounds,supplyPositions.rear.translation,100);
  assert.equal(rear.status,'clear');
  assert.ok(rear.gapMm>100);
  const blocked=checkSupplyPlacement(browser.bounds,supplyPositions.blocked.translation,100);
  assert.equal(blocked.status,'obstructed');
  assert.equal(blocked.gapMm,0);
});

test('clearance includes exact allowance and rejects touching or invalid geometry',()=>{
  const bounds={min:[0,0,0],max:[.2,.2,.2]};
  const position=[operatorAccess.max[0]+.1,0,2];
  const result=checkSupplyPlacement(bounds,position,100);
  assert.ok(Math.abs(result.gapMm-100)<1e-9);
  assert.equal(result.status,'clear');
  assert.equal(checkSupplyPlacement(bounds,position,101).status,'below-allowance');
  assert.equal(checkSupplyPlacement(bounds,[operatorAccess.max[0],0,2],0).status,'obstructed');
  assert.throws(()=>checkSupplyPlacement(bounds,[0,0,NaN],100),RangeError);
  assert.throws(()=>checkSupplyPlacement(bounds,position,-1),RangeError);
});
