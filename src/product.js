export const components = [
  {id:'base', name:'Lower frame plate', quantity:1, station:'lower', work:'The prepared lower plate is placed in the assembly fixture.',
    purpose:'Supports the landing gear and mounting rails beneath the frame.'},
  {id:'top', name:'Upper frame plate', quantity:1, station:'upper', work:'The upper plate closes the frame after the operator parks the arm leads.',
    purpose:'Holds the arm connectors against the lower plate and stiffens the frame.'},
  {id:'roots', name:'Arm-root connectors', quantity:4, station:'arms', work:'The connectors arrive in the arm modules and seat between the frame plates.',
    purpose:'Join each arm tube to the center frame and hold it in position.'},
  {id:'tubes', name:'Arm tubes', quantity:4, station:'arms', work:'The tubes arrive in four preassembled arm modules, which are loaded from the input tray.',
    purpose:'Carry the motors and transfer their loads to the center frame.'},
  {id:'mounts', name:'Motor bases', quantity:4, station:'arms', work:'The motor bases come installed on the arm modules.',
    purpose:'Secure each motor to the end of its arm.'},
  {id:'motors', name:'Motors', quantity:4, station:'arms', work:'The motors arrive with the arms. The cell handles each complete arm module.',
    purpose:'Use electrical power to spin the propellers.'},
  {id:'esc', name:'ESCs and leads', quantity:4, station:'arms', work:'The ESCs arrive with the arms. The operator parks their leads before plate closure.',
    purpose:'Adjust each motor’s speed using commands from the flight controller.'},
  {id:'screws', name:'Frame screws', quantity:16, station:'screws', work:'The robot takes screws from the feeder and tightens all 16 joints in the fixture.',
    purpose:'Clamp the frame plates and arm connectors together.'},
  {id:'nuts', name:'Flange locknuts', quantity:16, station:'nuts', work:'The operator loads the locknuts into the fixture before the frame parts are placed.',
    purpose:'Thread onto the frame screws and help resist loosening.'},
  {id:'rails', name:'Slide rails and supports', quantity:2, station:'lower', work:'The rails enter the cell as part of the prepared lower-plate assembly.',
    purpose:'Support the battery deck and accessory platform beneath the frame.'},
  {id:'landing', name:'Landing gear assemblies', quantity:2, station:'lower', work:'The landing gear is prepared upstream where required and enters with the lower-plate assembly.',
    purpose:'Support the drone on the ground and keep its underside clear.'},
  {id:'power', name:'Power distribution and module', quantity:1, station:'lower', work:'Power hardware arrives on the prepared lower plate. Connections are staged before closure.',
    purpose:'Feeds battery power to the motor controllers and flight controller.'},
  {id:'batteryDeck', name:'Battery deck and pad', quantity:1, station:'lower', work:'The battery deck enters with the prepared lower assembly in this process.',
    purpose:'Supports the battery and helps keep it from sliding.'},
  {id:'deck', name:'Accessory platform', quantity:1, station:'output', work:'The accessory platform is shown for product context and is outside this cell’s route.',
    purpose:'Provides a place to mount extra electronics or sensors.'},
  {id:'props', name:'Propeller assemblies', quantity:4, station:'output', work:'Propellers are installed downstream of frame acceptance.',
    purpose:'Push air downward to lift and maneuver the drone.'},
  {id:'controller', name:'Flight controller', quantity:1, station:'output', work:'The controller is installed downstream of frame acceptance.',
    purpose:'Keeps the drone stable and steers it by adjusting each motor’s speed.'},
  {id:'gps', name:'GPS module and mount', quantity:1, station:'output', work:'The GPS module is installed downstream of frame acceptance.',
    purpose:'Gives the drone its position for navigation. The mount holds the receiver above the frame.'},
  {id:'radio', name:'Telemetry radio', quantity:1, station:'output', work:'The radio is an option for downstream avionics integration.',
    purpose:'Sends flight data to the ground station and receives commands.'},
];

const upstream=new Set(['base','tubes','roots','mounts','motors','esc','rails','landing','power','batteryDeck']);
const downstream=new Set(['deck','props','controller','gps','radio']);
for (const part of components) {
  part.system=['motors','esc','props'].includes(part.id)?'propulsion':
    ['power','controller','gps','radio'].includes(part.id)?'electronics':'structure';
  part.stage=upstream.has(part.id)?'Incoming subassembly':downstream.has(part.id)?'Downstream assembly':'Frame assembly cell';
}
