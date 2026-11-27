import './style.css';
import {Cell,faults} from './cell.js';
import {createView} from './scene.js';
import {chooseLayout,compare,configurations} from './capacity.js';
import {initProductTour} from './product-tour.js';
import asset from '../data/asset-manifest.json';
import {checkSupplyPlacement,supplyPositions} from './supply-layout.js';

const byId=id=>document.getElementById(id);
byId('open-about').addEventListener('click', () => byId('about-station').showModal());
for(const [key,[label]] of Object.entries(faults)) byId('fault').add(new Option(label,key));
let view;
let supplyAssetLoaded=false;
try {view=createView(byId('scene'),(message,loaded=false)=>{
  supplyAssetLoaded=loaded;
  byId('asset-status').textContent=message;
  byId('supply-layout').querySelector('button').disabled=!loaded;
});}
catch(error) {
  console.error(error);
  byId('asset-status').textContent='Supply crate unavailable · renderer failed';
  byId('scene').textContent='The 3D view is unavailable. Cycle controls and shift planning are still available.';
}
let cell;
let lastTick;
let speed=Number(byId('speed').value);
let rendered=0;
let lastRefresh=0;
let activePlan;
let cameraKey='top';
let liveCamera='top';
const resources={operator:'Operator',robot:'Robot',fixture:'Fixture',inspection:'Inspection'};
function reset() {
  cell=new Cell({auto:byId('mode').value==='auto',fault:byId('fault').value,guided:byId('guided').checked});
  lastTick=performance.now();
  rendered=-1;
  refresh();
}
function refresh() {
  const op=cell.op;
  const operation=(op?.label??'')+(op?.joint!==undefined?' · J'+String(op.joint+1).padStart(2,'0'):'');
  byId('status').dataset.state=cell.stopLatched?'emergency':cell.status;
  const status=cell.stopLatched?'Emergency stop':{
    ready:'Ready',running:'Running',waiting:'Awaiting confirmation',paused:'Paused',held:'Held',complete:'Complete'
  }[cell.status];
  if (byId('status').textContent!==status) byId('status').textContent=status;
  byId('time').textContent=cell.time.toFixed(1)+' s';
  byId('joints').textContent=cell.accepted.size+' / 16';
  byId('input-kits').textContent=cell.stock.frames;
  byId('good-output').textContent=cell.output;
  byId('scrapped-screws').textContent=cell.scrap;
  byId('op').textContent=cell.status==='complete'?'Accepted frame at output':
    cell.status==='ready'?'Ready to start':operation;
  byId('bar').style.width=(op?100*cell.elapsed/op.duration:100)+'%';
  byId('confirm').hidden=cell.status!=='waiting';
  byId('confirm').disabled=cell.stopLatched;
  if (cell.status==='waiting') byId('confirm').textContent='Confirm: '+op.label;
  byId('recovery').hidden=cell.status!=='held'&&!cell.accessOpen;
  byId('reason').textContent=cell.held?.reason??'Close the gate before restarting.';
  byId('access').textContent=cell.accessOpen?'Close gate':'Open gate';
  byId('recover').disabled=!cell.accessOpen||cell.status!=='held';
  byId('gate').dataset.state=cell.stopLatched?'emergency':cell.status;
  byId('gate').textContent=cell.stopLatched?'Emergency stop latched · Acknowledge stop to enable restart':
    cell.accessOpen?'Gate open · motion inhibited':
    cell.status==='waiting'?'Select Confirm in Cell controls to begin: '+op.label:
    cell.status==='held'?'Cycle held · '+cell.held.reason:
    cell.status==='paused'?'Paused · '+operation+' · '+cell.elapsed.toFixed(1)+' s into step':
    cell.status==='running'?resources[op.resource]+' · '+operation+' · '+cell.elapsed.toFixed(1)+' / '+op.duration+' s':
    cell.status==='complete'?'Frame at output · 16 joints accepted':'Gate closed';
  byId('run').textContent=['running','waiting'].includes(cell.status)?'Pause cycle':
    cell.status==='paused'?'Resume cycle':'Start cycle';
  byId('ack').disabled=!cell.stopLatched||cell.accessOpen;
  byId('reset').disabled=cell.stopLatched;
  byId('estop').disabled=cell.stopLatched||cell.status==='complete';
  byId('run').disabled=cell.stopLatched||cell.accessOpen||['held','complete'].includes(cell.status);
  byId('mode').disabled=byId('fault').disabled=byId('guided').disabled=cell.status!=='ready'||cell.stopLatched;
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
  if(['running','waiting'].includes(cell.status)) cell.stop();
  else if (cell.start()) lastTick=performance.now();
  if (cameraKey==='plan') selectCamera(liveCamera);
  refresh();
};
byId('reset').onclick=()=>{
  if (!['ready','complete'].includes(cell.status) && !window.confirm('Discard this modeled run? Export the run record first to keep it.')) return;
  reset();
};
byId('estop').onclick=()=>{cell.emergencyStop();refresh();};
byId('ack').onclick=()=>{cell.acknowledgeStop();refresh();};
byId('mode').onchange=()=>{
  reset();
  if (activePlan) calculatePlan('estimate',false);
};
byId('fault').onchange=reset;
byId('guided').onchange=reset;
byId('confirm').onclick=()=>{
  if (cell.confirm()) {
    lastTick=performance.now();
    if (cameraKey==='plan') selectCamera(liveCamera);
  }
  refresh();
};
byId('access').onclick=()=>{
  if(cell.accessOpen) cell.closeAccess();else cell.openAccess();
  refresh();
};
byId('recover').onclick=()=>{cell.recover();refresh();};
const cameraNames={top:'Overhead',iso:'Isometric',focus:'Fixture close-up',plan:'Shift layout'};
function selectCamera(key) {
  cameraKey=key;
  if (key!=='plan') liveCamera=key;
  view?.setCamera(key);
  byId('camera-label').textContent=cameraNames[key];
  for (const name of Object.keys(cameraNames)) {
    byId(name).setAttribute('aria-pressed',String(name===key));
  }
  const planning=key==='plan';
  byId('shift-layout-details').hidden=!planning;
  byId('station-legend').hidden=planning;
  byId('gate').hidden=planning;
  byId('part-guide').hidden=planning || !byId('guide-part').textContent;
}
for (const key of ['top','iso','focus']) byId(key).onclick=()=>selectCamera(key);

