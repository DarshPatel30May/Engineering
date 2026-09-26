# HSC coverage audit

For each module, this audit lists the calculation question types that recur in NSW HSC Engineering Studies examinations, and how the website solves each one. Every row marked ✅ has at least one automated end-to-end test (`tests/interpreter.test.ts`, `tests/audit.test.ts`, `tests/tools.test.ts`). In those tests, a full question is entered as text or tool input, and the final answer is checked against an independent hand calculation.

Route key: **SS** = Smart Solver (paste the question) · **Calc** = module formula calculator · **Tool** = dedicated multi-step tool.

> The official NESA past papers could not be downloaded from the build environment (network policy). The question types below were compiled from knowledge of the syllabus and past papers. The test questions are *modelled on* past HSC questions; they are not verbatim copies.

## Civil Structures

| Calculation type | Route | Status |
|---|---|---|
| Resolve forces into components; resultant and direction | Tool (Concurrent forces), Calc | ✅ |
| Concurrent-force equilibrium, e.g. tensions in two cables holding a sign | SS → forces tool, Tool | ✅ |
| Moments / ΣM = 0 about a point | Calc, Beam tool | ✅ |
| Simply supported beam reactions (point loads, UDLs, overhangs) | SS → beam tool, Tool | ✅ |
| Shear force and bending moment diagrams, M_max at zero shear | Tool (SFD/BMD drawn) | ✅ |
| Cantilever reactions, fixing moment, M_max = FL / wL²/2 | SS → beam tool, Tool, Calc | ✅ |
| Truss member forces by method of joints (tension/compression) | Tool (Truss) | ✅ |
| Stress σ = F/A, including area from diameter or rectangle | SS, Calc | ✅ |
| Strain, Young's modulus, extension (stress → strain → E) | SS, Calc | ✅ |
| Factor of safety, allowable/working stress, minimum area/diameter | SS, Calc | ✅ |
| Bending stress σ = My/I (given I, or I from a rectangle / composite section) | SS → beam tool, Calc, Section tool | ✅ |
| Second moment of area, neutral axis, section modulus | Tool (Section), Calc | ✅ |
| Shear stress in pins/bolts (single/double shear) | SS, Calc | ✅ |
| Tensile test: E from graph data, UTS, yield, % elongation, % reduction in area | Tool (Tensile), Calc | ✅ |
| Hardness (Brinell/Vickers) and impact (Charpy/Izod) energy | SS, Calc | ✅ |
| Hydrostatic pressure (dams, piers), force on a wall | SS, Calc | ✅ |
| Bearing pressure P = F/A | SS, Calc | ✅ |

## Personal & Public Transport

| Calculation type | Route | Status |
|---|---|---|
| F = ma, tractive force minus resistance | SS, Calc | ✅ |
| Kinematics (suvat): stopping distance, deceleration, take-off run | SS, Calc | ✅ |
| Friction F = μN on level surfaces | SS, Calc | ✅ |
| μ = tan φ (angle of repose) | SS, Calc | ✅ |
| Inclined plane: force to push up / to hold / will it slide / acceleration | SS → incline tool, Tool | ✅ |
| Work, KE, PE, power (P = W/t, P = Fv), braking force from KE | SS, Calc | ✅ |
| Rotational power P = 2πNT/60, torque | SS, Calc | ✅ |
| Hill climbing power at constant speed | SS, Calc | ✅ |
| MA, VR, efficiency of machines (pulleys, levers) | SS, Calc | ✅ |
| Gear ratio, output speed and torque (simple and compound trains) | SS, Calc, Tool (Gear) | ✅ |
| Hydraulics: Pascal's principle, piston areas from diameters, piston travel | SS, Calc | ✅ |
| Electrical energy/power of motors, efficiency, battery energy, running cost | SS, Calc | ✅ |
| Transformers (turns ratio) | SS, Calc | ✅ |
| Iron–carbon equilibrium: lever rule phase percentages | SS → lever tool, Tool | ✅ |

## Aeronautical Engineering

| Calculation type | Route | Status |
|---|---|---|
| Four forces in straight and level flight (L = W, T = D, L/D) | SS, Calc, Tool (Flight) | ✅ |
| Steady climb: L = W cos γ, T = D + W sin γ | SS, Calc, Tool | ✅ |
| Glide angle and glide distance from L/D | SS, Calc, Tool | ✅ |
| Bernoulli: pressure difference from upper/lower airspeeds; lift = ΔP × S | SS, Calc | ✅ |
| Lift/drag equations with C_L, C_D (extension) | Calc | ✅ |
| Dynamic pressure / pitot airspeed | Calc | ✅ |
| Pascal's principle in aircraft hydraulics; hydrostatic pressure | SS, Calc | ✅ |
| Wing loading, load factor, banked turn, aspect ratio, Mach number | SS, Calc | ✅ |
| Take-off acceleration, runway length, thrust power | SS, Calc | ✅ |
| Structural members: stress, strain, E, FoS, bending of spars (cantilever) | SS, Calc, Beam tool | ✅ |
| Centre of gravity / weight and balance | Tool (Centroid) | ✅ |

## Telecommunications Engineering

| Calculation type | Route | Status |
|---|---|---|
| Ohm's law, electrical power (VI, I²R, V²/R) | SS, Calc | ✅ |
| Series, parallel and combined resistor networks; per-resistor V, I, P | SS → circuit tool, Tool | ✅ |
| LED / current-limiting resistor | SS, Calc | ✅ |
| Wave equation v = fλ, period, CRO readings | SS, Calc | ✅ |
| Antenna length (half-wave dipole, quarter-wave) | SS, Calc | ✅ |
| Decibel gain/loss, fibre attenuation (dB/km) | SS, Calc | ✅ |
| Snell's law, critical angle, refractive index, acceptance angle | SS, Calc | ✅ |
| Satellite / radio propagation delay | SS, Calc | ✅ |
| Data transfer time, sampling (Nyquist), PCM bit rate, quantisation levels | SS, Calc | ✅ |
| Number systems (binary/hex/octal/BCD/two's complement) | SS → number tool, Tool | ✅ |
| Logic gates, Boolean expressions, truth tables | SS → logic tool, Tool | ✅ |
| AM modulation index and bandwidth (extension) | Calc | ✅ |

## Cross-cutting checks

| Item | Evidence |
|---|---|
| Every formula solvable for every variable | `tests/formulas.test.ts`: round trip for all 443 rearrangements |
| Dimensional consistency of every rearrangement | `tests/formulas.test.ts`: numerical dimension check |
| Unit conversions (mm² ↔ m², mm³ ↔ m³, N ↔ kN, Pa ↔ MPa ↔ GPa, N/mm² ↔ MPa, N·mm ↔ N·m ↔ kN·m, mA ↔ A, kΩ ↔ Ω) | `tests/units.test.ts` |
| Known cases: 8 kN / 200 mm² = 40 MPa; 200 MPa / 0.001 = 200 GPa | `tests/formulas.test.ts`, `tests/interpreter.test.ts` |
| Error handling (missing data, incompatible units, impossible area, invalid modulus, ÷0, η > 100 %, inconsistent data, unstable truss) | `tests/formulas.test.ts`, `tests/tools.test.ts`, `tests/interpreter.test.ts` |
| Significant figures | `tests/units.test.ts` (formatting) |
| TypeScript and build | `npm run typecheck`, `npm run build` |
| UI routes render with no runtime errors (desktop 1536 × 960 and mobile 390 px) | Checked with headless Chromium during development |
