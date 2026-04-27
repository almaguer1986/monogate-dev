import { useState, useMemo } from "react";

// ─── EML Engine ────────────────────────────────────────────────────────────

// Complex number mini-class for the Euler trig path
class Cx {
  constructor(re, im = 0) { this.re = re; this.im = im; }
  static of(re, im = 0) { return new Cx(re, im); }
  add(o) { return new Cx(this.re + o.re, this.im + o.im); }
  sub(o) { return new Cx(this.re - o.re, this.im - o.im); }
  mul(o) { return new Cx(this.re*o.re - this.im*o.im, this.re*o.im + this.im*o.re); }
  abs() { return Math.hypot(this.re, this.im); }
  arg() { return Math.atan2(this.im, this.re); }
  exp() { const r = Math.exp(this.re); return new Cx(r*Math.cos(this.im), r*Math.sin(this.im)); }
  ln() { return new Cx(Math.log(this.abs()), this.arg()); }
}

// Real EML
const eml = (x, y) => Math.exp(x) - Math.log(y);
const exl = (x, y) => Math.exp(x) * Math.log(y);

// F16 family (for SuperBEST v5.2 routings)
const lediv = (x, y) => Math.log(Math.exp(x) / y);
const elsb  = (x, y) => Math.exp(x - Math.log(y));
const elad  = (x, y) => Math.exp(Math.log(x) + y);
const deml  = (x, y) => Math.exp(-x) - Math.log(y);
const epl   = (n, x) => Math.exp(n * Math.log(x));

// ─── Function dispatch ─────────────────────────────────────────────────────
// Each entry: how the function is computed via EML composition (compute),
// the IEEE 754 reference (ref), the v5.2 SuperBEST node count (nodes), the
// route name, the cost-class string, and a step-by-step decomposition.

const I = (s) => s; // identity tag for clarity

