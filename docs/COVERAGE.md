# HSC Engineering Studies — calculation coverage matrix

_Generated from `src/engine/formulas` by `npm run coverage-matrix`. Do not edit by hand._

Formulas: **146**, every variable solvable (467 rearrangements, all verified by automated round-trip and dimensional tests).

Sheet column: **yes** = expected on the NESA Engineering Studies formulae sheet; **derived** = a rearrangement/combination of sheet formulae; **no** = must be known or derived by the student (HSC-relevant, or marked _extension_). Formula-sheet status is based on the author’s knowledge of the NESA sheet — verify against the current official sheet.

## Civil Structures

### Forces & equilibrium

Multi-step tools: **Concurrent forces — resultant & equilibrium**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Horizontal component of a force | F_x = Fcosθ | F_x Horizontal component [N]; F Force magnitude [N]; θ Angle from horizontal [rad] | N, kN, MN, °, rad | F_x = F cos(θ); F = (F_x)/(cos(θ)); θ = cos^-1((F_x)/(F)) | derived | Components of cable tension; Horizontal component of towing force |
| Vertical component of a force | F_y = Fsinθ | F_y Vertical component [N]; F Force magnitude [N]; θ Angle from horizontal [rad] | N, kN, MN, °, rad | F_y = F sin(θ); F = (F_y)/(sin(θ)); θ = sin^-1((F_y)/(F)) | derived | Vertical component of a cable supporting a sign |
| Resultant of perpendicular components | R = √(F_x^2 + F_y^2) | R Resultant force [N]; F_x Sum of horizontal components (ΣFx) [N]; F_y Sum of vertical components (ΣFy) [N] | N, kN, MN | R = √(F_x^2 + F_y^2); F_x = √(R^2 - F_y^2); F_y = √(R^2 - F_x^2) | derived | Resultant of concurrent coplanar forces; Reaction at a pin joint from its components |
| Direction of a resultant | θ = tan^-1((F_y)/(F_x)) | θ Direction of resultant from horizontal [rad]; F_x ΣFx [N]; F_y ΣFy [N] | °, rad, N, kN, MN | θ = tan^-1((F_y)/(F_x)); F_x = (F_y)/(tan(θ)); F_y = F_x tan(θ) | derived | Direction of the reaction at a pinned support |
| Moment of a force | M = Fd | M Moment (about a point) [N·m]; F Force [N]; d Perpendicular distance from the pivot [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | M = F × d; F = (M)/(d); d = (M)/(F) | yes | Support reactions of simply supported beams; Maximum bending moment at a cantilever root; Tailplane load about aircraft CG |
| Weight force | W = mg | W Weight force [N]; m Mass [kg]; g Gravitational acceleration [m/s²] | N, kN, MN, g, kg, t, m/s² | W = m × g; m = (W)/(g); g = (W)/(m) | yes | Load of a hanging mass on a cable; Aircraft weight in flight force diagrams; Vehicle normal force |

### Beams & bending

Multi-step tools: **Beam analyser (reactions, SFD, BMD, bending stress)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Bending stress | σ = (My)/(I) | σ Bending stress (at distance y from the neutral axis) [Pa]; M Bending moment [N·m]; y Distance from the neutral axis [m]; I Second moment of area about the neutral axis [m⁴] | Pa, kPa, MPa, GPa, N/mm², N·mm, N·m, kN·m, mm, cm, m, km, mm⁴, cm⁴, m⁴ | σ = (M y)/(I); M = (σ I)/(y); y = (σ I)/(M); I = (M y)/(σ) | yes | Maximum bending stress in a simply supported beam with point loads; Bending stress in an aircraft wing spar / cantilever |
| Max bending moment — simply supported, central point load | M_max = (FL)/(4) | M_max Maximum bending moment (at mid-span) [N·m]; F Central point load [N]; L Span [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | M_max = (F L)/(4); F = \frac4 M_maxL; L = \frac4 M_maxF | derived | Maximum bending stress in a simply supported beam with a central load |
| Max bending moment — simply supported, full-span UDL | M_max = (wL^2)/(8) | M_max Maximum bending moment (at mid-span) [N·m]; w Uniformly distributed load [N/m]; L Span [m] | N·mm, N·m, kN·m, N/m, kN/m, mm, cm, m, km | M_max = (w L^2)/(8); w = \frac8 M_maxL^2; L = \sqrt\frac8 M_maxw | derived | Bending moment in a floor joist under UDL |
| Max bending moment — cantilever, end point load | M_max = FL | M_max Maximum bending moment (at the fixed end) [N·m]; F End point load [N]; L Cantilever length [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | M_max = F × L; F = \fracM_maxL; L = \fracM_maxF | derived | Bending stress at the root of a cantilever |
| Max bending moment — cantilever, UDL | M_max = (wL^2)/(2) | M_max Maximum bending moment (at the fixed end) [N·m]; w Uniformly distributed load [N/m]; L Cantilever length [m] | N·mm, N·m, kN·m, N/m, kN/m, mm, cm, m, km | M_max = (w L^2)/(2); w = \frac2 M_maxL^2; L = \sqrt\frac2 M_maxw | derived | Root bending moment of a wing idealised as a UDL cantilever |
| Total load of a UDL | W = wL | W Total (resultant) load, acting at the centre of the UDL [N]; w UDL intensity [N/m]; L Length loaded [m] | N, kN, MN, N/m, kN/m, mm, cm, m, km | W = w × L; w = (W)/(L); L = (W)/(w) | derived | Support reactions for a beam with a UDL |
| Section modulus | Z = \fracIy_max | Z Elastic section modulus [m³]; I Second moment of area [m⁴]; y_max Distance from NA to extreme fibre [m] | mm³, cm³, m³, mm⁴, cm⁴, m⁴, mm, cm, m, km | Z = \fracIy_max; I = Z × y_max; y_max = (I)/(Z) | no | Selecting a beam section from tables |
| Bending stress from section modulus | σ_max = (M)/(Z) | σ_max Maximum bending stress [Pa]; M Bending moment [N·m]; Z Section modulus [m³] | Pa, kPa, MPa, GPa, N/mm², N·mm, N·m, kN·m, mm³, cm³, m³ | σ_max = (M)/(Z); M = σ_max × Z; Z = \fracMσ_max | no | Beam selection from section tables |

### Trusses & joints

Multi-step tools: **Truss solver (method of joints)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Engineering stress (axial) | σ = (F)/(A) | σ Stress (tensile or compressive) [Pa]; F Axial force (tension or compression) [N]; A Cross-sectional area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | σ = (F)/(A); F = σ × A; A = (F)/(σ) | yes | Stress in a truss member once its force is known; Minimum diameter of a tie rod for an allowable stress; Stress in a cable of a suspension bridge |
| Shear stress (pins, bolts, rivets) | τ = (F)/(nA) | τ Shear stress [Pa]; F Shear force (load) [N]; n Number of shear planes (1 = single, 2 = double shear) [–]; A Area of one shear plane [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | τ = (F)/(n A); F = τ n A; n = (F)/(τ A); A = (F)/(n τ) | derived | Shear stress in a truss pin joint in double shear; Minimum rivet diameter |
| Load shared equally between fasteners | F_b = (F)/(N) | F_b Load carried by each bolt / rivet / pin [N]; F Total load on the joint [N]; N Number of bolts / rivets / pins sharing the load [–] | N, kN, MN | F_b = (F)/(N); F = F_b × N; N = (F)/(F_b) | derived | Shear stress in each of three bolts in a lap joint; Minimum number of rivets for an allowable shear stress |
| Shear stress in each fastener | τ = (F_b)/(nA) | τ Shear stress in each fastener [Pa]; F_b Load carried by each fastener [N]; n Shear planes per fastener (1 = single shear, 2 = double shear) [–]; A Cross-sectional area of one fastener [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | τ = (F_b)/(n A); F_b = τ n A; n = (F_b)/(τ A); A = (F_b)/(n τ) | derived | Shear stress in each M16 bolt of a bracket connection |
| Bearing (crushing) stress of a bolt on a plate _(extension)_ | σ_br = (F_b)/(dt) | σ_br Bearing stress between bolt and plate [Pa]; F_b Load carried by each fastener [N]; d Bolt diameter [m]; t Plate thickness [m] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm, cm, m, km | σ_br = (F_b)/(d t); F_b = σ_br d t; d = \fracF_bσ_br t; t = \fracF_bσ_br d | no | Bearing stress of a bolt in a 12 mm plate |

### Section properties

Multi-step tools: **Section properties (I, ȳ, Z) — composite sections**, **Centroid / centre of gravity (weight & balance)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Second moment of area — rectangle | I = (bd^3)/(12) | I Second moment of area (about centroidal axis parallel to b) [m⁴]; b Breadth (width) [m]; d Depth (height, perpendicular to the bending axis) [m] | mm⁴, cm⁴, m⁴, mm, cm, m, km | I = (b d^3)/(12); b = (12 I)/(d^3); d = \sqrt[3](12 I)/(b) | no | I of a timber joist; Why a beam is stronger “on edge” (d cubed) |
| Extreme fibre distance — symmetric section | y_max = (d)/(2) | y_max Distance from NA to extreme fibre [m]; d Overall depth of section [m] | mm, cm, m, km | y_max = (d)/(2); d = 2 × y_max | no | y for bending stress of a rectangular beam |
| Second moment of area — solid circle | I = (π D^4)/(64) | I Second moment of area [m⁴]; D Diameter [m] | mm⁴, cm⁴, m⁴, mm, cm, m, km | I = (π D^4)/(64); D = \sqrt[4](64 I)/(π) | no | Bending stress in an axle |
| Second moment of area — hollow circle (tube) | I = (π (D^4 - d^4))/(64) | I Second moment of area [m⁴]; D Outside diameter [m]; d Inside diameter [m] | mm⁴, cm⁴, m⁴, mm, cm, m, km | I = (π (D^4 - d^4))/(64); D = \sqrt[4](64 I)/(π) + d^4; d = \sqrt[4]D^4 - (64 I)/(π) | no | Bending stress in a tubular bicycle frame |
| Area of a circle from diameter | A = (π d^2)/(4) | A Cross-sectional area [m²]; d Diameter [m] | mm², cm², m², mm, cm, m, km | A = (π d^2)/(4); d = √((4 A)/(π)) | no | Area of a steel rod before calculating stress; Minimum diameter of a cable |
| Area of a hollow circle (tube) | A = (π (D^2 - d^2))/(4) | A Cross-sectional area [m²]; D Outside diameter [m]; d Inside diameter [m] | mm², cm², m², mm, cm, m, km | A = (π (D^2 - d^2))/(4); D = √((4 A)/(π) + d^2); d = √(D^2 - (4 A)/(π)) | no | Stress in a hollow steel column |
| Area of a rectangle | A = bd | A Area [m²]; b Breadth [m]; d Depth [m] | mm², cm², m², mm, cm, m, km | A = b × d; b = (A)/(d); d = (A)/(b) | no | Stress in a rectangular timber member |

### Stress & strain

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Engineering stress (axial) | σ = (F)/(A) | σ Stress (tensile or compressive) [Pa]; F Axial force (tension or compression) [N]; A Cross-sectional area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | σ = (F)/(A); F = σ × A; A = (F)/(σ) | yes | Stress in a truss member once its force is known; Minimum diameter of a tie rod for an allowable stress; Stress in a cable of a suspension bridge |
| Engineering strain | ε = (Δ L)/(L) | ε Strain [–]; Δ L Change in length (extension/compression) [m]; L Original length [m] | mm, cm, m, km | ε = (Δ L)/(L); Δ L = ε × L; L = (Δ L)/(ε) | yes | Strain in a tensile test specimen; Extension of a cable from strain |
| Young's modulus (modulus of elasticity) | E = (σ)/(ε) | E Young's modulus [Pa]; σ Stress (within the elastic/proportional region) [Pa]; ε Strain [–] | Pa, kPa, MPa, GPa, N/mm² | E = (σ)/(ε); σ = E × ε; ε = (σ)/(E) | yes | E from the slope of a stress–strain graph; Extension of a steel member given E |
| Young's modulus — combined form (extension) | E = (FL)/(AΔ L) | E Young's modulus [Pa]; F Axial force [N]; L Original length [m]; A Cross-sectional area [m²]; Δ L Change in length [m] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm, cm, m, km, mm², cm², m² | E = (F L)/(A Δ L); F = (E A Δ L)/(L); L = (E A Δ L)/(F); A = (F L)/(E Δ L); Δ L = (F L)/(A E) | derived | Elongation of a steel tie under load; Change in length of a bridge cable |
| Hooke's law (spring stiffness) | F = kx | F Force [N]; k Stiffness (spring constant) [N/m]; x Extension [m] | N, kN, MN, N/m, N/mm, kN/m, mm, cm, m, km | F = k × x; k = (F)/(x); x = (F)/(k) | no | Suspension spring compression under load |
| Shear stress (pins, bolts, rivets) | τ = (F)/(nA) | τ Shear stress [Pa]; F Shear force (load) [N]; n Number of shear planes (1 = single, 2 = double shear) [–]; A Area of one shear plane [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | τ = (F)/(n A); F = τ n A; n = (F)/(τ A); A = (F)/(n τ) | derived | Shear stress in a truss pin joint in double shear; Minimum rivet diameter |

### Material testing & factor of safety

Multi-step tools: **Tensile test analysis (E, UTS, ductility)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Factor of safety (ultimate strength) | FoS = \fracσ_UTSσ_w | FoS Factor of safety [–]; σ_UTS Ultimate tensile strength [Pa]; σ_w Working (allowable) stress [Pa] | Pa, kPa, MPa, GPa, N/mm² | FoS = \fracσ_UTSσ_w; σ_UTS = FoS × σ_w; σ_w = \fracσ_UTSFoS | yes | Allowable stress in a cable given UTS and FoS; FoS of a truss member |
| Factor of safety (yield strength) | FoS = \fracσ_yσ_w | FoS Factor of safety [–]; σ_y Yield stress (or proof stress) [Pa]; σ_w Working (allowable) stress [Pa] | Pa, kPa, MPa, GPa, N/mm² | FoS = \fracσ_yσ_w; σ_y = FoS × σ_w; σ_w = \fracσ_yFoS | yes | Working stress of a steel member with FoS on yield |
| Factor of safety (loads) | FoS = \fracF_failF_w | FoS Factor of safety [–]; F_fail Failure (breaking) load [N]; F_w Working (safe) load [N] | N, kN, MN | FoS = \fracF_failF_w; F_fail = FoS × F_w; F_w = \fracF_failFoS | derived | Safe working load of a lifting cable |
| Percentage elongation (ductility) | %El = (L_f - L_0)/(L_0) × 100% | %El Percentage elongation [–]; L_f Final gauge length (after fracture) [m]; L_0 Original gauge length [m] | %, mm, cm, m, km | %El = (L_f - L_0)/(L_0); L_f = L_0 (1 + %El); L_0 = (L_f)/(1 + %El) | no | Ductility of a specimen from gauge lengths before and after testing |
| Percentage reduction in area | %RA = (A_0 - A_f)/(A_0) × 100% | %RA Reduction in area [–]; A_0 Original area [m²]; A_f Final area at fracture (neck) [m²] | %, mm², cm², m² | %RA = (A_0 - A_f)/(A_0); A_0 = (A_f)/(1 - %RA); A_f = A_0 (1 - %RA) | no | Reduction of area of a tensile specimen |
| Brinell hardness _(extension)_ | HB = \frac2Fπ D(D - √(D^2 - d^2)) | HB Brinell hardness number (kgf/mm²) [Pa]; F Test load (e.g. 3000 kgf = 29.42 kN) [N]; D Ball diameter (usually 10 mm) [m]; d Indentation diameter [m] | HB, MPa, N, kN, MN, mm, cm, m, km | HB = \frac2 Fπ D (D - √(D^2 - d^2)); F = \fracHB π D (D - √(D^2 - d^2))2; D = solved numerically; d = √(D^2 - (D - (2 F)/(π D HB))^2) | no | Hardness of a steel sample from indentation diameter |
| Vickers hardness _(extension)_ | HV = (1.8544 F)/(d^2) | HV Vickers hardness number (kgf/mm²) [Pa]; F Test load [N]; d Mean diagonal of indentation [m] | HV, MPa, N, kN, MN, mm, cm, m, km | HV = (1.8544 F)/(d^2); F = (HV d^2)/(1.8544); d = √((1.8544 F)/(HV)) | no | Vickers hardness of a heat-treated component |
| Impact test energy absorbed (Charpy / Izod) _(extension)_ | E = mg(h_1 - h_2) | E Energy absorbed by the specimen [J]; m Pendulum mass [kg]; g Gravitational acceleration [m/s²]; h_1 Release height [m]; h_2 Rise height after fracture [m] | J, kJ, MJ, kWh, g, kg, t, m/s², mm, cm, m, km | E = m g (h_1 - h_2); m = (E)/(g (h_1 - h_2)); g = (E)/(m (h_1 - h_2)); h_1 = h_2 + (E)/(m g); h_2 = h_1 - (E)/(m g) | no | Energy absorbed in a Charpy test comparing brittle and ductile specimens |
| Elastic strain energy _(extension)_ | U = (1)/(2) F Δ L | U Strain energy stored [J]; F Load (elastic) [N]; Δ L Extension [m] | J, kJ, MJ, kWh, N, kN, MN, mm, cm, m, km | U = (1)/(2) F Δ L; F = (2 U)/(Δ L); Δ L = (2 U)/(F) | no | Energy absorbed by a member up to the elastic limit |
| Modulus of resilience (strain energy per volume) _(extension)_ | u = (1)/(2)σε | u Strain energy per unit volume [J/m³]; σ Stress [Pa]; ε Strain [–] | J/m³, kJ/m³, MJ/m³, Pa, kPa, MPa, GPa, N/mm² | u = (1)/(2) σ ε; σ = (2 u)/(ε); ε = (2 u)/(σ) | no | Comparing toughness from stress–strain graphs |
| Density | ρ = (m)/(V) | ρ Density [kg/m³]; m Mass [kg]; V Volume [m³] | kg/m³, g/cm³, g, kg, t, mm³, cm³, L, m³ | ρ = (m)/(V); m = ρ × V; V = (m)/(ρ) | no | Self-weight of a concrete beam; Comparing aluminium and steel components |

### Pressure & hydraulics

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Pressure | P = (F)/(A) | P Pressure [Pa]; F Force (normal to surface) [N]; A Area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | P = (F)/(A); F = P × A; A = (F)/(P) | yes | Bearing pressure under a column footing; Force on an aircraft door from cabin pressure difference |
| Hydrostatic pressure | P = ρ g h | P Gauge pressure at depth [Pa]; ρ Fluid density [kg/m³]; g Gravitational acceleration [m/s²]; h Depth below the free surface [m] | Pa, kPa, MPa, GPa, N/mm², kg/m³, g/cm³, m/s², mm, cm, m, km | P = ρ g h; ρ = (P)/(g h); g = (P)/(ρ h); h = (P)/(ρ g) | yes | Pressure at the base of a dam wall; Pressure on a bridge pier footing |
| Resultant hydrostatic force on a vertical wall _(extension)_ | F = (1)/(2)ρ g h^2 b | F Resultant force (acts h/3 above the base) [N]; ρ Fluid density [kg/m³]; g Gravitational acceleration [m/s²]; h Depth of water [m]; b Width of wall [m] | N, kN, MN, kg/m³, g/cm³, m/s², mm, cm, m, km | F = (1)/(2) ρ g h^2 b; ρ = (2 F)/(g h^2 b); g = (2 F)/(ρ h^2 b); h = √((2 F)/(ρ g b)); b = (2 F)/(ρ g h^2) | no | Overturning moment on a dam wall (F × h/3) |
| Pascal's principle (hydraulic press/brakes) | (F_1)/(A_1) = (F_2)/(A_2) | F_2 Output force (large / slave piston) [N]; F_1 Input force (small / master piston) [N]; A_1 Input piston area [m²]; A_2 Output piston area [m²] | N, kN, MN, mm², cm², m² | F_2 = (F_1 A_2)/(A_1); F_1 = (F_2 A_1)/(A_2); A_1 = (F_1 A_2)/(F_2); A_2 = (F_2 A_1)/(F_1) | yes | Force at a brake calliper from pedal force; Aircraft hydraulic actuator force; Hydraulic jack output force |

## Personal & Public Transport

### Forces & motion

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Newton's second law | F = ma | F Net (resultant) force [N]; m Mass [kg]; a Acceleration [m/s²] | N, kN, MN, g, kg, t, m/s² | F = m × a; m = (F)/(a); a = (F)/(m) | yes | Braking force on a vehicle from deceleration; Thrust required for take-off acceleration |
| Weight force | W = mg | W Weight force [N]; m Mass [kg]; g Gravitational acceleration [m/s²] | N, kN, MN, g, kg, t, m/s² | W = m × g; m = (W)/(g); g = (W)/(m) | yes | Load of a hanging mass on a cable; Aircraft weight in flight force diagrams; Vehicle normal force |
| Net force on a vehicle | F_t - F_r = ma | F_t Tractive / driving force (or thrust) [N]; F_r Total resistance (drag, rolling, friction) [N]; m Mass [kg]; a Acceleration [m/s²] | N, kN, MN, g, kg, t, m/s² | F_t = m a + F_r; F_r = F_t - m a; m = (F_t - F_r)/(a); a = (F_t - F_r)/(m) | derived | Acceleration of a train given tractive effort and resistance; Take-off acceleration: (T − D)/m |
| Tractive force climbing a slope at constant speed | F_t = mgsinθ + F_r | F_t Tractive (driving) force required [N]; m Mass [kg]; g Gravitational acceleration [m/s²]; θ Slope angle [rad]; F_r Other resistance (rolling, drag) [N] | N, kN, MN, g, kg, t, m/s², °, rad | F_t = m g sin(θ) + F_r; m = (F_t - F_r)/(g sin(θ)); g = (F_t - F_r)/(m sin(θ)); θ = sin^-1((F_t - F_r)/(m g)); F_r = F_t - m g sin(θ) | derived | Power required for a bus to climb a hill at constant speed |
| Momentum _(extension)_ | p = mv | p Momentum [kg·m/s]; m Mass [kg]; v Velocity [m/s] | kg·m/s, N·s, g, kg, t, m/s, km/h | p = m × v; m = (p)/(v); v = (p)/(m) | no | Momentum of a vehicle before a collision |
| Impulse–momentum _(extension)_ | FΔ t = m(v - u) | F Average force [N]; Δ t Time of impact [s]; m Mass [kg]; v Final velocity [m/s]; u Initial velocity [m/s] | N, kN, MN, μs, ms, s, min, h, g, kg, t, m/s, km/h | F = (m (v - u))/(Δ t); Δ t = (m (v - u))/(F); m = (F Δ t)/(v - u); v = u + (F Δ t)/(m); u = v - (F Δ t)/(m) | no | Average force on an occupant during a collision |
| Centripetal force (cornering) _(extension)_ | F = (mv^2)/(r) | F Centripetal force [N]; m Mass [kg]; v Speed [m/s]; r Radius of the curve [m] | N, kN, MN, g, kg, t, m/s, km/h, mm, cm, m, km | F = (m v^2)/(r); m = (F r)/(v^2); v = √((F r)/(m)); r = (m v^2)/(F) | no | Friction force required for a car cornering |

### Kinematics

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Equation of motion: v = u + at | v = u + at | v Final velocity [m/s]; u Initial velocity [m/s]; a Acceleration [m/s²]; t Time [s] | m/s, km/h, m/s², μs, ms, s, min, h | v = u + a × t; u = v - a × t; a = (v - u)/(t); t = (v - u)/(a) | yes | Deceleration of a braking vehicle; Time for an aircraft to reach take-off speed |
| Equation of motion: s = ut + ½at² | s = ut + (1)/(2)at^2 | s Displacement [m]; u Initial velocity [m/s]; t Time [s]; a Acceleration [m/s²] | mm, cm, m, km, m/s, km/h, μs, ms, s, min, h, m/s² | s = u t + (1)/(2) a t^2; u = (s - (1)/(2) a t^2)/(t); t = \frac-u + √(u^2 + 2 a s)a; a = (2(s - u t))/(t^2) | yes | Take-off run distance; Distance covered while accelerating |
| Equation of motion: v² = u² + 2as | v^2 = u^2 + 2as | v Final velocity [m/s]; u Initial velocity [m/s]; a Acceleration [m/s²]; s Displacement [m] | m/s, km/h, m/s², mm, cm, m, km | v = √(u^2 + 2 a s); u = √(v^2 - 2 a s); a = (v^2 - u^2)/(2 s); s = (v^2 - u^2)/(2 a) | yes | Braking distance from speed and deceleration; Deceleration needed to stop within a distance |
| Equation of motion: s = ½(u + v)t | s = (1)/(2)(u + v)t | s Displacement [m]; u Initial velocity [m/s]; v Final velocity [m/s]; t Time [s] | mm, cm, m, km, m/s, km/h, μs, ms, s, min, h | s = (1)/(2)(u + v) t; u = (2 s)/(t) - v; v = (2 s)/(t) - u; t = (2 s)/(u + v) | yes | Distance travelled while braking in a known time |
| Constant speed: s = vt | s = vt | s Distance [m]; v Speed (constant) [m/s]; t Time [s] | mm, cm, m, km, m/s, km/h, μs, ms, s, min, h | s = v × t; v = (s)/(t); t = (s)/(v) | derived | Travel time of a train at constant speed |

### Friction

Multi-step tools: **Inclined plane with friction**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Friction force | F_f = μ N | F_f Friction force (limiting) [N]; μ Coefficient of (static) friction [–]; N Normal reaction force [N] | N, kN, MN | F_f = μ × N; μ = (F_f)/(N); N = (F_f)/(μ) | yes | Force needed to start a crate sliding; Braking force available at the tyres; μ from a sliding test |
| Angle of friction / repose | μ = tanφ | μ Coefficient of friction [–]; φ Angle of friction (angle of repose) [rad] | °, rad | μ = tan(φ); φ = tan^-1(μ) | yes | μ from the angle at which a block starts to slide |
| Normal force on an incline | N = Wcosθ | N Normal reaction [N]; W Weight (mg) [N]; θ Incline angle [rad] | N, kN, MN, °, rad | N = W cos(θ); W = (N)/(cos(θ)); θ = cos^-1((N)/(W)) | derived | Friction on a vehicle parked on a hill |
| Weight component along an incline | F_∥ = Wsinθ | F_∥ Component of weight down the slope [N]; W Weight (mg) [N]; θ Incline angle [rad] | N, kN, MN, °, rad | F_∥ = W sin(θ); W = \fracF_∥sin(θ); θ = sin^-1(\fracF_∥W) | derived | Extra tractive force for a vehicle climbing a hill |

### Work, energy & power

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Work done | W = Fs | W Work done [J]; F Force (in direction of motion) [N]; s Displacement [m] | J, kJ, MJ, kWh, N, kN, MN, mm, cm, m, km | W = F × s; F = (W)/(s); s = (W)/(F) | yes | Work done lifting a load with a crane; Work done by braking force |
| Kinetic energy | KE = (1)/(2)mv^2 | KE Kinetic energy [J]; m Mass [kg]; v Speed [m/s] | J, kJ, MJ, kWh, g, kg, t, m/s, km/h | KE = (1)/(2) × m × v^2; m = (2 KE)/(v^2); v = √((2 KE)/(m)) | yes | Energy dissipated by brakes stopping a vehicle; Kinetic energy of a train |
| Gravitational potential energy | PE = mgh | PE Potential energy [J]; m Mass [kg]; g Gravitational acceleration [m/s²]; h Height (vertical change) [m] | J, kJ, MJ, kWh, g, kg, t, m/s², mm, cm, m, km | PE = m × g × h; m = (PE)/(g h); g = (PE)/(m h); h = (PE)/(m g) | yes | Energy to raise a lift car; Vehicle climbing a hill |
| Change in kinetic energy | Δ KE = (1)/(2)m(u^2 - v^2) | Δ KE Kinetic energy lost (positive when slowing down) [J]; m Mass [kg]; u Initial speed [m/s]; v Final speed [m/s] | J, kJ, MJ, kWh, g, kg, t, m/s, km/h | Δ KE = (1)/(2) m (u^2 - v^2); m = (2 Δ KE)/(u^2 - v^2); u = √(v^2 + (2 Δ KE)/(m)); v = √(u^2 - (2 Δ KE)/(m)) | derived | Heat generated in the brakes as a car slows; Energy recovered by regenerative braking |
| Power at the driving wheels | P_wheels = F_t v | P_wheels Useful power delivered to the driving wheels [W]; F_t Tractive force at the wheels [N]; v Vehicle speed (constant) [m/s] | mW, W, kW, MW, N, kN, MN, m/s, km/h | P_wheels = F_t × v; F_t = \fracP_wheelsv; v = \fracP_wheelsF_t | derived | Tractive force from the power delivered through a transmission |
| Work–energy theorem (braking / accelerating) | Fs = (1)/(2)m(u^2 - v^2) | F Braking (resisting) force [N]; s Distance over which force acts [m]; m Mass [kg]; u Initial speed [m/s]; v Final speed [m/s] | N, kN, MN, mm, cm, m, km, g, kg, t, m/s, km/h | F = (m (u^2 - v^2))/(2 s); s = (m (u^2 - v^2))/(2 F); m = (2 F s)/(u^2 - v^2); u = √(v^2 + (2 F s)/(m)); v = √(u^2 - (2 F s)/(m)) | derived | Average braking force to stop a car in a given distance; Stopping distance from braking force |
| Energy conservation (no losses): KE = PE | (1)/(2)mv^2 = mgh \Rightarrow v = √(2gh) | v Speed at the bottom [m/s]; g Gravitational acceleration [m/s²]; h Height dropped [m] | m/s, km/h, m/s², mm, cm, m, km | v = √(2 × g × h); g = (v^2)/(2 h); h = (v^2)/(2 g) | derived | Speed of a vehicle at the bottom of a slope with no friction |
| Power (rate of doing work) | P = (W)/(t) | P Power [W]; W Work done / energy transferred [J]; t Time [s] | mW, W, kW, MW, J, kJ, MJ, kWh, μs, ms, s, min, h | P = (W)/(t); W = P × t; t = (W)/(P) | yes | Power of a lift motor; Average braking power |
| Power from force and velocity | P = Fv | P Power [W]; F Driving / tractive force [N]; v Velocity (constant) [m/s] | mW, W, kW, MW, N, kN, MN, m/s, km/h | P = F × v; F = (P)/(v); v = (P)/(F) | derived | Power to drive a car at constant speed against resistance; Thrust power of an aircraft |
| Rotational power | P = Tω = (2π N T)/(60) | P Power [W]; T Torque [N·m]; ω Angular speed (enter rpm to use N) [rad/s] | mW, W, kW, MW, N·mm, N·m, kN·m, rad/s, rpm | P = T × ω; T = (P)/(ω); ω = (P)/(T) | yes | Engine power from torque and rpm; Torque delivered by an electric motor |
| Torque | T = Fr | T Torque [N·m]; F Tangential force [N]; r Radius (lever arm) [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | T = F × r; F = (T)/(r); r = (T)/(F) | derived | Tractive force at the tyre from axle torque; Torque applied with a wheel brace |
| Efficiency (power or energy) | η = \fracP_outP_in × 100% | η Efficiency [–]; P_out Useful output power (or energy) [W]; P_in Input power (or energy) [W] | %, mW, W, kW, MW | η = \fracP_outP_in; P_out = η × P_in; P_in = \fracP_outη | yes | Efficiency of an electric motor from electrical input and mechanical output; Overall efficiency of a drive train |
| Efficiency (energy) | η = \fracE_outE_in × 100% | η Efficiency [–]; E_out Useful energy / work out [J]; E_in Energy / work in [J] | %, J, kJ, MJ, kWh | η = \fracE_outE_in; E_out = η × E_in; E_in = \fracE_outη | yes | Efficiency of a pulley system from work output and input |
| Energy from power and time | E = Pt | E Energy [J]; P Power [W]; t Time [s] | J, kJ, MJ, kWh, mW, W, kW, MW, μs, ms, s, min, h | E = P × t; P = (E)/(t); t = (E)/(P) | derived | Energy (kWh) used by an electric train motor; Battery energy for an electric vehicle trip |

### Simple machines

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Mechanical advantage | MA = (L)/(E) | MA Mechanical advantage [–]; L Load (output force) [N]; E Effort (input force) [N] | N, kN, MN | MA = (L)/(E); L = MA × E; E = (L)/(MA) | yes | MA of a pulley block; Effort required on a car jack |
| Velocity ratio | VR = (d_E)/(d_L) | VR Velocity ratio [–]; d_E Distance moved by effort [m]; d_L Distance moved by load [m] | mm, cm, m, km | VR = (d_E)/(d_L); d_E = VR × d_L; d_L = (d_E)/(VR) | yes | VR of a pulley system from rope pulled vs load raised |
| Efficiency of a machine | η = (MA)/(VR) × 100% | η Efficiency [–]; MA Mechanical advantage [–]; VR Velocity ratio [–] | % | η = (MA)/(VR); MA = η × VR; VR = (MA)/(η) | yes | Efficiency of a block and tackle; Effort needed given efficiency and VR |
| Lever balance (principle of moments) | E × a = L × b | E Effort [N]; a Effort arm (distance from fulcrum) [m]; L Load [N]; b Load arm (distance from fulcrum) [m] | N, kN, MN, mm, cm, m, km | E = (L b)/(a); a = (L b)/(E); L = (E a)/(b); b = (E a)/(L) | derived | Force at a brake pedal linkage; Effort on a wheelbarrow handle |
| Velocity ratio of a lever | VR = (a)/(b) | VR Velocity ratio [–]; a Effort arm [m]; b Load arm [m] | mm, cm, m, km | VR = (a)/(b); a = VR × b; b = (a)/(VR) | derived | VR of a hand-brake lever |
| Velocity ratio of a pulley system | VR = n | VR Velocity ratio [–]; n Number of rope segments supporting the load block [–] |  | VR = n; n = VR | derived | VR and efficiency of a crane hoist |

### Mechanisms (gears, belts, screws)

Multi-step tools: **Gear / pulley / sprocket train**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Gear ratio (simple gear pair) | GR = \fracT_drivenT_driver = \fracN_driverN_driven | GR Gear ratio (= VR) [–]; T_driven Teeth on driven gear [–]; T_driver Teeth on driver gear [–] |  | GR = \fracT_drivenT_driver; T_driven = GR × T_driver; T_driver = \fracT_drivenGR | derived | Output speed of a gearbox; Bicycle chain-wheel and sprocket ratio |
| Gear speeds | N_driver T_driver = N_driven T_driven | N_driven Speed of driven gear [rad/s]; N_driver Speed of driver gear [rad/s]; T_driver Teeth on driver [–]; T_driven Teeth on driven [–] | rad/s, rpm | N_driven = \fracN_driver T_driverT_driven; N_driver = \fracN_driven T_drivenT_driver; T_driver = \fracN_driven T_drivenN_driver; T_driven = \fracN_driver T_driverN_driven | derived | Speed of the output shaft of a reduction gearbox |
| Output torque through a gear train | T_out = T_in × GR × η | T_out Output torque [N·m]; T_in Input torque [N·m]; GR Gear ratio [–]; η Efficiency (1 if ideal) [–] | N·mm, N·m, kN·m, % | T_out = T_in × GR × η; T_in = \fracT_outGR η; GR = \fracT_outT_in η; η = \fracT_outT_in GR | derived | Torque at the wheels after a final-drive reduction |
| Torque at the driving wheels | T_w = F_t r | T_w Total torque at the driving wheels [N·m]; F_t Tractive force at the road [N]; r Effective rolling radius of the wheel [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | T_w = F_t × r; F_t = (T_w)/(r); r = (T_w)/(F_t) | derived | Torque required at the driving wheels |
| Torque shared between driving wheels | T_each = (T_w)/(n_w) | T_each Torque at each driving wheel [N·m]; T_w Total torque at the driving wheels [N·m]; n_w Number of driving wheels [–] | N·mm, N·m, kN·m | T_each = (T_w)/(n_w); T_w = T_each × n_w; n_w = \fracT_wT_each | derived | Torque at each of two driving wheels |
| Wheel and axle / belt drive VR | VR = (D)/(d) | VR Velocity ratio [–]; D Effort (wheel / driven pulley) diameter [m]; d Load (axle / driver pulley) diameter [m] | mm, cm, m, km | VR = (D)/(d); D = VR × d; d = (D)/(VR) | derived | VR of a steering wheel on a shaft; Belt drive speed ratio |
| Screw jack VR _(extension)_ | VR = (2π R)/(p) | VR Velocity ratio [–]; R Handle (effort) radius [m]; p Screw pitch (lead) [m] | mm, cm, m, km | VR = (2π R)/(p); R = (VR p)/(2π); p = (2π R)/(VR) | no | Effort required on a car screw jack |

### Hydraulics

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Pascal's principle (hydraulic press/brakes) | (F_1)/(A_1) = (F_2)/(A_2) | F_2 Output force (large / slave piston) [N]; F_1 Input force (small / master piston) [N]; A_1 Input piston area [m²]; A_2 Output piston area [m²] | N, kN, MN, mm², cm², m² | F_2 = (F_1 A_2)/(A_1); F_1 = (F_2 A_1)/(A_2); A_1 = (F_1 A_2)/(F_2); A_2 = (F_2 A_1)/(F_1) | yes | Force at a brake calliper from pedal force; Aircraft hydraulic actuator force; Hydraulic jack output force |
| Input piston area from diameter | A_1 = (π d_1^2)/(4) | A_1 Input piston area [m²]; d_1 Input piston diameter [m] | mm², cm², m², mm, cm, m, km | A_1 = (π d_1^2)/(4); d_1 = √((4 A_1)/(π)) | no | Hydraulic brake master cylinder |
| Output piston area from diameter | A_2 = (π d_2^2)/(4) | A_2 Output piston area [m²]; d_2 Output piston diameter [m] | mm², cm², m², mm, cm, m, km | A_2 = (π d_2^2)/(4); d_2 = √((4 A_2)/(π)) | no | Hydraulic press ram |
| System pressure in a hydraulic circuit | P = (F_1)/(A_1) | P Fluid pressure [Pa]; F_1 Input force [N]; A_1 Input piston area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | P = (F_1)/(A_1); F_1 = P × A_1; A_1 = (F_1)/(P) | yes | Brake line pressure |
| Hydraulic piston travel (volume conservation) | A_1 s_1 = A_2 s_2 | s_2 Output piston travel [m]; A_1 Input piston area [m²]; s_1 Input piston travel [m]; A_2 Output piston area [m²] | mm, cm, m, km, mm², cm², m² | s_2 = (A_1 s_1)/(A_2); A_1 = (A_2 s_2)/(s_1); s_1 = (A_2 s_2)/(A_1); A_2 = (A_1 s_1)/(s_2) | derived | How far the small piston must move to lift a car 100 mm |
| Velocity ratio of a hydraulic system | VR = (A_2)/(A_1) = ((d_2)/(d_1))^2 | VR Velocity ratio [–]; A_2 Output piston area [m²]; A_1 Input piston area [m²] | mm², cm², m² | VR = (A_2)/(A_1); A_2 = VR × A_1; A_1 = (A_2)/(VR) | derived | Efficiency of a hydraulic jack |

### Electricity & electric motors

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Electrical energy | E = VIt | E Electrical energy [J]; V Voltage [V]; I Current [A]; t Time [s] | J, kJ, MJ, kWh, μV, mV, V, kV, μA, mA, A, μs, ms, s, min, h | E = V I t; V = (E)/(I t); I = (E)/(V t); t = (E)/(V I) | derived | Energy used by a tram motor during a trip |
| Cost of electrical energy | Cost = E × tariff | Cost Cost of energy [$]; E Energy used (kWh) [J]; r Tariff (price per kWh) [$/J] | $, c, J, kJ, MJ, kWh, $/kWh, c/kWh | Cost = E × r; E = \fracCostr; r = \fracCostE | no | Cost to charge an electric vehicle battery |
| Charge / battery capacity | Q = It | Q Charge (capacity) [C]; I Current [A]; t Time [s] | C, mAh, Ah, μA, mA, A, μs, ms, s, min, h | Q = I × t; I = (Q)/(t); t = (Q)/(I) | no | How long an e-bike battery lasts at a given current |
| Battery energy | E = VQ | E Stored energy [J]; V Battery voltage [V]; Q Capacity (charge) [C] | J, kJ, MJ, kWh, μV, mV, V, kV, C, mAh, Ah | E = V × Q; V = (E)/(Q); Q = (E)/(V) | no | Electric vehicle battery pack energy |
| Ohm's law | V = IR | V Voltage (potential difference) [V]; I Current [A]; R Resistance [Ω] | μV, mV, V, kV, μA, mA, A, Ω, kΩ, MΩ | V = I × R; I = (V)/(R); R = (V)/(I) | yes | Current drawn from a supply by a resistor network; Voltage drop across a resistor |
| Electrical power | P = VI | P Power [W]; V Voltage [V]; I Current [A] | mW, W, kW, MW, μV, mV, V, kV, μA, mA, A | P = V × I; V = (P)/(I); I = (P)/(V) | yes | Power drawn by a traction motor; Current drawn by a 2 kW heater at 240 V |
| Efficiency (power or energy) | η = \fracP_outP_in × 100% | η Efficiency [–]; P_out Useful output power (or energy) [W]; P_in Input power (or energy) [W] | %, mW, W, kW, MW | η = \fracP_outP_in; P_out = η × P_in; P_in = \fracP_outη | yes | Efficiency of an electric motor from electrical input and mechanical output; Overall efficiency of a drive train |
| Ideal transformer (voltage ratio) _(extension)_ | (V_p)/(V_s) = (N_p)/(N_s) | V_s Secondary voltage [V]; V_p Primary voltage [V]; N_p Primary turns [–]; N_s Secondary turns [–] | μV, mV, V, kV | V_s = (V_p N_s)/(N_p); V_p = (V_s N_p)/(N_s); N_p = (V_p N_s)/(V_s); N_s = (V_s N_p)/(V_p) | no | Turns ratio for a traction substation transformer |
| Ideal transformer (power balance) _(extension)_ | V_p I_p = V_s I_s | I_s Secondary current [A]; V_p Primary voltage [V]; I_p Primary current [A]; V_s Secondary voltage [V] | μA, mA, A, μV, mV, V, kV | I_s = (V_p I_p)/(V_s); V_p = (V_s I_s)/(I_p); I_p = (V_s I_s)/(V_p); V_s = (V_p I_p)/(I_s) | no | Current in the primary winding |
| RMS value of a sinusoidal voltage _(extension)_ | V_rms = \fracV_peak√(2) | V_rms RMS voltage [V]; V_peak Peak voltage (= V_pp / 2) [V] | μV, mV, V, kV | V_rms = \fracV_peak√(2); V_peak = √(2) × V_rms | no | Peak voltage of the 240 V mains supply |

### Engineering materials

Multi-step tools: **Iron–carbon lever rule (phase %)**, **Tensile test analysis (E, UTS, ductility)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Engineering stress (axial) | σ = (F)/(A) | σ Stress (tensile or compressive) [Pa]; F Axial force (tension or compression) [N]; A Cross-sectional area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | σ = (F)/(A); F = σ × A; A = (F)/(σ) | yes | Stress in a truss member once its force is known; Minimum diameter of a tie rod for an allowable stress; Stress in a cable of a suspension bridge |
| Engineering strain | ε = (Δ L)/(L) | ε Strain [–]; Δ L Change in length (extension/compression) [m]; L Original length [m] | mm, cm, m, km | ε = (Δ L)/(L); Δ L = ε × L; L = (Δ L)/(ε) | yes | Strain in a tensile test specimen; Extension of a cable from strain |
| Young's modulus (modulus of elasticity) | E = (σ)/(ε) | E Young's modulus [Pa]; σ Stress (within the elastic/proportional region) [Pa]; ε Strain [–] | Pa, kPa, MPa, GPa, N/mm² | E = (σ)/(ε); σ = E × ε; ε = (σ)/(E) | yes | E from the slope of a stress–strain graph; Extension of a steel member given E |
| Factor of safety (ultimate strength) | FoS = \fracσ_UTSσ_w | FoS Factor of safety [–]; σ_UTS Ultimate tensile strength [Pa]; σ_w Working (allowable) stress [Pa] | Pa, kPa, MPa, GPa, N/mm² | FoS = \fracσ_UTSσ_w; σ_UTS = FoS × σ_w; σ_w = \fracσ_UTSFoS | yes | Allowable stress in a cable given UTS and FoS; FoS of a truss member |
| Percentage elongation (ductility) | %El = (L_f - L_0)/(L_0) × 100% | %El Percentage elongation [–]; L_f Final gauge length (after fracture) [m]; L_0 Original gauge length [m] | %, mm, cm, m, km | %El = (L_f - L_0)/(L_0); L_f = L_0 (1 + %El); L_0 = (L_f)/(1 + %El) | no | Ductility of a specimen from gauge lengths before and after testing |
| Brinell hardness _(extension)_ | HB = \frac2Fπ D(D - √(D^2 - d^2)) | HB Brinell hardness number (kgf/mm²) [Pa]; F Test load (e.g. 3000 kgf = 29.42 kN) [N]; D Ball diameter (usually 10 mm) [m]; d Indentation diameter [m] | HB, MPa, N, kN, MN, mm, cm, m, km | HB = \frac2 Fπ D (D - √(D^2 - d^2)); F = \fracHB π D (D - √(D^2 - d^2))2; D = solved numerically; d = √(D^2 - (D - (2 F)/(π D HB))^2) | no | Hardness of a steel sample from indentation diameter |
| Vickers hardness _(extension)_ | HV = (1.8544 F)/(d^2) | HV Vickers hardness number (kgf/mm²) [Pa]; F Test load [N]; d Mean diagonal of indentation [m] | HV, MPa, N, kN, MN, mm, cm, m, km | HV = (1.8544 F)/(d^2); F = (HV d^2)/(1.8544); d = √((1.8544 F)/(HV)) | no | Vickers hardness of a heat-treated component |
| Impact test energy absorbed (Charpy / Izod) _(extension)_ | E = mg(h_1 - h_2) | E Energy absorbed by the specimen [J]; m Pendulum mass [kg]; g Gravitational acceleration [m/s²]; h_1 Release height [m]; h_2 Rise height after fracture [m] | J, kJ, MJ, kWh, g, kg, t, m/s², mm, cm, m, km | E = m g (h_1 - h_2); m = (E)/(g (h_1 - h_2)); g = (E)/(m (h_1 - h_2)); h_1 = h_2 + (E)/(m g); h_2 = h_1 - (E)/(m g) | no | Energy absorbed in a Charpy test comparing brittle and ductile specimens |

## Aeronautical Engineering

### Flight forces

Multi-step tools: **Flight forces (level, climb, glide, turn)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Straight & level flight: lift = weight | L = W | L Lift [N]; W Weight [N] | N, kN, MN | L = W; W = L | derived | Lift required for an aircraft of given mass in cruise |
| Straight & level flight: thrust = drag | T = D | T Thrust [N]; D Drag [N] | N, kN, MN | T = D; D = T | derived | Thrust required in cruise given the L/D ratio |
| Lift-to-drag ratio | (L)/(D) = L/D ratio | L/D Lift-to-drag ratio [–]; L Lift [N]; D Drag [N] | N, kN, MN | L/D = (L)/(D); L = L/D × D; D = (L)/(L/D) | derived | Drag (and thrust required) in cruise from L/D; Comparing glider performance |
| Climbing flight: lift | L = Wcosγ | L Lift [N]; W Weight [N]; γ Climb angle [rad] | N, kN, MN, °, rad | L = W cos(γ); W = (L)/(cos(γ)); γ = cos^-1((L)/(W)) | derived | Lift during a steady climb |
| Climbing flight: thrust | T = D + Wsinγ | T Thrust [N]; D Drag [N]; W Weight [N]; γ Climb angle [rad] | N, kN, MN, °, rad | T = D + W sin(γ); D = T - W sin(γ); W = (T - D)/(sin(γ)); γ = sin^-1((T - D)/(W)) | derived | Thrust required to climb at a given angle; Maximum climb angle from excess thrust |
| Glide ratio (distance) | (L)/(D) = \frachorizontal distanceheight lost | L/D Glide ratio (= L/D) [–]; x Horizontal glide distance [m]; h Height lost [m] | mm, cm, m, km | L/D = (x)/(h); x = L/D × h; h = (x)/(L/D) | derived | Distance a glider travels from a given altitude |
| Glide angle | tanγ = (D)/(L) = (1)/(L/D) | γ Glide angle (below horizontal) [rad]; L/D Lift-to-drag ratio [–] | °, rad | γ = tan^-1((1)/(L/D)); L/D = (1)/(tan(γ)) | derived | Glide angle of a sailplane with L/D = 40 |

### Lift & drag

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Pressure difference across a wing (Bernoulli) | Δ P = (1)/(2)ρ (v_upper^2 - v_lower^2) | Δ P Pressure difference (lower − upper) [Pa]; ρ Air density [kg/m³]; v_upper Airflow speed over upper surface [m/s]; v_lower Airflow speed under lower surface [m/s] | Pa, kPa, MPa, GPa, N/mm², kg/m³, g/cm³, m/s, km/h | Δ P = (1)/(2) ρ (v_upper^2 - v_lower^2); ρ = \frac2 Δ Pv_upper^2 - v_lower^2; v_upper = \sqrtv_lower^2 + (2 Δ P)/(ρ); v_lower = \sqrtv_upper^2 - (2 Δ P)/(ρ) | derived | Lift on a wing from upper/lower surface airspeeds |
| Lift from pressure difference | L = Δ P × S | L Lift [N]; Δ P Average pressure difference [Pa]; S Wing area [m²] | N, kN, MN, Pa, kPa, MPa, GPa, N/mm², mm², cm², m² | L = Δ P × S; Δ P = (L)/(S); S = (L)/(Δ P) | derived | Lift generated by a wing of given area; Required pressure difference for lift = weight |
| Lift equation _(extension)_ | L = (1)/(2)ρ v^2 S C_L | L Lift [N]; ρ Air density [kg/m³]; v Airspeed [m/s]; S Wing (planform) area [m²]; C_L Lift coefficient [–] | N, kN, MN, kg/m³, g/cm³, m/s, km/h, mm², cm², m² | L = (1)/(2) ρ v^2 S C_L; ρ = (2 L)/(v^2 S C_L); v = √((2 L)/(ρ S C_L)); S = (2 L)/(ρ v^2 C_L); C_L = (2 L)/(ρ v^2 S) | no | Effect of doubling airspeed on lift (×4); Minimum speed to generate lift equal to weight |
| Drag equation _(extension)_ | D = (1)/(2)ρ v^2 A C_D | D Drag force [N]; ρ Fluid (air) density [kg/m³]; v Speed [m/s]; A Reference area (wing or frontal area) [m²]; C_D Drag coefficient [–] | N, kN, MN, kg/m³, g/cm³, m/s, km/h, mm², cm², m² | D = (1)/(2) ρ v^2 A C_D; ρ = (2 D)/(v^2 A C_D); v = √((2 D)/(ρ A C_D)); A = (2 D)/(ρ v^2 C_D); C_D = (2 D)/(ρ v^2 A) | no | Drag on a car at highway speed; Power to overcome drag (P = Dv) |

### Fluid mechanics

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Bernoulli's principle (horizontal flow) | P_1 + (1)/(2)ρ v_1^2 = P_2 + (1)/(2)ρ v_2^2 | P_2 Static pressure at point 2 (e.g. upper wing surface) [Pa]; P_1 Static pressure at point 1 (e.g. lower surface / freestream) [Pa]; ρ Fluid density [kg/m³]; v_1 Flow speed at point 1 [m/s]; v_2 Flow speed at point 2 [m/s] | Pa, kPa, MPa, GPa, N/mm², kg/m³, g/cm³, m/s, km/h | P_2 = P_1 + (1)/(2) ρ (v_1^2 - v_2^2); P_1 = P_2 + (1)/(2) ρ (v_2^2 - v_1^2); ρ = (2 (P_1 - P_2))/(v_2^2 - v_1^2); v_1 = √(v_2^2 - (2 (P_1 - P_2))/(ρ)); v_2 = √(v_1^2 + (2 (P_1 - P_2))/(ρ)) | yes | Pressure on the upper surface of a wing given airspeeds above and below; Venturi pressure drop |
| Dynamic pressure | q = (1)/(2)ρ v^2 | q Dynamic pressure [Pa]; ρ Fluid density [kg/m³]; v Flow speed / airspeed [m/s] | Pa, kPa, MPa, GPa, N/mm², kg/m³, g/cm³, m/s, km/h | q = (1)/(2) ρ v^2; ρ = (2 q)/(v^2); v = √((2 q)/(ρ)) | derived | Airspeed from a pitot-static pressure difference |
| Continuity equation _(extension)_ | A_1 v_1 = A_2 v_2 | v_2 Speed at section 2 [m/s]; A_1 Area at section 1 [m²]; v_1 Speed at section 1 [m/s]; A_2 Area at section 2 [m²] | m/s, km/h, mm², cm², m² | v_2 = (A_1 v_1)/(A_2); A_1 = (A_2 v_2)/(v_1); v_1 = (A_2 v_2)/(A_1); A_2 = (A_1 v_1)/(v_2) | no | Airspeed in a venturi throat |
| Pascal's principle (hydraulic press/brakes) | (F_1)/(A_1) = (F_2)/(A_2) | F_2 Output force (large / slave piston) [N]; F_1 Input force (small / master piston) [N]; A_1 Input piston area [m²]; A_2 Output piston area [m²] | N, kN, MN, mm², cm², m² | F_2 = (F_1 A_2)/(A_1); F_1 = (F_2 A_1)/(A_2); A_1 = (F_1 A_2)/(F_2); A_2 = (F_2 A_1)/(F_1) | yes | Force at a brake calliper from pedal force; Aircraft hydraulic actuator force; Hydraulic jack output force |
| Hydrostatic pressure | P = ρ g h | P Gauge pressure at depth [Pa]; ρ Fluid density [kg/m³]; g Gravitational acceleration [m/s²]; h Depth below the free surface [m] | Pa, kPa, MPa, GPa, N/mm², kg/m³, g/cm³, m/s², mm, cm, m, km | P = ρ g h; ρ = (P)/(g h); g = (P)/(ρ h); h = (P)/(ρ g) | yes | Pressure at the base of a dam wall; Pressure on a bridge pier footing |
| Pressure | P = (F)/(A) | P Pressure [Pa]; F Force (normal to surface) [N]; A Area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | P = (F)/(A); F = P × A; A = (F)/(P) | yes | Bearing pressure under a column footing; Force on an aircraft door from cabin pressure difference |

### Aircraft performance

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Wing loading | WL = (W)/(S) | WL Wing loading [Pa]; W Weight [N]; S Wing area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | WL = (W)/(S); W = WL × S; S = (W)/(WL) | no | Comparing wing loading of a glider and an airliner |
| Aspect ratio _(extension)_ | AR = (b^2)/(S) | AR Aspect ratio [–]; b Wingspan [m]; S Wing area [m²] | mm, cm, m, km, mm², cm², m² | AR = (b^2)/(S); b = √(AR × S); S = (b^2)/(AR) | no | Why gliders have high aspect ratio wings |
| Load factor _(extension)_ | n = (L)/(W) | n Load factor (g) [–]; L Lift [N]; W Weight [N] | N, kN, MN | n = (L)/(W); L = n × W; W = (L)/(n) | no | Wing load during a 2 g pull-up |
| Load factor in a level banked turn _(extension)_ | n = (1)/(cosφ) | n Load factor [–]; φ Bank angle [rad] | °, rad | n = (1)/(cos(φ)); φ = cos^-1((1)/(n)) | no | Lift needed in a 60° banked turn (2 g) |
| Mach number _(extension)_ | M = (v)/(a) | M Mach number [–]; v True airspeed [m/s]; a Local speed of sound [m/s] | m/s, km/h | M = (v)/(a); v = M × a; a = (v)/(M) | no | Mach number of Concorde at cruise |

### Propulsion & power

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Jet / propeller thrust (momentum) _(extension)_ | T = \dotm(v_e - v_i) | T Thrust [N]; \dotm Mass flow rate of air/exhaust [kg/s]; v_e Exhaust (exit) velocity [m/s]; v_i Inlet (flight) velocity [m/s] | N, kN, MN, kg/s, kg/min, m/s, km/h | T = \dotm (v_e - v_i); \dotm = (T)/(v_e - v_i); v_e = v_i + \fracT\dotm; v_i = v_e - \fracT\dotm | no | Thrust of a jet engine from mass flow and velocity change |
| Net force on a vehicle | F_t - F_r = ma | F_t Tractive / driving force (or thrust) [N]; F_r Total resistance (drag, rolling, friction) [N]; m Mass [kg]; a Acceleration [m/s²] | N, kN, MN, g, kg, t, m/s² | F_t = m a + F_r; F_r = F_t - m a; m = (F_t - F_r)/(a); a = (F_t - F_r)/(m) | derived | Acceleration of a train given tractive effort and resistance; Take-off acceleration: (T − D)/m |
| Power from force and velocity | P = Fv | P Power [W]; F Driving / tractive force [N]; v Velocity (constant) [m/s] | mW, W, kW, MW, N, kN, MN, m/s, km/h | P = F × v; F = (P)/(v); v = (P)/(F) | derived | Power to drive a car at constant speed against resistance; Thrust power of an aircraft |
| Rotational power | P = Tω = (2π N T)/(60) | P Power [W]; T Torque [N·m]; ω Angular speed (enter rpm to use N) [rad/s] | mW, W, kW, MW, N·mm, N·m, kN·m, rad/s, rpm | P = T × ω; T = (P)/(ω); ω = (P)/(T) | yes | Engine power from torque and rpm; Torque delivered by an electric motor |
| Equation of motion: v² = u² + 2as | v^2 = u^2 + 2as | v Final velocity [m/s]; u Initial velocity [m/s]; a Acceleration [m/s²]; s Displacement [m] | m/s, km/h, m/s², mm, cm, m, km | v = √(u^2 + 2 a s); u = √(v^2 - 2 a s); a = (v^2 - u^2)/(2 s); s = (v^2 - u^2)/(2 a) | yes | Braking distance from speed and deceleration; Deceleration needed to stop within a distance |

### Aircraft structures & materials

Multi-step tools: **Beam analyser (reactions, SFD, BMD, bending stress)**, **Centroid / centre of gravity (weight & balance)**, **Tensile test analysis (E, UTS, ductility)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Bending stress | σ = (My)/(I) | σ Bending stress (at distance y from the neutral axis) [Pa]; M Bending moment [N·m]; y Distance from the neutral axis [m]; I Second moment of area about the neutral axis [m⁴] | Pa, kPa, MPa, GPa, N/mm², N·mm, N·m, kN·m, mm, cm, m, km, mm⁴, cm⁴, m⁴ | σ = (M y)/(I); M = (σ I)/(y); y = (σ I)/(M); I = (M y)/(σ) | yes | Maximum bending stress in a simply supported beam with point loads; Bending stress in an aircraft wing spar / cantilever |
| Max bending moment — cantilever, UDL | M_max = (wL^2)/(2) | M_max Maximum bending moment (at the fixed end) [N·m]; w Uniformly distributed load [N/m]; L Cantilever length [m] | N·mm, N·m, kN·m, N/m, kN/m, mm, cm, m, km | M_max = (w L^2)/(2); w = \frac2 M_maxL^2; L = \sqrt\frac2 M_maxw | derived | Root bending moment of a wing idealised as a UDL cantilever |
| Max bending moment — cantilever, end point load | M_max = FL | M_max Maximum bending moment (at the fixed end) [N·m]; F End point load [N]; L Cantilever length [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | M_max = F × L; F = \fracM_maxL; L = \fracM_maxF | derived | Bending stress at the root of a cantilever |
| Moment of a force | M = Fd | M Moment (about a point) [N·m]; F Force [N]; d Perpendicular distance from the pivot [m] | N·mm, N·m, kN·m, N, kN, MN, mm, cm, m, km | M = F × d; F = (M)/(d); d = (M)/(F) | yes | Support reactions of simply supported beams; Maximum bending moment at a cantilever root; Tailplane load about aircraft CG |
| Engineering stress (axial) | σ = (F)/(A) | σ Stress (tensile or compressive) [Pa]; F Axial force (tension or compression) [N]; A Cross-sectional area [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | σ = (F)/(A); F = σ × A; A = (F)/(σ) | yes | Stress in a truss member once its force is known; Minimum diameter of a tie rod for an allowable stress; Stress in a cable of a suspension bridge |
| Engineering strain | ε = (Δ L)/(L) | ε Strain [–]; Δ L Change in length (extension/compression) [m]; L Original length [m] | mm, cm, m, km | ε = (Δ L)/(L); Δ L = ε × L; L = (Δ L)/(ε) | yes | Strain in a tensile test specimen; Extension of a cable from strain |
| Young's modulus (modulus of elasticity) | E = (σ)/(ε) | E Young's modulus [Pa]; σ Stress (within the elastic/proportional region) [Pa]; ε Strain [–] | Pa, kPa, MPa, GPa, N/mm² | E = (σ)/(ε); σ = E × ε; ε = (σ)/(E) | yes | E from the slope of a stress–strain graph; Extension of a steel member given E |
| Factor of safety (ultimate strength) | FoS = \fracσ_UTSσ_w | FoS Factor of safety [–]; σ_UTS Ultimate tensile strength [Pa]; σ_w Working (allowable) stress [Pa] | Pa, kPa, MPa, GPa, N/mm² | FoS = \fracσ_UTSσ_w; σ_UTS = FoS × σ_w; σ_w = \fracσ_UTSFoS | yes | Allowable stress in a cable given UTS and FoS; FoS of a truss member |
| Shear stress (pins, bolts, rivets) | τ = (F)/(nA) | τ Shear stress [Pa]; F Shear force (load) [N]; n Number of shear planes (1 = single, 2 = double shear) [–]; A Area of one shear plane [m²] | Pa, kPa, MPa, GPa, N/mm², N, kN, MN, mm², cm², m² | τ = (F)/(n A); F = τ n A; n = (F)/(τ A); A = (F)/(n τ) | derived | Shear stress in a truss pin joint in double shear; Minimum rivet diameter |
| Vickers hardness _(extension)_ | HV = (1.8544 F)/(d^2) | HV Vickers hardness number (kgf/mm²) [Pa]; F Test load [N]; d Mean diagonal of indentation [m] | HV, MPa, N, kN, MN, mm, cm, m, km | HV = (1.8544 F)/(d^2); F = (HV d^2)/(1.8544); d = √((1.8544 F)/(HV)) | no | Vickers hardness of a heat-treated component |
| Impact test energy absorbed (Charpy / Izod) _(extension)_ | E = mg(h_1 - h_2) | E Energy absorbed by the specimen [J]; m Pendulum mass [kg]; g Gravitational acceleration [m/s²]; h_1 Release height [m]; h_2 Rise height after fracture [m] | J, kJ, MJ, kWh, g, kg, t, m/s², mm, cm, m, km | E = m g (h_1 - h_2); m = (E)/(g (h_1 - h_2)); g = (E)/(m (h_1 - h_2)); h_1 = h_2 + (E)/(m g); h_2 = h_1 - (E)/(m g) | no | Energy absorbed in a Charpy test comparing brittle and ductile specimens |

## Telecommunications Engineering

### Electrical circuits

Multi-step tools: **Series / parallel circuit analyser**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Ohm's law | V = IR | V Voltage (potential difference) [V]; I Current [A]; R Resistance [Ω] | μV, mV, V, kV, μA, mA, A, Ω, kΩ, MΩ | V = I × R; I = (V)/(R); R = (V)/(I) | yes | Current drawn from a supply by a resistor network; Voltage drop across a resistor |
| Electrical power | P = VI | P Power [W]; V Voltage [V]; I Current [A] | mW, W, kW, MW, μV, mV, V, kV, μA, mA, A | P = V × I; V = (P)/(I); I = (P)/(V) | yes | Power drawn by a traction motor; Current drawn by a 2 kW heater at 240 V |
| Electrical power (I²R) | P = I^2 R | P Power [W]; I Current [A]; R Resistance [Ω] | mW, W, kW, MW, μA, mA, A, Ω, kΩ, MΩ | P = I^2 × R; I = √((P)/(R)); R = (P)/(I^2) | yes | Power lost in transmission lines — why high voltage is used |
| Electrical power (V²/R) | P = (V^2)/(R) | P Power [W]; V Voltage [V]; R Resistance [Ω] | mW, W, kW, MW, μV, mV, V, kV, Ω, kΩ, MΩ | P = (V^2)/(R); V = √(P × R); R = (V^2)/(P) | yes | Resistance of an element rated 1 kW at 240 V |
| Resistors in series (two) | R_T = R_1 + R_2 | R_T Total resistance [Ω]; R_1 Resistor 1 [Ω]; R_2 Resistor 2 [Ω] | Ω, kΩ, MΩ | R_T = R_1 + R_2; R_1 = R_T - R_2; R_2 = R_T - R_1 | yes | Total resistance of series resistors |
| Resistors in parallel (two) | (1)/(R_T) = (1)/(R_1) + (1)/(R_2) | R_T Total resistance [Ω]; R_1 Resistor 1 [Ω]; R_2 Resistor 2 [Ω] | Ω, kΩ, MΩ | R_T = ((1)/(R_1) + (1)/(R_2))^-1; R_1 = ((1)/(R_T) - (1)/(R_2))^-1; R_2 = ((1)/(R_T) - (1)/(R_1))^-1 | yes | Equivalent resistance of parallel resistors |
| Series (current-limiting) resistor | R = (V_s - V_f)/(I) | R Series resistance [Ω]; V_s Supply voltage [V]; V_f Forward voltage of LED / load voltage [V]; I Required current [A] | Ω, kΩ, MΩ, μV, mV, V, kV, μA, mA, A | R = (V_s - V_f)/(I); V_s = V_f + I R; V_f = V_s - I R; I = (V_s - V_f)/(R) | derived | Resistor needed for an indicator LED on a 12 V vehicle supply |
| Energy from power and time | E = Pt | E Energy [J]; P Power [W]; t Time [s] | J, kJ, MJ, kWh, mW, W, kW, MW, μs, ms, s, min, h | E = P × t; P = (E)/(t); t = (E)/(P) | derived | Energy (kWh) used by an electric train motor; Battery energy for an electric vehicle trip |
| Cost of electrical energy | Cost = E × tariff | Cost Cost of energy [$]; E Energy used (kWh) [J]; r Tariff (price per kWh) [$/J] | $, c, J, kJ, MJ, kWh, $/kWh, c/kWh | Cost = E × r; E = \fracCostr; r = \fracCostE | no | Cost to charge an electric vehicle battery |
| Charge / battery capacity | Q = It | Q Charge (capacity) [C]; I Current [A]; t Time [s] | C, mAh, Ah, μA, mA, A, μs, ms, s, min, h | Q = I × t; I = (Q)/(t); t = (Q)/(I) | no | How long an e-bike battery lasts at a given current |
| RMS value of a sinusoidal voltage _(extension)_ | V_rms = \fracV_peak√(2) | V_rms RMS voltage [V]; V_peak Peak voltage (= V_pp / 2) [V] | μV, mV, V, kV | V_rms = \fracV_peak√(2); V_peak = √(2) × V_rms | no | Peak voltage of the 240 V mains supply |

### Waves, signals & antennas

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Wave equation | v = fλ | v Wave speed (3.00 × 10⁸ m/s for EM waves in vacuum/air) [m/s]; f Frequency [Hz]; λ Wavelength [m] | m/s, km/h, Hz, kHz, MHz, GHz, mm, cm, m, km | v = f × λ; f = (v)/(λ); λ = (v)/(f) | yes | Wavelength of an FM radio station; Frequency of a microwave link |
| Period and frequency | T = (1)/(f) | T Period [s]; f Frequency [Hz] | μs, ms, s, min, h, Hz, kHz, MHz, GHz | T = (1)/(f); f = (1)/(T) | derived | Frequency of a signal from its period on a CRO |
| Oscilloscope (CRO) period reading | T = n × time/div | T Period [s]; n Horizontal divisions for one cycle [–]; t_div Timebase setting (time per division) [s] | μs, ms, s, min, h | T = n × t_div; n = \fracTt_div; t_div = (T)/(n) | no | Frequency of a signal displayed on a CRO |
| Oscilloscope (CRO) amplitude reading | V_pp = n × volts/div | V_pp Peak-to-peak voltage [V]; n Vertical divisions peak to peak [–]; V_div Volts per division [V] | μV, mV, V, kV | V_pp = n × V_div; n = \fracV_ppV_div; V_div = \fracV_ppn | no | Amplitude of a signal on a CRO |
| Half-wave dipole antenna length | L = (λ)/(2) | L Antenna length [m]; λ Wavelength [m] | mm, cm, m, km | L = (λ)/(2); λ = 2 × L | no | Length of a dipole for a given broadcast frequency |
| Quarter-wave (monopole) antenna length | L = (λ)/(4) | L Antenna length [m]; λ Wavelength [m] | mm, cm, m, km | L = (λ)/(4); λ = 4 × L | no | Length of a quarter-wave car radio antenna |
| Signal propagation delay | t = (d)/(v) | t Delay (travel time) [s]; d Distance travelled by the signal [m]; v Signal speed (3.00 × 10⁸ m/s for radio) [m/s] | μs, ms, s, min, h, mm, cm, m, km, m/s, km/h | t = (d)/(v); d = v × t; v = (d)/(t) | derived | Delay of a signal via a geostationary satellite (~35 786 km altitude) |

### Decibels & attenuation

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Power gain / loss in decibels | G_dB = 10log_10(\fracP_outP_in) | G_dB Gain (negative = loss/attenuation) [dB]; P_out Output power [W]; P_in Input power [W] | dB, mW, W, kW, MW | G_dB = 10log_10(\fracP_outP_in); P_out = P_in × 10^G_dB/10; P_in = \fracP_out10^G_dB/10 | no | Output power of an amplifier with 20 dB gain; Signal remaining after a lossy cable |
| Voltage gain in decibels | G_dB = 20log_10(\fracV_outV_in) | G_dB Voltage gain [dB]; V_out Output voltage [V]; V_in Input voltage [V] | dB, μV, mV, V, kV | G_dB = 20log_10(\fracV_outV_in); V_out = V_in × 10^G_dB/20; V_in = \fracV_out10^G_dB/20 | no | Voltage gain of an amplifier stage |
| Total attenuation of a link | Loss_dB = α \ell | Loss Total loss [dB]; α Attenuation per length [dB/m]; \ell Link length [m] | dB, dB/m, dB/km, mm, cm, m, km | Loss = α × \ell; α = \fracLoss\ell; \ell = \fracLossα | no | Maximum distance before a repeater is needed; Received power over a fibre link |

### Fibre optics

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Snell's law (refraction) | n_1sinθ_1 = n_2sinθ_2 | θ_2 Angle of refraction (from normal) [rad]; n_1 Refractive index of medium 1 [–]; θ_1 Angle of incidence (from normal) [rad]; n_2 Refractive index of medium 2 [–] | °, rad | θ_2 = sin^-1((n_1 sin(θ_1))/(n_2)); n_1 = (n_2 sin(θ_2))/(sin(θ_1)); θ_1 = sin^-1((n_2 sin(θ_2))/(n_1)); n_2 = (n_1 sin(θ_1))/(sin(θ_2)) | no | Angle of refraction entering a fibre core; Showing total internal reflection occurs |
| Critical angle (total internal reflection) | sinθ_c = (n_2)/(n_1) | θ_c Critical angle (from normal) [rad]; n_1 Core refractive index (denser) [–]; n_2 Cladding refractive index [–] | °, rad | θ_c = sin^-1((n_2)/(n_1)); n_1 = (n_2)/(sin(θ_c)); n_2 = n_1 sin(θ_c) | no | Critical angle at the core–cladding boundary |
| Refractive index | n = (c)/(v) | n Refractive index [–]; c Speed of light in vacuum [m/s]; v Speed of light in the medium [m/s] | m/s, km/h | n = (c)/(v); c = n × v; v = (c)/(n) | no | Time for a pulse to travel along a fibre |
| Numerical aperture / acceptance angle _(extension)_ | sinθ_a = √(n_1^2 - n_2^2) | θ_a Acceptance (half) angle in air [rad]; n_1 Core index [–]; n_2 Cladding index [–] | °, rad | θ_a = sin^-1√(n_1^2 - n_2^2); n_1 = √(sin^2(θ_a) + n_2^2); n_2 = √(n_1^2 - sin^2(θ_a)) | no | Acceptance angle of a step-index fibre |

### Digital electronics & data

Multi-step tools: **Logic gates & truth tables**, **Number systems (binary, hex, BCD, 2’s complement)**

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| Data transfer time | t = \fracdata sizebit rate | t Transfer time [s]; D Data size [bit]; R_b Bit rate [bit/s] | μs, ms, s, min, h, bit, kbit, Mbit, B, kB, MB, GB, bit/s, kbit/s, Mbit/s, Gbit/s | t = (D)/(R_b); D = R_b × t; R_b = (D)/(t) | no | Time to download a file over an NBN link |
| Nyquist sampling rate | f_s = 2 f_max | f_s Minimum sampling frequency [Hz]; f_max Highest signal frequency [Hz] | Hz, kHz, MHz, GHz | f_s = 2 × f_max; f_max = (f_s)/(2) | no | Sampling rate for telephone voice (4 kHz → 8 kHz) |
| PCM bit rate | R_b = f_s × n × channels | R_b Bit rate [bit/s]; f_s Sampling frequency [Hz]; n Bits per sample [–]; N_ch Number of channels [–] | bit/s, kbit/s, Mbit/s, Gbit/s, Hz, kHz, MHz, GHz | R_b = f_s × n × N_ch; f_s = \fracR_bn N_ch; n = \fracR_bf_s N_ch; N_ch = (R_b)/(f_s n) | no | Bit rate of a digitised voice channel (8 kHz × 8 bit = 64 kbit/s) |
| Quantisation levels | N = 2^n | N Number of levels [–]; n Number of bits [–] |  | N = 2^n; n = log_2(N) | no | Levels available from an 8-bit ADC (256) |

### Modulation

| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |
|---|---|---|---|---|---|---|
| AM modulation index _(extension)_ | m = (V_m)/(V_c) | m Modulation index (depth) [–]; V_m Modulating (message) amplitude [V]; V_c Carrier amplitude [V] | %, μV, mV, V, kV | m = (V_m)/(V_c); V_m = m × V_c; V_c = (V_m)/(m) | no | Modulation depth from an AM waveform |
| AM bandwidth _(extension)_ | BW = 2 f_m | BW Bandwidth [Hz]; f_m Highest modulating frequency [Hz] | Hz, kHz, MHz, GHz | BW = 2 × f_m; f_m = (BW)/(2) | no | Bandwidth of an AM broadcast (5 kHz audio → 10 kHz) |

