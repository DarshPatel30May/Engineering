/**
 * HSC coverage audit: calculation question types modelled on NSW HSC Engineering
 * Studies past papers. Each must be solved end-to-end by the Smart Solver.
 */
import { describe, expect, it } from 'vitest';
import { interpret } from '../src/engine/interpreter/interpret';
import { solveInterpretation } from '../src/engine/interpreter/solve';

function run(q: string) {
  const i = interpret(q);
  return { i, s: solveInterpretation(i) };
}
function val(q: string, sym?: string) {
  const { i, s } = run(q);
  const f = sym ? s.finals.find((x) => x.symbolLatex === sym) : s.finals[0];
  if (!f) throw new Error(`No final ${sym ?? ''}: ${q}\n type=${i.problemType} targets=${i.targets} q=${JSON.stringify(i.quantities.map((x) => [x.numText, x.unit, x.concept]))} issues=${JSON.stringify(s.issues.map((x) => x.message))}`);
  return f.valueSI;
}
const near = (a: number, b: number, rel = 2e-3) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(Math.abs(b) * rel);
const D = Math.PI / 180;

describe('HSC audit — Civil Structures', () => {
  it('tie rod stress and factor of safety (two parts)', () => {
    const { s } = run('Calculate the stress in a tie rod 12 mm in diameter carrying a tensile force of 15 kN. If the UTS of the steel is 450 MPa, determine the factor of safety.');
    const sigma = 15000 / (Math.PI * 0.006 ** 2);
    near(s.finals.find((f) => f.symbolLatex === '\\sigma')!.valueSI, sigma);
    near(s.finals.find((f) => f.symbolLatex === 'FoS')!.valueSI, 450e6 / sigma);
  });
  it('load hung from two cables', () => {
    const { i, s } = run('A sign of mass 100 kg is suspended by two cables making angles of 30° and 45° with the horizontal. Calculate the tension in each cable.');
    expect(i.problemType).toBe('forces');
    const W = 981;
    // T1 cos30 = T2 cos45 ; T1 sin30 + T2 sin45 = W
    const T1 = W / (Math.sin(30 * D) + Math.cos(30 * D) * Math.tan(45 * D));
    near(s.finals[0].valueSI, T1);
  });
  it('Brinell hardness with kgf load', () => {
    near(val('A Brinell hardness test uses a 10 mm diameter ball and a load of 3000 kgf. The indentation diameter is 4 mm. Calculate the Brinell hardness number.') / 9.80665e6, 6000 / (Math.PI * 10 * (10 - Math.sqrt(84))));
  });
  it('Charpy impact energy', () => {
    near(val('In a Charpy test, a 20 kg pendulum is released from a height of 1.5 m and rises to 0.6 m after fracturing the specimen. Calculate the energy absorbed.'), 20 * 9.81 * 0.9);
  });
  it('bending stress in a simply supported rectangular beam', () => {
    // 4 m span, 10 kN central load, 100 mm wide × 200 mm deep: M = 10 kN·m, I = bd³/12, σ = 15 MPa
    near(val('A simply supported timber beam of span 4 m carries a central point load of 10 kN. The beam is 100 mm wide and 200 mm deep. Calculate the maximum bending stress.', '\\sigma_{max}'), 15e6);
  });
});

