export const recipe = 'FRAME-DEMO-01';
export const faults = {
  identity: ['Wrong arm identity', 'arm2'],
  closure: ['Plate seating obstructed', 'top'],
  nut: ['Missing retained nut', 'clamp'],
  clamp: ['Clamp feedback absent', 'clamp'],
  jam: ['Screw presentation timeout', 'pick'],
  cross: ['Early resistance during rundown', 'run'],
  spin: ['Nut spins during tightening', 'tighten'],
  stale: ['Mismatched tool result', 'tighten'],
  inspection: ['Invalid inspection result', 'inspect'],
  output: ['Output pallet full', 'unload'],
};
export const parts = ['base','arm0','arm1','arm2','arm3','top'];
export const jointOrder = [0,15,4,11, 1,14,5,10, 2,13,6,9, 3,12,7,8];
export const gripFraction=.22;
const task = (key, label, duration, resource, joint) => ({key, label, duration, resource, joint});

export function makeCycle(auto) {
  const handling = auto ? 'robot' : 'operator';
  const operations=[
    task('prepare','Load retained nuts',8,'operator'),
    ...parts.slice(0,5).map((p,i) => task(p,i ? 'Seat arm '+i : 'Seat lower plate',auto ? 4 : 8,handling)),
    task('wire','Park and inspect arm leads',16,'operator'),
    task('top','Seat upper plate',auto ? 4 : 8,handling),
    task('clamp','Confirm fixture clamps',2,'fixture'),
    task('dock','Acquire screwdriver',5,'robot'),
    ...jointOrder.flatMap(j => [
      task('pick','Present screw',1.8,'robot',j),
      task('move','Approach joint',2,'robot',j),
      task('run','Engage and run down',1.6,'robot',j),
      task('tighten','Tighten and read feedback',1.2,'robot',j),
    ]),
    task('inspect','Reconcile joints and inspect frame',7,'inspection'),
    task('undock','Return screwdriver',4,'robot'),
    task('unload','Transfer frame to output',auto ? 5 : 9,handling),
  ];
  const route=[];
  for (let index=0;index<operations.length;index++) {
    const step=operations[index];
    if (step.resource==='operator' && operations[index-1]?.resource!=='operator') {
      route.push(task('park','Park tool and inhibit automatic motion',2,'robot'),
        task('enter','Open access for operator work',2,'operator'));
    }
    route.push(step);
    if (step.resource==='operator' && operations[index+1]?.resource!=='operator') {
      route.push(task('exit','Operator exits and closes access',2,'operator'),
        task('resetAccess','Verify access reset before automatic work',1,'fixture'));
    }
  }
  return route;
}

