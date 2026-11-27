import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeRenderer } from './renderer.js';
import geometry from '../data/reference-geometry.json';
import { components } from './product.js';

const vector = (x, y, z) => new THREE.Vector3(x, y, z);
const material = (color, metalness = .16) => new THREE.MeshStandardMaterial({ color, metalness, roughness:.48 });
const carbon = material(0x343e46, .38);
const polymer = material(0x415668);
const machined = material(0xadbbc5, .67);
const accent = material(0x648eb5);
const copper = material(0xbf7351, .42);
const board = material(0x287575);
const tire = material(0x202830);
const selectedMaterial = material(0xc4ee8b, .25);
const propMaterial = material(0x8299ad);
const directions = [[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z]) => vector(x,0,z).normalize());

function mesh(parent, shape, finish, x, y, z) {
  const object = new THREE.Mesh(shape, finish);
  object.position.set(x,y,z);
  parent.add(object);
  return object;
}

function box(parent, w, h, d, finish, x = 0, y = 0, z = 0) {
  return mesh(parent, new THREE.BoxGeometry(w,h,d), finish, x,y,z);
}

function cylinder(parent, r, h, finish, x = 0, y = 0, z = 0, faces = 24) {
  return mesh(parent, new THREE.CylinderGeometry(r,r,h,faces), finish, x,y,z);
}

function rod(parent, from, to, radius, finish) {
  const delta = to.clone().sub(from);
  const center = from.clone().lerp(to,.5);
  const object = cylinder(parent,radius,delta.length(),finish,...center);
  object.quaternion.setFromUnitVectors(vector(0,1,0),delta.normalize());
}

function profile(parent, points, thickness, finish, holes = []) {
  const shape = new THREE.Shape(points.map(([x,z]) => new THREE.Vector2(x,-z)));
  for (const [x,z,radius] of holes) {
    const hole = new THREE.Path();
    hole.absarc(x,-z,radius,0,2*Math.PI,true);
    shape.holes.push(hole);
  }
  const body = mesh(parent,new THREE.ExtrudeGeometry(shape, {depth:thickness,bevelEnabled:false,curveSegments:12}),finish,0,0,0);
  body.rotation.x = -Math.PI/2;
}

