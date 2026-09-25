import { describe, expect, it } from 'vitest';
import { convert, parseUnit, toSI, dimEq, DimensionMismatchError } from '../src/engine/units';
import { equivalents, fmt, roundSig, displayValue } from '../src/engine/format';

const close = (a: number, b: number, rel = 1e-12) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel + 1e-300);

describe('unit parsing & conversion', () => {
  it('length', () => {
    close(toSI(1, 'mm'), 1e-3);
    close(toSI(1, 'cm'), 1e-2);
    close(toSI(2.5, 'km'), 2500);
    close(toSI(10, 'μm'), 1e-5);
  });
  it('mm² ↔ m² (squared prefixes)', () => {
    close(toSI(200, 'mm²'), 2e-4);
    close(toSI(200, 'mm^2'), 2e-4);
    close(toSI(200, 'mm2'), 2e-4);
    close(convert(1, 'm²', 'mm²'), 1e6);
    close(convert(1, 'cm²', 'mm²'), 100);
    close(convert(5e-4, 'm²', 'cm²'), 5);
  });
  it('mm³ ↔ m³ (cubed prefixes)', () => {
    close(toSI(1e9, 'mm³'), 1);
    close(convert(1, 'm³', 'mm³'), 1e9);
    close(convert(1, 'cm³', 'mm³'), 1000);
    close(convert(1, 'L', 'cm³'), 1000);
  });
  it('mm⁴ ↔ m⁴', () => {
    close(toSI(1, 'mm⁴'), 1e-12);
    close(convert(8e-5, 'm^4', 'mm^4'), 8e7);
  });
  it('N ↔ kN ↔ MN', () => {
    close(toSI(8, 'kN'), 8000);
    close(convert(2.5, 'MN', 'kN'), 2500);
    close(convert(450, 'N', 'kN'), 0.45);
  });
  it('Pa ↔ kPa ↔ MPa ↔ GPa', () => {
    close(toSI(40, 'MPa'), 4e7);
    close(convert(200, 'GPa', 'MPa'), 200000);
    close(convert(101.3, 'kPa', 'Pa'), 101300);
    close(convert(4e7, 'Pa', 'GPa'), 0.04);
  });
  it('N/mm² = MPa', () => {
    close(convert(1, 'N/mm²', 'MPa'), 1);
    close(convert(1, 'N/mm^2', 'Pa'), 1e6);
    close(convert(250, 'MPa', 'N/mm²'), 250);
    close(convert(1, 'kN/mm²', 'GPa'), 1);
    close(convert(1, 'N/m²', 'Pa'), 1);
  });
  it('N·mm ↔ N·m ↔ kN·m', () => {
    close(convert(1e6, 'N·mm', 'N·m'), 1000);
    close(convert(1e6, 'N·mm', 'kN·m'), 1);
    close(convert(12, 'kN·m', 'N·mm'), 1.2e7);
    close(convert(5, 'kNm', 'Nm'), 5000);
    close(convert(5, 'kN m', 'N.m'), 5000);
    close(convert(3, 'N*m', 'Nmm'), 3000);
  });
  it('energy and power', () => {
    close(toSI(2, 'kJ'), 2000);
    close(toSI(1.5, 'MJ'), 1.5e6);
    close(toSI(1, 'kWh'), 3.6e6);
    close(convert(1, 'kW', 'W'), 1000);
    close(convert(2.5, 'MW', 'kW'), 2500);
    // J and N·m share a dimension
    expect(dimEq(parseUnit('J').dim, parseUnit('N·m').dim)).toBe(true);
  });
  it('mass and time', () => {
    close(toSI(500, 'g'), 0.5);
    close(toSI(2, 't'), 2000);
    close(toSI(3, 'min'), 180);
    close(toSI(1.5, 'h'), 5400);
  });
  it('velocity, acceleration, density', () => {
    close(toSI(36, 'km/h'), 10);
    close(convert(10, 'm/s', 'km/h'), 36);
    close(toSI(9.81, 'm/s²'), 9.81);
    close(toSI(9.81, 'm/s^2'), 9.81);
    close(toSI(7.85, 'g/cm³'), 7850);
    close(toSI(1000, 'kg/m^3'), 1000);
  });
  it('electrical: V, mA, kΩ', () => {
    close(toSI(250, 'mA'), 0.25);
    close(toSI(50, 'μA'), 5e-5);
    close(toSI(50, 'uA'), 5e-5);
    close(convert(0.02, 'A', 'mA'), 20);
    close(toSI(4.7, 'kΩ'), 4700);
    close(toSI(2.2, 'MΩ'), 2.2e6);
    close(toSI(4.7, 'kohm'), 4700);
    close(convert(1500, 'Ω', 'kΩ'), 1.5);
    close(toSI(11, 'kV'), 11000);
    close(toSI(500, 'mV'), 0.5);
  });
  it('frequency, rpm, angle, percent, data', () => {
    close(toSI(100, 'MHz'), 1e8);
    close(toSI(60, 'rpm'), 2 * Math.PI);
    close(toSI(180, '°'), Math.PI);
    close(toSI(85, '%'), 0.85);
    close(toSI(1, 'MB'), 8e6);
    close(toSI(50, 'Mbit/s'), 5e7);
    close(toSI(10, 'Ah'), 36000);
    close(toSI(0.3, 'dB/km'), 3e-4);
  });
  it('rejects incompatible dimensions', () => {
    expect(() => convert(1, 'kN', 'mm²')).toThrow(DimensionMismatchError);
    expect(() => convert(1, 'MPa', 'kN·m')).toThrow(DimensionMismatchError);
  });
  it('rejects unknown units', () => {
    expect(() => parseUnit('furlongs')).toThrow();
  });
});

describe('formatting & equivalents', () => {
  it('rounds significant figures', () => {
    expect(roundSig(40123456, 3)).toBe(40100000);
    expect(roundSig(0.000123456, 2)).toBe(0.00012);
    expect(fmt(4e7, 3)).toBe('4.00 × 10⁷');
    expect(fmt(40000, 3)).toBe('40,000');
    expect(fmt(2500, 2)).toBe('2500');
    expect(fmt(0.0400, 3)).toBe('0.0400');
  });
  it('stress equivalents: 40,000,000 Pa = 40,000 kPa = 40 MPa = 0.040 GPa = 40 N/mm²', () => {
    const eq = equivalents(4e7, 'stress', 4);
    const get = (u: string) => eq.find((e) => e.unit === u)!.value;
    close(get('Pa'), 4e7);
    close(get('kPa'), 4e4);
    close(get('MPa'), 40);
    close(get('GPa'), 0.04);
    close(get('N/mm²'), 40);
    expect(eq.find((e) => e.hsc)!.unit).toBe('MPa');
  });
  it('chooses sensible display units', () => {
    expect(displayValue(4e7, 'stress').unit).toBe('MPa');
    expect(displayValue(2e11, 'modulus').unit).toBe('GPa');
    expect(displayValue(12000, 'moment').unit).toBe('kN·m');
    expect(displayValue(2e-4, 'area').unit).toBe('mm²');
  });
});
