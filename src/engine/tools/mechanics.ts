/**
 * Mechanics tools: concurrent force systems (resultant / equilibrium), inclined-plane
 * friction, gear trains, flight forces.
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution } from '../solution';
import { solveLinear } from './truss';

const f = (x: number) => fmtLatex(x, 4);
const D2R = Math.PI / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface ForceVec {
  name: string;
  F?: number; // N; undefined = unknown magnitude
  angle: number; // degrees anticlockwise from +x
}

/**
 * Concurrent coplanar forces. If no magnitudes are unknown, returns the resultant and
 * equilibrant. If exactly two magnitudes are unknown, solves ΣFx = ΣFy = 0 for them
 * (e.g. tensions in two cables supporting a load).
 */
export function forcesSolution(forces: ForceVec[]): Solution {
  const sol = emptySolution('Concurrent forces');
  sol.module = 'civil';
  sol.topic = 'Force resolution & equilibrium';
  const known = forces.filter((x) => x.F !== undefined && isFinite(x.F));
  const unknown = forces.filter((x) => x.F === undefined || !isFinite(x.F));
  known.forEach((k) => sol.given.push({ symbolLatex: k.name, name: `at ${k.angle}° from +x`, raw: `${f(k.F!)} N`, valueSI: k.F!, quantity: 'force', unit: 'N' }));
  const comps = known.map((k) => ({ ...k, Fx: k.F! * Math.cos(k.angle * D2R), Fy: k.F! * Math.sin(k.angle * D2R) }));
  const sx = comps.reduce((s, c) => s + c.Fx, 0);
  const sy = comps.reduce((s, c) => s + c.Fy, 0);
  sol.tables = [{ title: 'Components (N)', headers: ['Force', '|F| (N)', 'θ (°)', 'Fx = F cos θ', 'Fy = F sin θ'], rows: comps.map((c) => [c.name, f(c.F!), f(c.angle), f(c.Fx), f(c.Fy)]) }];
  sol.steps.push({
    title: 'Step 1 — Resolve each known force into components',
    formulaLatex: 'F_x = F\\cos\\theta, \\quad F_y = F\\sin\\theta',
    workingLatex: comps.map((c) => `${c.name}:\\ F_x = ${f(c.F!)}\\cos ${f(c.angle)}^{\\circ} = ${f(c.Fx)},\\quad F_y = ${f(c.F!)}\\sin ${f(c.angle)}^{\\circ} = ${f(c.Fy)}`),
    resultLatex: `\\Sigma F_x = ${f(sx)}\\ \\text{N},\\quad \\Sigma F_y = ${f(sy)}\\ \\text{N}`,
  });
  if (unknown.length === 0) {
    const R = Math.hypot(sx, sy);
    const th = deg(Math.atan2(sy, sx));
    sol.find.push({ symbolLatex: 'R', name: 'Resultant' });
    sol.steps.push({
      title: 'Step 2 — Resultant magnitude and direction',
      formulaLatex: 'R = \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2},\\quad \\theta = \\tan^{-1}\\frac{\\Sigma F_y}{\\Sigma F_x}',
      substitutionLatex: `R = \\sqrt{(${f(sx)})^2 + (${f(sy)})^2}`,
      resultLatex: `R = ${f(R)}\\ \\text{N} \\text{ at } ${f(th)}^{\\circ} \\text{ from } +x`,
      explanation: 'The equilibrant is equal in magnitude and opposite in direction to the resultant.',
    });
    sol.finals.push({ symbolLatex: 'R', name: 'Resultant', valueSI: R, quantity: 'force' });
    sol.finals.push({ symbolLatex: '\\theta_R', name: 'Direction of resultant (from +x, anticlockwise)', valueSI: th * D2R, quantity: 'angle' });
    sol.finals.push({ symbolLatex: 'E', name: 'Equilibrant (opposite direction)', valueSI: R, quantity: 'force', suffix: `at ${f(((th + 180) % 360 + 360) % 360)}°` });
    sol.ok = true;
    return sol;
  }
  if (unknown.length !== 2) {
    sol.issues.push({ level: 'error', message: `With two equations (ΣFx = 0, ΣFy = 0) exactly two unknown magnitudes can be found — ${unknown.length} are unknown.` });
    return sol;
  }
  const [u1, u2] = unknown;
  const A = [
    [Math.cos(u1.angle * D2R), Math.cos(u2.angle * D2R)],
    [Math.sin(u1.angle * D2R), Math.sin(u2.angle * D2R)],
  ];
  const x = solveLinear(A, [-sx, -sy]);
  if (!x) {
    sol.issues.push({ level: 'error', message: 'The two unknown forces are parallel — they cannot balance a general load.' });
    return sol;
  }
  sol.find.push({ symbolLatex: u1.name, name: 'Unknown force' }, { symbolLatex: u2.name, name: 'Unknown force' });
  const c1 = f(Math.cos(u1.angle * D2R));
  const c2 = f(Math.cos(u2.angle * D2R));
  const s1 = f(Math.sin(u1.angle * D2R));
  const s2 = f(Math.sin(u2.angle * D2R));
  sol.steps.push({
    title: 'Step 2 — Equilibrium equations',
    formulaLatex: '\\Sigma F_x = 0, \\quad \\Sigma F_y = 0',
    workingLatex: [
      `\\Sigma F_x:\\ ${u1.name}\\cos ${u1.angle}^{\\circ} + ${u2.name}\\cos ${u2.angle}^{\\circ} + (${f(sx)}) = 0 \\Rightarrow ${c1}${u1.name} + ${c2}${u2.name} = ${f(-sx)}`,
      `\\Sigma F_y:\\ ${u1.name}\\sin ${u1.angle}^{\\circ} + ${u2.name}\\sin ${u2.angle}^{\\circ} + (${f(sy)}) = 0 \\Rightarrow ${s1}${u1.name} + ${s2}${u2.name} = ${f(-sy)}`,
    ],
    resultLatex: `${u1.name} = ${f(x[0])}\\ \\text{N},\\quad ${u2.name} = ${f(x[1])}\\ \\text{N}`,
    explanation: 'Solve the two simultaneous equations. A negative answer means the force acts opposite to the assumed direction (e.g. a strut in compression rather than a cable in tension — a cable cannot push).',
  });
  sol.finals.push({ symbolLatex: u1.name, name: `Force at ${u1.angle}°`, valueSI: x[0], quantity: 'force' });
  sol.finals.push({ symbolLatex: u2.name, name: `Force at ${u2.angle}°`, valueSI: x[1], quantity: 'force' });
  if (x[0] < 0 || x[1] < 0) sol.issues.push({ level: 'warning', message: 'A negative result means that force acts in the opposite direction to that assumed.' });
  sol.ok = true;
  return sol;
}

