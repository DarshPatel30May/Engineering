import { describe, expect, it } from 'vitest';
import { analyseBeam, beamSolution } from '../src/engine/tools/beam';
import { analyseTruss, trussSolution } from '../src/engine/tools/truss';
import { circuitSolution, parseNetwork, totalR } from '../src/engine/tools/circuit';
import { truthTable } from '../src/engine/tools/logic';
import { numberSolution, parseInBase, toBase, twosComplement } from '../src/engine/tools/numbase';
import { sectionProps, SECTION_PRESETS, centroidSolution } from '../src/engine/tools/section';
import { forcesSolution, inclineSolution, gearSolution, flightSolution } from '../src/engine/tools/mechanics';
import { leverRuleSolution, tensileSolution } from '../src/engine/tools/materials';

const near = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(Math.abs(b), 1) * tol);

describe('beam analyser', () => {
  it('SS beam with a single point load', () => {
    const r = analyseBeam({ type: 'simply', length: 6, points: [{ x: 2, P: 12000 }], udls: [], couples: [] });
    near(r.reactions[0].value, 8000);
    near(r.reactions[1].value, 4000);
    near(r.maxM.M, 16000);
    near(r.maxM.x, 2);
  });
  it('SS beam with full UDL: M = wL²/8 at mid-span', () => {
    const r = analyseBeam({ type: 'simply', length: 8, points: [], udls: [{ x1: 0, x2: 8, w: 5000 }], couples: [] });
    near(r.reactions[0].value, 20000);
    near(r.maxM.M, 40000);
    near(r.maxM.x, 4);
  });
  it('mixed point load + partial UDL', () => {
    const r = analyseBeam({ type: 'simply', length: 10, points: [{ x: 3, P: 20000 }], udls: [{ x1: 5, x2: 10, w: 4000 }], couples: [] });
    near(r.reactions[1].value, 21000);
    near(r.reactions[0].value, 19000);
    near(r.maxM.M, 57000);
  });
  it('partial UDL with zero shear inside the UDL', () => {
    // SS 6 m, UDL 10 kN/m from 0 to 4 m: RB = 40*2/6 = 13.333, RA = 26.667, V=0 at x = 2.6667, Mmax = 26.667²/(2*10) = 35.556 kN·m
    const r = analyseBeam({ type: 'simply', length: 6, points: [], udls: [{ x1: 0, x2: 4, w: 10000 }], couples: [] });
    near(r.maxM.x, 26.6667 / 10, 1e-4);
    near(r.maxM.M, (26666.667 ** 2) / (2 * 10000), 1e-5);
  });
  it('cantilever with end load and UDL', () => {
    const r = analyseBeam({ type: 'cantilever-left', length: 3, points: [{ x: 3, P: 2000 }], udls: [{ x1: 0, x2: 3, w: 1000 }], couples: [] });
    near(r.reactions[0].value, 5000);
    near(Math.abs(r.fixingMoment!), 10500);
    near(r.maxM.M, -10500);
    near(r.maxM.x, 0);
  });
  it('right-fixed cantilever', () => {
    const r = analyseBeam({ type: 'cantilever-right', length: 2, points: [{ x: 0, P: 1000 }], udls: [], couples: [] });
    near(Math.abs(r.maxM.M), 2000);
  });
  it('overhanging beam gives a negative reaction and hogging moment', () => {
    const r = analyseBeam({ type: 'simply', length: 6, a: 0, b: 4, points: [{ x: 6, P: 10000 }], udls: [], couples: [] });
    near(r.reactions[1].value, 15000);
    near(r.reactions[0].value, -5000);
    near(r.maxM.M, -20000);
  });
  it('applied couple on a simply supported beam', () => {
    // 10 kN·m clockwise couple at mid-span of a 5 m beam: RB = 2 kN up, RA = -2 kN
    const r = analyseBeam({ type: 'simply', length: 5, points: [], udls: [], couples: [{ x: 2.5, M: 10000 }] });
    near(r.reactions[1].value, 2000);
    near(r.reactions[0].value, -2000);
    near(Math.abs(r.maxM.M), 5000);
  });
  it('produces working and bending stress', () => {
    const s = beamSolution({ type: 'simply', length: 4, points: [{ x: 2, P: 10000 }], udls: [], couples: [], I: 8e-6, y: 0.1 });
    expect(s.ok).toBe(true);
    const sigma = s.finals.find((f) => f.symbolLatex === '\\sigma_{max}')!;
    near(sigma.valueSI, (10000 * 1) * 0.1 / 8e-6);
  });
  it('rejects loads outside the beam', () => {
    const s = beamSolution({ type: 'simply', length: 4, points: [{ x: 5, P: 1000 }], udls: [], couples: [] });
    expect(s.ok).toBe(false);
  });
});

