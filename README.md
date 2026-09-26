# HSC Engineering Solver

A locally runnable website that solves calculation questions from the **NSW HSC Engineering Studies (Stage 6)** course. It covers all four Year 12 modules:

1. Civil Structures
2. Personal and Public Transport
3. Aeronautical Engineering
4. Telecommunications Engineering

All arithmetic, algebra, unit conversion and validation is done by a **deterministic TypeScript engine** working in coherent SI units. No AI model or paid API is used, and it needs no network connection once installed.

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command | Purpose |
|---|---|
| `npm test` | Runs the automated tests (Vitest): every formula and rearrangement, unit conversions, tools, Smart Solver, HSC audit |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Type-checks, then builds a production bundle to `dist/` |
| `npm run coverage-matrix` | Regenerates `docs/COVERAGE.md` from the formula registry |
| `npm run solve -- "question"` | Command-line Smart Solver (`V=1` shows the interpretation) |

## What it does

### Smart Solver
You paste a whole HSC-style question. The solver then:

1. identifies the module and topic
2. pulls out every number and unit, including `8 kN`, `200 mm²`, `2.5 × 10^3`, `12 000 N`, `300 mm × 300 mm` and `3.5:1`
3. works out what each number means, using its unit (the dimension check), the nearby wording ("tensile load", "elongation", "UTS", "FoS"…) and typed symbols (`E = 200 GPa`)
4. identifies the unknown(s), including several in one sentence ("its power and resistance")
5. finds the shortest chain of standard formulas from the knowns to the unknown (multi-step)
6. converts every input to coherent SI and shows the conversions
7. rearranges, substitutes, calculates, and checks the units of each step
8. shows the final answer in the most suitable engineering unit, with equivalents. The usual HSC unit is starred.

Some questions go to a dedicated solver instead: beams, resistor networks, inclined planes, loads hung from two cables, logic and truth tables, number systems, the iron–carbon lever rule and gear trains. You can correct any misread value, or add or remove unknowns, in the **Interpretation** panel, and the solution updates straight away. The solver also makes the standard assumptions students are expected to make (water 1000 kg/m³, air n = 1.00, starting from rest ⇒ u = 0, "comes to rest" ⇒ v = 0, double shear ⇒ 2 planes). It flags each one as an assumption.

### Module calculators
Each module page groups calculators into categories, such as Forces & equilibrium, Beams & bending, Friction, Hydraulics, Flight forces and Fibre optics. **Every formula can be solved for every variable.** For example σ = F/A also gives F = σA and A = F/σ.

### Multi-step tools
| Tool | What it does |
|---|---|
| Beam analyser | Simply supported (with overhangs) or cantilever beams; point loads, UDLs, couples; reactions by ΣM = 0 / ΣFy = 0; SFD and BMD; M_max at zero shear; σ = My/I |
| Truss solver | Method of joints for any statically determinate pin-jointed truss; reactions; tension/compression; member stresses. Presets include Warren and Pratt |
| Section properties | Rectangle, hollow rectangle, I-beam, T-beam, channel or custom shape: ȳ, I (parallel axis theorem), y_max, Z |
| Centroid / CG | Composite areas and aircraft weight & balance |
| Concurrent forces | Resultant and equilibrant, or two unknown magnitudes (cable tensions) |
| Tensile test | E from the elastic region, UTS, yield, % elongation, % reduction in area, working stress; stress–strain graph |
| Inclined plane | Force to move up, force to hold, will it slide, acceleration; applied force at any angle |
| Gear / pulley train | Simple and compound trains, idlers, output speed, torque, power, direction |
| Flight forces | Level flight, climb, glide (angle and distance), banked turn; ΔP across the wing |
| Circuit analyser | Any series/parallel network written as `R1 + (R2 ‖ R3)`; R_T, I, P and each resistor's V, I, P |
| Logic | Boolean expressions (AND/OR/NOT/NAND/NOR/XOR/XNOR) → truth table with intermediate columns, SOP/POS |
| Number systems | Binary/octal/decimal/hex/BCD/two's complement, with repeated-division working |
| Lever rule | Pearlite / pro-eutectoid ferrite or cementite / total phase percentages for plain carbon steels |