export type InclineCase = 'up' | 'hold' | 'accel' | 'check';

export interface InclineInput {
  m: number; // kg
  theta: number; // deg incline
  mu: number;
  alpha?: number; // deg — angle of applied force above the incline surface
  P?: number; // N applied force (for accel / check)
  g?: number;
  mode: InclineCase;
}

export function inclineSolution(inp: InclineInput): Solution {
  const sol = emptySolution('Friction on an inclined plane');
  sol.module = 'transport';
  sol.topic = 'Friction';
  const g = inp.g ?? 9.81;
  const th = inp.theta * D2R;
  const al = (inp.alpha ?? 0) * D2R;
  if (!(inp.m > 0)) sol.issues.push({ level: 'error', message: 'Mass must be positive.' });
  if (inp.theta < 0 || inp.theta >= 90) sol.issues.push({ level: 'error', message: 'Incline angle must be between 0° and 90°.' });
  if (inp.mu < 0) sol.issues.push({ level: 'error', message: 'μ cannot be negative.' });
  if (sol.issues.length) return sol;
  sol.given.push(
    { symbolLatex: 'm', name: 'Mass', raw: `${inp.m} kg`, valueSI: inp.m, quantity: 'mass', unit: 'kg' },
    { symbolLatex: '\\theta', name: 'Incline angle', raw: `${inp.theta}°`, valueSI: th, quantity: 'angle', unit: '°' },
    { symbolLatex: '\\mu', name: 'Coefficient of friction', raw: `${inp.mu}`, valueSI: inp.mu, quantity: 'ratio', unit: '' },
  );
  if (inp.alpha) sol.given.push({ symbolLatex: '\\alpha', name: 'Angle of applied force to the incline', raw: `${inp.alpha}°`, valueSI: al, quantity: 'angle', unit: '°' });
  const W = inp.m * g;
  const Wpar = W * Math.sin(th);
  const Wperp = W * Math.cos(th);
  sol.steps.push({ title: 'Step 1 — Weight', formulaId: 'weight', formulaLatex: 'W = mg', substitutionLatex: `W = ${f(inp.m)}\\ \\text{kg} \\times ${f(g)}\\ \\text{m/s}^2`, resultLatex: `W = ${f(W)}\\ \\text{N}`, unitCheckLatex: '\\text{kg} \\times \\text{m/s}^2 = \\text{N}\\ \\checkmark', unitCheckOk: true });
  sol.steps.push({
    title: 'Step 2 — Resolve the weight parallel and perpendicular to the incline',
    formulaLatex: 'W_{\\parallel} = W\\sin\\theta, \\quad W_{\\perp} = W\\cos\\theta',
    workingLatex: [`W_{\\parallel} = ${f(W)} \\sin ${f(inp.theta)}^{\\circ} = ${f(Wpar)}\\ \\text{N}`, `W_{\\perp} = ${f(W)} \\cos ${f(inp.theta)}^{\\circ} = ${f(Wperp)}\\ \\text{N}`],
    resultLatex: '',
  });
  const phi = deg(Math.atan(inp.mu));
  if (inp.mode === 'check') {
    const slides = inp.theta > phi;
    sol.steps.push({
      title: 'Step 3 — Will it slide? Compare the incline with the angle of friction',
      formulaLatex: '\\mu = \\tan\\phi \\Rightarrow \\phi = \\tan^{-1}\\mu',
      substitutionLatex: `\\phi = \\tan^{-1}(${f(inp.mu)})`,
      resultLatex: `\\phi = ${f(phi)}^{\\circ}\\ ${slides ? '<' : '\\ge'}\\ \\theta = ${f(inp.theta)}^{\\circ}`,
      explanation: slides ? 'The incline is steeper than the angle of friction, so the block slides down unless held.' : 'The incline is less steep than the angle of friction, so the block stays at rest (friction ≤ μN is sufficient).',
    });
    sol.finals.push({ symbolLatex: '\\phi', name: 'Angle of friction (repose)', valueSI: phi * D2R, quantity: 'angle' });
    sol.finals.push({ symbolLatex: 'F_{req}', name: 'Friction needed to hold (W sin θ)', valueSI: Wpar, quantity: 'force', suffix: slides ? 'exceeds μN → slides' : '≤ μN → stays at rest' });
    sol.ok = true;
    return sol;
  }
  if (inp.mode === 'up' || inp.mode === 'hold') {
    const up = inp.mode === 'up';
    // P cosα ± μ(W⊥ − P sinα) = W∥  →  P = (W∥ ± μW⊥)/(cosα ± μ sinα)
    const num = up ? Wpar + inp.mu * Wperp : Wpar - inp.mu * Wperp;
    const den = up ? Math.cos(al) + inp.mu * Math.sin(al) : Math.cos(al) - inp.mu * Math.sin(al);
    const P = num / den;
    const N = Wperp - P * Math.sin(al);
    sol.find.push({ symbolLatex: 'P', name: up ? 'Force to move the load up the incline (limiting)' : 'Minimum force to prevent sliding down' });
    sol.steps.push({
      title: `Step 3 — ${up ? 'Friction acts down the slope (opposing upward motion)' : 'Friction acts up the slope (opposing sliding down)'}`,
      formulaLatex: up ? 'P\\cos\\alpha = W_{\\parallel} + \\mu N,\\quad N = W_{\\perp} - P\\sin\\alpha' : 'P\\cos\\alpha + \\mu N = W_{\\parallel},\\quad N = W_{\\perp} - P\\sin\\alpha',
      rearrangedLatex: up ? 'P = \\frac{W_{\\parallel} + \\mu W_{\\perp}}{\\cos\\alpha + \\mu\\sin\\alpha}' : 'P = \\frac{W_{\\parallel} - \\mu W_{\\perp}}{\\cos\\alpha - \\mu\\sin\\alpha}',
      substitutionLatex: `P = \\frac{${f(Wpar)} ${up ? '+' : '-'} ${f(inp.mu)} \\times ${f(Wperp)}}{\\cos ${f(inp.alpha ?? 0)}^{\\circ} ${up ? '+' : '-'} ${f(inp.mu)}\\sin ${f(inp.alpha ?? 0)}^{\\circ}}`,
      resultLatex: `P = ${f(P)}\\ \\text{N}`,
      unitCheckLatex: '\\frac{\\text{N}}{1} = \\text{N}\\ \\checkmark',
      unitCheckOk: true,
      explanation: 'Friction always opposes the (impending) motion and has maximum value F = μN at the point of slipping.',
    });
    if (!up && P <= 0) {
      sol.issues.push({ level: 'warning', message: 'No force is needed — friction alone holds the load (θ ≤ angle of friction).' });
      sol.finals.push({ symbolLatex: 'P', name: 'Force required to hold', valueSI: 0, quantity: 'force' });
    } else sol.finals.push({ symbolLatex: 'P', name: up ? 'Force to move up the incline' : 'Force to prevent sliding', valueSI: P, quantity: 'force' });
    sol.finals.push({ symbolLatex: 'N', name: 'Normal reaction', valueSI: N, quantity: 'force' });
    sol.finals.push({ symbolLatex: 'F_f', name: 'Friction force (limiting)', valueSI: inp.mu * N, quantity: 'force' });
    if (N < 0) sol.issues.push({ level: 'error', message: 'Normal force is negative — the applied force would lift the body off the surface.' });
    sol.ok = N >= 0;
    return sol;
  }
  // acceleration with applied force P up the slope
  const P = inp.P ?? 0;
  const N = Wperp - P * Math.sin(al);
  const drive = P * Math.cos(al) - Wpar;
  const Ff = inp.mu * N;
  let net: number;
  if (Math.abs(drive) <= Ff) net = 0;
  else net = drive > 0 ? drive - Ff : drive + Ff;
  const a = net / inp.m;
  sol.given.push({ symbolLatex: 'P', name: 'Applied force (up the slope)', raw: `${P} N`, valueSI: P, quantity: 'force', unit: 'N' });
  sol.steps.push({
    title: 'Step 3 — Net force along the incline',
    formulaLatex: 'F_{net} = P\\cos\\alpha - W_{\\parallel} \\mp \\mu N',
    workingLatex: [`N = ${f(Wperp)} - ${f(P)}\\sin ${f(inp.alpha ?? 0)}^{\\circ} = ${f(N)}\\ \\text{N}`, `F_f = \\mu N = ${f(inp.mu)} \\times ${f(N)} = ${f(Ff)}\\ \\text{N}`, `F_{net} = ${f(net)}\\ \\text{N}`],
    resultLatex: `a = \\frac{F_{net}}{m} = \\frac{${f(net)}}{${f(inp.m)}} = ${f(a)}\\ \\text{m/s}^2`,
    explanation: net === 0 ? 'The driving force does not exceed limiting friction, so the body stays at rest.' : 'Positive a is up the slope.',
  });
  sol.finals.push({ symbolLatex: 'a', name: 'Acceleration (up the slope +)', valueSI: a, quantity: 'acceleration' });
  sol.ok = true;
  return sol;
}

