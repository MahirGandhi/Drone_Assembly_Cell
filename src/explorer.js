import { components, stages } from './product.js';
import { defaultLine, lineLimits, simulateLine, findLinePlan } from './line.js';
import { createProductView } from './product-view.js';
import './explorer.css';

const byId = id => document.getElementById(id);
const fieldNames = {
  minutes:'Shift minutes',target:'Target good frames',release:'Release interval (s)',buffer:'Buffer per stage',
  cells:'Assembly cells',operators:'Shared operators',kit:'Kitting (s)',prep:'Preparation (s)',
  inspection:'Inspection (s)',reject:'First-pass rejects (%)',rework:'Rework & recheck (s)',
};
const percent = value => value===null ? '–' : `${(value*100).toFixed(1)}%`;
const decimal = value => value===null ? '–' : value.toFixed(1);
const changeFrom = (value,base,unit = '') => {
  const change = Number((value-base).toFixed(1));
  const sign = change>0 ? '+' : change<0 ? '−' : '';
  return change===0 ? 'No change' : `${sign}${decimal(Math.abs(change))}${unit}`;
};

export function initExplorer(openCell) {
  const partButtons = new Map();
  const route = byId('route');
  const stageCards = new Map();
  let view;
  byId('trace-cell').addEventListener('click',openCell);

  for (const part of components) {
    const button = document.createElement('button');
    const name = document.createElement('span');
    const quantity = document.createElement('span');
    name.textContent = part.name;
    quantity.textContent = `×${part.quantity}`;
    button.type = 'button';
    button.className = 'component';
    button.setAttribute('aria-pressed','false');
    button.append(name,quantity);
    button.addEventListener('click',() => select(part.id));
    byId('component-list').append(button);
    partButtons.set(part.id,button);
  }

  for (const stage of stages) {
    const card = document.createElement('li');
    const name = document.createElement('strong');
    const detail = document.createElement('p');
    name.textContent = stage.name;
    detail.textContent = stage.detail;
    card.append(name,detail);
    route.append(card);
    stageCards.set(stage.id,card);
  }

  function select(id) {
    const part = components.find(item => item.id===id);
    if (!part) return;
    view?.select(id);
    for (const [key,button] of partButtons) button.setAttribute('aria-pressed',String(key===id));
    for (const [stage,card] of stageCards) card.classList.toggle('on-route',part.route.includes(stage));
    byId('part-name').textContent = part.name;
    byId('part-tag').textContent = part.scope;
    byId('part-detail').textContent = part.detail;
    const path = stages.filter(stage => part.route.includes(stage.id)).map(stage => stage.name).join(' → ');
    byId('trace').textContent = `${part.name} · ${path || 'Installed downstream of frame acceptance'}`;
  }

  try {
    view = createProductView(byId('product-scene'),select);
  } catch (error) {
    console.error(error);
    byId('product-scene').textContent = 'The 3D view is unavailable. Select a part from the bill of materials to trace its route.';
    for (const id of ['product-iso','product-top','explosion','assemble','explode']) byId(id).disabled = true;
    document.querySelector('.orbit-hint').hidden = true;
  }
  select('top');
  for (const mode of ['iso','top']) {
    byId(`product-${mode}`).addEventListener('click',() => {
      view?.setCamera(mode);
      for (const option of ['iso','top']) {
        byId(`product-${option}`).setAttribute('aria-pressed',String(option===mode));
      }
    });
  }
  function setExplosion(value) {
    byId('explosion').value = value;
    byId('explosion-value').value = `${value}%`;
    view?.setExplosion(value/100);
  }
  byId('explosion').addEventListener('input',event => setExplosion(Number(event.target.value)));
  byId('assemble').addEventListener('click',() => setExplosion(0));
  byId('explode').addEventListener('click',() => setExplosion(100));

  const form = byId('line-form');
  const fields = byId('line-fields');
  for (const [key,labelText] of Object.entries(fieldNames)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const [min,max] = lineLimits[key];
    label.textContent = labelText;
    Object.assign(input,{type:'number',name:key,min,max,step:1,value:defaultLine[key],required:true});
    label.append(input);
    fields.append(label);
  }
  const modeLabel = document.createElement('label');
  modeLabel.textContent = 'Cell handling';
  const mode = document.createElement('select');
  mode.name = 'handling';
  mode.add(new Option('Robot assisted','auto'));
  mode.add(new Option('Operator loaded','manual'));
  modeLabel.append(mode);
  fields.append(modeLabel);

  let scenario = simulateLine(defaultLine);
  let baseline = scenario;
  let target = defaultLine.target;

  function renderReport() {
    const cards = [
      ['Good frames',scenario.accepted,baseline.accepted,number => String(number)],
      ['Good frames/hr',scenario.goodPerHour,baseline.goodPerHour,decimal],
      ['First-pass yield',scenario.yield,baseline.yield,percent],
      ['Lead time (min)',scenario.averageLeadMinutes,baseline.averageLeadMinutes,decimal],
    ].map(([label,value,base,format]) => {
      const card = document.createElement('div');
      const name = document.createElement('span');
      const number = document.createElement('strong');
      const comparison = document.createElement('small');
      name.textContent = label;
      number.textContent = value===null ? '–' : format(value);
      const isYield = label==='First-pass yield';
      const scale = isYield ? 100 : 1;
      comparison.textContent = value===null || base===null ? `Baseline ${format(base)}` :
        `${changeFrom(value*scale,base*scale,isYield ? ' pp' : '')} vs. baseline`;
      card.append(name,number,comparison);
      return card;
    });
    byId('line-metrics').replaceChildren(...cards);
    const constraint = scenario.constraints.map(item => item.name).join(' / ');
    const constraintText = byId('line-constraint');
    const heading = document.createElement('strong');
    heading.textContent = constraint;
    const largestQueue = scenario.stationRows.reduce((first,second) => second.avgQueue>first.avgQueue ? second : first);
    const queueSummary = document.createElement('p');
    queueSummary.textContent = largestQueue.avgQueue>0
      ? `Largest average queue in this run: ${largestQueue.name} (${decimal(largestQueue.avgQueue)} frames).`
      : 'No frames queued in this run.';
    constraintText.replaceChildren('Nominal capacity limit ',heading,
      ` · ${decimal(scenario.constraints[0].seconds)} s of nominal load/frame · ${scenario.accepted} / ${target} good frames`,queueSummary);
    const stationRows = scenario.stationRows.map((row,index) => {
      const tr = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = row.name;
      if (scenario.constraints.some(item => item.name===row.name)) tr.classList.add('is-constraint');
      tr.append(heading);
      const baseQueue = baseline.stationRows[index].avgQueue;
      const queueChange = changeFrom(row.avgQueue,baseQueue);
      const queue = `${decimal(row.avgQueue)} (${queueChange==='No change' ? '0.0' : queueChange})`;
      for (const value of [percent(row.utilization),queue,row.maxQueue,
        `${decimal(row.waitMinutes)} min`,`${decimal(row.blockedMinutes)} min`]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        tr.append(cell);
      }
      return tr;
    });
    byId('line-stations').replaceChildren(...stationRows);
    byId('line-accounting').textContent =
      `${scenario.released} released · ${scenario.wip} in process at shift end · ${scenario.reworked} recovered in rework · ${scenario.skippedReleases} release slots skipped · ${percent(scenario.operatorUtilization)} shared operator utilization`;
  }

  form.addEventListener('submit',event => {
    event.preventDefault();
    const values = new FormData(form);
    const config = Object.fromEntries(Object.keys(fieldNames).map(key => [key,Number(values.get(key))]));
    config.auto = values.get('handling')==='auto';
    target = config.target;
    const planning = byId('line-plan');
    planning.replaceChildren();
    if (event.submitter?.value==='plan') {
      const plan = findLinePlan(config);
      const wording = plan.feasible ? `Target met with ${plan.cells} cell(s) and ${plan.operators} operator(s).` :
        `No configuration reached ${target}. Best modeled output used ${plan.cells} cell(s) and ${plan.operators} operator(s).`;
      planning.textContent = `${wording} ${plan.result.accepted} good frames. Search tested up to 4 cells and 4 operators at the entered settings.`;
      scenario = plan.result;
      form.elements.cells.value = plan.cells;
      form.elements.operators.value = plan.operators;
    } else {
      scenario = simulateLine(config);
    }
    renderReport();
  });
  byId('capture-baseline').addEventListener('click',() => {
    baseline = scenario;
    renderReport();
    byId('line-plan').textContent = 'Baseline updated using the displayed result.';
  });
  renderReport();
  return {setVisible(visible) { view?.setVisible(visible); }};
}
