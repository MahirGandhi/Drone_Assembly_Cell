import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const manifest=JSON.parse(await readFile(new URL('../data/asset-manifest.json',import.meta.url),'utf8'));
const bytes=await readFile(new URL('../'+manifest.browser.path,import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.browser.sha256,'Asset digest changed');
assert.equal(bytes.length,manifest.browser.bytes,'Asset byte count changed');
const {positions,indices}=JSON.parse(bytes);
assert.equal(positions.length,manifest.browser.vertices*3,'Vertex count changed');
assert.equal(indices.length,manifest.browser.triangles*3,'Triangle count changed');
assert.ok(positions.every(Number.isFinite),'Non-finite coordinate');
assert.ok(indices.every(index=>Number.isInteger(index)&&index>=0&&index<manifest.browser.vertices),'Invalid triangle index');
const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
for(let index=0;index<positions.length;index++) {
  const axis=index%3;
  low[axis]=Math.min(low[axis],positions[index]);
  high[axis]=Math.max(high[axis],positions[index]);
}
assert.deepEqual(low,manifest.browser.bounds.min,'Asset minimum bounds changed');
assert.deepEqual(high,manifest.browser.bounds.max,'Asset maximum bounds changed');
assert.match(manifest.source.revision,/^[a-f0-9]{40}$/,'Asset revision must be pinned');
assert.equal(manifest.browser.conversionReproducible,false,'A reproducible converter requires separate evidence');
assert.equal(manifest.nativeValidation.status,'pending','Native validation requires separate evidence');
console.log('Supply crate digest, topology, bounds and provenance verified.');
