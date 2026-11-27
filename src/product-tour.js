import {components} from './product.js';
import {createProductView} from './product-view.js';
import './product-tour.css';

export function initProductTour({onShowPart}) {
  const dialog = document.getElementById('product-tour');
  const host = document.getElementById('product-scene');
  const list = document.getElementById('product-parts');
  const slider = document.getElementById('product-explosion');
  const buttons = new Map();
  let selected = components[0];
  let view;

  function select(id) {
    selected = components.find(part => part.id === id);
    if(buttons.get(id)?.hidden) {
      document.getElementById('product-filter').value='all';
      for(const button of buttons.values()) button.hidden=false;
    }
    view?.select(id);
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === id));
    document.getElementById('product-part-name').textContent = selected.name;
    document.getElementById('product-part-purpose').textContent = selected.purpose;
    document.getElementById('product-stage').textContent = selected.stage;
    document.getElementById('product-process-context').textContent = selected.work;
    buttons.get(id)?.scrollIntoView({block:'nearest'});
  }

  for (const part of components) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${part.name} · ×${part.quantity}`;
    button.addEventListener('click', () => select(part.id));
    list.append(button);
    buttons.set(part.id, button);
  }
  document.getElementById('product-filter').addEventListener('change',event=>{
    for(const part of components) buttons.get(part.id).hidden=event.target.value!=='all'&&part.system!==event.target.value;
    if(buttons.get(selected.id).hidden) select(components.find(part=>!buttons.get(part.id).hidden).id);
  });
  select(selected.id);

  function spread(value) {
    slider.value = value;
    document.getElementById('product-spread').value = `${value}%`;
    view?.setExplosion(Number(value)/100);
  }

  function open() {
    dialog.showModal();
    if (view === undefined) {
      try {
        view = createProductView(host, select);
        view.select(selected.id);
        view.setIsolation(document.getElementById('product-isolate').checked);
      } catch (error) {
        console.error(error);
        view = null;
        host.textContent = 'The model is unavailable. Select a component from the list to see what it does.';
        slider.disabled = true;
        document.getElementById('product-assemble').disabled = true;
        document.getElementById('product-explode').disabled = true;
      }
    } else {
      view?.setVisible(true);
    }
  }
  for(const button of document.querySelectorAll('#open-product, [data-open-product]')) button.addEventListener('click',open);
  for(const camera of ['iso','top']) document.getElementById('product-'+camera).addEventListener('click',()=>{
    view?.setCamera(camera);
    for(const key of ['iso','top']) document.getElementById('product-'+key).setAttribute('aria-pressed',String(key===camera));
  });
  document.getElementById('product-isolate').addEventListener('change',event=>view?.setIsolation(event.target.checked));
  dialog.addEventListener('close', () => view?.setVisible(false));
  slider.addEventListener('input', () => spread(slider.value));
  document.getElementById('product-assemble').addEventListener('click', () => spread(0));
  document.getElementById('product-explode').addEventListener('click', () => spread(100));
  document.getElementById('product-to-station').addEventListener('click', () => {
    dialog.close();
    view?.setVisible(false);
    onShowPart(selected);
  });
}