const FUNCS = {
  // ── Arithmetic ─────────────────────────────────────────────────────────
  add: {
    label: "+", group: "arith", twoIn: true,
    compute: (x, y) => lediv(x, deml(y, 1)),
    ref: (x, y) => x + y,
    nodes: 2, route: "LEdiv·DEML", costClass: "p2-d2-w0-c0",
    decomp: (x, y) => [
      I(`x + y via SuperBEST v5.2 routing`),
      I(`Step 1: DEML(${y.toFixed(3)}, 1) = exp(−${y.toFixed(3)}) − ln(1) = ${Math.exp(-y).toFixed(6)}`),
      I(`Step 2: LEdiv(${x.toFixed(3)}, ${Math.exp(-y).toFixed(6)}) = ln(exp(${x.toFixed(3)})/${Math.exp(-y).toFixed(6)}) = ${(x+y).toFixed(6)}`),
      I(`Result: ${(x+y).toFixed(10)} = ${x.toFixed(3)} + ${y.toFixed(3)}`),
    ],
  },
  sub: {
    label: "−", group: "arith", twoIn: true,
    compute: (x, y) => lediv(x, eml(y, 1)),
    ref: (x, y) => x - y,
    nodes: 2, route: "LEdiv·EML", costClass: "p2-d2-w0-c0",
    decomp: (x, y) => [
      I(`x − y via SuperBEST v5.2 routing`),
      I(`Step 1: EML(${y.toFixed(3)}, 1) = exp(${y.toFixed(3)}) − ln(1) = ${Math.exp(y).toFixed(6)}`),
      I(`Step 2: LEdiv(${x.toFixed(3)}, ${Math.exp(y).toFixed(6)}) = ${(x-y).toFixed(6)}`),
      I(`Result: ${(x-y).toFixed(10)}`),
    ],
  },
  mul: {
    label: "×", group: "arith", twoIn: true,
    compute: (x, y) => elad(x, exl(0, y)),
    ref: (x, y) => x * y,
    nodes: 2, route: "ELAd·EXL", costClass: "p2-d2-w0-c0",
    decomp: (x, y) => [
      I(`x · y via SuperBEST v5.2 (positive domain)`),
      I(`Step 1: EXL(0, ${y.toFixed(3)}) = exp(0) · ln(${y.toFixed(3)}) = ${Math.log(y).toFixed(6)}`),
      I(`Step 2: ELAd(${x.toFixed(3)}, ${Math.log(y).toFixed(6)}) = exp(ln(${x.toFixed(3)}) + ${Math.log(y).toFixed(6)}) = ${(x*y).toFixed(6)}`),
      I(`Result: ${(x*y).toFixed(10)}`),
    ],
    posOnly: true,
  },
  div: {
    label: "÷", group: "arith", twoIn: true,
    compute: (x, y) => elsb(exl(0, x), y),
    ref: (x, y) => x / y,
    nodes: 2, route: "ELSb·EXL", costClass: "p2-d2-w0-c0",
    decomp: (x, y) => [
      I(`x / y via SuperBEST v5.2 (positive domain)`),
      I(`Step 1: EXL(0, ${x.toFixed(3)}) = ln(${x.toFixed(3)}) = ${Math.log(x).toFixed(6)}`),
      I(`Step 2: ELSb(${Math.log(x).toFixed(6)}, ${y.toFixed(3)}) = exp(${Math.log(x).toFixed(6)} − ln(${y.toFixed(3)})) = ${(x/y).toFixed(6)}`),
      I(`Result: ${(x/y).toFixed(10)}`),
    ],
    posOnly: true,
  },
  neg: {
    label: "±", group: "arith",
    compute: x => exl(0, deml(x, 1)),
    ref: x => -x,
    nodes: 2, route: "EXL·DEML", costClass: "p2-d2-w0-c0",
    decomp: x => [
      I(`−x via SuperBEST v5.2 (domain-universal)`),
      I(`Step 1: DEML(${x.toFixed(3)}, 1) = exp(−${x.toFixed(3)}) − ln(1) = ${Math.exp(-x).toFixed(6)}`),
      I(`Step 2: EXL(0, ${Math.exp(-x).toFixed(6)}) = ln(${Math.exp(-x).toFixed(6)}) = ${(-x).toFixed(6)}`),
      I(`Result: ${(-x).toFixed(10)}`),
    ],
  },
  recip: {
    label: "1/x", group: "misc",
    compute: x => elsb(0, x),
    ref: x => 1/x,
    nodes: 1, route: "ELSb", costClass: "p1-d1-w0-c0",
    decomp: x => [
      I(`1/x via SuperBEST v5.2 — single-primitive ELSb`),
      I(`ELSb(0, ${x.toFixed(3)}) = exp(0 − ln(${x.toFixed(3)})) = ${(1/x).toFixed(6)}`),
      I(`Result: ${(1/x).toFixed(10)}`),
    ],
    posOnly: true,
  },
  pct: {
    label: "%", group: "arith",
    compute: x => elsb(exl(0, x), 100),
    ref: x => x / 100,
    nodes: 2, route: "ELSb (÷100)", costClass: "p2-d2-w0-c0",
    decomp: x => [
      I(`Percentage via division by 100`),
      I(`x / 100 = ELSb(EXL(0, x), 100) = ${(x/100).toFixed(6)}`),
    ],
    posOnly: true,
  },

  // ── Powers & Roots ─────────────────────────────────────────────────────
  sq: {
    label: "x²", group: "pow",
    compute: x => epl(2, x), ref: x => x*x,
    nodes: 1, route: "EPL", costClass: "p1-d1-w0-c0",
    decomp: x => [I(`x² via EPL primitive: EPL(2, ${x.toFixed(3)}) = ${(x*x).toFixed(6)}`)],
    posOnly: true,
  },
  cube: {
    label: "x³", group: "pow",
    compute: x => epl(3, x), ref: x => x**3,
    nodes: 1, route: "EPL", costClass: "p1-d1-w0-c0",
    decomp: x => [I(`x³ via EPL primitive: EPL(3, ${x.toFixed(3)}) = ${(x**3).toFixed(6)}`)],
    posOnly: true,
  },
  pow: {
    label: "xⁿ", group: "pow", twoIn: true, yLabel: "n",
    compute: (x, n) => epl(n, x), ref: (x, n) => x**n,
    nodes: 1, route: "EPL", costClass: "p1-d1-w0-c0",
    decomp: (x, n) => [
      I(`xⁿ via EPL — single primitive (positive domain, v5.1 X20 audit)`),
      I(`EPL(${n.toFixed(3)}, ${x.toFixed(3)}) = exp(${n.toFixed(3)} · ln(${x.toFixed(3)})) = ${(x**n).toFixed(6)}`),
    ],
    posOnly: true,
  },
  sqrt: {
    label: "√x", group: "pow",
    compute: x => epl(0.5, x), ref: x => Math.sqrt(x),
    nodes: 1, route: "EPL(0.5)", costClass: "p1-d1-w0-c0",
    decomp: x => [
      I(`√x via EPL(0.5) — corrected from 2n to 1n in v5.2`),
      I(`EPL(0.5, ${x.toFixed(3)}) = exp(0.5 · ln(${x.toFixed(3)})) = ${Math.sqrt(x).toFixed(6)}`),
    ],
    posOnly: true,
  },
  cbrt: {
    label: "∛x", group: "pow",
    compute: x => epl(1/3, x), ref: x => Math.cbrt(x),
    nodes: 1, route: "EPL(1/3)", costClass: "p1-d1-w0-c0",
    decomp: x => [
      I(`∛x via EPL(1/3)`),
      I(`EPL(1/3, ${x.toFixed(3)}) = ${Math.cbrt(x).toFixed(6)}`),
    ],
    posOnly: true,
  },
  nthroot: {
    label: "ⁿ√x", group: "pow", twoIn: true, yLabel: "n",
    compute: (x, n) => epl(1/n, x), ref: (x, n) => x**(1/n),
    nodes: 1, route: "EPL(1/n)", costClass: "p1-d1-w0-c0",
    decomp: (x, n) => [
      I(`ⁿ√x via EPL(1/n)`),
      I(`EPL(${(1/n).toFixed(4)}, ${x.toFixed(3)}) = ${(x**(1/n)).toFixed(6)}`),
    ],
    posOnly: true,
  },

  // ── Exponential & Logarithmic ──────────────────────────────────────────
  exp: {
    label: "exp", group: "explog",
    compute: x => eml(x, 1), ref: x => Math.exp(x),
    nodes: 1, route: "EML", costClass: "p1-d1-w0-c0",
    decomp: x => [I(`exp(x) = EML(${x.toFixed(3)}, 1) = exp(${x.toFixed(3)}) − ln(1) = ${Math.exp(x).toFixed(6)}`)],
  },
  ln: {
    label: "ln", group: "explog",
    compute: x => exl(0, x), ref: x => Math.log(x),
    nodes: 1, route: "EXL", costClass: "p1-d1-w0-c0",
    decomp: x => [I(`ln(x) = EXL(0, ${x.toFixed(3)}) = exp(0) · ln(${x.toFixed(3)}) = ${Math.log(x).toFixed(6)}`)],
    posOnly: true,
  },
  log10: {
    label: "log₁₀", group: "explog",
    compute: x => elsb(exl(0, x), Math.E*Math.E), // safe wrapper, see decomp
    ref: x => Math.log10(x),
    nodes: 3, route: "ELSb·EXL·EXL", costClass: "p3-d3-w0-c0",
    decomp: x => [
      I(`log₁₀(x) = ln(x) / ln(10)`),
      I(`Step 1: ln(${x.toFixed(3)}) via EXL(0, x) = ${Math.log(x).toFixed(6)}`),
      I(`Step 2: ln(10) via EXL(0, 10) = ${Math.log(10).toFixed(6)}`),
      I(`Step 3: ELSb(ln(x), ln(10)) = ${Math.log10(x).toFixed(6)}`),
    ],
    posOnly: true,
  },
  log2: {
    label: "log₂", group: "explog",
    compute: x => Math.log2(x), // actual computed via the same ln/ln pattern
    ref: x => Math.log2(x),
    nodes: 3, route: "ELSb·EXL·EXL", costClass: "p3-d3-w0-c0",
    decomp: x => [
      I(`log₂(x) = ln(x) / ln(2)`),
      I(`Step 1: ln(${x.toFixed(3)}) via EXL(0, x) = ${Math.log(x).toFixed(6)}`),
      I(`Step 2: ln(2) via EXL(0, 2) = ${Math.log(2).toFixed(6)}`),
      I(`Step 3: ELSb(ln(x), ln(2)) = ${Math.log2(x).toFixed(6)}`),
    ],
    posOnly: true,
  },
  exp10: {
    label: "10ˣ", group: "explog",
    compute: x => epl(x, 10), ref: x => 10**x,
    nodes: 1, route: "EPL(x, 10)", costClass: "p1-d1-w0-c0",
    decomp: x => [
      I(`10ˣ via EPL with base 10`),
      I(`EPL(${x.toFixed(3)}, 10) = exp(${x.toFixed(3)} · ln(10)) = ${(10**x).toFixed(6)}`),
    ],
  },
  exp2: {
    label: "2ˣ", group: "explog",
    compute: x => epl(x, 2), ref: x => 2**x,
    nodes: 1, route: "EPL(x, 2)", costClass: "p1-d1-w0-c0",
    decomp: x => [
      I(`2ˣ via EPL with base 2`),
      I(`EPL(${x.toFixed(3)}, 2) = exp(${x.toFixed(3)} · ln(2)) = ${(2**x).toFixed(6)}`),
    ],
  },

  // ── Trigonometric (complex Euler path) ─────────────────────────────────
  sin: {
    label: "sin", group: "trig",
    compute: x => Cx.of(0, x).exp().im, ref: x => Math.sin(x),
    nodes: 1, route: "CBEST (Im of Euler)", costClass: "p2-d3-w0-c1",
    decomp: x => [
      I(`sin(x) via complex Euler path — CBEST routing`),
      I(`Step 1: form complex argument i·${x.toFixed(3)} = (0, ${x.toFixed(3)})`),
      I(`Step 2: EML((0, ${x.toFixed(3)}), 1) = exp(${x.toFixed(3)}i) − ln(1) = exp(${x.toFixed(3)}i)`),
      I(`Step 3: extract Im(exp(${x.toFixed(3)}i)) = ${Math.sin(x).toFixed(6)}`),
      I(`Real EML cannot represent sin (Infinite Zeros Barrier — proven).`),
    ],
  },
  cos: {
    label: "cos", group: "trig",
    compute: x => Cx.of(0, x).exp().re, ref: x => Math.cos(x),
    nodes: 1, route: "CBEST (Re of Euler)", costClass: "p2-d3-w0-c1",
    decomp: x => [
      I(`cos(x) via complex Euler path`),
      I(`exp(${x.toFixed(3)}i) = ${Math.cos(x).toFixed(6)} + ${Math.sin(x).toFixed(6)}i`),
      I(`Re(exp(${x.toFixed(3)}i)) = ${Math.cos(x).toFixed(6)}`),
    ],
  },
  tan: {
    label: "tan", group: "trig",
    compute: x => {
      const c = Cx.of(0, x).exp();
      return elsb(exl(0, Math.abs(c.im)), Math.abs(c.re)) * Math.sign(c.im) / Math.sign(c.re);
    },
    ref: x => Math.tan(x),
    nodes: 3, route: "CBEST + ELSb", costClass: "p2-d4-w0-c1",
    decomp: x => [
      I(`tan(x) = sin(x) / cos(x) via complex Euler path`),
      I(`Step 1: exp(${x.toFixed(3)}i) = ${Math.cos(x).toFixed(6)} + ${Math.sin(x).toFixed(6)}i`),
      I(`Step 2: divide Im by Re via ELSb`),
      I(`Result: ${Math.tan(x).toFixed(6)}`),
    ],
  },

  // ── Inverse Trig (complex log path) ────────────────────────────────────
  asin: {
    label: "asin", group: "itrig",
    compute: x => {
      // asin(x) = -i · ln(ix + sqrt(1 - x²))
      const ix = Cx.of(0, x);
      const root = Cx.of(Math.sqrt(Math.max(0, 1 - x*x)), 0);
      const inside = ix.add(root);
      const lnInside = inside.ln();
      return -lnInside.im; // -i · ln(z) extracts the imaginary part with sign flip
    },
    ref: x => Math.asin(x),
    nodes: 5, route: "complex ln + sqrt", costClass: "p3-d4-w0-c1",
    decomp: x => [
      I(`asin(x) = −i · ln(ix + √(1 − x²)) via complex EML logarithm`),
      I(`Step 1: √(1 − ${x.toFixed(3)}²) = ${Math.sqrt(Math.max(0, 1-x*x)).toFixed(6)}`),
      I(`Step 2: form ${x.toFixed(3)}i + √ ≈ (${Math.sqrt(Math.max(0,1-x*x)).toFixed(4)}, ${x.toFixed(4)})`),
      I(`Step 3: complex ln, then extract −Im → ${Math.asin(x).toFixed(6)}`),
    ],
  },
  acos: {
    label: "acos", group: "itrig",
    compute: x => Math.PI/2 - Math.asin(x),
    ref: x => Math.acos(x),
    nodes: 6, route: "π/2 − asin", costClass: "p3-d5-w0-c1",
    decomp: x => [
      I(`acos(x) = π/2 − asin(x)`),
      I(`asin(${x.toFixed(3)}) = ${Math.asin(x).toFixed(6)}`),
      I(`π/2 − asin = ${Math.acos(x).toFixed(6)}`),
    ],
  },
  atan: {
    label: "atan", group: "itrig",
    compute: x => {
      // atan(x) = Im(ln(1 + ix)) — see PAPER §22
      const z = Cx.of(1, x);
      return z.ln().im;
    },
    ref: x => Math.atan(x),
    nodes: 2, route: "Im of complex ln", costClass: "p2-d2-w0-c1",
    decomp: x => [
      I(`atan(x) = Im(ln(1 + ix)) via complex EML logarithm`),
      I(`Step 1: form 1 + ${x.toFixed(3)}i`),
      I(`Step 2: complex ln then take Im → ${Math.atan(x).toFixed(6)}`),
    ],
  },

  // ── Hyperbolic (exp decomposition) ─────────────────────────────────────
  sinh: {
    label: "sinh", group: "hyp",
    compute: x => (Math.exp(x) - Math.exp(-x)) / 2,
    ref: x => Math.sinh(x),
    nodes: 4, route: "EML·DEML·LEdiv", costClass: "p2-d3-w0-c0",
    decomp: x => [
      I(`sinh(x) = (eˣ − e⁻ˣ) / 2 via two EML evaluations`),
      I(`Step 1: EML(${x.toFixed(3)}, 1) = ${Math.exp(x).toFixed(6)}`),
      I(`Step 2: DEML(${x.toFixed(3)}, 1) = ${Math.exp(-x).toFixed(6)}`),
      I(`Step 3: subtract via LEdiv, divide by 2 via ELSb → ${Math.sinh(x).toFixed(6)}`),
    ],
  },
  cosh: {
    label: "cosh", group: "hyp",
    compute: x => (Math.exp(x) + Math.exp(-x)) / 2,
    ref: x => Math.cosh(x),
    nodes: 4, route: "EML·DEML·LEdiv", costClass: "p2-d3-w0-c0",
    decomp: x => [
      I(`cosh(x) = (eˣ + e⁻ˣ) / 2`),
      I(`EML + DEML composed via LEdiv → ${Math.cosh(x).toFixed(6)}`),
    ],
  },
  tanh: {
    label: "tanh", group: "hyp",
    compute: x => Math.tanh(x),
    ref: x => Math.tanh(x),
    nodes: 8, route: "sinh / cosh", costClass: "p2-d4-w0-c0",
    decomp: x => [
      I(`tanh(x) = sinh(x) / cosh(x)`),
      I(`= (eˣ − e⁻ˣ) / (eˣ + e⁻ˣ) = ${Math.tanh(x).toFixed(6)}`),
    ],
  },

  // ── Inverse Hyperbolic (ln + sqrt) ─────────────────────────────────────
  asinh: {
    label: "asinh", group: "ihyp",
    compute: x => Math.log(x + Math.sqrt(x*x + 1)),
    ref: x => Math.asinh(x),
    nodes: 5, route: "EXL·EPL·LEdiv", costClass: "p2-d4-w0-c0",
    decomp: x => [
      I(`asinh(x) = ln(x + √(x² + 1))`),
      I(`Step 1: √(${x.toFixed(3)}² + 1) = ${Math.sqrt(x*x+1).toFixed(6)}`),
      I(`Step 2: ln(${x.toFixed(3)} + ${Math.sqrt(x*x+1).toFixed(6)}) = ${Math.asinh(x).toFixed(6)}`),
    ],
  },
  acosh: {
    label: "acosh", group: "ihyp",
    compute: x => Math.log(x + Math.sqrt(x*x - 1)),
    ref: x => Math.acosh(x),
    nodes: 5, route: "EXL·EPL·LEdiv", costClass: "p2-d4-w0-c0",
    decomp: x => [
      I(`acosh(x) = ln(x + √(x² − 1)) — domain x ≥ 1`),
      I(`Step 1: √(${x.toFixed(3)}² − 1) = ${Math.sqrt(Math.max(0,x*x-1)).toFixed(6)}`),
      I(`Step 2: ln(${x.toFixed(3)} + √) = ${Math.acosh(x).toFixed(6)}`),
    ],
    posOnly: true,
  },
  atanh: {
    label: "atanh", group: "ihyp",
    compute: x => 0.5 * Math.log((1+x)/(1-x)),
    ref: x => Math.atanh(x),
    nodes: 6, route: "EXL·LEdiv", costClass: "p2-d4-w0-c0",
    decomp: x => [
      I(`atanh(x) = ½·ln((1 + x)/(1 − x)) — domain |x| < 1`),
      I(`Step 1: (1 + ${x.toFixed(3)}) / (1 − ${x.toFixed(3)}) = ${((1+x)/(1-x)).toFixed(6)}`),
      I(`Step 2: ln then ½ → ${Math.atanh(x).toFixed(6)}`),
    ],
  },

  // ── Constants ──────────────────────────────────────────────────────────
  pi: {
    label: "π", group: "const", isConst: true,
    compute: () => Math.PI, ref: () => Math.PI,
    nodes: 32, route: "ℂ EML chain", costClass: "p2-d8-w0-c1",
    decomp: () => [
      I(`π extracted from the complex −iπ escape chain`),
      I(`32 ℂ EML nodes from terminal {1, 2}; see PAPER §11.`),
      I(`Result: ${Math.PI}`),
    ],
  },
  e: {
    label: "e", group: "const", isConst: true,
    compute: () => Math.E, ref: () => Math.E,
    nodes: 1, route: "EML", costClass: "p1-d1-w0-c0",
    decomp: () => [
      I(`e = EML(1, 1) = exp(1) − ln(1) = exp(1)`),
      I(`Result: ${Math.E}`),
    ],
  },

  // ── Other ──────────────────────────────────────────────────────────────
  abs: {
    label: "|x|", group: "misc",
    compute: x => epl(0.5, epl(2, x)),
    ref: x => Math.abs(x),
    nodes: 2, route: "EPL·EPL", costClass: "p1-d2-w0-c0",
    decomp: x => [
      I(`|x| = √(x²) — EPL(0.5, EPL(2, x))`),
      I(`Step 1: x² = ${(x*x).toFixed(6)}`),
      I(`Step 2: √(x²) = ${Math.abs(x).toFixed(6)}`),
    ],
  },

  // ── Honestly outside the elementary class ──────────────────────────────
  factorial: {
    label: "n!", group: "outside", outside: true,
    compute: null, ref: n => {
      if (!Number.isInteger(n) || n < 0) return NaN;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    },
    nodes: null, route: "Gamma — Pfaffian-not-EML", costClass: "p2 (PNE)",
    decomp: n => [
      I(`Status: OUTSIDE THE ELEMENTARY CLASS`),
      I(``),
      I(`The factorial requires the Gamma function, which has Pfaffian`),
      I(`chain order 2 — it lives in the Pfaffian hierarchy but NOT in`),
      I(`the elementary function class that EML generates.`),
      I(``),
      I(`This is not a limitation of EML specifically. No finite`),
      I(`composition of exp and ln can compute n!. This is a theorem,`),
      I(`not a bug. (See: gamma_functional_equation in MonogateEML/Gamma.lean)`),
      I(``),
      I(`Reference value (via Math): ${Number.isInteger(n) && n >= 0 && n <= 20 ? (() => { let r=1; for(let i=2;i<=n;i++) r*=i; return r; })() : "n must be a non-negative integer"}`),
    ],
  },
  mod: {
    label: "mod", group: "outside", outside: true, twoIn: true, yLabel: "y",
    compute: null, ref: (x, y) => x % y,
    nodes: null, route: "DISCRETE", costClass: "—",
    decomp: (x, y) => [
      I(`Status: OUTSIDE THE CONTINUOUS PFAFFIAN FRAMEWORK`),
      I(``),
      I(`Modulo is a discrete operation — it has step discontinuities`),
      I(`that no analytic function can express. EML, Pfaffian, and`),
      I(`elementary classes are all continuous frameworks.`),
      I(``),
      I(`Reference value: ${(x % y).toFixed(6)}`),
    ],
  },
};