export function createProductView(host, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141c27);
  scene.add(new THREE.HemisphereLight(0xe9f3ff,0x6b829a,2.1));
  const light = new THREE.DirectionalLight(0xf5f0e5,2.5);
  light.position.set(-2,4,3);
  scene.add(light);

  const {renderer,webgl} = makeRenderer(host,scene,1.75);
  renderer.domElement.classList.add('product-render');
  renderer.domElement.setAttribute('aria-hidden','true');

  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.01,25);
  const controls = new OrbitControls(camera,renderer.domElement);
  controls.enableDamping = webgl;
  controls.minZoom = .85;
  controls.maxZoom = 4;
  let hostVisible = true;
  let selected = null;
  let amount = .8;
  let targetAmount = .8;
  let animation = 0;
  let needsRender = true;
  controls.addEventListener('change',() => { needsRender = true; });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const objects = [];
  const partsById = new Map(components.map(component => [component.id,[]]));

  function part(id, position, offset, draw, rotation = 0) {
    const group = new THREE.Group();
    group.rotation.y = rotation;
    draw(group);
    group.traverse(object => {
      if (object.isMesh) {
        object.userData.partId = id;
        object.userData.finish = object.material;
        partsById.get(id).push(object);
      }
    });
    objects.push({group,position,offset});
    group.position.copy(position).addScaledVector(offset,amount);
    scene.add(group);
  }

  const axes = geometry.joints.map(joint => joint.axis_xz_mm.map(value => value/1000));
  const upper = [[-.072,-.087],[.072,-.087],[.095,-.056],[.095,.058],[.072,.081],[.043,.073],[-.043,.073],[-.072,.081],[-.095,.058],[-.095,-.056]];
  const lower = [[-.074,-.093],[.074,-.093],[.097,-.061],[.097,.059],[.065,.087],[-.065,.087],[-.097,.059],[-.097,-.061]];
  const holes = axes.map(([x,z]) => [x,z,.0024]);
  part('top',vector(0,.035,0),vector(0,.17,0),group => {
    profile(group,upper,.0038,carbon,[...holes,[0,-.038,.012],[0,.034,.012]]);
    box(group,.049,.0015,.004,accent,0,.004,-.069);
  });
  part('base',vector(0,0,0),vector(0,-.11,0),group => profile(group,lower,.004,carbon,holes));
  part('screws',vector(0,.038,0),vector(0,.245,0),group => {
    for (const [x,z] of axes) {
      cylinder(group,.0038,.0055,machined,x,.003,z,12);
      cylinder(group,.0018,.041,machined,x,-.019,z,10);
    }
  });
  part('nuts',vector(0,-.003,0),vector(0,-.173,0),group => {
    for (const [x,z] of axes) {
      cylinder(group,.0047,.002,machined,x,-.001,z,12);
      cylinder(group,.0041,.004,machined,x,-.003,z,6);
    }
  });

  for (const [index, direction] of directions.entries()) {
    const rotation = -Math.atan2(direction.z,direction.x);
    const root = direction.clone().multiplyScalar(.073).add(vector(0,.018,0));
    const motor = direction.clone().multiplyScalar(.25).add(vector(0,.02,0));
    const span = distance => direction.clone().multiplyScalar(distance);
    part('roots',root,span(.02),group => {
      box(group,.043,.027,.042,polymer);
      box(group,.05,.005,.029,polymer,.003,.009);
    },rotation);
    part('tubes',root,span(.108),group => {
      rod(group,vector(.009,0,0),vector(.167,0,0),.009,carbon);
      rod(group,vector(.037,0,0),vector(.045,0,0),.0095,accent);
    },rotation);
    part('mounts',motor,span(.108).add(vector(0,-.053,0)),group => {
      profile(group,[[-.038,-.014],[.012,-.022],[.029,-.012],[.029,.012],[.012,.022],[-.038,.014]],.004,polymer);
      cylinder(group,.011,.011,polymer,-.032,-.003,0,12);
    },rotation);
    part('motors',motor.clone().add(vector(0,.009,0)),span(.12).add(vector(0,.046,0)),group => {
      cylinder(group,.017,.022,machined,0,.012);
      cylinder(group,.0175,.004,carbon,0,.024);
      cylinder(group,.004,.008,machined,0,.03);
      for (let vent=0;vent<6;vent++) {
        const angle = vent*Math.PI/3;
        cylinder(group,.0022,.001,carbon,.011*Math.cos(angle),.0265,.011*Math.sin(angle),8);
      }
    });
    part('esc',root.clone().add(span(.062)).add(vector(0,-.01,0)),
      span(.105).add(vector(0,-.071,0)),group => {
        box(group,.044,.008,.013,tire);
        box(group,.03,.001,.012,board,0,.005);
        for(const [z, finish] of [[-.004,copper],[.004,machined]]) {
          rod(group,vector(-.053,0,z),vector(-.022,0,z),.0015,finish);
          rod(group,vector(.022,0,z),vector(.048,0,z),.0015,finish);
        }
      },rotation);
    part('props',motor.clone().add(vector(0,.046,0)),span(.117).add(vector(0,.196,0)),group => {
      const blade = [[.008,-.006],[.047,-.015],[.093,-.014],[.117,-.005],[.113,.005],[.091,.009],[.048,.007],[.008,.004]];
      profile(group,blade,.0026,propMaterial);
      profile(group,blade.map(([x,z]) => [-x,-z]),.0026,propMaterial);
      cylinder(group,.011,.006,polymer);
      cylinder(group,.0045,.004,machined,0,.005);
    },rotation + (index%2 ? .31 : -.31));
  }

  for (const side of [-1,1]) {
    part('rails',vector(side*.048,-.012,0),vector(side*.038,-.192,0),group => {
      rod(group,vector(0,0,-.13),vector(0,0,.13),.0045,machined);
      for (const z of [-.056,.056]) box(group,.019,.019,.024,polymer,0,.005,z);
    });
    part('landing',vector(side*.061,-.012,0),vector(side*.075,-.275,0),group => {
      const end = side*.068;
      for (const z of [-.077,.077]) {
        rod(group,vector(0,0,z),vector(end,-.122,z),.0065,carbon);
        box(group,.023,.013,.021,polymer,end,-.122,z);
      }
      rod(group,vector(end,-.122,-.15),vector(end,-.122,.15),.0058,carbon);
      for (const z of [-.151,.151]) {
        cylinder(group,.007,.013,tire,end,-.122,z).rotation.x = Math.PI/2;
      }
    });
  }
  part('batteryDeck',vector(0,-.022,.048),vector(-.13,-.273,.12),group => {
    profile(group,[[-.049,-.076],[.049,-.076],[.056,-.065],[.056,.072],[-.056,.072],[-.056,-.065]],.004,polymer);
    box(group,.085,.006,.099,tire,0,.006,.01);
    for (const z of [-.027,.039]) box(group,.12,.005,.012,machined,0,.009,z);
  });
  part('deck',vector(0,-.024,-.11),vector(.09,-.21,-.14),group => {
    box(group,.11,.004,.082,carbon);
    for (const x of [-.043,.043]) box(group,.013,.008,.078,polymer,x,.006);
  });
  part('power',vector(0,.006,.002),vector(.027,-.043,.081),group => {
    box(group,.047,.004,.053,board);
    box(group,.018,.007,.018,tire,0,.005,.005);
    for(const x of [-.017,.017]) for(const z of [-.019,.019]) box(group,.006,.003,.01,copper,x,.004,z);
    box(group,.02,.008,.014,copper,0,.005,.032);
  });
  part('controller',vector(0,.046,0),vector(.075,.266,.043),group => {
    box(group,.055,.016,.046,polymer);
    box(group,.045,.002,.034,machined,0,.008);
    for(const x of [-.015,0,.015]) box(group,.008,.006,.004,tire,x,0,.024);
  });
  part('gps',vector(0,.044,-.061),vector(-.049,.335,-.076),group => {
    cylinder(group,.007,.075,machined,0,.039);
    cylinder(group,.027,.011,polymer,0,.08);
    cylinder(group,.023,.004,accent,0,.087);
  });
  part('radio',vector(.06,.044,.04),vector(.15,.169,.105),group => {
    box(group,.034,.011,.019,accent);
    rod(group,vector(.015,0,0),vector(.059,.009,0),.0022,tire);
  });

  const aids = new THREE.Group();
  const guides = [];
  const guideMaterial = new THREE.LineDashedMaterial({color:0x8ba9ba,transparent:true,opacity:.43,dashSize:.012,gapSize:.01});
  scene.add(aids);
  for (const [x,z] of axes.filter((_, index) => [0,3,12,15].includes(index))) {
    const shape = new THREE.BufferGeometry().setFromPoints([vector(x,0,z),vector(x,0,z)]);
    const guide = new THREE.Line(shape,guideMaterial);
    guide.frustumCulled = false;
    guides.push(guide);
    aids.add(guide);
  }

  function fit() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const aspect = width/height;
    const half = Math.max(.56,.57/aspect);
    Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    needsRender = true;
  }

  function setCamera(mode) {
    controls.target.set(0,.008,0);
    camera.position.copy(mode === 'top' ? vector(0,2,.001) : vector(.72,.84,1.35));
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function select(id) {
    for (const object of partsById.get(selected) ?? []) object.material = object.userData.finish;
    for (const object of partsById.get(id) ?? []) object.material = selectedMaterial;
    selected = id;
    needsRender = true;
  }

  const ray = new THREE.Raycaster();
  let pointerStart;
  renderer.domElement.addEventListener('pointerdown',event => {
    if (event.isPrimary && event.button === 0) pointerStart = [event.clientX,event.clientY];
  });
  renderer.domElement.addEventListener('pointercancel',() => { pointerStart = null; });
  renderer.domElement.addEventListener('pointerup',event => {
    if (!event.isPrimary || event.button !== 0 || !pointerStart) return;
    const [x,y] = pointerStart;
    pointerStart = null;
    if (Math.hypot(event.clientX-x,event.clientY-y)>6) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x-bounds.left)/bounds.width*2-1,1-(y-bounds.top)/bounds.height*2),camera);
    const [hit] = ray.intersectObjects(scene.children,true).filter(result => result.object.userData.partId);
    if (hit) onSelect(hit.object.userData.partId);
  });

  function updateGuide(guide) {
    const positions = guide.geometry.attributes.position;
    positions.setY(0,-.004-.174*amount);
    positions.setY(1,.04+.24*amount);
    positions.needsUpdate = true;
    guide.computeLineDistances();
  }

  guides.forEach(updateGuide);

  function render() {
    if (!hostVisible) return;
    const remaining = targetAmount-amount;
    if (remaining !== 0) {
      amount = !webgl || reducedMotion.matches || Math.abs(remaining)<.001 ? targetAmount : amount + remaining*.17;
      for (const {group,position,offset} of objects) group.position.copy(position).addScaledVector(offset,amount);
      aids.visible = amount>.07;
      for (const guide of guides) updateGuide(guide);
      needsRender = true;
    }
    controls.update();
    if (needsRender) {
      renderer.render(scene,camera);
      needsRender = false;
    }
    animation = requestAnimationFrame(render);
  }

  function setVisible(visible) {
    if (hostVisible === visible) return;
    hostVisible = visible;
    if (visible) {
      fit();
      animation = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animation);
    }
  }

  new ResizeObserver(fit).observe(host);
  fit();
  setCamera('iso');
  animation = requestAnimationFrame(render);
  return {setCamera,select,setVisible,setExplosion(value) { targetAmount = value; }};
}
