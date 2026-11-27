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
    view?.select(id);
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === id));
    document.getElementById('product-part-name').textContent = selected.name;
    document.getElementById('product-part-purpose').textContent = selected.purpose;
  }

  for (const part of components) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${part.name} · ×${part.quantity}`;
    button.addEventListener('click', () => select(part.id));
    list.append(button);
    buttons.set(part.id, button);
  }
  select(selected.id);

  function spread(value) {
    slider.value = value;
    document.getElementById('product-spread').value = `${value}%`;
    view?.setExplosion(Number(value)/100);
  }

  document.getElementById('open-product').addEventListener('click', () => {
    dialog.showModal();
    if (view === undefined) {
      try {
        view = createProductView(host, select);
        view.select(selected.id);
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
  });
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