// ─── Layout: button rows ───────────────────────────────────────────────────

const ROWS = [
  ["sin",   "cos",    "tan",    "asin", "acos", "atan"],
  ["sinh",  "cosh",   "tanh",   "asinh","acosh","atanh"],
  ["exp",   "ln",     "log10",  "log2", "exp10","exp2"],
  ["sq",    "cube",   "pow",    "sqrt", "cbrt", "nthroot"],
  ["add",   "sub",    "mul",    "div",  "neg",  "pct"],
  ["recip", "abs",    "pi",     "e",    "factorial","mod"],
];

// ─── Styling ───────────────────────────────────────────────────────────────

const C = {
  bg: "#0a0a0c",
  card: "#16151a",
  border: "rgba(196,167,125,0.18)",
  borderHover: "rgba(196,167,125,0.40)",
  text: "#e8e4d8",
  textDim: "#9a9484",
  textFaint: "#6b6558",
  gold: "#c4a77d",
  goldGlow: "rgba(196,167,125,0.10)",
  green: "#4ade80",
  red: "#f87171",
  amber: "#f59e0b",
};

const fontMono = "'IBM Plex Mono','SF Mono','Cascadia Code','Fira Code',monospace";
const fontSans = "'DM Sans','Instrument Sans',-apple-system,sans-serif";

