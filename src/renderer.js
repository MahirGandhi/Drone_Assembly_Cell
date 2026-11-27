import * as THREE from 'three';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';

export function makeRenderer(host,scene,maxPixelRatio) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2',{antialias:true,alpha:false});
  const renderer = context ? new THREE.WebGLRenderer({canvas,context}) : new SVGRenderer();
  if (context) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,maxPixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  } else {
    renderer.setPrecision(2);
    renderer.setQuality('low');
    scene.add(new THREE.AmbientLight(0x77818b,.58));
  }
  host.append(renderer.domElement);
  return {renderer,webgl:Boolean(context)};
}
