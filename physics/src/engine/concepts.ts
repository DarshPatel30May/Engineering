/**
 * Global concept vocabulary. Formula variables map onto shared concepts so the chain
 * solver can link formulas (F from F = qvB feeds a = F/m), and the Smart Solver can map
 * question wording ("stopping voltage", "half-life", "altitude") to variables.
 *
 * `keywords` are lower-case phrases searched for near a number and in "calculate …" clauses.
 * `symbols` are typed symbols (as in "B = 3.0 T"); clashes are resolved by unit dimension.
 */
import type { QuantityId } from './quantities';

export interface Concept {
  id: string;
  name: string;
  latex: string;
  quantity: QuantityId;
  keywords: string[];
  symbols?: string[];
}

const c = (id: string, name: string, latex: string, quantity: QuantityId, keywords: string[], symbols: string[] = []): Concept => ({ id, name, latex, quantity, keywords, symbols });

export const CONCEPTS: Concept[] = [
  // ── kinematics / projectiles
  c('s', 'Displacement / distance', 's', 'length', ['displacement', 'distance', 'travels', 'distance travelled', 'distance traveled', 'how far', 'covers', 'moves'], ['s', 'd', 'x']),
  c('u', 'Initial velocity / launch speed', 'u', 'velocity', ['initial velocity', 'initial speed', 'launch speed', 'launched at', 'launched with', 'projected at', 'projected with', 'thrown at', 'thrown with', 'kicked at', 'kicked with', 'fired at', 'fired with', 'hit at', 'struck at', 'speed of launch', 'launch velocity', 'muzzle velocity', 'starting speed', 'initially'], ['u', 'v0', 'vi', 'u0']),
  c('v', 'Velocity / speed', 'v', 'velocity', ['velocity', 'speed', 'travelling at', 'traveling at', 'moving at', 'moves at', 'final velocity', 'final speed', 'orbital speed', 'orbital velocity', 'enters', 'with a speed', 'at a speed', 'at a velocity', 'rest frame', 'relative to'], ['v', 'vf']),
  c('a', 'Acceleration', 'a', 'acceleration', ['acceleration', 'accelerates', 'accelerating', 'deceleration', 'decelerates', 'centripetal acceleration', 'radial acceleration'], ['a', 'ac', 'a_c']),
  c('t', 'Time', 't', 'time', ['time', 'seconds', 'takes', 'taken', 'duration', 'time interval', 'for a time', 'in a time', 'over a period', 'elapsed', 'after', 'how long'], ['t', 'Δt', 'dt']),
  c('g', 'Gravitational acceleration / field strength', 'g', 'gfield', ['gravitational field strength', 'acceleration due to gravity', 'gravitational acceleration', 'surface gravity', 'field strength', 'value of g', 'strength of gravity'], ['g']),
  c('sx', 'Horizontal displacement (range)', 's_x', 'length', ['range', 'horizontal distance', 'horizontal displacement', 'horizontally from', 'lands', 'from the base', 'from the foot', 'from the edge', 'how far from'], ['sx', 'Δx', 'R', 'x']),
  c('sy', 'Vertical displacement', 's_y', 'length', ['vertical displacement', 'vertical distance', 'drop of', 'below the launch', 'above the launch'], ['sy', 'Δy', 'y']),
  c('hDrop', 'Height fallen', 'h', 'length', ['cliff', 'high cliff', 'tall building', 'building', 'table', 'height of', 'high', 'above the ground', 'above ground', 'from a height', 'tall', 'falls', 'dropped from', 'rolls off', 'bench', 'tower', 'bridge', 'balcony'], ['h']),
  c('H', 'Maximum height', 'H', 'length', ['maximum height', 'max height', 'highest point', 'peak height', 'greatest height', 'maximum vertical'], ['H', 'hmax']),
  c('ux', 'Horizontal component of velocity', 'u_x', 'velocity', ['horizontal component', 'horizontal velocity', 'horizontal speed', 'horizontally at', 'horizontally with', 'horizontally'], ['ux', 'vx']),
  c('uy', 'Vertical component of velocity', 'u_y', 'velocity', ['vertical component', 'initial vertical velocity', 'vertically upward', 'vertically at', 'vertically upwards', 'straight up'], ['uy']),
  c('vx', 'Horizontal velocity', 'v_x', 'velocity', ['horizontal velocity at', 'final horizontal velocity']),
  c('vy', 'Vertical velocity', 'v_y', 'velocity', ['vertical velocity', 'vertical speed', 'final vertical velocity', 'vertical component of the velocity'], ['vy']),
  c('thetaL', 'Launch angle', '\\theta', 'angle', ['launch angle', 'angle of projection', 'angle of launch', 'above the horizontal', 'to the horizontal', 'with the horizontal', 'elevation', 'launched at an angle', 'at an angle of', 'projected at an angle'], ['θ', 'theta']),
  c('thetaV', 'Direction of velocity', '\\theta', 'angle', ['direction of the velocity', 'angle of impact', 'angle at which', 'direction of motion', 'direction of travel']),
  c('tFlight', 'Time of flight', 't', 'time', ['time of flight', 'flight time', 'time in the air', 'time to hit', 'time to reach the ground', 'time to land', 'time taken to hit', 'hang time', 'how long it takes to hit', 'time to fall']),
  c('tPeak', 'Time to maximum height', 't_{peak}', 'time', ['time to reach maximum height', 'time to reach its maximum height', 'time to the highest point', 'time to reach the top']),
  // ── forces / energy
  c('F', 'Force', 'F', 'force', ['force', 'net force', 'resultant force', 'magnetic force', 'electric force', 'electrostatic force', 'gravitational force', 'centripetal force', 'force of attraction', 'force of repulsion', 'force on', 'force exerted', 'friction', 'frictional force', 'tension', 'thrust', 'pull', 'push'], ['F', 'Fnet', 'Fc', 'FB', 'FE', 'Fg']),
  c('Wt', 'Weight', 'F_g', 'force', ['weight', 'weighs', 'weight force'], ['W', 'Fg']),
  c('m', 'Mass', 'm', 'mass', ['mass', 'kg', 'of mass', 'with a mass', 'a mass of', 'satellite of mass', 'car of mass'], ['m', 'm0', 'mo']),
  c('K', 'Kinetic energy', 'K', 'energy', ['kinetic energy', 'ke', 'energy of motion', 'k.e.'], ['K', 'KE', 'Ek', 'Ek']),
  c('dU', 'Change in potential energy', '\\Delta U', 'energy', ['gain in potential energy', 'change in potential energy', 'gravitational potential energy gained', 'potential energy gained']),
  c('dh', 'Change in height', '\\Delta h', 'length', ['change in height', 'raised by', 'lifted', 'height gained'], ['Δh']),
  c('Wk', 'Work done', 'W', 'energy', ['work done', 'work', 'energy transferred', 'energy gained'], ['W']),
  c('thetaFs', 'Angle between force and displacement', '\\theta', 'angle', ['angle between the force and', 'at an angle to the direction of motion']),
  c('P', 'Power', 'P', 'power', ['power', 'power output', 'luminosity', 'output of', 'rated at', 'power rating', 'watts', 'radiates', 'emits energy at'], ['P', 'L']),
  c('E', 'Energy', 'E', 'energy', ['energy', 'total energy', 'energy released', 'energy produced', 'energy output', 'rest energy', 'energy equivalent', 'energy converted'], ['E', 'ΔE']),
  c('Fx', 'x-component of force', 'F_x', 'force', ['horizontal component of the force', 'x-component', 'x component'], ['Fx']),
  c('Fy', 'y-component of force', 'F_y', 'force', ['vertical component of the force', 'y-component', 'y component'], ['Fy']),
  c('thetaF', 'Direction of force', '\\theta', 'angle', ['direction of the resultant', 'direction of the net force']),
  c('Fpar', 'Component of weight along slope', 'F_{\\parallel}', 'force', ['component of weight down the slope', 'down the slope', 'along the incline', 'along the slope']),
  c('mu', 'Coefficient of friction', '\\mu', 'ratio', ['coefficient of friction', 'coefficient of static friction', 'friction coefficient'], ['μ', 'mu']),
  c('tension', 'Tension', 'T', 'force', ['tension in the string', 'tension in the rope', 'tension']),
  // ── torque
  c('tau', 'Torque', '\\tau', 'torque', ['torque', 'turning effect', 'moment', 'turning moment', 'maximum torque'], ['τ', 'tau']),
  c('rArm', 'Distance from pivot', 'r', 'length', ['from the pivot', 'from the hinge', 'from the axis', 'from the axle', 'from the fulcrum', 'spanner', 'wrench', 'lever arm', 'long spanner', 'door handle', 'from the centre of rotation', 'moment arm'], ['r']),
  c('rPerp', 'Perpendicular distance to line of action', 'r_{\\perp}', 'length', ['perpendicular distance']),
  c('thetaT', 'Angle between r and F', '\\theta', 'angle', ['angle to the spanner', 'angle to the wrench', 'angle to the lever', 'angle to the handle', 'angle to the door', 'angle with the spanner', 'angle to the bar']),
  c('rArm1', 'Distance of force 1 from pivot', 'r_1', 'length', []),
  c('rArm2', 'Distance of force 2 from pivot', 'r_2', 'length', []),
  c('F1', 'Force 1', 'F_1', 'force', [], ['F1']),
  c('F2', 'Force 2', 'F_2', 'force', [], ['F2']),
  // ── circular motion
  c('r', 'Radius / distance from centre', 'r', 'length', ['radius', 'orbital radius', 'radius of the orbit', 'radius of orbit', 'radius of the circle', 'radius of the path', 'radius of curvature', 'circle of radius', 'curve of radius', 'bend of radius', 'separation', 'apart', 'distance between', 'distance from the centre', 'from the centre', 'distance of', 'orbits at a distance', 'distance from'], ['r', 'R']),
  c('T', 'Period', 'T', 'time', ['period', 'orbital period', 'period of', 'one revolution', 'one orbit', 'one rotation', 'each revolution', 'completes an orbit', 'completes one', 'time for one'], ['T']),
  c('f', 'Frequency', 'f', 'frequency', ['frequency', 'hz', 'revolutions per second', 'rotations per second', 'oscillates', 'cycles per second'], ['f', 'ν']),
  c('omega', 'Angular velocity', '\\omega', 'angularVelocity', ['angular velocity', 'angular speed', 'rad/s', 'rpm', 'revolutions per minute', 'rotational speed', 'rotates at', 'spins at'], ['ω', 'omega']),
  c('dTheta', 'Angle turned', '\\Delta\\theta', 'angle', ['angle turned', 'rotates through', 'angular displacement', 'turns through'], ['Δθ']),
  c('thetaBank', 'Bank / incline angle', '\\theta', 'angle', ['banked', 'banking angle', 'angle of banking', 'bank angle', 'banked at', 'incline', 'inclined at', 'slope of', 'ramp', 'string makes an angle', 'angle with the vertical', 'to the vertical', 'from the vertical'], []),
  // ── gravitation
  c('M', 'Mass of central body', 'M', 'mass', ['mass of the earth', 'mass of earth', 'mass of the planet', 'mass of the sun', 'mass of the star', 'mass of mars', 'mass of jupiter', 'mass of the moon', 'planet of mass', 'planet has a mass', 'star of mass', 'central mass', 'mass of the central'], ['M', 'ME', 'Mp', 'Ms']),
  c('Rp', 'Radius of planet', 'R', 'length', ['radius of the earth', 'radius of earth', 'radius of the planet', 'radius of mars', 'radius of the moon', 'radius of jupiter', 'planet of radius', 'planetary radius', 'radius of the sun', 'radius of the star'], ['rE', 'RE', 'Rp']),
  c('hAlt', 'Altitude', 'h', 'length', ['altitude', 'above the surface', 'above the earth', "above earth's surface", 'above the earth’s surface', 'above the planet', 'height above', 'orbits at a height', 'at a height of', 'orbital height', 'above sea level'], ['h']),
  c('Ug', 'Gravitational potential energy', 'U', 'energy', ['gravitational potential energy', 'potential energy', 'gpe'], ['U', 'Ep', 'GPE']),
  c('dUg', 'Change in GPE', '\\Delta U', 'energy', ['change in gravitational potential energy', 'change in potential energy', 'increase in potential energy', 'increase in gravitational potential energy']),
  c('vesc', 'Escape velocity', 'v_{esc}', 'velocity', ['escape velocity', 'escape speed'], ['vesc']),
  c('Eorb', 'Total orbital energy', 'E', 'energy', ['total energy of the satellite', 'total mechanical energy', 'orbital energy', 'total orbital energy']),
  c('dEorb', 'Energy to change orbit', '\\Delta E', 'energy', ['energy required to move', 'energy needed to move', 'energy to move', 'energy required to raise', 'work required to move', 'energy to transfer']),
  c('r1', 'Radius 1', 'r_1', 'length', ['initial orbit', 'lower orbit', 'original orbit', 'first orbit', 'initial radius'], ['r1']),
  c('r2', 'Radius 2', 'r_2', 'length', ['final orbit', 'higher orbit', 'new orbit', 'second orbit', 'final radius'], ['r2']),
  c('T1', 'Period 1', 'T_1', 'time', [], ['T1']),
  c('T2', 'Period 2', 'T_2', 'time', [], ['T2']),
  // ── electric fields
  c('q', 'Charge', 'q', 'charge', ['charge', 'charge of', 'charged', 'carrying a charge', 'charge on', 'point charge'], ['q', 'Q']),
  c('q1', 'Charge 1', 'q_1', 'charge', ['first charge'], ['q1', 'Q1']),
  c('q2', 'Charge 2', 'q_2', 'charge', ['second charge'], ['q2', 'Q2']),
  c('qSource', 'Source charge', 'q', 'charge', ['source charge']),
  c('Ef', 'Electric field strength', 'E', 'efield', ['electric field', 'electric field strength', 'field strength', 'uniform field', 'field of', 'n/c', 'v/m'], ['E']),
  c('V', 'Potential difference', 'V', 'voltage', ['potential difference', 'voltage', 'accelerated through', 'accelerating voltage', 'accelerating potential', 'volts', 'connected to', 'emf of the supply', 'p.d.', 'pd'], ['V', 'ΔV']),
  c('dPlate', 'Plate separation', 'd', 'length', ['plates', 'plate separation', 'separated by', 'apart', 'distance between the plates', 'gap'], ['d']),
  c('eCharge', 'Elementary charge', 'e', 'charge', ['elementary charge'], ['e']),
  c('k', 'Coulomb constant', 'k', 'coulombK', ['coulomb constant'], ['k']),
  // ── magnetic
  c('B', 'Magnetic field strength', 'B', 'bfield', ['magnetic field', 'magnetic field strength', 'magnetic flux density', 'field of', 'tesla', 'uniform magnetic field'], ['B']),
  c('thetaB', 'Angle between velocity and field', '\\theta', 'angle', ['angle to the field', 'angle to the magnetic field', 'angle with the field', 'to the magnetic field', 'with the magnetic field', 'to the field'], ['θ']),
  c('thetaIB', 'Angle between conductor and field', '\\theta', 'angle', ['angle between the wire and', 'angle to the wire', 'wire makes', 'conductor makes', 'angle between the conductor']),
  c('thetaN', 'Angle between field and normal', '\\theta', 'angle', ['angle between the field and the normal', 'normal to the coil', 'normal to the loop', 'normal to the plane', 'area vector']),
  c('lw', 'Length of conductor', 'l', 'length', ['length of wire', 'length of the wire', 'length of the conductor', 'wire of length', 'conductor of length', 'long wire', 'metre of wire', 'rod of length', 'side of length', 'length of the rod', 'length of the side'], ['l', 'L']),
  c('I', 'Current', 'I', 'current', ['current', 'carries a current', 'carrying a current', 'current of', 'amperes', 'amps'], ['I', 'i']),
  c('I1', 'Current 1', 'I_1', 'current', [], ['I1']),
  c('I2', 'Current 2', 'I_2', 'current', [], ['I2']),
  c('Fl', 'Force per unit length', '\\frac{F}{l}', 'forcePerLength', ['force per unit length', 'force per metre', 'force per meter', 'n/m'], ['F/l', 'F/L']),
  c('rWire', 'Distance from wire', 'r', 'length', ['from the wire', 'between the wires', 'wires are', 'conductors are', 'separated by', 'apart']),
  c('N', 'Number of turns', 'N', 'count', ['turns', 'loops', 'windings', 'number of turns'], ['N', 'n']),
  c('A', 'Area', 'A', 'area', ['area', 'cross-sectional area', 'area of the coil', 'area of the loop'], ['A']),
  c('Lsol', 'Length of solenoid', 'L', 'length', ['length of the solenoid', 'solenoid of length']),
  c('emfBack', 'Back emf', '\\varepsilon_{back}', 'voltage', ['back emf', 'back-emf', 'counter emf']),
  c('Vsupply', 'Supply voltage', 'V', 'voltage', ['supply voltage', 'connected to a', 'supply of']),
  c('R', 'Resistance', 'R', 'resistance', ['resistance', 'resistor', 'ohms', 'resistance of'], ['R']),
  // ── induction
  c('Phi', 'Magnetic flux', '\\Phi', 'flux', ['magnetic flux', 'flux', 'flux through', 'weber'], ['Φ', 'phi']),
  c('dPhi', 'Change in flux', '\\Delta\\Phi', 'flux', ['change in flux', 'change in magnetic flux', 'flux changes', 'flux decreases', 'flux increases'], ['ΔΦ']),
  c('PhiF', 'Final flux', '\\Phi_f', 'flux', ['final flux']),
  c('PhiI', 'Initial flux', '\\Phi_i', 'flux', ['initial flux']),
  c('emf', 'Induced emf', '\\varepsilon', 'voltage', ['emf', 'induced emf', 'induced voltage', 'e.m.f.', 'average emf', 'electromotive force', 'voltage induced'], ['ε', 'emf', 'E']),
  c('emfPeak', 'Peak emf', '\\varepsilon_{max}', 'voltage', ['peak emf', 'maximum emf']),
  // ── transformers
  c('Vp', 'Primary voltage', 'V_p', 'voltage', ['primary voltage', 'input voltage', 'primary coil voltage', 'voltage across the primary', 'supplied at', 'mains', 'primary'], ['Vp']),
  c('Vs', 'Secondary voltage', 'V_s', 'voltage', ['secondary voltage', 'output voltage', 'voltage across the secondary', 'secondary coil voltage', 'secondary', 'steps down to', 'steps up to', 'stepped up to', 'stepped down to'], ['Vs']),
  c('Np', 'Primary turns', 'N_p', 'count', ['primary turns', 'turns on the primary', 'primary coil has', 'primary coil of', 'primary has', 'primary winding'], ['Np']),
  c('Ns', 'Secondary turns', 'N_s', 'count', ['secondary turns', 'turns on the secondary', 'secondary coil has', 'secondary coil of', 'secondary has', 'secondary winding'], ['Ns']),
  c('Ip', 'Primary current', 'I_p', 'current', ['primary current', 'current in the primary', 'input current', 'current drawn'], ['Ip']),
  c('Is', 'Secondary current', 'I_s', 'current', ['secondary current', 'current in the secondary', 'output current'], ['Is']),
  c('Pp', 'Input power', 'P_p', 'power', ['input power', 'primary power', 'power input', 'power supplied'], ['Pp', 'Pin']),
  c('Ps', 'Output power', 'P_s', 'power', ['output power', 'secondary power', 'power output', 'power delivered'], ['Ps', 'Pout']),
  c('eta', 'Efficiency', '\\eta', 'percent', ['efficiency', 'efficient'], ['η', 'eta']),
  c('Ploss', 'Power loss', 'P_{loss}', 'power', ['power loss', 'power lost', 'energy lost per second', 'heat loss', 'lost as heat', 'transmission loss'], ['Ploss']),
  // ── waves / light
  c('lambda', 'Wavelength', '\\lambda', 'wavelength', ['wavelength', 'nm', 'light of wavelength', 'wavelength of', 'line at', 'spectral line', 'photons of wavelength'], ['λ', 'lambda']),
  c('c', 'Speed of light', 'c', 'velocity', ['speed of light'], ['c']),
  c('n', 'Refractive index', 'n', 'ratio', ['refractive index', 'index of refraction'], ['n']),
  c('n1', 'Refractive index 1', 'n_1', 'ratio', ['refractive index of the first', 'incident medium'], ['n1']),
  c('n2', 'Refractive index 2', 'n_2', 'ratio', ['refractive index of the second'], ['n2']),
  c('theta1', 'Angle of incidence', '\\theta_1', 'angle', ['angle of incidence', 'incident at', 'strikes at', 'incidence angle'], ['θ1', 'θi', 'i']),
  c('theta2', 'Angle of refraction', '\\theta_2', 'angle', ['angle of refraction', 'refracted at', 'refraction angle'], ['θ2', 'θr']),
  c('thetaC', 'Critical angle', '\\theta_c', 'angle', ['critical angle'], ['θc']),
  c('lambdaN', 'Wavelength in medium', '\\lambda_n', 'wavelength', ['wavelength in the glass', 'wavelength in water', 'wavelength inside']),
  c('Iint', 'Transmitted intensity', 'I', 'intensity', ['transmitted intensity', 'intensity transmitted', 'intensity of the light emerging', 'emerging intensity', 'final intensity'], ['I']),
  c('Imax', 'Incident polarised intensity', 'I_{max}', 'intensity', ['incident intensity', 'initial intensity', 'intensity of', 'of intensity', 'polarised light of intensity', 'polarized light of intensity', 'intensity after the first polariser', 'intensity after the first polarizer'], ['Imax', 'I0']),
  c('I0unpol', 'Intensity of unpolarised light', 'I_0', 'intensity', ['unpolarised light of intensity', 'unpolarized light of intensity', 'unpolarised light with an intensity', 'unpolarized light with an intensity'], []),
  c('thetaPol', 'Angle between polariser axes', '\\theta', 'angle', ['between the polarisers', 'between the polarizers', 'between the transmission axes', 'polariser is rotated', 'polarizer is rotated', 'analyser', 'analyzer', 'relative to the first'], []),
  c('Iint1', 'Intensity 1', 'I_1', 'intensity', [], []),
  c('Iint2', 'Intensity 2', 'I_2', 'intensity', [], []),
  c('dI1', 'Distance 1', 'r_1', 'length', []),
  c('dI2', 'Distance 2', 'r_2', 'length', []),
  c('cPred', 'Predicted speed of EM waves', 'c', 'velocity', []),
  // ── interference
  c('dSlit', 'Slit separation / grating spacing', 'd', 'length', ['slit separation', 'slits separated', 'slits are', 'slit spacing', 'grating spacing', 'separation of the slits', 'distance between the slits', 'slits apart', 'spacing between the slits', 'line spacing'], ['d']),
  c('thetaM', 'Angle of maximum', '\\theta', 'angle', ['angle of the', 'order maximum', 'diffracted at', 'observed at an angle', 'angle from the central', 'maximum at', 'bright fringe at'], ['θ']),
  c('mOrder', 'Order', 'm', 'count', ['order', 'first order', 'second order', 'third order', 'fringe number', 'bright fringe'], ['m']),
  c('Lscreen', 'Slit–screen distance', 'L', 'length', ['screen', 'from the screen', 'to the screen', 'screen is', 'screen placed', 'away from the slits', 'distance to the screen', 'from the slits'], ['L', 'D']),
  c('yFringe', 'Fringe distance from centre', 'y', 'length', ['from the central maximum', 'from the central bright', 'from the centre of the pattern', 'from the central fringe', 'fringe is'], ['y', 'x']),
  c('dyFringe', 'Fringe spacing', '\\Delta y', 'length', ['fringe spacing', 'fringe separation', 'between adjacent', 'between bright fringes', 'distance between fringes', 'spacing of the fringes', 'between successive'], ['Δy', 'Δx']),
  c('Nlines', 'Lines per unit length', 'N', 'lineDensity', ['lines per', 'lines/mm', 'lines/cm', 'lines/m', 'lines per mm', 'lines per millimetre', 'lines per metre', 'lines per centimetre', 'rulings'], ['N']),
  c('mMax', 'Maximum order', 'm_{max}', 'count', ['maximum order', 'highest order', 'number of orders', 'how many orders', 'maximum number of']),
  c('pathDiff', 'Path difference', '\\Delta', 'length', ['path difference'], ['Δ']),
  // ── quantum light
  c('lambdaMax', 'Peak wavelength', '\\lambda_{max}', 'wavelength', ['peak wavelength', 'maximum intensity at', 'peaks at', 'peak at', 'wavelength of maximum', 'λmax', 'most intense', 'peak emission', 'emits most strongly'], ['λmax']),
  c('Temp', 'Temperature', 'T', 'temperature', ['temperature', 'surface temperature', 'kelvin', 'hot'], ['T']),
  c('Eph', 'Photon energy', 'E', 'energyAtomic', ['photon energy', 'energy of the photon', 'energy of a photon', 'energy of each photon', 'energy of one photon', 'photon has', 'photons of energy', 'energy of the emitted photon', 'energy difference'], ['E', 'Ephoton', 'Ep']),
  c('p', 'Momentum', 'p', 'momentum', ['momentum', 'relativistic momentum'], ['p']),
  c('photonRate', 'Photons per second', 'n', 'rate', ['photons per second', 'number of photons', 'photons emitted each second', 'photons emitted per second']),
  c('Kmax', 'Maximum kinetic energy', 'K_{max}', 'energyAtomic', ['maximum kinetic energy', 'max kinetic energy', 'kmax', 'most energetic', 'kinetic energy of the photoelectrons', 'kinetic energy of the ejected'], ['Kmax', 'Ek']),
  c('phi', 'Work function', '\\phi', 'energyAtomic', ['work function'], ['φ', 'phi', 'W', 'ϕ']),
  c('f0', 'Threshold frequency', 'f_0', 'frequency', ['threshold frequency', 'cut-off frequency', 'cutoff frequency', 'minimum frequency'], ['f0']),
  c('lambda0', 'Threshold wavelength', '\\lambda_0', 'wavelength', ['threshold wavelength', 'cut-off wavelength', 'maximum wavelength', 'longest wavelength'], ['λ0']),
  c('Vstop', 'Stopping voltage', 'V_s', 'voltage', ['stopping voltage', 'stopping potential', 'cut-off voltage', 'retarding potential', 'reverse voltage'], ['Vs', 'V0']),
  c('me', 'Electron mass', 'm_e', 'mass', ['mass of an electron', 'electron mass']),
  // ── relativity
  c('gamma', 'Lorentz factor', '\\gamma', 'ratio', ['lorentz factor', 'gamma factor', 'gamma'], ['γ', 'gamma']),
  c('t0', 'Proper time', 't_0', 'time', ['proper time', 'lifetime', 'half-life of', 'mean lifetime', 'in its own frame', 'in its rest frame', 'measured on the spaceship', 'on board', 'measured by the astronaut', 'onboard', 'ship clock', 'measured by the traveller', 'as measured on the ship'], ['t0', 'to', 'Δt0']),
  c('tDil', 'Dilated time', 't', 'time', ['dilated time', 'measured from earth', 'measured on earth', 'observer on earth', 'earth observer', 'measured by an observer', 'stationary observer', 'observed lifetime', 'as measured from earth', 'earth frame', 'ground observer'], ['t', 'Δt']),
  c('L0', 'Proper length', 'l_0', 'length', ['proper length', 'rest length', 'length at rest', 'measured length at rest', 'when at rest', 'measured at rest', 'at rest', 'long when', 'atmosphere', 'thick', 'thickness of the atmosphere', 'distance to the star', 'distance between the earth and', 'length of the spaceship', 'length of the ship', 'original length'], ['L0', 'l0', 'Lo']),
  c('Lc', 'Contracted length', 'l', 'length', ['contracted length', 'length observed', 'length measured by', 'appear to be', 'observed length'], ['L', 'l']),
  c('Etot', 'Relativistic total energy', 'E', 'energyAtomic', ['relativistic total energy']),
  // ── Module 8
  c('vRec', 'Recession velocity', 'v', 'velocity', ['recession velocity', 'recessional velocity', 'receding at', 'moving away at', 'recedes at', 'moving away from'], ['v']),
  c('H0', 'Hubble constant', 'H_0', 'hubble', ['hubble constant', "hubble's constant", 'hubble parameter', 'km/s/mpc'], ['H0', 'Ho']),
  c('Dgal', 'Distance to galaxy', 'D', 'astroDistance', ['distance to the galaxy', 'galaxy is', 'mpc away', 'light-years away', 'distance of the galaxy', 'galaxy at a distance', 'megaparsecs'], ['D', 'd']),
  c('tAge', 'Age of the Universe', 't', 'longTime', ['age of the universe']),
  c('dLambda', 'Wavelength shift', '\\Delta\\lambda', 'wavelength', ['shifted by', 'shift of', 'change in wavelength']),
  c('lambdaRest', 'Rest wavelength', '\\lambda_0', 'wavelength', ['laboratory wavelength', 'rest wavelength', 'emitted wavelength']),
  c('Rstar', 'Radius of star', 'R', 'length', ['radius of the star']),
  c('nCharges', 'Number of elementary charges', 'n', 'count', ['number of electrons', 'excess electrons', 'extra electrons', 'how many electrons']),
  c('En', 'Energy level', 'E_n', 'energyAtomic', ['energy level', 'energy of level', 'energy of the electron in', 'ground state energy', 'energy of the n']),
  c('nLevel', 'Principal quantum number', 'n', 'count', ['principal quantum number', 'energy level n', 'shell'], ['n']),
  c('ni', 'Initial energy level', 'n_i', 'count', ['initial level', 'from n', 'upper level', 'initial state', 'initial energy level'], ['ni']),
  c('nf', 'Final energy level', 'n_f', 'count', ['final level', 'to n', 'lower level', 'final state', 'final energy level'], ['nf']),
  c('Ei', 'Initial energy level', 'E_i', 'energyAtomic', ['initial energy'], ['Ei']),
  c('Ef_level', 'Final energy level', 'E_f', 'energyAtomic', ['final energy'], ['Ef']),
  c('Ry', 'Rydberg constant', 'R', 'waveNumber', ['rydberg constant'], ['R']),
  c('qm', 'Charge-to-mass ratio', '\\frac{q}{m}', 'chargeToMass', ['charge-to-mass ratio', 'charge to mass ratio', 'e/m', 'q/m', 'specific charge'], ['q/m', 'e/m']),
  c('dm', 'Mass defect', '\\Delta m', 'atomicMass', ['mass defect', 'mass difference', 'loss of mass', 'mass lost', 'mass deficit', 'decrease in mass'], ['Δm']),
  c('Enuc', 'Nuclear energy (binding / released)', 'E', 'energyNuclear', ['binding energy', 'energy released', 'energy liberated', 'q value', 'q-value', 'energy per fission', 'energy per reaction', 'energy per fusion'], ['E', 'Eb', 'BE']),
  c('BEperA', 'Binding energy per nucleon', '\\frac{E_B}{A}', 'energyNuclear', ['binding energy per nucleon', 'per nucleon']),
  c('Anuc', 'Mass number', 'A', 'count', ['mass number', 'nucleons', 'number of nucleons'], ['A']),
  c('nReact', 'Number of reactions / nuclei', 'n', 'count', ['number of fissions', 'number of reactions', 'fissions per second', 'reactions per second', 'number of nuclei', 'number of atoms', 'how many nuclei', 'how many atoms'], []),
  c('mSample', 'Mass of sample', 'm', 'mass', ['mass of the sample', 'sample of mass', 'kg of uranium', 'of fuel']),
  c('mAtom', 'Mass of one atom', 'm_{atom}', 'atomicMass', ['mass of one atom', 'atomic mass', 'mass of a nucleus', 'nuclear mass']),
  c('Nt', 'Amount remaining', 'N', 'amount', ['remaining', 'remains', 'left', 'undecayed', 'still present', 'will remain', 'drops to', 'falls to', 'decreased to', 'reduced to', 'measured activity', 'current activity'], ['N', 'Nt', 'A']),
  c('N0', 'Initial amount', 'N_0', 'amount', ['initial', 'initially', 'originally', 'original', 'starts with', 'sample of', 'begins with', 'freshly prepared', 'initial activity', 'initial mass', 'at the start', 'living'], ['N0', 'No', 'A0', 'm0']),
  c('lambdaD', 'Decay constant', '\\lambda', 'decayConst', ['decay constant', 'disintegration constant'], ['λ']),
  c('tHalf', 'Half-life', 't_{1/2}', 'longTime', ['half-life', 'half life', 'halflife', 'half-life of'], ['t1/2', 't½', 'T1/2', 'T½']),
  c('nHalf', 'Number of half-lives', 'n', 'ratio', ['number of half-lives', 'half-lives', 'half lives']),
  c('Act', 'Activity', 'A', 'activity', ['activity', 'becquerel', 'decays per second', 'count rate', 'disintegrations per second'], ['A']),
  c('Nnuclei', 'Number of undecayed nuclei', 'N', 'count', ['undecayed nuclei', 'radioactive nuclei']),
];

const BY_ID = new Map(CONCEPTS.map((x) => [x.id, x]));

export function getConcept(id: string): Concept | undefined {
  return BY_ID.get(id);
}

// Constants and helper concepts that are never read from question wording directly.
for (const extra of [
  c('G', 'Gravitational constant', 'G', 'gravConst', ['gravitational constant'], ['G']),
  c('h', 'Planck constant', 'h', 'planck', ['planck constant', "planck's constant"], ['h']),
  c('b', "Wien's constant", 'b', 'wien', ["wien's constant", 'wien constant'], ['b']),
  c('mu0', 'Permeability of free space', '\\mu_0', 'permeability', ['permeability'], ['μ0']),
  c('eps0', 'Permittivity of free space', '\\varepsilon_0', 'permittivity', ['permittivity'], ['ε0']),
  c('sig', 'Stefan–Boltzmann constant', '\\sigma', 'stefan', ['stefan-boltzmann constant']),
]) {
  CONCEPTS.push(extra);
  BY_ID.set(extra.id, extra);
}