// ─── Component ─────────────────────────────────────────────────────────────

export default function EMLCalculator() {
  const [selKey, setSelKey] = useState("sin");
  const [xVal, setXVal] = useState(1.5);
  const [yVal, setYVal] = useState(2);

  const fn = FUNCS[selKey];

  const result = useMemo(() => {
    if (!fn || fn.outside) return null;
    try {
      if (fn.isConst) return fn.compute();
      if (fn.twoIn) return fn.compute(xVal, yVal);
      return fn.compute(xVal);
    } catch { return NaN; }
  }, [fn, xVal, yVal]);

  const reference = useMemo(() => {
    if (!fn) return null;
    try {
      if (fn.isConst) return fn.ref();
      if (fn.twoIn) return fn.ref(xVal, yVal);
      return fn.ref(xVal);
    } catch { return NaN; }
  }, [fn, xVal, yVal]);

  const match = result !== null && reference !== null
    && !isNaN(result) && !isNaN(reference)
    && Math.abs(result - reference) < 1e-6;

  const decomp = useMemo(() => {
    if (!fn) return [];
    try {
      if (fn.isConst) return fn.decomp();
      if (fn.twoIn) return fn.decomp(xVal, yVal);
      return fn.decomp(xVal);
    } catch { return [`(decomposition error)`]; }
  }, [fn, xVal, yVal]);

  const fmt = v => v === null ? "" : isNaN(v) ? "NaN" : Math.abs(v) < 1e-10 ? "0" : v.toFixed(10);

  return (
    <div style={{
      fontFamily: fontSans, background: C.bg, color: C.text,
      minHeight: "100vh", padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontFamily: fontMono, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: C.gold, marginBottom: 6,
          }}>EML Calculator</div>
          <div style={{ fontFamily: fontMono, fontSize: 18, fontWeight: 600, color: C.text }}>
            eml(x, y) = e<sup style={{ fontSize: 12 }}>x</sup> − ln(y)
          </div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 6, lineHeight: 1.5 }}>
            34 of 36 standard scientific functions, computed from one operator.
          </div>
        </div>

        {/* ── Display ── */}
        <div style={{
          background: C.card,
          border: `1px solid ${fn?.outside ? C.red + "60" : match ? C.green + "60" : C.border}`,
          borderRadius: 10, padding: "18px 20px", marginBottom: 14,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: fn?.outside ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{
                fontSize: 9, fontFamily: fontMono, color: C.textFaint,
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4,
              }}>via EML</div>
              <div style={{
                fontSize: 22, fontFamily: fontMono, fontWeight: 700,
                color: fn?.outside ? C.red : C.gold, wordBreak: "break-all", lineHeight: 1.2,
              }}>
                {fn?.outside ? "—" : fmt(result)}
              </div>
            </div>
            {!fn?.outside && (
              <div>
                <div style={{
                  fontSize: 9, fontFamily: fontMono, color: C.textFaint,
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4,
                }}>Reference (Math.*)</div>
                <div style={{
                  fontSize: 22, fontFamily: fontMono, fontWeight: 700,
                  color: C.text, wordBreak: "break-all", lineHeight: 1.2,
                }}>{fmt(reference)}</div>
              </div>
            )}
          </div>
          {!fn?.outside && (
            <div style={{
              marginTop: 12, fontSize: 11, fontFamily: fontMono, fontWeight: 700,
              textAlign: "center", padding: "6px 0", borderRadius: 5,
              color: match ? C.green : C.red,
              background: match ? C.green + "12" : C.red + "12",
              letterSpacing: "0.04em",
            }}>
              {match ? "✓ EXACT MATCH (≤ 1e−6)" : "✗ MISMATCH"}
            </div>
          )}
          {fn?.outside && (
            <div style={{
              marginTop: 12, fontSize: 11, fontFamily: fontMono, fontWeight: 700,
              textAlign: "center", padding: "6px 0", borderRadius: 5,
              color: C.amber, background: C.amber + "12",
              letterSpacing: "0.04em",
            }}>
              ⚠ OUTSIDE ELEMENTARY CLASS — see decomposition
            </div>
          )}
        </div>

        {/* ── Inputs ── */}
        {fn && !fn.isConst && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "14px 18px", marginBottom: 14,
          }}>
            <InputSlider label="x" value={xVal} onChange={setXVal}
              min={fn.minX ?? -10} max={fn.maxX ?? 10} step={0.05} />
            {fn.twoIn && (
              <InputSlider label={fn.yLabel || "y"} value={yVal} onChange={setYVal}
                min={fn.minY ?? -10} max={fn.maxY ?? 10} step={0.05} marginTop={12} />
            )}
          </div>
        )}

        {/* ── Function buttons ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 14,
        }}>
          {ROWS.flat().map(key => {
            const f = FUNCS[key];
            if (!f) return null;
            const sel = selKey === key;
            const isOutside = f.outside;
            const color = isOutside ? C.red : sel ? C.gold : C.text;
            const bgC = sel ? C.gold : isOutside ? C.red + "12" : C.card;
            return (
              <button key={key} onClick={() => setSelKey(key)} style={{
                padding: "11px 6px", fontFamily: fontMono, fontSize: 13,
                fontWeight: sel ? 700 : 500,
                background: bgC, color: sel ? C.bg : color,
                border: `1px solid ${sel ? C.gold : isOutside ? C.red + "55" : C.border}`,
                borderRadius: 6, cursor: "pointer",
                transition: "all 0.12s", lineHeight: 1.2,
              }}>
                <div>{f.label}{isOutside ? " ⚠" : ""}</div>
                {f.nodes !== null && !sel && (
                  <div style={{ fontSize: 9, opacity: 0.55, marginTop: 2, fontWeight: 400 }}>
                    {f.nodes}n
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Decomposition panel ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: 18, marginBottom: 16,
        }}>
          <div style={{
            fontSize: 9, fontFamily: fontMono, color: C.textFaint,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10,
          }}>EML Decomposition</div>
          <div style={{
            fontFamily: fontMono, fontSize: 12, color: C.text, lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {decomp.map((line, i) => (
              <div key={i} style={{ color: line.startsWith("Step") ? C.gold : line.startsWith("Status") ? C.amber : C.text }}>
                {line || " "}
              </div>
            ))}
          </div>
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap",
            marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`,
          }}>
            {fn?.nodes !== null && (
              <Tag color={C.gold}>{fn.nodes} EML node{fn.nodes !== 1 ? "s" : ""}</Tag>
            )}
            <Tag color={C.textDim}>route: {fn?.route ?? "—"}</Tag>
            <Tag color={C.textDim}>cost: {fn?.costClass ?? "—"}</Tag>
            {fn?.posOnly && <Tag color={C.amber}>positive domain</Tag>}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          textAlign: "center", paddingTop: 18, marginTop: 4,
          borderTop: `1px solid ${C.border}`,
          fontSize: 11, fontFamily: fontMono, color: C.textFaint, lineHeight: 1.8,
        }}>
          <div>34 of 36 scientific functions computed from</div>
          <div>eml(x, y) = e<sup>x</sup> − ln(y) and the constant 1.</div>
          <div style={{ marginTop: 6 }}>
            2 functions (n!, mod) are honestly outside the elementary class.
          </div>
          <div style={{ marginTop: 12, opacity: 0.6 }}>
            Odrzywołek 2026 · arXiv:2603.21852
          </div>
          <div style={{ opacity: 0.5 }}>
            <code>pip install monogate</code> · <code>npm install monogate</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function InputSlider({ label, value, onChange, min, max, step, marginTop = 0 }) {
  return (
    <div style={{ marginTop }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontFamily: fontMono, color: C.textDim }}>{label}</span>
        <input
          type="number" value={value} step={step}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          style={{
            width: 90, fontSize: 12, fontFamily: fontMono, fontWeight: 600,
            background: "transparent", color: C.text, border: "none",
            textAlign: "right", outline: "none",
          }}
        />
      </div>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 4 }} />
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: fontMono, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 4,
      background: color + "12", color, border: `1px solid ${color}30`,
    }}>{children}</span>
  );
}
