export const stages = [
  {id:'kit', name:'Kitting', detail:'Verify incoming parts and stage a frame kit.'},
  {id:'prep', name:'Preparation', detail:'Build the lower-plate subassembly and stage hardware.'},
  {id:'assembly', name:'Assembly cell', detail:'Seat the arms and plates, route leads and reconcile 16 joints.'},
  {id:'inspection', name:'Outgoing inspection', detail:'Check the assembled frame and route the first-pass result.'},
  {id:'rework', name:'Rework & recheck', detail:'Correct and reinspect diverted frames in a dedicated modeled step.'},
];

export const components = [
  {id:'top', name:'Upper frame plate', quantity:1, route:['kit','assembly','inspection'], scope:'Frame', detail:'Closes the center stack after arm leads are parked.'},
  {id:'base', name:'Lower frame plate', quantity:1, route:['kit','prep','assembly','inspection'], scope:'Frame', detail:'Carries the prepared equipment mounts and locates the arm roots.'},
  {id:'roots', name:'Arm-root connectors', quantity:4, route:['kit','assembly','inspection'], scope:'Purchased arm module', detail:'Locate the arm tubes between the frame plates.'},
  {id:'tubes', name:'Arm tubes', quantity:4, route:['kit','assembly','inspection'], scope:'Purchased arm module', detail:'Connect the center stack to the motor mounts.'},
  {id:'mounts', name:'Motor bases', quantity:4, route:['kit','assembly','inspection'], scope:'Purchased arm module', detail:'Support the motors at the outboard ends.'},
  {id:'motors', name:'Motors', quantity:4, route:['kit','assembly','inspection'], scope:'Purchased arm module', detail:'Arrive with the arms. The frame cell handles the complete modules.'},
  {id:'esc', name:'ESCs & leads', quantity:4, route:['kit','assembly','inspection'], scope:'Purchased arm module', detail:'Arrive with the arms. The operator parks their leads before closure.'},
  {id:'screws', name:'Frame screws', quantity:16, route:['kit','assembly','inspection'], scope:'Frame', detail:'Presented one at a time. Each screw has an individual joint record.'},
  {id:'nuts', name:'Flange locknuts', quantity:16, route:['kit','assembly','inspection'], scope:'Frame', detail:'Loaded into retained fixture positions before closure and fastening.'},
  {id:'rails', name:'Slide rails & supports', quantity:2, route:['kit','prep','inspection'], scope:'Lower subassembly', detail:'Prepared upstream of the cell and shown as left and right assemblies.'},
  {id:'batteryDeck', name:'Battery deck & pad', quantity:1, route:[], scope:'Downstream installation', detail:'Shown with the product. The line simulation ends at accepted frame output.'},
  {id:'deck', name:'Accessory platform', quantity:1, route:[], scope:'Downstream installation', detail:'Provides a mounting platform for ancillary electronics.'},
  {id:'landing', name:'Landing gear assemblies', quantity:2, route:['kit','prep','inspection'], scope:'Lower subassembly', detail:'Each side groups the uprights, crossbar and tee fittings for viewing.'},
  {id:'power', name:'Power distribution & module', quantity:1, route:['kit','prep','assembly','inspection'], scope:'Lower subassembly', detail:'The prepared lower assembly carries the power hardware and lead routing.'},
  {id:'props', name:'Propeller assemblies', quantity:4, route:[], scope:'Downstream installation', detail:'Paired rotors shown with retainers for product context.'},
  {id:'controller', name:'Flight controller', quantity:1, route:[], scope:'Downstream installation', detail:'Represents the controller bundle used in the reference kit variant.'},
  {id:'gps', name:'GPS module & mount', quantity:1, route:[], scope:'Downstream installation', detail:'Shown on its mount above the equipment platform.'},
  {id:'radio', name:'Telemetry radio', quantity:1, route:[], scope:'Downstream installation', detail:'Represents the radio option in the selected development-kit variant.'},
];