describe('HSC audit — Personal & Public Transport', () => {
  it('train tractive force from rest', () => {
    near(val('A train of mass 200 t accelerates uniformly from rest to 72 km/h in 50 s. Calculate the tractive force required if the resistance to motion is 20 kN.'), 100000);
  });
  it('bus climbing a hill — power', () => {
    near(val('A bus of mass 12 t climbs a hill inclined at 5° at a constant speed of 36 km/h. Ignoring other resistances, calculate the power required.'), 12000 * 9.81 * Math.sin(5 * D) * 10);
  });
  it('lever effort', () => {
    near(val('A lever has an effort arm of 1.2 m and a load arm of 0.3 m. Calculate the effort required to lift a load of 600 N.'), 150);
  });
  it('hydraulic hoist lifting a car', () => {
    near(val('A hydraulic car hoist has a large piston of diameter 300 mm. What force must be applied to a small piston of diameter 25 mm to lift a car of mass 1500 kg?'), 1500 * 9.81 * (25 / 300) ** 2);
  });
  it('machine MA, VR and efficiency', () => {
    const { s } = run('A load of 2 kN is raised 3 m by an effort of 500 N moving through 15 m. Calculate the MA, VR and efficiency.');
    near(s.finals.find((f) => f.symbolLatex === 'MA')!.valueSI, 4);
    near(s.finals.find((f) => f.symbolLatex === 'VR')!.valueSI, 5);
    near(s.finals.find((f) => f.symbolLatex === '\\eta')!.valueSI, 0.8);
  });
  it('deceleration to rest', () => {
    near(val('A car travelling at 25 m/s takes 5 s to stop. Calculate its deceleration.'), -5);
  });
  it('shaft torque from power and speed', () => {
    near(val('A shaft transmits 15 kW at 1450 rpm. Calculate the torque.'), 15000 / ((1450 * 2 * Math.PI) / 60));
  });
  it('EV charging cost', () => {
    near(val('An electric car battery stores 60 kWh. Electricity costs 30 c/kWh. Calculate the cost to fully charge the battery.'), 18);
  });
  it('transformer turns', () => {
    near(val('A transformer steps 240 V down to 12 V. The primary has 2000 turns. How many turns are on the secondary?'), 100);
  });
  it('compound gear train', () => {
    const { i, s } = run('A compound gear train has a 20 teeth driver meshing with a 60 teeth gear, which is on the same shaft as a 15 teeth gear driving a 45 teeth gear. The input shaft turns at 1800 rpm. Calculate the output speed.');
    expect(i.problemType).toBe('gear');
    near(s.finals.find((f) => f.symbolLatex === 'N_{out}')!.valueSI, (200 * 2 * Math.PI) / 60);
  });
});

describe('HSC audit — Aeronautical Engineering', () => {
  it('glide angle', () => {
    near(val('A glider has a lift-to-drag ratio of 25. Calculate the glide angle.'), Math.atan(1 / 25));
  });
  it('climbing thrust', () => {
    const W = 5000 * 9.81;
    near(val('An aircraft of mass 5000 kg climbs at 10° with a lift-to-drag ratio of 12. Calculate the thrust required.'), (W * Math.cos(10 * D)) / 12 + W * Math.sin(10 * D));
  });
  it('lift from pressure difference', () => {
    near(val('Calculate the lift generated by a wing of area 16 m² if the average pressure difference between the upper and lower surfaces is 1.2 kPa.'), 19200);
  });
  it('take-off distance', () => {
    near(val('An aircraft accelerates from rest at 3 m/s² until it reaches its take-off speed of 60 m/s. Calculate the length of runway required.'), 600);
  });
});

describe('HSC audit — Telecommunications Engineering', () => {
  it('parallel resistors', () => {
    near(val('Calculate the equivalent resistance of 100 Ω, 220 Ω and 470 Ω resistors connected in parallel.'), 1 / (1 / 100 + 1 / 220 + 1 / 470));
  });
  it('series circuit current', () => {
    near(val('Calculate the current in a 12 V circuit with resistors of 4 Ω and 8 Ω in series.', 'I'), 1);
  });
  it('amplifier gain in dB', () => {
    near(val('An amplifier has an input power of 2 mW and an output power of 0.5 W. Calculate the gain in decibels.'), 10 * Math.log10(250));
  });
  it('fibre attenuation', () => {
    near(val('A 50 km optical fibre link has an attenuation of 0.3 dB/km. Calculate the total loss.'), 15);
  });
  it("Snell's law from air", () => {
    near(val('Light travels from air into glass (n = 1.5) at an angle of incidence of 40°. Calculate the angle of refraction.'), Math.asin(Math.sin(40 * D) / 1.5));
  });
  it('quarter-wave antenna', () => {
    near(val('A mobile phone transmits at 900 MHz. Calculate the length of a quarter-wave antenna.'), 3e8 / 900e6 / 4);
  });
  it('half-wave dipole (default)', () => {
    near(val('Calculate the length of a dipole antenna for a frequency of 150 MHz.'), 1);
  });
  it('download time', () => {
    near(val('A file of 25 MB is downloaded over a 50 Mbps connection. How long does it take?'), 4);
  });
  it('binary with spaces to decimal', () => {
    const { s } = run('Convert 1011 0110 from binary to decimal.');
    expect(s.tables![0].rows.find((r) => r[0] === 'Decimal')![1]).toBe('182');
  });
  it('LED series resistor', () => {
    near(val('An LED with a forward voltage of 2 V is to be run from a 12 V supply at 20 mA. Calculate the resistance of the series resistor.'), 500);
  });
  it('CRO frequency', () => {
    near(val('A signal on a CRO occupies 4 divisions for one cycle with the timebase set to 0.5 ms/div. Calculate the frequency.'), 500);
  });
});

