import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import geometry from '../data/reference-geometry.json';
import {gripFraction,jointOrder,parts} from './cell.js';
import {SVGObject} from 'three/addons/renderers/SVGRenderer.js';
import {makeRenderer} from './renderer.js';
import asset from '../data/asset-manifest.json';

const V=(x,y,z)=>new T.Vector3(x,y,z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mat=(color,metalness=.15,roughness=.58)=>new T.MeshStandardMaterial({color,metalness,roughness});
const steel=mat(0x9ba9ad,.55), dark=mat(0x222b33), black=mat(0x14191e), carbon=mat(0x273038,.36);
const orange=mat(0xe27b2d), yellow=mat(0xf4bd3b), blue=mat(0x346983), rubber=mat(0x111416);
const white=mat(0xd7ded9), green=mat(0x9deb62), red=mat(0xff5544), table=mat(0x65757b,.32), glass=mat(0x48565d);

function solid(parent,geo,material,x,y,z,shadow=true) {
  const mesh=new T.Mesh(geo,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=shadow;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}
const box=(p,x,y,z,w,h,d,m,s)=>solid(p,new T.BoxGeometry(w,h,d),m,x,y,z,s);
const cyl=(p,x,y,z,r,h,m,n=24)=>solid(p,new T.CylinderGeometry(r,r,h,n),m,x,y,z);
function line(p,a,b,radius,m,sides=12) {
  const vec=b.clone().sub(a);
  const mesh=cyl(p,0,0,0,radius,1,m,sides);
  setLine(mesh,a,b);
  return mesh;
}
function setLine(mesh,a,b) {
  const vec=b.clone().sub(a);
  mesh.position.copy(a).addScaledVector(vec,.5);
  mesh.scale.y=Math.max(.0001,vec.length());
  mesh.quaternion.setFromUnitVectors(V(0,1,0),vec.normalize());
}

export function createView(host,onAssetStatus=()=>{}) {
  const scene=new T.Scene();
  scene.background=new T.Color(0x30363c);
  const {renderer,webgl}=makeRenderer(host,scene,1.45);
  Object.assign(renderer.domElement.style,{width:'100%',height:'100%',display:'block',touchAction:'none'});
  if (webgl) {
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFShadowMap;
    renderer.toneMappingExposure=1.23;
  }
  const camera=new T.OrthographicCamera(-4,4,3,-3,.1,70);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=webgl;
  controls.minZoom=.65;
  controls.maxZoom=5;
  controls.maxPolarAngle=Math.PI/2.3;
  scene.add(new T.HemisphereLight(0xe4eeff,0x5f5953,2.2));
  const sun=new T.DirectionalLight(0xfff1df,2.5);
  sun.position.set(-3,7,4);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:24});
  sun.shadow.bias=-.00035;
  scene.add(sun);

  const ground=box(scene,0,-.05,0,25,.1,25,mat(0x53595a),false);
  const grid=new T.GridHelper(24,48,0x535a5c,0x505658);grid.position.y=.001;scene.add(grid);
  if (!webgl) {
    // Vector rendering sorts whole polygons, so floor layers draw before equipment.
    ground.renderOrder=-4;
    grid.renderOrder=-3;
    grid.material.color.setHex(0x666b6b);
    grid.material.vertexColors=false;
  }
  const station=new T.Group();
  const layout=new T.Group();
  layout.visible=false;
  scene.add(station,layout);
  let needsRender=true;
  let lastRender=-Infinity;
  let motionDirty=false;
  let lastStatus;
  let lastAccess;
  let lastStop;
  let lastTime;
  let cameraMode='top';
  let snapshot;
  let layoutColumns=1;
  let layoutRows=1;
  controls.addEventListener('change',()=>{needsRender=true;});
  const cellFloor=box(station,0,.004,0,6.7,.008,4.55,mat(0x676969),false);
  if (!webgl) cellFloor.renderOrder=-2;
  const corners=[[-3.35,-2.27],[3.35,-2.27],[3.35,2.27],[-3.35,2.27]];
  corners.forEach(([x,z],i)=>{
    const [a,b]=corners[(i+1)%4];
    const beam=box(station,(x+a)/2,.012,(z+b)/2,Math.abs(x-a)||.045,.006,Math.abs(z-b)||.045,yellow,false);
    beam.castShadow=false;
    if (!webgl) beam.renderOrder=-1;
  });
  for (let i=0;i<13;i++) {
    const stripe=box(station,-.65+i*.105,.016,2.5,.045,.002,.36,yellow,false);stripe.rotation.y=.45;
  }
  // Guarding with a separate front access opening.
  const fence=(a,b)=>{
    for(const height of [.36,1.57]) line(station,V(a[0],height,a[1]),V(b[0],height,b[1]),.019,dark);
    for(let t=0;t<=1.001;t+=.055) {
      const x=T.MathUtils.lerp(a[0],b[0],t),z=T.MathUtils.lerp(a[1],b[1],t);
      line(station,V(x,.36,z),V(x,1.57,z),.003,glass,5);
    }
    for(const [x,z] of [a,b]) box(station,x,.81,z,.067,1.62,.067,dark);
  };
  fence([-3.3,-2.2],[3.3,-2.2]);fence([-3.3,-2.2],[-3.3,2.14]);fence([3.3,-2.2],[3.3,2.14]);
  fence([-3.3,2.14],[-.85,2.14]);fence([.85,2.14],[3.3,2.14]);
  const gate=new T.Group();station.add(gate);gate.position.set(-.85,0,2.14);
  for(const x of [0,1.67]) box(gate,x,.79,0,.059,1.58,.06,yellow);
  for(const y of [.35,1.53]) box(gate,.835,y,0,1.67,.035,.045,yellow);
  for(let x=.08;x<1.65;x+=.095) box(gate,x,.94,0,.008,1.17,.008,glass);

  function bench(x,z,w,d) {
    box(station,x,.82,z,w,.08,d,table);
    for (const dx of [-1,1]) for(const dz of [-1,1]) {
      box(station,x+dx*(w/2-.07),.39,z+dz*(d/2-.07),.065,.78,.065,dark);
      box(station,x+dx*(w/2-.07),.04,z+dz*(d/2-.07),.11,.04,.11,rubber);
    }
    box(station,x,.29,z,w-.1,.04,d-.1,dark);
  }
  bench(-1.63,.35,1.65,1.26);
  bench(.17,.3,1.77,1.53);
  bench(1.86,.54,1.16,1.14);
  bench(1.52,-.7,1.18,.58);
  // Actual vendor geometry remains a local input. Nominal fixture and part display meshes are proxies.
  const fx=.15,fz=.4,fy=1.09;
  box(station,fx,.877,fz,.68,.035,.57,steel);
  for(const x of [-.25,.25]) for(const z of [-.21,.21]) {
    box(station,fx+x,.983,fz+z,.035,.208,.037,steel);
    box(station,fx+x,1.078,fz+z,.056,.018,.058,dark);
  }
  box(station,fx,.99,fz,.22,.022,.23,dark);
  for (const x of [-.045,.045]) for (const z of [-.045,.045])
    cyl(station,fx+x,1.045,fz+z,.008,.09,steel);
  const clamps=[];
  for(const sign of [-1,1]){
    box(station,fx+sign*.29,.94,fz,.085,.115,.1,blue);
    const lever=box(station,fx+sign*.29,1.045,fz,.15,.022,.026,orange);
    const toe=box(station,fx+sign*.23,1.09,fz,.024,.09,.027,steel);
    clamps.push({lever,toe,sign});
  }
  const jointLocations=geometry.joints.map(j=>V(fx+j.axis_xz_mm[0]/1000,fy+.035,fz+j.axis_xz_mm[1]/1000));
  const nutMarkers=jointLocations.map(v=>cyl(station,v.x,fy-.007,v.z,.006,.012,steel,6));
  const indicators=jointLocations.map(v=>cyl(station,v.x,v.y,v.z,.004,.004,white,12));
  const workRing=solid(station,new T.RingGeometry(.88,1,32),
    new T.MeshBasicMaterial({color:0x63e1f0,depthTest:false,side:T.DoubleSide}),0,0,0,false);
  workRing.rotation.x=-Math.PI/2;
  workRing.renderOrder=8;
  workRing.receiveShadow=false;
  function plate(width,height) {
    const group=new T.Group();
    const pts=[[-.05,-.0718],[.05,-.0718],[.0718,-.05],[.0718,.05],[.05,.0718],[-.05,.0718],[-.0718,.05],[-.0718,-.05]];
    const shape=new T.Shape(pts.map(([x,z])=>new T.Vector2(x,z)));
    geometry.joints.forEach(j=>{
      const hole=new T.Path();hole.absarc(j.axis_xz_mm[0]/1000,j.axis_xz_mm[1]/1000,.0018,0,Math.PI*2,true);shape.holes.push(hole);
    });
    const mesh=solid(group,new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:5}),carbon,0,0,0);
    mesh.rotation.x=Math.PI/2;
    box(group,0,.002,-.057,width,.001,.003,white);
    return group;
  }
  const objects={};
  const inputs={
    base:V(-2.05,.888,.18),top:V(-2.05,.899,.53),
    arm0:V(-1.8,.895,-.03),arm1:V(-1.47,.895,-.03),arm2:V(-1.8,.895,.56),arm3:V(-1.47,.895,.56)
  };
  const placement={base:V(fx,fy,fz),top:V(fx,fy+.032,fz)};
  const angles=[-2.356,-.785,2.356,.785];
  for(const key of ['base','top']) {
    objects[key]=plate(.032,.002);
    station.add(objects[key]);
  }
  for(let i=0;i<4;i++){
    const obj=new T.Group();station.add(obj);
    line(obj,V(0,0,0),V(.17,0,0),.008,carbon);
    box(obj,0,0,0,.044,.031,.033,dark);
    box(obj,.17,-.003,0,.043,.005,.037,carbon);
    cyl(obj,.17,.012,0,.015,.027,steel);
    cyl(obj,.17,.029,0,.005,.011,black);
    for(let s=0;s<6;s++){
      const a=s*Math.PI/3;
      cyl(obj,.17+.009*Math.cos(a),.026,.009*Math.sin(a),.0018,.002,black,6);
    }
    line(obj,V(-.045,-.008,.011),V(.01,-.009,.011),.0015,red,6);
    line(obj,V(-.045,-.008,.015),V(.01,-.009,.015),.0015,black,6);
    box(obj,-.044,-.008,.014,.01,.006,.009,yellow);
    objects['arm'+i]=obj;
    placement['arm'+i]=V(fx+Math.cos(angles[i])*.076,fy+.016,fz+Math.sin(angles[i])*.076);
  }
  const inputTray=V(-1.68,.868,.38);
  box(station,inputTray.x,inputTray.y,inputTray.z,1.25,.023,.9,blue);
  for(const x of [-2.29,-1.07]) box(station,x,.894,.38,.022,.06,.89,blue);
  for(const z of [-.07,.83]) box(station,-1.68,.894,z,1.22,.06,.023,blue);
  box(station,1.84,.872,.53,.92,.022,.9,blue);
  for(const x of [1.41,2.27]) box(station,x,.894,.53,.024,.062,.88,blue);
  for(const z of [.09,.97]) box(station,1.84,.894,z,.88,.062,.024,blue);
  const bin=new T.Group();bin.position.set(-2.93,0,-1.12);station.add(bin);
  box(bin,0,.10,0,.59,.2,.42,blue);
  box(bin,0,.203,0,.52,.005,.35,rubber);
  onAssetStatus('Loading supply crate…');
  fetch(asset.browser.url).then(response=>{
    if (!response.ok) throw new Error('Supply crate failed to load');
    return response.json();
  }).then(mesh=>{
    if (!Array.isArray(mesh.positions)||!Array.isArray(mesh.indices)||
      mesh.positions.length!==asset.browser.vertices*3||mesh.indices.length!==asset.browser.triangles*3) {
      throw new Error('Supply crate geometry does not match the recorded asset');
    }
    bin.clear();
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(mesh.positions,3));
    g.setIndex(mesh.indices);g.computeVertexNormals();
    solid(bin,g,blue,0,0,0);
    needsRender=true;
    onAssetStatus('Supply crate loaded · display geometry');
  }).catch(error=>{
    console.error(error);
    onAssetStatus('Supply crate unavailable · placeholder shown');
  });
  // Screw rack and tool dock.
  box(station,1.35,.9,-.7,.43,.075,.33,dark);
  const feeder=jointLocations.map((_,i)=>V(1.2+i%4*.092,.953,-.82+Math.floor(i/4)*.07));
  const rackScrews=feeder.map(p=>cyl(station,p.x,p.y,p.z,.005,.036,steel,10));
  box(station,1.84,.927,-.71,.24,.128,.3,blue);
  cyl(station,1.84,1.05,-.71,.045,.16,steel);
  box(station,2.83,.68,-.27,.53,1.34,.55,white);
  box(station,2.83,.86,.012,.26,.21,.015,dark);
  box(station,2.83,.9,.024,.18,.09,.012,blue);
  cyl(station,2.86,1.42,-.25,.019,.145,steel);
  const beacon=cyl(station,2.86,1.52,-.25,.038,.075,green);
  // Articulated display arm, solved as a two-link reach model.
  const base=V(.05,.39,-.94);
  cyl(station,base.x,.12,base.z,.24,.24,dark);
  cyl(station,base.x,.3,base.z,.165,.28,orange);
  const shoulder=cyl(station,base.x,.45,base.z,.14,.1,orange);
  const elbow=cyl(station,0,0,0,.104,.19,orange);
  const wrist=cyl(station,0,0,0,.073,.13,orange);
  const upper=line(station,base,base.clone().add(V(0,1,0)),.087,orange);
  const lower=line(station,base,base.clone().add(V(0,1,0)),.066,orange);
  const cable=line(station,base,base.clone().add(V(0,1,0)),.018,dark);
  const tool=new T.Group();station.add(tool);
  box(tool,0,0,0,.071,.095,.067,dark);
  const bit=cyl(tool,0,-.089,0,.009,.092,steel);
  const heldScrew=cyl(tool,0,-.153,0,.003,.038,steel,8);
  const jaw1=box(tool,-.027,-.059,0,.019,.062,.023,steel);
  const jaw2=box(tool,.027,-.059,0,.019,.062,.023,steel);
  const home=V(.37,1.49,-.42);
  const tip=home.clone();
  const dock=V(1.84,1.17,-.71);
  const operator=new T.Group();operator.name='station-operator';station.add(operator);
  cyl(operator,0,1.25,0,.15,.37,mat(0x888f62));
  solid(operator,new T.SphereGeometry(.087,14,10),mat(0xa67b60),0,1.52,0);
  solid(operator,new T.SphereGeometry(.10,16,10,0,Math.PI*2,0,Math.PI*.52),yellow,0,1.55,0);
  const workerArms=[];
  for(const sign of [-1,1]){
    line(operator,V(sign*.069,.08,0),V(sign*.069,1.08,0),.055,dark);
    box(operator,sign*.068,.04,.038,.115,.075,.2,rubber);
    const atShoulder=V(sign*.13,1.37,0);
    const atElbow=V(sign*.17,1.17,.045);
    const atHand=V(sign*.19,1.06,.114);
    const sleeve=line(operator,atShoulder,atElbow,.046,mat(0x888f62));
    const forearm=line(operator,atElbow,atHand,.037,mat(0x99765d));
    const glove=cyl(operator,atHand.x,atHand.y,atHand.z,.043,.08,dark,10);
    workerArms.push({sign,atShoulder,sleeve,forearm,glove});
  }

  function label(text,x,z,parent=station) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=78;
    const c=canvas.getContext('2d');
    c.fillStyle='#1c242a';c.fillRect(0,0,512,78);c.strokeStyle='#82928b';c.lineWidth=3;c.strokeRect(1,1,510,76);
    c.font='600 30px sans-serif';c.fillStyle='#e0e7dc';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,40);
    let object;
    if (webgl) {
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      object=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));
      object.scale.set(.93,.143,1);
    } else {
      const SVG='http://www.w3.org/2000/svg';
      const image=document.createElementNS(SVG,'image');
      image.setAttribute('href',canvas.toDataURL());
      image.setAttribute('width','94');
      image.setAttribute('height','14');
      image.setAttribute('x','-47');
      image.setAttribute('y','-7');
      object=new SVGObject(image);
    }
    object.position.set(x,.09,z);
    object.name='floor-label';
    parent.add(object);
  }
  label('INPUT TRAYS',-1.65,1.28);
  label('ASSEMBLY FIXTURE',.15,1.31);
  label('ACCEPTED OUTPUT',1.88,1.3);
  label('TOOL DOCK',1.54,-1.28);
  label('OPERATOR ACCESS',0,2.78);

  function fit() {
    const w=host.clientWidth,h=Math.max(1,host.clientHeight);
    if (!w) return;
    const aspect=w/h;
    const half=Math.max(3.35,3.95/aspect);
    Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});
    if (cameraMode==='plan') fitPlan();
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
    needsRender=true;
  }

  function fitPlan() {
    camera.zoom=Math.min(
      (camera.right-camera.left)/(8*layoutColumns-.4),
      (camera.top-camera.bottom)/(6*layoutRows+.65),
    );
  }

  function setCamera(next) {
    cameraMode=next;
    const planning=next==='plan';
    station.visible=!planning;
    layout.visible=planning;
    controls.target.set(next==='focus'?fx:0,next==='focus'?fy:0,next==='focus'?fz:.12);
    if (planning) {
      camera.position.set(0,24,.001);
      fitPlan();
    } else {
      if(next==='iso') camera.position.set(5.3,7.2,6.5);
      else if(next==='focus') camera.position.set(1.35,3.9,2.2);
      else camera.position.set(0,10,2.38);
      camera.zoom=next==='focus'?3.3:next==='iso'?.87:1;
    }
    controls.minZoom=Math.min(.65,camera.zoom);
    camera.updateProjectionMatrix();controls.update();
    needsRender=true;
  }

  function setLayout({cells,operators,bays}) {
    if (!snapshot) return;
    layout.clear();
    layoutColumns=Math.min(cells,2);
    layoutRows=Math.ceil(cells/layoutColumns);
    for (let index=0;index<cells;index++) {
      const bay=snapshot.clone();
      const x=(index%layoutColumns-(layoutColumns-1)/2)*8;
      const z=(Math.floor(index/layoutColumns)-(layoutRows-1)/2)*6;
      bay.position.set(x,0,z);
      layout.add(bay);
      label(`CELL ${index+1} · ${bays[index].good} GOOD`,x,z-2.56,layout);
    }
    // Show the shared staff once, in the access aisle.
    for (let index=0;index<operators;index++) {
      const worker=operator.clone();
      worker.position.set((index-(operators-1)/2)*.75,0,(layoutRows-1)*3+2.72);
      layout.add(worker);
    }
    if (cameraMode==='plan') setCamera('plan');
  }

  const guides=Array.from({length:4},()=>{
    const guide=new T.Box3Helper(new T.Box3(),0xc4ec8b);
    guide.visible=false;
    guide.material.depthTest=false;
    guide.renderOrder=10;
    station.add(guide);
    return guide;
  });
  let selectedPart=null;
  function highlight(part) {
    selectedPart=part;
    needsRender=true;
  }

  function updateGuides() {
    for (const guide of guides) guide.visible=false;
    const keys={lower:['base'],upper:['top'],arms:['arm0','arm1','arm2','arm3']}[selectedPart];
    if (keys) {
      keys.forEach((key,index)=>{
        guides[index].box.setFromObject(objects[key]).expandByScalar(.025);
        guides[index].visible=true;
      });
      return;
    }
    const zone={
      screws:[V(1.35,.98,-.70),V(.45,.17,.34)],
      nuts:[V(fx,1.055,fz),V(.23,.10,.23)],
      output:[V(1.84,.93,.53),V(.96,.16,.94)],
    }[selectedPart];
    if (zone) {
      guides[0].box.setFromCenterAndSize(...zone);
      guides[0].visible=true;
    }
  }
  new ResizeObserver(fit).observe(host);fit();setCamera('top');

  function render(now,changed) {
    controls.update();
    motionDirty ||= changed;
    if (!needsRender && (!motionDirty || (!webgl && now-lastRender<100))) return;
    renderer.render(scene,camera);
    lastRender=now;
    needsRender=false;
    motionDirty=false;
  }

  function animate(cell,now=performance.now()) {
    if (cameraMode==='plan') {
      render(now,false);
      return;
    }
    const statusChanged=lastStatus!==cell.status || lastAccess!==cell.accessOpen || lastStop!==cell.stopLatched;
    const changed=statusChanged || lastTime!==cell.time;
    lastStatus=cell.status;
    lastAccess=cell.accessOpen;
    lastStop=cell.stopLatched;
    lastTime=cell.time;
    if (!changed && !needsRender) {
      render(now,false);
      return;
    }
    const op=cell.op;
    const executing=cell.inFlight;
    const f=op?clamp(cell.elapsed/op.duration,0,1):0;
    const delivery=op?.key==='unload'?1:.8;
    const carry=clamp((f-gripFraction)/(delivery-gripFraction),0,1);
    const outputOffset=V(1.68,-.16,.13);
    const transfer=V(0,0,0);
    if (cell.parts.top==='output') transfer.copy(outputOffset);
    else if (op?.key==='unload' && executing) {
      transfer.copy(outputOffset).multiplyScalar(carry);
      transfer.y+=.28*Math.sin(Math.PI*carry);
    }
    for(const key of parts){
      const obj=objects[key], placed=cell.parts[key]!=='tray', pos=placement[key];
      obj.position.copy(placed?pos:inputs[key]);
      const ai=key.startsWith('arm')?Number(key.at(-1)):-1;
      obj.rotation.y=ai<0?0:placed?-angles[ai]:0;
      if(executing && op.key===key && !placed) {
        obj.position.lerp(pos,carry);
        obj.position.y+=Math.sin(carry*Math.PI)*.26;
        if(ai>=0) obj.rotation.y=-angles[ai]*carry;
      }
      if (placed) obj.position.add(transfer);
    }
    for(let i=0;i<16;i++){
      const nut=nutMarkers[i];
      nut.visible=cell.nuts[i]==='fixture'||cell.nuts[i]==='joint';
      nut.position.set(jointLocations[i].x,fy-.007,jointLocations[i].z).add(transfer);
      const head=indicators[i];head.visible=cell.parts.top!=='tray';
      head.material=cell.held?.joint===i?red:cell.accepted.has(i)?green:white;
      head.position.copy(jointLocations[i]).add(transfer);
      rackScrews[i].visible=cell.screw!==i && !cell.accepted.has(i);
    }
    clamps.forEach(({lever,toe,sign})=>{
      lever.rotation.y=cell.clamped?0:sign*Math.PI/2;
      toe.visible=cell.clamped;
    });
    beacon.material=cell.stopLatched||cell.status==='held'?red:
      ['waiting','paused'].includes(cell.status)?yellow:green;
    gate.rotation.y=cell.accessOpen?Math.PI/2:0;
    tip.copy(home);
    if (executing) {
      if (op.resource==='robot' && (parts.includes(op.key)||op.key==='unload')) {
        const gripPoint=objects[op.key==='unload'?'top':op.key].position.clone().add(V(0,.12,0));
        const approach=op.key==='unload'?dock:home;
        if (f<gripFraction) tip.lerpVectors(approach,gripPoint,f/gripFraction);
        else if (op.key==='unload') tip.copy(gripPoint);
        else tip.copy(gripPoint).lerp(home,clamp((f-.8)/.2,0,1));
      }
      if (op.key==='dock') tip.lerp(dock,f);
      if (op.key==='pick') {
        const previous=cell.cycle[cell.index-1]?.joint;
        const from=previous===undefined?dock:jointLocations[previous].clone().add(V(0,.28,0));
        tip.lerpVectors(from,feeder[op.joint].clone().add(V(0,.17,0)),f);
        tip.y+=.27*Math.sin(Math.PI*f);
      }
      if (op.key==='move') {
        tip.lerpVectors(feeder[op.joint].clone().add(V(0,.17,0)),jointLocations[op.joint].clone().add(V(0,.28,0)),f);
        tip.y+=.27*Math.sin(Math.PI*f);
      }
      if (op.key==='run'||op.key==='tighten') {
        const lift=op.key==='run'?1-f:clamp((f-.8)/.2,0,1);
        tip.copy(jointLocations[op.joint]).add(V(0,.17+.11*lift,0));
      }
      if (op.key==='inspect'||op.key==='undock') {
        tip.copy(jointLocations[jointOrder.at(-1)]).add(V(0,.28,0));
        if (op.key==='undock') tip.lerp(dock,f);
      }
    } else if (cell.status==='complete' && cell.auto) tip.copy(objects.top.position).add(V(0,.12,0));
    const operatorWorking=executing && op.resource==='operator';
    const operatorAtOutput=cell.status==='complete' && !cell.auto;
    // All gestures use modeled step progress so a pause also holds the worker's pose.
    const workPoint=V(fx,fy+.045,fz);
    if (operatorWorking || operatorAtOutput) {
      if (operatorAtOutput || op.key==='unload') workPoint.copy(objects.top.position);
      else if (parts.includes(op.key)) workPoint.copy(objects[op.key].position);
      else if (op.key==='prepare') workPoint.copy(jointLocations[Math.min(15,Math.floor(f*16))]);
      else if (op.key==='wire') workPoint.copy(placement['arm'+Math.min(3,Math.floor(f*4))]);
      operator.position.set(workPoint.x,0,Math.max(1.15,workPoint.z+.55));
    } else operator.position.set(1.1,0,2.57);
    operator.rotation.y=Math.PI;
    for (const {sign,atShoulder,sleeve,forearm,glove} of workerArms) {
      const reach=operatorWorking || operatorAtOutput ? .5-.5*Math.cos(2*Math.PI*(f*4+(sign+1)/4)) : 0;
      const atElbow=V(sign*.18,1.13+.07*reach,.05+.2*reach);
      const atHand=V(sign*.16,1.05,.12);
      if (operatorWorking || operatorAtOutput) atHand.lerp(V(sign*.046,workPoint.y+.04,operator.position.z-workPoint.z),.4+.6*reach);
      setLine(sleeve,atShoulder,atElbow);
      setLine(forearm,atElbow,atHand);
      glove.position.copy(atHand);
    }
    workRing.visible=executing;
    if (executing) {
      workRing.position.copy(operatorWorking?workPoint:op.resource==='robot'?tip:V(fx,fy+.04,fz));
      const radius=op.joint!==undefined?.10:.22;
      workRing.scale.setScalar(radius);
    }
    const delta=tip.clone().sub(base), length=delta.length();
    const mid=base.clone().addScaledVector(delta,.5);
    const bend=V(0,1,0).addScaledVector(delta,-delta.y/(length*length)).normalize();
    mid.addScaledVector(bend,Math.sqrt(Math.max(0,1.18**2-length**2/4)));
    elbow.position.copy(mid);wrist.position.copy(tip);shoulder.position.set(base.x,.44,base.z);
    setLine(upper,shoulder.position,mid);setLine(lower,mid,tip);
    setLine(cable,mid.clone().add(V(0,.09,0)),tip.clone().add(V(0,.05,0)));
    tool.position.copy(tip).add(V(0,-.035,0));bit.visible=cell.driver;jaw1.visible=jaw2.visible=!cell.driver;
    heldScrew.visible=cell.screw!==null;
    if (!snapshot) {
      snapshot=new T.Group();
      for (const object of station.children) {
        if (object!==workRing && object.name!=='station-operator' && object.name!=='floor-label' && !guides.includes(object)) {
          snapshot.add(object.clone());
        }
      }
    }
    if (selectedPart) updateGuides();
    else for (const guide of guides) guide.visible=false;
    render(now,changed);
  }
  return {animate,setCamera,setLayout,highlight};
}