export class Cell {
  constructor({auto=true, fault='', guided=false}={}) {
    this.auto=auto;
    this.guided=guided;
    this.fault=fault;
    this.faultUsed=false;
    this.cycle=makeCycle(auto);
    this.index=0;
    this.elapsed=0;
    this.time=0;
    this.status='ready';
    this.history=[];
    this.attempts=[];
    this.accepted=new Set();
    this.stock={frames:2,screws:32,nuts:32};
    this.output=0;
    this.outputLimit=fault==='output'?0:2;
    this.scrap=0;
    this.nuts=Array(16).fill('tray');
    this.lostNuts=0;
    this.serial=1;
    this.parts=Object.fromEntries(parts.map(p=>[p,'tray']));
    this.clamped=false;
    this.driver=false;
    this.inFlight=false;
    this.accessOpen=false;
    this.operatorAccess=false;
    this.stopLatched=false;
    this.held=null;
    this.screw=null;
  }
  get op() {return this.cycle[this.index];}
  get canStart() {
    return ['ready','paused'].includes(this.status) && !this.stopLatched &&
      (!this.accessOpen || (this.operatorAccess && this.op?.resource==='operator'));
  }
  log(type, text, details={}) {
    this.history.push({time:+this.time.toFixed(3),serial:this.serial,type,text,...details});
  }
  openAccess() {
    if (['running','waiting'].includes(this.status)) return false;
    this.accessOpen=true;
    this.log('access','Gate opened');
    return true;
  }
  closeAccess() {
    if (!this.accessOpen || (this.operatorAccess && ['running','waiting'].includes(this.status))) return false;
    this.accessOpen=false;
    this.log('access','Gate closed');
  }
  start() {
    if (!this.canStart) return false;
    const resumed=this.status==='paused';
    if (this.operatorAccess && !this.accessOpen && this.op?.resource==='operator') {
      this.accessOpen=true;
      this.log('access','Stopped-state operator re-entry confirmed before resuming work');
    }
    this.status='running';
    this.log('control',resumed?'Cycle resumed':'Cycle start');
    this.tick(0);
    return true;
  }
  stop() {
    if (['running','waiting'].includes(this.status)) {
      this.status='paused';
      this.log('control','Cycle paused. State retained.');
    }
  }
  emergencyStop() {
    this.stop();
    this.stopLatched=true;
    this.log('control','Emergency stop latched. Acknowledge and restart separately.');
  }
  acknowledgeStop() {
    if (this.accessOpen || !this.stopLatched) return false;
    this.stopLatched=false;
    this.log('control','Emergency stop acknowledged');
    return true;
  }
  confirm() {
    if (this.status!=='waiting' || this.stopLatched || (this.accessOpen && !this.operatorAccess)) return false;
    this.status='running';
    this.log('operator','Operator authorized '+this.op.label.toLowerCase());
    return this.issue();
  }
  trip(reason,stage=this.op?.key) {
    this.status='held';
    this.held={reason,stage,joint:this.op?.joint};
    this.log('held',reason,this.held);
  }
  issue() {
    if (this.accessOpen && this.op.resource!=='operator') {
      this.trip('Automatic work inhibited while access is open');
      return false;
    }
    if (this.op.resource==='operator' && !['enter'].includes(this.op.key) &&
      (!this.accessOpen || !this.operatorAccess)) {
      this.trip('Operator access has not been established');
      return false;
    }
    this.log('command',this.op.label,{joint:this.op.joint, recipe});
    if (this.op.key==='unload') {
      if (this.output>=this.outputLimit) {
        if (this.fault==='output') this.faultUsed=true;
        this.trip('Output pallet full');
        return false;
      }
      if (!this.clamped || this.driver || this.accepted.size!==16 || parts.some(p=>this.parts[p]!=='fixture')) {
        this.trip('Transfer prerequisites missing');
        return false;
      }
    }
    this.inFlight=true;
    return true;
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt<0) throw new RangeError('Invalid time increment');
    while (this.status==='running') {
      if (!this.inFlight) {
        if (this.guided && this.op.resource==='operator') {
          this.status='waiting';
          this.log('wait',this.op.label);
          return;
        }
        if (!this.issue()) return;
      }
      const acquiringFrame=this.op.key==='unload' && this.clamped;
      const nextFeedback=acquiringFrame?this.op.duration*gripFraction:this.op.duration;
      const used=Math.min(dt,nextFeedback-this.elapsed);
      this.elapsed+=used;
      this.time+=used;
      dt-=used;
      if (this.elapsed + 1e-9 < nextFeedback) return;
      if (acquiringFrame) {
        this.clamped=false;
        for (const key of parts) this.parts[key]=this.op.resource;
        this.log('feedback','Modeled grip confirmed. Fixture released to '+this.op.resource+'.');
        continue;
      }
      this.inFlight=false;
      this.elapsed=0;
      if (!this.complete()) return;
      this.index++;
      if (!this.op) {
        this.status='complete';
        this.log('accepted','Frame transferred to accepted output');
        return;
      }
    }
  }
  complete() {
    const {key,joint,label}=this.op;
    if (!this.faultUsed && faults[this.fault]?.[1]===key) {
      this.faultUsed=true;
      if (key==='tighten' || key==='run') this.record(false,faults[this.fault][0]);
      if (this.fault==='nut') {this.nuts[0]='missing';this.lostNuts++;this.log('material','Nut at J01 unaccounted for');}
      this.trip(faults[this.fault][0]);
      return false;
    }
    let error;
    if (key==='enter') {
      this.accessOpen=true;
      this.operatorAccess=true;
      this.log('access','Modeled stopped-state feedback permits operator access');
    }
    if (key==='exit') {
      this.accessOpen=false;
      this.operatorAccess=false;
      this.log('access','Operator exit and gate-closed feedback recorded');
    }
    if (key==='resetAccess' && this.accessOpen) error='Access is open';
    if (key==='prepare') {
      if (this.stock.frames<1 || this.stock.nuts<16 || this.stock.screws<16) error='Material shortage';
      else {this.stock.frames--;this.stock.nuts-=16;this.nuts.fill('fixture');}
    }
    if (parts.includes(key)) {
      if (this.parts[key]!=='tray') error='Invalid part ownership';
      else this.parts[key]='fixture';
    }
    if (key==='clamp') {
      if (parts.some(p=>this.parts[p]!=='fixture') || this.nuts.includes('missing')) error='Fixture is incomplete';
      else this.clamped=true;
    }
    if (key==='dock') this.driver=true;
    if (key==='pick') {
      if (this.stock.screws<1 || this.screw!==null) error='Screw unavailable';
      else {this.stock.screws--;this.screw=joint;}
    }
    if (['run','tighten'].includes(key) && (!this.clamped || !this.driver || this.screw!==joint))
      error='Missing clamp, tool or screw confirmation';
    if (key==='tighten' && !error) {
      if (this.accepted.has(joint)) error='Duplicate joint acceptance';
      else if(this.nuts[joint]!=='fixture') error='Retained nut not confirmed';
      else {this.record(true,'Modeled feedback accepted');this.accepted.add(joint);this.nuts[joint]='joint';this.screw=null;}
    }
    if (key==='inspect' && this.accepted.size!==16) error='Incomplete joint evidence';
    if (key==='undock') this.driver=false;
    if (key==='unload') {
      if (this.output>=this.outputLimit) error='Output pallet full';
      else if (this.clamped || this.driver || this.accepted.size!==16 ||
        parts.some(p=>this.parts[p]!==this.op.resource)) error='Transfer prerequisites missing';
      else {
        for (const p of parts) this.parts[p]='output';
        this.output++;
      }
    }
    if (error) {this.trip(error);return false;}
    this.log('feedback',label+' confirmed',{joint,recipe});
    return true;
  }
  record(ok,reason) {
    const joint=this.op.joint;
    const attempt=this.attempts.filter(x=>x.joint===joint).length+1;
    this.attempts.push({serial:this.serial,joint,attempt,recipe,result:ok?'accepted':'failed',reason});
  }
  recover() {
    if (this.status!=='held' || !this.accessOpen) return false;
    if (this.held.reason==='Output pallet full') this.outputLimit=this.output+2;
    if (this.held.reason==='Material shortage') {
      this.stock.frames+=2;this.stock.screws+=32;this.stock.nuts+=32;
    }
    if (this.nuts.includes('missing')) {
      if (this.stock.nuts<1) return false;
      this.stock.nuts--;
      this.nuts[this.nuts.indexOf('missing')]='fixture';
      this.log('material','Replace missing fixture nut from stock');
    }
    if (this.screw!==null && ['run','tighten'].includes(this.held.stage)) {
      this.scrap++;
      this.screw=null;
      this.index=this.cycle.findIndex(o=>o.key==='pick' && o.joint===this.held.joint);
      this.log('rework','Discard rejected screw and restart this joint');
    }
    this.log('recovery','Operator confirmed corrective action. Close gate and restart.');
    if (this.op?.resource==='operator' && this.op.key!=='enter' && !this.operatorAccess) {
      this.index=this.cycle.findLastIndex((step,index)=>index<this.index && step.key==='enter');
    }
    this.status='paused';
    this.held=null;
    return true;
  }
  report() {
    return {recipe,auto:this.auto,guided:this.guided,status:this.status,serial:this.serial,time:this.time,stock:this.stock,
      parts:this.parts,retainedNuts:this.nuts,lostNuts:this.lostNuts,output:this.output,scrap:this.scrap,joints:this.attempts,events:this.history};
  }
}