describe('truss solver', () => {
  const tri = {
    nodes: [
      { id: 'A', x: 0, y: 0 },
      { id: 'B', x: 4, y: 0 },
      { id: 'C', x: 2, y: 2 },
    ],
    members: [
      { id: 'AB', a: 'A', b: 'B' },
      { id: 'AC', a: 'A', b: 'C' },
      { id: 'BC', a: 'B', b: 'C' },
    ],
    supports: [
      { node: 'A', type: 'pin' as const },
      { node: 'B', type: 'roller-y' as const },
    ],
    loads: [{ node: 'C', Fx: 0, Fy: -10000 }],
  };
  it('triangle truss member forces', () => {
    const r = analyseTruss(tri);
    near(r.forces.AC, -10000 / Math.SQRT2);
    near(r.forces.BC, -10000 / Math.SQRT2);
    near(r.forces.AB, 5000);
    near(r.reactions.find((x) => x.node === 'B')!.value, 5000);
  });
  it('Warren-type truss with 5 joints', () => {
    // bottom chord A(0,0) B(4,0) C(8,0); top D(2,2) E(6,2); load 10 kN at B
    const r = analyseTruss({
      nodes: [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 4, y: 0 },
        { id: 'C', x: 8, y: 0 },
        { id: 'D', x: 2, y: 2 },
        { id: 'E', x: 6, y: 2 },
      ],
      members: [
        { id: 'AB', a: 'A', b: 'B' },
        { id: 'BC', a: 'B', b: 'C' },
        { id: 'AD', a: 'A', b: 'D' },
        { id: 'BD', a: 'B', b: 'D' },
        { id: 'BE', a: 'B', b: 'E' },
        { id: 'CE', a: 'C', b: 'E' },
        { id: 'DE', a: 'D', b: 'E' },
      ],
      supports: [
        { node: 'A', type: 'pin' },
        { node: 'C', type: 'roller-y' },
      ],
      loads: [{ node: 'B', Fx: 0, Fy: -10000 }],
    });
    near(r.forces.AD, -5000 * Math.SQRT2);
    near(r.forces.AB, 5000);
    near(r.forces.DE, -10000);
    near(r.forces.BD, 5000 * Math.SQRT2);
  });
  it('detects an unstable truss', () => {
    const s = trussSolution({ ...tri, members: tri.members.slice(0, 2) });
    expect(s.ok).toBe(false);
  });
  it('member stress from area (multi-step)', () => {
    const s = trussSolution({ ...tri, members: tri.members.map((m) => ({ ...m, area: 100e-6 })) });
    expect(s.ok).toBe(true);
    expect(s.tables![0].headers).toContain('σ (MPa)');
  });
});

describe('circuit analyser', () => {
  it('series-parallel network', () => {
    const net = parseNetwork('10 + (20 || 30)');
    near(totalR(net), 22);
    const s = circuitSolution({ network: '10 + (20 || 30)', V: 12 });
    near(s.finals.find((f) => f.symbolLatex === 'I')!.valueSI, 12 / 22);
    near(s.finals.find((f) => f.symbolLatex === 'P')!.valueSI, (12 * 12) / 22);
  });
  it('named resistors and k suffix', () => {
    near(totalR(parseNetwork('R1 // R2', { R1: 4700, R2: 4700 })), 2350);
    near(totalR(parseNetwork('4.7k + 2.2k')), 6900);
  });
  it('power sums to total', () => {
    const s = circuitSolution({ network: '(100 || 220) + 47 + (10 + 330) || 1k', V: 24 });
    expect(s.ok).toBe(true);
  });
});

describe('logic', () => {
  it('truth table of A·B + C\'', () => {
    const t = truthTable("A.B + C'");
    expect(t.vars).toEqual(['A', 'B', 'C']);
    expect(t.output).toEqual([1, 0, 1, 0, 1, 0, 1, 1]);
  });
  it('NAND, NOR, XOR keywords and implicit AND', () => {
    expect(truthTable('A NAND B').output).toEqual([1, 1, 1, 0]);
    expect(truthTable('A NOR B').output).toEqual([1, 0, 0, 0]);
    expect(truthTable('A XOR B').output).toEqual([0, 1, 1, 0]);
    expect(truthTable("AB'").output).toEqual([0, 0, 1, 0]);
    expect(truthTable('NOT (A + B)').output).toEqual([1, 0, 0, 0]);
  });
});