initProductTour({onShowPart(part) {
  byId('guide-part').textContent=part.name;
  byId('guide-operation').textContent=part.work;
  view?.highlight(part.station);
  selectCamera('top');
  byId('station').focus({preventScroll:true});
  byId('station').scrollIntoView({block:'nearest'});
}});
const supplyStudy=byId('supply-study');
function updateSupplyLayout(showCamera) {
  if (!supplyAssetLoaded) {
    byId('supply-result').textContent='Load the recorded supply-crate geometry before checking its placement.';
    return;
  }
  const position=supplyPositions[byId('supply-position').value].translation;
  const result=checkSupplyPlacement(asset.browser.bounds,position,Number(byId('supply-allowance').value));
  view?.setSupplyPlacement(position,result,supplyStudy.open);
  const message=result.status==='obstructed'?'Bin overlaps the access envelope.':
    result.status==='below-allowance'?'Bin is closer than the required gap.':'Bin clears the assumed access envelope.';
  byId('supply-result').textContent=message+' Bounding-box gap: '+result.gapMm.toFixed(1)+' mm. Required: '+result.allowanceMm+' mm.';
  if (showCamera) selectCamera('top');
}
byId('supply-layout').onsubmit=event=>{
  event.preventDefault();
  if (byId('supply-layout').reportValidity()) updateSupplyLayout(true);
};
supplyStudy.addEventListener('toggle',()=>{
  if (byId('supply-layout').checkValidity()) updateSupplyLayout(false);
});
byId('clear-guide').onclick=()=>{
  view?.highlight(null);
  byId('guide-part').textContent='';
  byId('part-guide').hidden=true;
  byId('station').focus({preventScroll:true});
};
byId('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(cell.report(),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='x500-run.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const capacity=byId('capacity');
const configuration=byId('configuration');
for (const [cells,operators] of configurations) {
  configuration.add(new Option(`${cells} / ${operators}`,`${cells}:${operators}`));
}

function calculatePlan(request,showLayout) {
  const targetInput=byId('target');
  targetInput.required=request==='target';
  if (!capacity.reportValidity()) return;
  const target=targetInput.value==='' ? null : Number(targetInput.value);
  const minutes=Number(byId('minutes').value);
  const rows=compare(target,minutes,cell.auto);
  const chosen=request==='target' ? chooseLayout(rows) :
    rows.find(row=>`${row.cells}:${row.operators}`===configuration.value);
  configuration.value=`${chosen.cells}:${chosen.operators}`;
  activePlan=chosen;
  view?.setLayout(chosen);
  byId('layout-title').textContent=`${chosen.cells} assembly ${chosen.cells===1?'cell':'cells'} · ${chosen.operators} shared ${chosen.operators===1?'operator':'operators'}`;
  byId('layout-output').textContent=`${chosen.nominal} nominal good frames in ${minutes} min · ${chosen.waitingMinutes.toFixed(1)} min total cell wait for staff`;
  const bays=chosen.bays.map((bay,index)=>{
    const item=document.createElement('li');
    item.textContent=`Cell ${index+1} · ${bay.good} good frames · ${(bay.wait/60).toFixed(1)} min waiting`;
    return item;
  });
  byId('layout-bays').replaceChildren(...bays);
  const message=target===null ? `The selected layout produced ${chosen.nominal} good frames in the nominal shift.` :
    chosen.shortfall===0
    ? `The selected layout met the ${target}-frame target in all five modeled shifts.`
    : request==='target'
      ? `No evaluated layout met the target in all five modeled shifts. The closest layout was ${chosen.shortfall} frames short in its lowest-output sample.`
      : `The selected layout was ${chosen.shortfall} frames short in its lowest-output sample.`;
  const takt=target===null?'':` Required takt is <strong>${(minutes*60/target).toFixed(1)} s per good frame</strong> across the layout.`;
  byId('capacity-result').innerHTML=`<p>${message}${takt}</p>
    <table><thead><tr><th scope="col">Cells</th><th scope="col">Operators</th><th scope="col">Good frames</th><th scope="col">Good frames/hr</th><th scope="col">Operator utilization</th><th scope="col">Cell time waiting for staff</th><th scope="col">Good frames across samples</th><th scope="col">Shortfall at low sample</th></tr></thead><tbody>${
      rows.map(row=>`<tr aria-current="${row===chosen}"><td>${row.cells}</td><td>${row.operators}</td><td>${row.nominal}</td><td>${row.goodFramesPerHour.toFixed(1)}</td><td>${(100*row.operatorUtilization).toFixed(1)}%</td><td>${row.waitingMinutes.toFixed(1)} min</td><td>${row.min}–${row.max}</td><td>${row.shortfall??'–'}</td></tr>`).join('')
    }</tbody></table>
    <details class="kpi-method"><summary>How the shift KPIs are calculated</summary>
    <p>The model counts good frames when assembly and inspection finish and the frame reaches output. The hourly rate divides that count by available shift hours. Operator utilization divides busy time by available operator time. Cell wait adds up the time cells spend waiting for an operator. Takt divides available shift time by the good frames required.</p>
    <p>The table shows the nominal run and the range from five samples that vary assumed task times by up to 15%. The model excludes faults and assumes 20 seconds of operator time for replenishment and pallet service after every two frames per cell.</p></details>`;
  if (showLayout) {
    selectCamera('plan');
    byId('station').focus({preventScroll:true});
    byId('station').scrollIntoView({block:'start'});
  }
}
capacity.onsubmit=event=>{
  event.preventDefault();
  calculatePlan(event.submitter?.value,true);
};
byId('plan').onclick=()=>{
  if (activePlan) selectCamera('plan');
  else calculatePlan('estimate',true);
};
reset();
view?.animate(cell);
function advance(now) {
  if (lastTick!==undefined && !document.hidden && cell.status==='running') {
    cell.tick((now-lastTick)/1000*speed);
  }
  lastTick=now;
}
byId('speed').onchange=()=>{
  advance(performance.now());
  speed=Number(byId('speed').value);
};
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();});
function frame() {
  const now=performance.now();
  advance(now);
  if(now-lastRefresh>=100 || rendered!==cell.history.length) {
    refresh();
    lastRefresh=now;
  }
  view?.animate(cell,now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