### Working modes and precision
- **Quick**: formula → substitution → answer.
- **Full HSC**: given → find → unit conversions → formula → rearrangement → substitution → working → result → unit check → final answer → short HSC explanation.
- Significant figures can be set to **Auto** (least precise input, 3–4 s.f.), **2**, **3**, **4** or **Full**. Values keep full double precision internally; only the displayed final answer is rounded. Intermediate results are shown to 4 s.f.
- g can be set to 9.81 or 9.8 m/s². The top bar also switches between dark and light themes.

### Error checking
The engine detects and explains: missing data (and suggests which formula would need what), incompatible units (`kN` given for an area), impossible values (negative area, invalid modulus, strain > 50 %), divide-by-zero, no real solution (e.g. arcsin > 1, no total internal reflection when n₂ > n₁), efficiency above 100 %, inconsistent inputs (σ, ε and E all given but E ≠ σ/ε), unstable or statically indeterminate trusses, and loads placed off the beam. **It never silently calculates nonsense.**

## Architecture

```
src/engine/
  units.ts            unit parser + converter (dimension vectors over m, kg, s, A)
  quantities.ts       quantity kinds: SI unit, display units, usual HSC unit
  format.ts           significant figures, LaTeX formatting, equivalents
  formulas/           central formula registry (civil, mechanics, transport, aero, telecom)
  solver.ts           single-formula engine: rearrangement, substitution, unit check
  dimcheck.ts         numerical dimensional analysis of every rearrangement
  validation.ts       input/unit/constraint validation
  chain.ts            multi-step shortest-derivation chain solver
  concepts.ts         shared vocabulary + synonyms used by the interpreter
  interpreter/        text normalisation, quantity extraction, interpretation, routing
  tools/              beam, truss, circuit, logic, number systems, sections, mechanics, materials
src/components, src/pages   React UI (KaTeX rendering)
tests/                Vitest suites
docs/COVERAGE.md      generated coverage matrix
docs/HSC-AUDIT.md     past-paper-style audit
```

Each formula is defined **once**, as structured data: name, module(s), topic, equation, variables (symbol, meaning, quantity kind, constraints), an explicit rearrangement for every variable (LaTeX template and function), aliases, when it is used, formula-sheet status, and typical HSC applications. The calculators, the Smart Solver, the library, the coverage matrix and the tests all read from this one registry.

**Dimensional checking without a symbolic algebra system.** For every rearrangement, the engine scales each input by 2^(its exponent in each SI base dimension) and measures how the output scales. The measured exponents must equal the unknown's dimension. The tests run this check on all 443 rearrangements, and each solution shows it as a "Unit check" line (e.g. N ÷ m² ⇒ Pa ✓).

## Research sources and limitations

- **Official NESA sources could not be downloaded from the build environment.** Its network policy blocked `educationstandards.nsw.edu.au`, `nsw.gov.au` and `boardofstudies.nsw.edu.au`. The calculation scope was therefore built from the author's knowledge of the Engineering Studies Stage 6 syllabus (2011 syllabus, HSC modules H1–H4), the NESA Engineering Studies formulae sheet, and the types of calculation questions set in past HSC papers and marking guidelines. No Wikipedia content was used.
- The "formula sheet" status shown for each formula is the author's best understanding of the current NESA sheet. **Check it against the official sheet** printed at the back of the HSC paper.
- The Smart Solver is rule-based. It handles common HSC phrasings well, but unusual wording can be misread. Always check the Interpretation panel; any value or unknown can be corrected there. Trusses and complex beam arrangements are best entered in their dedicated tools.
- Material data on the Constants page is indicative. In an exam, use the values the question gives.