describe('HSC audit — alternative phrasings', () => {
  const cases: [string, number, string?][] = [
    ["A steel wire 3 m long and 1 mm in diameter stretches by 2 mm when a mass of 10 kg is hung from it. Calculate the Young's modulus of the steel.", (10 * 9.81) / (Math.PI * 0.0005 ** 2) / (0.002 / 3)],
    ['A concrete column has a cross-section of 300 mm × 300 mm and supports an axial load of 900 kN. Calculate the compressive stress.', 10e6],
    ['Calculate the minimum diameter of a steel bolt required to carry a tensile load of 25 kN if the allowable stress is 150 MPa.', Math.sqrt((4 * (25000 / 150e6)) / Math.PI)],
    ['A spring extends 40 mm under a load of 200 N. Calculate its stiffness.', 5000],
    ['A crate weighing 800 N is pushed along a horizontal floor. The coefficient of friction is 0.4. Calculate the force required to move the crate.', 320],
    ['An electric motor draws 5 A from a 240 V supply and delivers 1 kW of mechanical power. Calculate its efficiency.', 1000 / 1200],
    ['A 1200 kg car accelerates from 0 to 100 km/h in 8 s. Calculate the average power developed.', (0.5 * 1200 * (100 / 3.6) ** 2) / 8],
    ['Calculate the pressure exerted by a force of 500 N acting on an area of 25 cm².', 200000],
    ['A gearbox has an input torque of 150 N·m and a gear ratio of 3.5:1. Assuming 95% efficiency, calculate the output torque.', 150 * 3.5 * 0.95],
    ['A jet engine produces 120 kN of thrust at an airspeed of 250 m/s. Calculate the thrust power.', 120000 * 250],
    ['An aircraft has a wing area of 30 m² and a mass of 4500 kg. Calculate the wing loading.', (4500 * 9.81) / 30],
    ['Calculate the time taken for a radio signal to travel 1500 km.', 1.5e6 / 3e8],
    ['Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel across a 6 V battery. Calculate the total current.', 6, 'I'],
    ['A beam of length 5 m is simply supported at its ends and carries loads of 10 kN and 20 kN at 1 m and 3 m from the left end respectively. Determine the reactions.', 16000, 'R_A'],
    ['A hydraulic press has a ram of 200 mm diameter and a plunger of 25 mm diameter. What force on the plunger is needed to produce a force of 50 kN on the ram?', 50000 * (25 / 200) ** 2],
    ['What is the frequency of a signal with a wavelength of 2 m?', 1.5e8],
    ['A load of 5 kN is lifted using a pulley system with 4 supporting ropes. If the efficiency is 80%, calculate the effort required.', 5000 / (0.8 * 4)],
  ];
  for (const [q, expected, sym] of cases) {
    it(q.slice(0, 70), () => near(val(q, sym), expected));
  }
  it('4.7 kΩ resistor: voltage and power', () => {
    const { s } = run('A 4.7 kΩ resistor carries a current of 2 mA. Calculate the voltage across it and the power dissipated.');
    near(s.finals.find((f) => f.symbolLatex === 'V')!.valueSI, 9.4);
    near(s.finals.find((f) => f.symbolLatex === 'P')!.valueSI, 0.0188);
  });
});
