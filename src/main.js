import './style.css';
import {Cell,faults} from './cell.js';
import {createView} from './scene.js';
import {compare} from './capacity.js';
import {initExplorer} from './explorer.js';

const byId=id=>document.getElementById(id);
let showingCell = false;
const explorer = initExplorer(() => setWorkspace(true));
byId('open-explorer').onclick = () => setWorkspace(false);
byId('open-cell').onclick = () => setWorkspace(true);

function setWorkspace(showCell) {
  if (showCell === showingCell) return;
  showingCell = showCell;
  byId('cell-workspace').hidden = !showCell;
  byId('explorer').hidden = showCell;
  byId('open-cell').setAttribute('aria-pressed',String(showCell));
  byId('open-explorer').setAttribute('aria-pressed',String(!showCell));
  explorer.setVisible(!showCell);
  if (showCell && view === undefined) {
    try { view = createView(byId('scene')); }
    catch (error) {
      console.error(error);
      view = null;
      byId('scene').textContent = '3D rendering requires WebGL. Cycle controls and shift planning are available.';
    }
  }
  window.scrollTo(0,0);
  byId(showCell ? 'open-cell' : 'open-explorer').focus({preventScroll:true});
}

for(const [key,[label]] of Object.entries(faults)) byId('fault').add(new Option(label,key));
let view;
let cell;
let last=-1;
let rendered=0;
let lastRefresh=0;
function reset() {
  cell=new Cell({auto:byId('mode').value==='auto',fault:byId('fault').value,guided:true});
  rendered=-1;
  refresh();
}
function refresh() {
  const op=cell.op;
  byId('status').dataset.state=cell.status;
  byId('status').textContent={
    ready:'Ready',running:'Running',waiting:'Operator needed',paused:'Paused',held:'Held',complete:'Complete'
  }[cell.status];
  byId('time').textContent=cell.time.toFixed(1)+' s';
  byId('joints').textContent=cell.accepted.size+' / 16';
  byId('op').textContent=cell.status==='complete'?'Accepted frame at output':
    cell.status==='ready'?'Ready to start':op?.label+(op?.joint!==undefined?' · J'+String(op.joint+1).padStart(2,'0'):'');
  byId('bar').style.width=(op?100*cell.elapsed/op.duration:100)+'%';
  byId('confirm').hidden=cell.status!=='waiting';
  byId('confirm').disabled=cell.stopLatched;
  byId('recovery').hidden=cell.status!=='held'&&!cell.accessOpen;
  byId('reason').textContent=cell.held?.reason??'Close the gate before restarting.';
  byId('access').textContent=cell.accessOpen?'Close gate':'Open gate';
  byId('recover').disabled=!cell.accessOpen||cell.status!=='held';
  byId('gate').textContent=cell.stopLatched?'Emergency stop latched':cell.accessOpen?'Gate open · motion inhibited':
    cell.status==='waiting'?'Operator station · confirmation required':
    cell.status==='held'?'Cycle held · corrective action required':'Gate closed';
  byId('run').textContent=['running','waiting'].includes(cell.status)?'Pause cycle':
    cell.status==='paused'?'Resume cycle':'Start cycle';
  byId('ack').disabled=!cell.stopLatched||cell.accessOpen;
  byId('estop').disabled=cell.stopLatched||cell.status==='complete';
  byId('run').disabled=cell.stopLatched||cell.accessOpen||['held','complete'].includes(cell.status);
  byId('mode').disabled=byId('fault').disabled=cell.status!=='ready';
  if(rendered!==cell.history.length) {
    rendered=cell.history.length;
    const entries=cell.history.slice(-9).reverse().map(e=>{
      const row=document.createElement('li');
      row.textContent=e.time.toFixed(1)+' s  '+e.text+(e.joint!==undefined?' [J'+String(e.joint+1).padStart(2,'0')+']':'');
      return row;
    });
    if(!entries.length) {
      const row=document.createElement('li');row.textContent='Waiting for cycle start.';entries.push(row);
    }
    byId('events').replaceChildren(...entries);
  }
}
byId('run').onclick=()=>{
  if(['running','waiting'].includes(cell.status)) cell.stop();else cell.start();
  refresh();
};
byId('reset').onclick=()=>{
  if (!['ready','complete'].includes(cell.status) && !window.confirm('Discard this modeled run? Export the run record first to keep it.')) return;
  reset();
};
byId('estop').onclick=()=>{cell.emergencyStop();refresh();};
byId('ack').onclick=()=>{cell.acknowledgeStop();refresh();};
byId('mode').onchange=reset;
byId('fault').onchange=reset;
byId('confirm').onclick=()=>{cell.confirm();refresh();};
byId('access').onclick=()=>{
  if(cell.accessOpen) cell.closeAccess();else cell.openAccess();
  refresh();
};
byId('recover').onclick=()=>{cell.recover();refresh();};
for(const [key,label] of [['top','Overhead'],['iso','Isometric'],['focus','Fixture close-up']])
  byId(key).onclick=()=>{
    view?.setCamera(key);
    byId('camera-label').textContent=label;
    for(const viewName of ['top','iso','focus']) byId(viewName).setAttribute('aria-pressed',String(viewName===key));
  };
byId('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(cell.report(),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='x500-run.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
byId('capacity').onsubmit=e=>{
  e.preventDefault();
  const target=Number(byId('target').value);
  const rows=compare(target,Number(byId('minutes').value),byId('mode').value==='auto');
  const preferred=rows.find(row=>row.shortfall===0);
  const message=preferred?
    `${preferred.cells} cell(s) with ${preferred.operators} operator(s) met demand in all five modeled runs.`:
    'No evaluated configuration met demand in all five modeled runs.';
  byId('capacity-result').innerHTML=`<p>${message} Fault-free planning estimate, independent of the selected demo fault. Assumes 20 s of operator replenishment and pallet service every two frames. Five seeded samples vary assumed operation times by ±15%.</p>
    <table><thead><tr><th>Cells</th><th>Operators</th><th>Nominal good</th><th>Sample range</th><th>Shortfall at low sample</th><th>Nominal operator wait</th></tr></thead><tbody>${
      rows.map(r=>`<tr class="${r===preferred?'recommended':''}"><td>${r.cells}</td><td>${r.operators}</td><td>${r.nominal}</td><td>${r.min}–${r.max}</td><td>${r.shortfall}</td><td>${r.waitingMinutes.toFixed(1)} min</td></tr>`).join('')
    }</tbody></table>`;
};
reset();
function frame(now) {
  const dt=last<0?0:Math.min(.12,(now-last)/1000);
  last=now;
  cell.tick(dt*Number(byId('speed').value));
  if (showingCell) view?.animate(cell);
  if(now-lastRefresh>=100 || rendered!==cell.history.length) {
    refresh();
    lastRefresh=now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
