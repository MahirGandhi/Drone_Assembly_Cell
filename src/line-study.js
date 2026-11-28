import {defaultLineInputs,lineStages,studyLine,lineSnapshot,designMetrics} from './line-model.js';
import './line-study.css';

const byId=id=>document.getElementById(id);
const n=value=>Number(value).toFixed(1);
const names={working:'Working',rework:'Repair and recheck','scrap-handling':'Scrap handling','staff-wait':'Waiting for operator',blocked:'Waiting for transfer',repair:'Equipment repair','repair-wait':'Waiting for technician','planned-stop':'Scheduled pause',idle:'Awaiting input'};
export function initLineStudy({onLayout,onState,onFocus}) {
  const form=byId('line-form'),initial=defaultLineInputs();
  let study,playing=false,time=0,last=performance.now(),lastUI=0,busy=false;
  const field=(name,label,value,min,max,step='1')=>`<label>${label}<input name="${name}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
  byId('line-station-fields').innerHTML=initial.stages.map((stage,index)=>`<tr><th scope="row">${stage.name}</th>${[
    ['count',stage.count,1,4,1],['seconds',stage.seconds,1,3600,.1],['touch',stage.touch,0,3600,.1],['defect',stage.defect,0,100,.1],['area',stage.area,1,200,.1],['cost',stage.cost,0,1e7,1]
  ].map(([key,value,min,max,step])=>`<td><input aria-label="${stage.name}: ${key}" name="s${index}-${key}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></td>`).join('')}</tr>`).join('');
  const lossFields=[
    ['arrival','Kit arrival interval (s)',60,1,3600],['kits','Available kits',500,1,2000],['buffer','Waiting spaces / station',2,0,12],
    ['outputCapacity','Accepted-output capacity',8,1,100],['pickupInterval','Output collection interval (s)',900,1,7200],
    ['mtbf','Equipment MTBF (s; 0 disables)',0,0,86400],['repairSeconds','Equipment repair duration (s)',180,1,7200],['technicians','Shared maintenance technicians',1,1,3],
    ['reworkSeconds','Repair and recheck / attempt (s)',60,1,3600],['repairSuccess','Repair pass probability (%)',90,0,100],['maxReworks','Maximum repair attempts',2,0,5],
    ['stopAt','Scheduled pause starts (s)',12600,0,43200],['stopSeconds','Scheduled pause duration (s)',0,0,7200],['variationPercent','Assumed time variation (±%)',0,0,50],
  ];
  byId('line-loss-fields').innerHTML=lossFields.map(args=>field(...args)).join('');
  byId('line-objective-fields').innerHTML=[['maxResources','Maximum station resources',12,5,20],['maxOperators','Maximum operators',6,1,6],['maxArea','Maximum equipment footprint (m²)',160,1,1000],['weight-equipment','Equipment / capital weight',1,0,10],['weight-labor','Staffing weight',1,0,10],['weight-space','Footprint weight',1,0,10]].map(args=>field(...args)).join('');
  byId('line-requirements').innerHTML=`<table><thead><tr><th>Workstation</th><th>Product requirement and process check</th></tr></thead><tbody>${lineStages.map(stage=>`<tr><th scope="row">${stage.name}</th><td>${stage.requirement}</td></tr>`).join('')}</tbody></table>`;
  function read() {
    const input=defaultLineInputs(),values=new FormData(form);
    for(const key of Object.keys(input)) if(typeof input[key]==='number'&&values.has(key)) input[key]=Number(values.get(key));
    input.seconds=Number(values.get('minutes'))*60;
    input.auto=values.get('auto')==='true';input.timingProfile=values.get('timingProfile');input.variation=Number(values.get('variationPercent'))/100;
    input.weights=Object.fromEntries(['equipment','labor','space'].map(key=>[key,Number(values.get('weight-'+key))]));
    input.stages=input.stages.map((stage,index)=>({...stage,...Object.fromEntries(['count','seconds','touch','defect','area','cost'].map(key=>[key,Number(values.get(`s${index}-${key}`))]))}));
    return input;
  }
  function pause() {playing=false;byId('line-play').textContent='Play line';}
  function update() {
    if(!study) return;
    const snapshot=lineSnapshot(study.nominal,time);
    byId('line-time').value=time;byId('line-clock').textContent=n(time/60)+' min';
    const counts=`${snapshot.good} accepted · ${snapshot.scrap} scrapped · ${snapshot.wip} in process`;
    byId('line-live-counts').textContent=counts;byId('line-scene-counts').textContent=counts;
    byId('line-monitor').innerHTML=`<div><small>WINDOW FORECAST</small><strong>${study.nominal.good} / ${study.input.target}</strong><small>accepted assemblies</small></div><div><small>PLAYBACK TIME</small><strong>${n(time/60)} min</strong></div><div class="metrics"><div><small>ACCEPTED</small><strong>${snapshot.good}</strong></div><div><small>IN PROCESS</small><strong>${snapshot.wip}</strong></div><div><small>SCRAPPED</small><strong>${snapshot.scrap}</strong></div></div><h2>Workstation state</h2><ol class="line-live-stations">${snapshot.stations.map((stage,index)=>`<li><strong>${study.input.stages[index].name}</strong><span>${stage.units.map((unit,i)=>`Resource ${i+1}: ${names[unit.state]??unit.state}${unit.job?' · assembly '+unit.job:''}`).join('<br>')}</span><small>${stage.queued} waiting · ${stage.completed} processed</small></li>`).join('')}</ol>`;
    onState(snapshot);
  }
  function display(search,previous) {
    const r=study.nominal,input=study.input,metrics=designMetrics(input),target=input.target;
    const delta=previous?input.stages.map((stage,index)=>stage.count!==previous.stages[index].count?`${stage.name}: ${previous.stages[index].count} to ${stage.count}`:null).filter(Boolean):[];
    if(previous&&previous.operators!==input.operators) delta.push(`Shared operators: ${previous.operators} to ${input.operators}`);
    byId('line-results').innerHTML=`<div class="line-kpis"><div><small>SHIFT FORECAST</small><strong>${r.good} / ${target}</strong><span>accepted assemblies</span></div><div><small>REQUIRED TAKT</small><strong>${n(input.seconds/target)} s</strong><span>per accepted assembly</span></div><div><small>FIRST-PASS YIELD</small><strong>${r.firstPassYield===null?'—':n(r.firstPassYield*100)+'%'}</strong><span>accepted or scrapped cohort</span></div><div><small>LABOR / ACCEPTED</small><strong>${r.laborMinutesPerGood===null?'—':n(r.laborMinutesPerGood)+' min'}</strong><span>assembly operator time</span></div></div><p>${search?`${study.designs.length} designs evaluated. ${delta.length?delta.join('; ')+'.':'The entered design was retained.'} `:''}${r.good>=target?'The nominal scenario meets demand.':`The nominal scenario is ${target-r.good} assemblies short.`} ${metrics.equipment} station resources · ${input.operators} assembly operators + ${input.technicians} maintenance technician${input.technicians===1?'':'s'} · ${n(metrics.area)} m² equipment footprint. ${metrics.allPriced?'Entered installed equipment cost: $'+metrics.pricedCapital.toLocaleString()+'.':'Equipment costs are incomplete; ranking uses equipment count.'}</p>`;
    const confidence=study.conditionalTargetInterval?`${study.targetMet} of ${study.samples.length} runs met demand. Conditional 95% Wilson interval: ${n(study.conditionalTargetInterval[0]*100)}–${n(study.conditionalTargetInterval[1]*100)}%. This describes sampling under the entered assumptions and excludes parameter uncertainty.`:'This scenario is deterministic. Repeating it does not establish statistical confidence.';
    byId('line-analysis').innerHTML=`<h2>Line performance and production losses</h2><p>${confidence} Factory predictive accuracy remains unvalidated.</p><p>Sample output: ${study.sampleRange.join('–')} · end-of-window WIP: ${r.wip} · scrap: ${r.scrap} · equipment failures: ${r.repairs} · repair-and-recheck attempts: ${r.reworkAttempts} · mean accepted lead time: ${r.leadSeconds===null?'—':n(r.leadSeconds/60)+' min'}.</p><div class="table-scroll"><table><thead><tr><th>Workstation</th><th>Resources</th><th>Productive utilization</th><th>Wait for operator</th><th>Blocked transfer</th><th>Equipment downtime</th><th>Scheduled pause</th><th>Unoccupied resource time</th></tr></thead><tbody>${r.stations.map((stage,index)=>`<tr><th scope="row">${input.stages[index].name}</th><td>${stage.count}</td><td>${n(stage.utilization*100)}%</td><td>${n(stage.staffWait/60)} min</td><td>${n(stage.blocked/60)} min</td><td>${n(stage.down/60)} min</td><td>${n(stage.planned/60)} min</td><td>${n(stage.unoccupied/60)} min</td></tr>`).join('')}</tbody></table></div><p>Loss times add across resources. Downtime includes waiting for a technician and repair. Scheduled pause is time occupied work spent paused. Unoccupied time includes startup and waiting for incoming work. WIP = admitted assemblies − accepted − scrapped. Material transfer time, inspection detection errors, worker travel and special-cause disruptions are outside this model. The search tests at most 24 designs and does not prove global optimality.</p>`;
    byId('line-playback').hidden=false;byId('line-time').max=input.seconds;
    byId('line-export').disabled=false;
    onLayout(study);update();
  }
  async function calculate(search=false,focus=true) {
    if(busy||!form.reportValidity()) return;
    pause();const input=read();busy=true;byId('line-error').hidden=true;
    const controls=[...form.elements],disabled=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
    byId('line-calculating').textContent='Calculating the schedule…';
    try {
      study=await studyLine(input,{search,onProgress:count=>{byId('line-calculating').textContent=`${count} design${count===1?'':'s'} evaluated…`;}});
      time=0;
      study.input.stages.forEach((stage,index)=>form.elements.namedItem(`s${index}-count`).value=stage.count);
      form.elements.namedItem('operators').value=study.input.operators;
      display(search,input);
      byId('line-study').querySelector('.evidence-tag').textContent='Planning model · uncalibrated';
      if(focus) onFocus();
    } catch(error) {byId('line-error').textContent=error.message;byId('line-error').hidden=false;}
    finally {controls.forEach((control,index)=>control.disabled=disabled[index]);byId('line-export').disabled=!study;byId('line-calculating').textContent='';busy=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();calculate(event.submitter?.value==='search');});
  form.addEventListener('input',()=>{byId('line-study').querySelector('.evidence-tag').textContent='Inputs changed · run again';byId('line-export').disabled=true;});
  form.elements.namedItem('auto').addEventListener('change',()=>{
    const auto=form.elements.namedItem('auto').value==='true';
    form.elements.namedItem('s1-seconds').value=auto?192.6:220.6;form.elements.namedItem('s1-touch').value=auto?36:93;
  });
  byId('line-loss-example').onclick=()=>{
    for(const [key,value] of Object.entries({mtbf:7200,repairSeconds:180,reworkSeconds:60,repairSuccess:80,maxReworks:2,stopAt:12600,stopSeconds:900,'s3-defect':5,variationPercent:10})) form.elements.namedItem(key).value=value;
    byId('line-study').querySelector('.evidence-tag').textContent='Example assumptions loaded · run again';
    byId('line-export').disabled=true;
  };
  byId('line-export').onclick=()=>{
    if(!study) return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(study,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='x500-line-study.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  byId('line-play').onclick=()=>{if(!study) return;onFocus();if(time>=study.input.seconds) time=0;playing=!playing;last=performance.now();byId('line-play').textContent=playing?'Pause line':'Play line';update();};
  byId('line-time').oninput=()=>{pause();time=Number(byId('line-time').value);onFocus();update();};
  document.addEventListener('visibilitychange',()=>{last=performance.now();});
  return {pause,focus(){if(study){onFocus();update();}else calculate(false);},calculate,
    tick(now){if(playing&&!document.hidden&&study){time=Math.min(study.input.seconds,time+(now-last)/1000*120);if(now-lastUI>=150||time>=study.input.seconds){update();lastUI=now;}if(time>=study.input.seconds) pause();}last=now;}};
}
