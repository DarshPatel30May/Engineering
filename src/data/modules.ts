/**
 * Calculator catalogue: groups formulas and tools into logical categories per module.
 * Formula ids reference the central registry, so no formula is duplicated here.
 */
import type { ModuleId } from '../engine/formulas/types';

export type ToolId = 'beam' | 'truss' | 'circuit' | 'logic' | 'numbase' | 'section' | 'centroid' | 'forces' | 'incline' | 'gear' | 'flight' | 'lever' | 'tensile';

export const TOOL_NAMES: Record<ToolId, string> = {
  beam: 'Beam analyser (reactions, SFD, BMD, bending stress)',
  truss: 'Truss solver (method of joints)',
  circuit: 'Series / parallel circuit analyser',
  logic: 'Logic gates & truth tables',
  numbase: 'Number systems (binary, hex, BCD, 2’s complement)',
  section: 'Section properties (I, ȳ, Z) — composite sections',
  centroid: 'Centroid / centre of gravity (weight & balance)',
  forces: 'Concurrent forces — resultant & equilibrium',
  incline: 'Inclined plane with friction',
  gear: 'Gear / pulley / sprocket train',
  flight: 'Flight forces (level, climb, glide, turn)',
  lever: 'Iron–carbon lever rule (phase %)',
  tensile: 'Tensile test analysis (E, UTS, ductility)',
};

export type CatalogItem = { kind: 'formula'; id: string } | { kind: 'tool'; id: ToolId };
export interface Category {
  title: string;
  items: CatalogItem[];
}

const F = (...ids: string[]): CatalogItem[] => ids.map((id) => ({ kind: 'formula', id }));
const T = (...ids: ToolId[]): CatalogItem[] => ids.map((id) => ({ kind: 'tool', id }));

export const MODULE_CATALOG: Record<ModuleId, Category[]> = {
  civil: [
    { title: 'Forces & equilibrium', items: [...T('forces'), ...F('forceX', 'forceY', 'resultant', 'resultantAngle', 'moment', 'weight')] },
    { title: 'Beams & bending', items: [...T('beam'), ...F('bending', 'ssCentral', 'ssUdl', 'cantPoint', 'cantUdl', 'udlTotal', 'sectionModulus', 'bendingZ')] },
    { title: 'Trusses & joints', items: [...T('truss'), ...F('stress', 'shear', 'fastenerLoad', 'shearPerBolt', 'bearingStress')] },
    { title: 'Section properties', items: [...T('section', 'centroid'), ...F('Irect', 'yRect', 'Icircle', 'Itube', 'areaCircle', 'areaTube', 'areaRect')] },
    { title: 'Stress & strain', items: F('stress', 'strain', 'youngs', 'youngsCombined', 'hooke', 'shear') },
    { title: 'Material testing & factor of safety', items: [...T('tensile'), ...F('fosUts', 'fosYield', 'fosLoad', 'pctElong', 'pctRA', 'brinell', 'vickers', 'impactEnergy', 'strainEnergy', 'resilience', 'density')] },
    { title: 'Pressure & hydraulics', items: F('pressure', 'hydrostatic', 'damForce', 'pascal') },
  ],
  transport: [
    { title: 'Forces & motion', items: F('newton2', 'weight', 'tractive', 'hillClimb', 'momentum', 'impulse', 'centripetal') },
    { title: 'Kinematics', items: F('suvat1', 'suvat2', 'suvat3', 'suvat4', 'constSpeed') },
    { title: 'Friction', items: [...T('incline'), ...F('friction', 'frictionAngle', 'inclineNormal', 'inclineParallel')] },
    { title: 'Work, energy & power', items: F('work', 'ke', 'pe', 'deltaKE', 'wheelPower', 'workEnergy', 'energyConservation', 'power', 'powerFv', 'rotPower', 'torque', 'efficiency', 'efficiencyEnergy', 'energyTime') },
    { title: 'Simple machines', items: F('MA', 'VR', 'machineEff', 'leverBalance', 'leverVR', 'pulleyVR') },
    { title: 'Mechanisms (gears, belts, screws)', items: [...T('gear'), ...F('gearRatio', 'gearSpeed', 'gearTorque', 'wheelTorque', 'torquePerWheel', 'wheelAxle', 'screwJack')] },
    { title: 'Hydraulics', items: F('pascal', 'pistonArea1', 'pistonArea2', 'hydraulicPressure', 'hydraulicVolume', 'hydraulicVR') },
    { title: 'Electricity & electric motors', items: F('electricalEnergy', 'energyCost', 'charge', 'batteryEnergy', 'ohm', 'powerVI', 'efficiency', 'transformer', 'transformerCurrent', 'rms') },
    { title: 'Engineering materials', items: [...T('lever', 'tensile'), ...F('stress', 'strain', 'youngs', 'fosUts', 'pctElong', 'brinell', 'vickers', 'impactEnergy')] },
  ],
  aero: [
    { title: 'Flight forces', items: [...T('flight'), ...F('levelLift', 'levelThrust', 'liftDragRatio', 'climbLift', 'climbThrust', 'glideRatio', 'glideAngle')] },
    { title: 'Lift & drag', items: F('bernoulliDp', 'liftFromDp', 'liftEquation', 'dragEquation') },
    { title: 'Fluid mechanics', items: F('bernoulli', 'dynamicPressure', 'continuity', 'pascal', 'hydrostatic', 'pressure') },
    { title: 'Aircraft performance', items: F('wingLoading', 'aspectRatio', 'loadFactor', 'bankedTurn', 'mach') },
    { title: 'Propulsion & power', items: F('jetThrust', 'tractive', 'powerFv', 'rotPower', 'suvat3') },
    { title: 'Aircraft structures & materials', items: [...T('beam', 'centroid', 'tensile'), ...F('bending', 'cantUdl', 'cantPoint', 'moment', 'stress', 'strain', 'youngs', 'fosUts', 'shear', 'vickers', 'impactEnergy')] },
  ],
  telecom: [
    { title: 'Electrical circuits', items: [...T('circuit'), ...F('ohm', 'powerVI', 'powerI2R', 'powerV2R', 'series2', 'parallel2', 'ledResistor', 'energyTime', 'energyCost', 'charge', 'rms')] },
    { title: 'Waves, signals & antennas', items: F('wave', 'period', 'scopePeriod', 'scopeVoltage', 'halfWave', 'quarterWave', 'propDelay') },
    { title: 'Decibels & attenuation', items: F('dbPower', 'dbVoltage', 'fibreLoss') },
    { title: 'Fibre optics', items: F('snell', 'criticalAngle', 'refractiveIndex', 'numericalAperture') },
    { title: 'Digital electronics & data', items: [...T('logic', 'numbase'), ...F('dataTime', 'nyquist', 'pcmBitRate', 'quantLevels')] },
    { title: 'Modulation', items: F('amIndex', 'amBandwidth') },
  ],
};

export const MODULE_ORDER: ModuleId[] = ['civil', 'transport', 'aero', 'telecom'];