describe('number systems', () => {
  it('converts between bases', () => {
    expect(toBase(45, 2)).toBe('101101');
    expect(toBase(45, 16)).toBe('2D');
    expect(parseInBase('2D', 16)).toBe(45);
    expect(parseInBase('101101', 2)).toBe(45);
    expect(twosComplement(-5, 8)).toBe('11111011');
    expect(numberSolution('255', 10).ok).toBe(true);
  });
  it('rejects invalid digits', () => {
    expect(numberSolution('102', 2).ok).toBe(false);
  });
});

describe('section properties', () => {
  it('rectangle', () => {
    const r = sectionProps(SECTION_PRESETS.rectangle(0.05, 0.2));
    near(r.I, (0.05 * 0.2 ** 3) / 12);
    near(r.ybar, 0.1);
  });
  it('symmetric I-beam', () => {
    const r = sectionProps(SECTION_PRESETS.iBeam(0.1, 0.01, 0.18, 0.006));
    near(r.I * 1e12, 20982666.667, 1e-8);
    near(r.ybar, 0.1);
  });
  it('T-beam neutral axis', () => {
    // web 10×100 (0–100), flange 100×10 (100–110): ybar = (1000*50 + 1000*105)/2000 = 77.5 mm
    const r = sectionProps(SECTION_PRESETS.tBeam(0.1, 0.01, 0.1, 0.01));
    near(r.ybar, 0.0775);
  });
  it('centroid / CG', () => {
    const s = centroidSolution([
      { name: 'a', w: 2, x: 1 },
      { name: 'b', w: 3, x: 4 },
    ]);
    near(s.finals[0].valueSI, 14 / 5);
  });
});

describe('mechanics tools', () => {
  it('resultant of forces', () => {
    const s = forcesSolution([
      { name: 'F_1', F: 3000, angle: 0 },
      { name: 'F_2', F: 4000, angle: 90 },
    ]);
    near(s.finals[0].valueSI, 5000);
  });
  it('two cable tensions supporting a 1000 N sign', () => {
    // cables at 30° and 150° from +x, weight at 270°: T1 = T2 = 1000 N
    const s = forcesSolution([
      { name: 'W', F: 1000, angle: 270 },
      { name: 'T_1', angle: 30 },
      { name: 'T_2', angle: 150 },
    ]);
    near(s.finals[0].valueSI, 1000);
    near(s.finals[1].valueSI, 1000);
  });
  it('incline: force to push up', () => {
    const s = inclineSolution({ m: 20, theta: 30, mu: 0.3, mode: 'up' });
    near(s.finals[0].valueSI, 20 * 9.81 * (0.5 + 0.3 * Math.cos(Math.PI / 6)));
  });
  it('incline: will it slide?', () => {
    const s = inclineSolution({ m: 20, theta: 30, mu: 0.7, mode: 'check' });
    near(s.finals[0].valueSI, Math.atan(0.7));
  });
  it('gear train', () => {
    const s = gearSolution({ stages: [{ driver: 20, driven: 60 }, { driver: 15, driven: 45 }], nIn: (1800 * 2 * Math.PI) / 60, Tin: 10, eta: 0.9 });
    near(s.finals[0].valueSI, 9);
    near(s.finals.find((f) => f.symbolLatex === 'N_{out}')!.valueSI, (200 * 2 * Math.PI) / 60);
    near(s.finals.find((f) => f.symbolLatex === 'T_{out}')!.valueSI, 81);
  });
  it('flight: level and climb', () => {
    const lvl = flightSolution({ mode: 'level', m: 5000, LD: 10 });
    near(lvl.finals[0].valueSI, 5000 * 9.81);
    near(lvl.finals[2].valueSI, 4905);
    const climb = flightSolution({ mode: 'climb', m: 5000, LD: 10, angle: 10 });
    const W = 5000 * 9.81;
    near(climb.finals[2].valueSI, (W * Math.cos(Math.PI / 18)) / 10 + W * Math.sin(Math.PI / 18));
  });
});

describe('materials tools', () => {
  it('lever rule: 0.4 % C steel', () => {
    const s = leverRuleSolution({ C0: 0.4 });
    near(s.finals[0].valueSI, (0.4 - 0.025) / (0.8 - 0.025));
  });
  it('lever rule: 1.2 % C steel', () => {
    const s = leverRuleSolution({ C0: 1.2 });
    near(s.finals[0].valueSI, (6.67 - 1.2) / (6.67 - 0.8));
  });
  it('tensile test: E and UTS', () => {
    const s = tensileSolution({
      L0: 0.05,
      A0: 100e-6,
      data: [
        { F: 10000, dL: 0.025e-3 },
        { F: 20000, dL: 0.05e-3 },
        { F: 40000, dL: 2e-3 },
        { F: 45000, dL: 6e-3 },
      ],
      linearPoints: 2,
    });
    near(s.finals[0].valueSI, 200e9);
    near(s.finals[1].valueSI, 450e6);
  });
});
