import { describe, expect, it } from 'vitest';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';
import { extractQuantities, normaliseText } from '../src/engine/interpreter/extract';

function solve(q: string) {
  const i = interpret(q);
  const s = solveInterpretation(i);
  return { i, s };
}
function final(q: string, symbol?: string) {
  const { i, s } = solve(q);
  const f = symbol ? s.finals.find((x) => x.symbolLatex === symbol) : s.finals[0];
  if (!f) throw new Error(`No final ${symbol ?? ''} for: ${q}\nproblem=${i.problemType} targets=${i.targets} q=${JSON.stringify(i.quantities.map((x) => [x.numText, x.unit, x.concept]))}\nissues=${JSON.stringify(s.issues)}`);
  return f.valueSI;
}
const near = (a: number, b: number, rel = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel);

describe('text extraction', () => {
  it('normalises scientific notation and thousands separators', () => {
    expect(normaliseText('I = 8 × 10^6 mm^4')).toContain('8e6');
    expect(normaliseText('a load of 12 000 N')).toContain('12000 N');
    expect(normaliseText('40,000,000 Pa')).toContain('40000000 Pa');
  });
  it('extracts value/unit pairs and symbols', () => {
    const qs = extractQuantities(normaliseText('F = 8 kN, A = 200 mm², E=200GPa, μ = 0.3, v = 72 km/h, θ = 30°'));
    expect(qs.map((q) => [q.value, q.unit, q.symbol])).toEqual([
      [8, 'kN', 'F'],
      [200, 'mm²', 'A'],
      [200, 'GPa', 'E'],
      [0.3, '', 'μ'],
      [72, 'km/h', 'v'],
      [30, '°', 'θ'],
    ]);
  });
});