export interface GearStage {
  driver: number; // teeth (or diameter)
  driven: number;
}

export interface GearInput {
  stages: GearStage[];
  nIn?: number; // rad/s
  Tin?: number; // N·m
  eta?: number; // overall efficiency 0–1
  idlers?: number;
  unitLabel?: 'teeth' | 'diameter';
}

export function gearSolution(inp: GearInput): Solution {
  const sol = emptySolution('Gear / pulley train');
  sol.module = 'transport';
  sol.topic = 'Mechanisms';
  if (!inp.stages.length || inp.stages.some((s) => !(s.driver > 0 && s.driven > 0))) {
    sol.issues.push({ level: 'error', message: 'Every gear must have a positive number of teeth (or diameter).' });
    return sol;
  }
  const eta = inp.eta ?? 1;
  if (eta <= 0 || eta > 1) sol.issues.push({ level: eta > 1 ? 'error' : 'error', message: 'Efficiency must be between 0 and 100%.' });
  if (sol.issues.length) return sol;
  const GR = inp.stages.reduce((p, s) => p * (s.driven / s.driver), 1);
  const word = inp.unitLabel === 'diameter' ? 'D' : 'T';
  inp.stages.forEach((s, i) => sol.given.push({ symbolLatex: `\\text{Stage } ${i + 1}`, name: 'driver → driven', raw: `${s.driver} → ${s.driven}`, valueSI: s.driven / s.driver, quantity: 'ratio', unit: '' }));
  sol.steps.push({
    title: 'Step 1 — Overall gear ratio (velocity ratio)',
    formulaLatex: `GR = \\frac{${word}_{driven,1}}{${word}_{driver,1}} \\times \\frac{${word}_{driven,2}}{${word}_{driver,2}} \\times \\cdots`,
    substitutionLatex: `GR = ${inp.stages.map((s) => `\\frac{${s.driven}}{${s.driver}}`).join(' \\times ')}`,
    resultLatex: `GR = ${f(GR)} \\;(${GR >= 1 ? `${f(GR)}:1 \\text{ reduction}` : `1:${f(1 / GR)} \\text{ overdrive}`})`,
    explanation: 'Gears on the same shaft (compound) turn at the same speed. Idler gears change direction only, not the ratio.',
  });
  sol.finals.push({ symbolLatex: 'GR', name: 'Overall gear ratio (VR)', valueSI: GR, quantity: 'ratio' });
  const external = inp.stages.length + (inp.idlers ?? 0);
  sol.finals.push({ symbolLatex: '\\text{Dir}', name: 'Output direction', valueSI: external % 2 === 0 ? 1 : -1, quantity: 'dimensionless', suffix: external % 2 === 0 ? 'same as input' : 'opposite to input' });
  if (inp.nIn !== undefined) {
    const nOut = inp.nIn / GR;
    sol.steps.push({ title: 'Step 2 — Output speed', formulaLatex: 'N_{out} = \\frac{N_{in}}{GR}', substitutionLatex: `N_{out} = \\frac{${f((inp.nIn * 60) / (2 * Math.PI))}\\ \\text{rpm}}{${f(GR)}}`, resultLatex: `N_{out} = ${f((nOut * 60) / (2 * Math.PI))}\\ \\text{rpm}` });
    sol.finals.push({ symbolLatex: 'N_{out}', name: 'Output speed', valueSI: nOut, quantity: 'angularVelocity' });
  }
  if (inp.Tin !== undefined) {
    const Tout = inp.Tin * GR * eta;
    sol.steps.push({ title: 'Step 3 — Output torque', formulaId: 'gearTorque', formulaLatex: 'T_{out} = T_{in} \\times GR \\times \\eta', substitutionLatex: `T_{out} = ${f(inp.Tin)}\\ \\text{N·m} \\times ${f(GR)} \\times ${f(eta)}`, resultLatex: `T_{out} = ${f(Tout)}\\ \\text{N·m}` });
    sol.finals.push({ symbolLatex: 'T_{out}', name: 'Output torque', valueSI: Tout, quantity: 'torque' });
    if (inp.nIn !== undefined) {
      const Pin = inp.Tin * inp.nIn;
      sol.steps.push({ title: 'Step 4 — Power', formulaId: 'rotPower', formulaLatex: 'P = T\\omega', workingLatex: [`P_{in} = ${f(inp.Tin)} \\times ${f(inp.nIn)} = ${f(Pin)}\\ \\text{W}`, `P_{out} = \\eta P_{in} = ${f(eta * Pin)}\\ \\text{W}`], resultLatex: '' });
      sol.finals.push({ symbolLatex: 'P_{out}', name: 'Output power', valueSI: eta * Pin, quantity: 'power' });
    }
  }
  sol.ok = true;
  return sol;
}

