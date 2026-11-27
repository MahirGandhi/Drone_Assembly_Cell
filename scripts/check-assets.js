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
assert.equal(manifest.browser.conversionReproducible,true,'The browser asset requires the recorded converter');
assert.ok(manifest.browser.sourceEnvelopeErrorMetres<=.002,'Display-envelope error exceeds recorded limit');
assert.equal(manifest.nativeValidation.status,'cpu-composition-checked','Native inspection report required');
console.log('Supply crate local digest, topology, bounds and source-revision format verified.');

const report=JSON.parse(await readFile(new URL('../data/native-asset-report.json',import.meta.url),'utf8'));
assert.equal(report.sourceRevision,manifest.source.revision,'Native report revision differs');
assert.equal(report.browserExport.sha256,manifest.browser.sha256,'Native report browser digest differs');
assert.deepEqual(report.unresolvedDependencies,[],'Native dependencies are unresolved');
assert.equal(report.sourceMetrics.metersPerUnit,1,'Pinned asset metrics changed');
assert.equal(report.sourceMetrics.upAxis,'Z','Pinned asset orientation changed');
assert.ok(report.rearAccessGapMetres>.1,'Native rear clearance control failed');
assert.equal(report.obstructionGapMetres,0,'Native obstruction control failed');
const native=report.rearWorldBoundsMetres;
const browserBounds={
  min:[native.min[0]+2.93,native.min[2],1.12-native.max[1]],
  max:[native.max[0]+2.93,native.max[2],1.12-native.min[1]],
};
for (const key of ['min','max']) for (let axis=0;axis<3;axis++) {
  assert.ok(Math.abs(browserBounds[key][axis]-manifest.browser.bounds[key][axis])<=.002,
    'Native-to-browser envelope exceeds 2 mm display tolerance');
}
console.log('Native dependency, composition and static-layout evidence matches the browser derivative.');