describe('Smart Solver — HSC-style questions', () => {
  it('stress in a rod from diameter and load', () => {
    near(final('A steel rod with a diameter of 20 mm is subjected to a tensile load of 50 kN. Calculate the stress in the rod.'), 50000 / (Math.PI * 0.01 ** 2));
  });
  it("Young's modulus (stress → strain → modulus)", () => {
    near(final("A 2 m long steel bar with a cross-sectional area of 200 mm² extends by 0.5 mm under a load of 10 kN. Determine the Young's modulus of the steel."), 200e9);
  });
  it('symbolic data: F = 8 kN, A = 200 mm²', () => {
    near(final('F = 8 kN, A = 200 mm². Find the stress.'), 40e6);
  });
  it('σ = 200 MPa, ε = 0.001 → E', () => {
    near(final('σ = 200 MPa and ε = 0.001. Determine the modulus of elasticity.'), 200e9);
  });
  it('minimum area from UTS and factor of safety', () => {
    near(final('A cable has an ultimate tensile strength of 400 MPa and a factor of safety of 4 is used. It carries a load of 20 kN. Calculate the minimum cross-sectional area required.'), 200e-6);
  });
  it('braking force from speed and stopping distance', () => {
    near(final('A car of mass 1200 kg travelling at 72 km/h brakes to a stop in 40 m. Calculate the average braking force.'), 6000);
  });
  it('kinetic energy', () => {
    near(final('Calculate the kinetic energy of a 1500 kg car travelling at 90 km/h.'), 468750);
  });
  it('lifting power (PE → work → power)', () => {
    near(final('A crane lifts a mass of 500 kg through a height of 12 m in 20 s. Calculate the power developed.'), (500 * 9.81 * 12) / 20);
  });
  it('machine efficiency', () => {
    near(final('A pulley system has a velocity ratio of 4. An effort of 300 N raises a load of 1000 N. Calculate the efficiency.'), 1000 / 300 / 4);
  });
  it('series-parallel circuit current', () => {
    near(final('A resistor of 10 Ω is connected in series with a parallel combination of 20 Ω and 30 Ω across a 12 V supply. Calculate the current drawn from the supply.', 'I'), 12 / 22);
  });
  it('wavelength from frequency', () => {
    near(final('Calculate the wavelength of a radio signal with a frequency of 100 MHz.'), 3);
  });
  it('simply supported beam reactions and max BM', () => {
    const { s } = solve('A simply supported beam 6 m long carries a point load of 12 kN at 2 m from the left support. Calculate the reactions and the maximum bending moment.');
    near(s.finals.find((f) => f.symbolLatex === 'R_A')!.valueSI, 8000);
    near(s.finals.find((f) => f.symbolLatex === 'M_{max}')!.valueSI, 16000);
  });
  it('beam with UDL over whole span', () => {
    const { s } = solve('A simply supported beam of span 8 m carries a uniformly distributed load of 5 kN/m over the whole span. Determine the maximum bending moment.');
    near(s.finals.find((f) => f.symbolLatex === 'M_{max}')!.valueSI, 40000);
  });
  it('cantilever bending stress', () => {
    near(final('A cantilever beam 2 m long carries a load of 5 kN at its free end. The beam has I = 8 × 10^6 mm^4 and y = 100 mm. Calculate the maximum bending stress.', '\\sigma_{max}'), 125e6);
  });
  it('incline: force to push up', () => {
    near(final('A block of mass 20 kg rests on a plane inclined at 30°. The coefficient of friction is 0.3. Calculate the force parallel to the plane required to push the block up the plane.', 'P'), 20 * 9.81 * (0.5 + 0.3 * Math.cos(Math.PI / 6)));
  });
  it('aircraft thrust in level flight', () => {
    near(final('An aircraft of mass 60 000 kg is in straight and level flight. Its lift-to-drag ratio is 15. Calculate the thrust required.'), (60000 * 9.81) / 15);
  });
  it('Bernoulli lift on a wing', () => {
    near(final('Air flows over the upper surface of a wing at 80 m/s and under the lower surface at 70 m/s. The air density is 1.2 kg/m³ and the wing area is 20 m². Calculate the lift.'), 18000);
  });
  it('critical angle of an optical fibre', () => {
    near(final('The core of an optical fibre has a refractive index of 1.48 and the cladding has a refractive index of 1.46. Calculate the critical angle.'), Math.asin(1.46 / 1.48));
  });
  it('two unknowns in one sentence', () => {
    const { s } = solve('A 240 V heater draws a current of 8 A. Calculate its power and resistance.');
    near(s.finals.find((f) => f.symbolLatex === 'P')!.valueSI, 1920);
    near(s.finals.find((f) => f.symbolLatex === 'R')!.valueSI, 30);
  });
  it('number conversion', () => {
    const { i, s } = solve('Convert 45 to binary.');
    expect(i.problemType).toBe('numbase');
    expect(s.tables![0].rows.find((r) => r[0] === 'Binary')![1]).toBe('101101');
  });
  it('truth table', () => {
    const { i } = solve("Complete the truth table for X = A.B + C'");
    expect(i.problemType).toBe('logic');
  });
  it('hydraulic jack', () => {
    near(final('A hydraulic jack has a small piston of diameter 20 mm and a large piston of diameter 100 mm. A force of 200 N is applied to the small piston. Calculate the force on the large piston.'), 5000);
  });
  it('motor efficiency', () => {
    near(final('A motor has an input power of 2 kW and an output power of 1.7 kW. Calculate its efficiency.'), 0.85);
  });
  it('engine power from torque and rpm', () => {
    near(final('An engine produces a torque of 250 N·m at 3000 rpm. Calculate the power.'), 250 * 100 * Math.PI);
  });
  it('satellite round-trip delay', () => {
    near(final('A geostationary satellite orbits at an altitude of 35 786 km. Calculate the time delay for a signal travelling up to the satellite and back.'), (2 * 35786e3) / 3e8);
  });
  it('double shear', () => {
    near(final('Calculate the shear stress in a 25 mm diameter pin in double shear carrying a load of 40 kN.'), 40000 / (2 * Math.PI * 0.0125 ** 2));
  });
  it('strain', () => {
    near(final('A 4 m long rod stretches 2 mm under load. Calculate the strain.'), 0.0005);
  });
  it('hydrostatic pressure with assumed water density', () => {
    near(final('Water behind a dam is 25 m deep. Calculate the pressure at the base of the dam.'), 1000 * 9.81 * 25);
  });
  it('stress from a hanging mass', () => {
    near(final('A mass of 500 kg hangs from a steel wire of diameter 4 mm. Find the stress in the wire.'), (500 * 9.81) / (Math.PI * 0.002 ** 2));
  });
  it('simple gear pair speed', () => {
    near(final('A gear with 20 teeth drives a gear with 60 teeth. If the driver rotates at 1200 rpm, calculate the speed of the driven gear.'), (400 * 2 * Math.PI) / 60);
  });
  it('angle of repose gives μ', () => {
    near(final('A block on a ramp just begins to slide when the ramp is inclined at 22°. Calculate the coefficient of friction.'), Math.tan((22 * Math.PI) / 180));
  });
  it('lever rule', () => {
    const { i } = solve('Calculate the percentage of pearlite in a 0.4% carbon steel slowly cooled to room temperature.');
    expect(i.problemType).toBe('lever');
  });
  it('glide distance', () => {
    near(final('A glider with a lift-to-drag ratio of 30 is at an altitude of 1500 m. How far can it glide in still air?'), 45000);
  });
  it('flags missing data', () => {
    const { s } = solve('Calculate the stress in a rod carrying 10 kN.');
    expect(s.ok).toBe(false);
    expect(s.issues.some((x) => /Missing data/.test(x.message))).toBe(true);
  });
  it('flags inconsistent inputs', () => {
    const { s } = solve('σ = 200 MPa, ε = 0.001 and E = 150 GPa. Calculate the force if the area is 100 mm².');
    expect(s.issues.some((x) => /Inconsistent/.test(x.message))).toBe(true);
  });
});
