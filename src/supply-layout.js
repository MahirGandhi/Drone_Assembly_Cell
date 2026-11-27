export const supplyPositions={
  rear:{name:'Rear supply position',translation:[-2.93,0,-1.12]},
  blocked:{name:'Gate obstruction example',translation:[0,0,2.14]},
};

// Layout assumption from the current scene's 1.7 m gate opening.
// This is a planning envelope, not a validated ergonomic or safety clearance.
export const operatorAccess={
  min:[-.85,0,1.65],
  max:[.85,1.7,3.05],
};

export function checkSupplyPlacement(bounds,position,allowanceMm) {
  if (!bounds || !['min','max'].every(key=>Array.isArray(bounds[key])&&bounds[key].length===3)||
    !Array.isArray(position)||position.length!==3||
    ![...bounds.min,...bounds.max,...position,allowanceMm].every(Number.isFinite)||
    allowanceMm<0||allowanceMm>1000||
    bounds.min.some((low,axis)=>low>bounds.max[axis])) {
    throw new RangeError('Invalid supply layout geometry or allowance');
  }
  const world={
    min:bounds.min.map((value,axis)=>value+position[axis]),
    max:bounds.max.map((value,axis)=>value+position[axis]),
  };
  const gaps=world.min.map((low,axis)=>Math.max(0,
    operatorAccess.min[axis]-world.max[axis],low-operatorAccess.max[axis]));
  const intersects=world.min.every((low,axis)=>low<=operatorAccess.max[axis]&&world.max[axis]>=operatorAccess.min[axis]);
  const gapMm=Math.hypot(...gaps)*1000;
  return {world,intersects,gapMm,allowanceMm,
    status:intersects?'obstructed':gapMm+1e-9<allowanceMm?'below-allowance':'clear'};
}