export type FlightMode = 'level' | 'climb' | 'glide' | 'turn';
export interface FlightInput {
  mode: FlightMode;
  m: number; // kg
  LD: number;
  angle?: number; // deg climb angle or bank angle
  thrust?: number; // N (climb: find angle from thrust)
  height?: number; // m (glide distance)
  S?: number; // wing area m²
  g?: number;
}

export function flightSolution(inp: FlightInput): Solution {
  const sol = emptySolution('Aircraft flight forces');
  sol.module = 'aero';
  sol.topic = 'Flight forces';
  const g = inp.g ?? 9.81;
  if (!(inp.m > 0)) sol.issues.push({ level: 'error', message: 'Mass must be positive.' });
  if (!(inp.LD > 0)) sol.issues.push({ level: 'error', message: 'L/D must be positive.' });
  if (sol.issues.length) return sol;
  const W = inp.m * g;
  sol.given.push({ symbolLatex: 'm', name: 'Aircraft mass', raw: `${inp.m} kg`, valueSI: inp.m, quantity: 'mass', unit: 'kg' });
  sol.given.push({ symbolLatex: 'L/D', name: 'Lift-to-drag ratio', raw: `${inp.LD}`, valueSI: inp.LD, quantity: 'ratio', unit: '' });
  sol.steps.push({ title: 'Step 1 — Weight', formulaId: 'weight', formulaLatex: 'W = mg', substitutionLatex: `W = ${f(inp.m)} \\times ${f(g)}`, resultLatex: `W = ${f(W)}\\ \\text{N}` });
  let L = W;
  let D = W / inp.LD;
  let T = D;
  if (inp.mode === 'level') {
    sol.steps.push({ title: 'Step 2 — Straight and level: ΣFy = 0, ΣFx = 0', formulaLatex: 'L = W, \\quad T = D = \\frac{L}{L/D}', workingLatex: [`L = W = ${f(L)}\\ \\text{N}`, `D = \\frac{${f(L)}}{${f(inp.LD)}} = ${f(D)}\\ \\text{N}`], resultLatex: `T = D = ${f(T)}\\ \\text{N}`, explanation: 'In unaccelerated level flight lift balances weight and thrust balances drag.' });
  } else if (inp.mode === 'climb') {
    const gam = (inp.angle ?? 0) * D2R;
    L = W * Math.cos(gam);
    D = L / inp.LD;
    T = D + W * Math.sin(gam);
    sol.given.push({ symbolLatex: '\\gamma', name: 'Climb angle', raw: `${inp.angle}°`, valueSI: gam, quantity: 'angle', unit: '°' });
    sol.steps.push({
      title: 'Step 2 — Steady climb: resolve perpendicular and parallel to the flight path',
      formulaLatex: 'L = W\\cos\\gamma, \\quad T = D + W\\sin\\gamma',
      workingLatex: [`L = ${f(W)}\\cos ${f(inp.angle ?? 0)}^{\\circ} = ${f(L)}\\ \\text{N}`, `D = \\frac{L}{L/D} = \\frac{${f(L)}}{${f(inp.LD)}} = ${f(D)}\\ \\text{N}`, `T = ${f(D)} + ${f(W)}\\sin ${f(inp.angle ?? 0)}^{\\circ}`],
      resultLatex: `T = ${f(T)}\\ \\text{N}`,
      explanation: 'In a climb, a component of weight acts backwards along the flight path, so thrust must exceed drag.',
    });
  } else if (inp.mode === 'glide') {
    const gam = Math.atan(1 / inp.LD);
    L = W * Math.cos(gam);
    D = W * Math.sin(gam);
    T = 0;
    sol.steps.push({
      title: 'Step 2 — Steady glide (no thrust)',
      formulaLatex: '\\tan\\gamma = \\frac{D}{L} = \\frac{1}{L/D}, \\quad L = W\\cos\\gamma, \\quad D = W\\sin\\gamma',
      workingLatex: [`\\gamma = \\tan^{-1}\\left(\\frac{1}{${f(inp.LD)}}\\right) = ${f(deg(gam))}^{\\circ}`, `L = ${f(L)}\\ \\text{N}, \\quad D = ${f(D)}\\ \\text{N}`],
      resultLatex: `\\gamma = ${f(deg(gam))}^{\\circ}`,
      explanation: 'The weight component along the glide path provides the “thrust” that balances drag.',
    });
    sol.finals.push({ symbolLatex: '\\gamma', name: 'Glide angle', valueSI: gam, quantity: 'angle' });
    if (inp.height) {
      const dist = inp.height * inp.LD;
      sol.steps.push({ title: 'Step 3 — Glide distance', formulaId: 'glideRatio', formulaLatex: '\\text{distance} = h \\times \\frac{L}{D}', substitutionLatex: `x = ${f(inp.height)}\\ \\text{m} \\times ${f(inp.LD)}`, resultLatex: `x = ${f(dist)}\\ \\text{m}` });
      sol.finals.push({ symbolLatex: 'x', name: 'Horizontal glide distance', valueSI: dist, quantity: 'length' });
    }
  } else {
    const phi = (inp.angle ?? 0) * D2R;
    const n = 1 / Math.cos(phi);
    L = n * W;
    D = L / inp.LD;
    T = D;
    sol.steps.push({ title: 'Step 2 — Level banked turn', formulaLatex: 'L\\cos\\phi = W \\Rightarrow L = \\frac{W}{\\cos\\phi}, \\quad n = \\frac{L}{W}', workingLatex: [`L = \\frac{${f(W)}}{\\cos ${f(inp.angle ?? 0)}^{\\circ}} = ${f(L)}\\ \\text{N}`, `n = ${f(n)}\\ g`], resultLatex: `D = T = ${f(D)}\\ \\text{N}` });
    sol.finals.push({ symbolLatex: 'n', name: 'Load factor', valueSI: n, quantity: 'ratio' });
  }
  sol.finals.unshift({ symbolLatex: 'L', name: 'Lift', valueSI: L, quantity: 'force' }, { symbolLatex: 'D', name: 'Drag', valueSI: D, quantity: 'force' }, { symbolLatex: 'T', name: 'Thrust required', valueSI: T, quantity: 'force' }, { symbolLatex: 'W', name: 'Weight', valueSI: W, quantity: 'force' });
  if (inp.S && inp.S > 0) {
    const dp = L / inp.S;
    sol.steps.push({ title: 'Step 4 — Average pressure difference across the wing', formulaId: 'liftFromDp', formulaLatex: 'L = \\Delta P \\times S', rearrangedLatex: '\\Delta P = \\frac{L}{S}', substitutionLatex: `\\Delta P = \\frac{${f(L)}\\ \\text{N}}{${f(inp.S)}\\ \\text{m}^2}`, resultLatex: `\\Delta P = ${f(dp)}\\ \\text{Pa}` });
    sol.finals.push({ symbolLatex: '\\Delta P', name: 'Average pressure difference (= wing loading in level flight)', valueSI: dp, quantity: 'pressure' });
  }
  sol.ok = true;
  return sol;
}
