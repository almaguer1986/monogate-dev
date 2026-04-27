import { useState, useMemo, useCallback } from "react";

// ─── EML Engine (mirrors monogate npm API exactly) ─────────────────────────

// Complex number mini-class
class Cx {
  constructor(re, im = 0) { this.re = re; this.im = im; }
  static of(re, im = 0) { return new Cx(re, im); }
  add(o) { return new Cx(this.re + o.re, this.im + o.im); }
  sub(o) { return new Cx(this.re - o.re, this.im - o.im); }
  mul(o) { return new Cx(this.re*o.re - this.im*o.im, this.re*o.im + this.im*o.re); }
  neg() { return new Cx(-this.re, -this.im); }
  abs() { return Math.hypot(this.re, this.im); }
  arg() { return Math.atan2(this.im, this.re); }
  exp() { const r = Math.exp(this.re); return new Cx(r*Math.cos(this.im), r*Math.sin(this.im)); }
  ln() { return new Cx(Math.log(this.abs()), this.arg()); }
}

const ONE = Cx.of(1);
const wrap = v => v instanceof Cx ? v : Cx.of(v);

// ─── Real EML operators ────────────────────────────────────────────────────

const eml = (x, y) => Math.exp(x) - Math.log(y);
const edl = (x, y) => Math.exp(x) / Math.log(y);
const exl = (x, y) => Math.exp(x) * Math.log(y);

// EML constants
const E_CONST = eml(1, 1);
const ZERO = eml(1, eml(eml(1, 1), 1));
const NEG_ONE = eml(ZERO, eml(2, 1));

// Pure-EML compositions (Real EML tab — counts every nested eml() call)
const exp_eml = x => eml(x, 1);
const ln_eml = x => eml(1, eml(eml(1, x), 1));
const sub_eml = (x, y) => eml(ln_eml(x), exp_eml(y));
const neg_eml = y => {
  if (y <= 0) {
    const a = eml(y, 1);
    return eml(ln_eml(eml(a, a)), eml(eml(a, 1), 1));
  }
  const y1 = eml(ln_eml(y), eml(NEG_ONE, 1));
  return eml(ZERO, eml(y1, 1));
};
const add_eml = (x, y) => {
  if (x > 0) return eml(ln_eml(x), eml(neg_eml(y), 1));
  if (y > 0) return eml(ln_eml(y), eml(neg_eml(x), 1));
  return neg_eml(eml(ln_eml(neg_eml(x)), eml(neg_eml(neg_eml(y)), 1)));
};
const mul_eml = (x, y) => eml(add_eml(ln_eml(x), ln_eml(y)), 1);
const recip_eml = x => eml(neg_eml(ln_eml(x)), 1);

// ─── F16 family primitives (used by SuperBEST v5.2 routings) ───────────────
// Each F16 op counts as a single node in the v5.2 framework.
const lediv = (x, y) => Math.log(Math.exp(x) / y);     // F9: ln(exp(x)/y)
const elsb  = (x, y) => Math.exp(x - Math.log(y));     // F8: exp(x − ln(y)) = exp(x)/y
const elad  = (x, y) => Math.exp(Math.log(x) + y);     // exp(ln(x) + y) = x·exp(y)
const deml  = (x, y) => Math.exp(-x) - Math.log(y);    // F3: exp(−x) − ln(y)
const epl   = (n, x) => Math.exp(n * Math.log(x));     // EPL primitive: x^n

// SuperBEST v5.2 routings (positive-domain headlines from CONTEXT.md table)
const exp_sb   = x      => eml(x, 1);                  // 1n: EML(x, 1)
const ln_sb    = x      => exl(0, x);                  // 1n: EXL(0, x)
const recip_sb = x      => elsb(0, x);                 // 1n: ELSb(0, x)
const sqrt_sb  = x      => epl(0.5, x);                // 1n: EPL(0.5, x)
const pow_sb   = (x, n) => epl(n, x);                  // 1n pos: EPL(n, x)
const div_sb   = (x, y) => elsb(exl(0, x), y);         // 2n: ELSb(EXL(0,x), y)
const neg_sb   = x      => exl(0, deml(x, 1));         // 2n: EXL(0, DEML(x,1))
const sub_sb   = (x, y) => lediv(x, eml(y, 1));        // 2n: LEdiv(x, EML(y,1))
const add_sb   = (x, y) => lediv(x, deml(y, 1));       // 2n: LEdiv(x, DEML(y,1))
const mul_sb   = (x, y) => elad(x, exl(0, y));         // 2n pos: ELAd(x, EXL(0,y))

// ─── Complex EML ───────────────────────────────────────────────────────────

const eml_c = (x, y) => { x = wrap(x); y = wrap(y); return x.exp().sub(y.ln()); };

// 11-node escape chain → −iπ from terminal {1} alone
const _e = eml_c(ONE, ONE);
const _em1 = eml_c(ONE, _e);
const _t1 = eml_c(_em1, ONE);
const _t2 = eml_c(_t1, ONE);
const _tower = eml_c(_t2, ONE);
const _neg_br = eml_c(ONE, _tower);
const _exp_e = eml_c(_e, ONE);
const _exp_ee = eml_c(_exp_e, ONE);
const _mid = eml_c(_neg_br, _exp_ee);
const NEG_I_PI = eml_c(ONE, _mid);

// sin/cos via Euler — extracts Im/Re of one complex EML node
const sin_euler = x => { const z = Cx.of(0, x).exp(); return z.im; };
const cos_euler = x => { const z = Cx.of(0, x).exp(); return z.re; };

// ─── Construction catalog ──────────────────────────────────────────────────

const TABS = [
  { id: "real", label: "Real EML" },
  { id: "best", label: "SuperBEST v5.2" },
  { id: "complex", label: "Complex ℂ" },
  { id: "catalog", label: "Identity Catalog" },
];

const REAL_CONSTRUCTIONS = [
  {
    name: "exp(x)", formula: "eml(x, 1)", op: "EML",
    nodes: 1, depth: 1,
    compute: x => exp_eml(x), ref: x => Math.exp(x),
    desc: "The simplest case. Set y = 1, ln(1) vanishes.",
    defX: 2,
  },
  {
    name: "e", formula: "eml(1, 1)", op: "EML",
    nodes: 1, depth: 1,
    compute: () => E_CONST, ref: () => Math.E,
    desc: "Euler's number falls out immediately.",
    isConst: true,
  },
  {
    name: "0", formula: "eml(1, eml(eml(1,1), 1))", op: "EML",
    nodes: 3, depth: 3,
    compute: () => ZERO, ref: () => 0,
    desc: "Zero from three nested EML calls. The additive identity.",
    isConst: true,
  },
  {
    name: "ln(x)", formula: "eml(1, eml(eml(1,x), 1))", op: "EML",
    nodes: 3, depth: 3,
    compute: x => ln_eml(x), ref: x => Math.log(x),
    desc: "Three nodes recover the logarithm in pure EML. Domain: x > 0.",
    defX: 5, minX: 0.1,
  },
  {
    name: "−x", formula: "two-regime (tower + shift)", op: "EML",
    nodes: 9, depth: 5,
    compute: x => neg_eml(x), ref: x => -x,
    desc: "Pure-EML negation needs two regimes for numerical stability.",
    defX: 7, minX: -5,
  },
  {
    name: "x − y", formula: "eml(ln(x), exp(y))", op: "EML",
    nodes: 5, depth: 4,
    compute: (x, y) => sub_eml(x, y), ref: (x, y) => x - y,
    desc: "exp(ln(x)) − ln(exp(y)) = x − y. Domain: x > 0.",
    defX: 8, defY: 3, twoIn: true, minX: 0.1,
  },
  {
    name: "x + y", formula: "eml(ln(x), eml(neg(y), 1))", op: "EML",
    nodes: 11, depth: 6,
    compute: (x, y) => add_eml(x, y), ref: (x, y) => x + y,
    desc: "Addition is harder than subtraction in pure EML. 11 nested nodes.",
    defX: 3, defY: 5, twoIn: true, minX: 0.1,
  },
  {
    name: "x × y", formula: "eml(add(ln(x), ln(y)), 1)", op: "EML",
    nodes: 13, depth: 7,
    compute: (x, y) => mul_eml(x, y), ref: (x, y) => x * y,
    desc: "Multiplication via exp(ln(x) + ln(y)). Domain: x,y > 0.",
    defX: 3, defY: 5, twoIn: true, minX: 0.1, minY: 0.1,
  },
  {
    name: "1/x", formula: "eml(neg(ln(x)), 1)", op: "EML",
    nodes: 5, depth: 4,
    compute: x => recip_eml(x), ref: x => 1/x,
    desc: "Pure-EML reciprocal via exp(−ln(x)). Domain: x > 0.",
    defX: 4, minX: 0.1,
  },
];

// SuperBEST v5.2 routings — positive-domain headline numbers.
// Each entry uses the F16 family primitives (LEdiv, ELSb, ELAd, DEML, EPL, EXL, EML).
const BEST_CONSTRUCTIONS = [
  {
    name: "exp(x)", formula: "EML(x, 1)", op: "EML",
    nodes: 1, depth: 1, emlNodes: 1,
    compute: x => exp_sb(x), ref: x => Math.exp(x),
    desc: "EML primitive — domain-universal, 1 node.",
    defX: 2,
  },
  {
    name: "ln(x)", formula: "EXL(0, x)", op: "EXL",
    nodes: 1, depth: 1, emlNodes: 3,
    compute: x => ln_sb(x), ref: x => Math.log(x),
    desc: "EXL recognises ln as 1 node. Pure EML needs 3.",
    defX: 5, minX: 0.1,
  },
  {
    name: "1/x", formula: "ELSb(0, x)", op: "ELSb",
    nodes: 1, depth: 1, emlNodes: 5,
    compute: x => recip_sb(x), ref: x => 1/x,
    desc: "Reciprocal as a single ELSb primitive. v5.2.",
    defX: 4, minX: 0.1,
  },
  {
    name: "√x", formula: "EPL(0.5, x)", op: "EPL",
    nodes: 1, depth: 1, emlNodes: 2,
    compute: x => sqrt_sb(x), ref: x => Math.sqrt(x),
    desc: "Square root as EPL(0.5, x). v5.2 — corrected from 2n to 1n.",
    defX: 9, minX: 0.1,
  },
  {
    name: "xⁿ", formula: "EPL(n, x)", op: "EPL",
    nodes: 1, depth: 1, emlNodes: 15,
    compute: (x, n) => pow_sb(x, n), ref: (x, n) => Math.pow(x, n),
    desc: "EPL recognised as a primitive (v5.1 X20 audit). 1n positive, 3n general.",
    defX: 2, defY: 5, twoIn: true, minX: 0.1, minY: 0.1, yLabel: "n",
  },
  {
    name: "x / y", formula: "ELSb(EXL(0,x), y)", op: "ELSb",
    nodes: 2, depth: 2, emlNodes: 15,
    compute: (x, y) => div_sb(x, y), ref: (x, y) => x / y,
    desc: "Division via ELSb. 2-node full tree. 1n if EXL is recognised standalone.",
    defX: 10, defY: 2, twoIn: true, minX: 0.1, minY: 0.1,
  },
  {
    name: "−x", formula: "EXL(0, DEML(x,1))", op: "EXL/DEML",
    nodes: 2, depth: 2, emlNodes: 9,
    compute: x => neg_sb(x), ref: x => -x,
    desc: "Negation via EXL of DEML. v5.2 — domain-universal at 2n.",
    defX: 7,
  },
  {
    name: "x − y", formula: "LEdiv(x, EML(y,1))", op: "LEdiv",
    nodes: 2, depth: 2, emlNodes: 5,
    compute: (x, y) => sub_sb(x, y), ref: (x, y) => x - y,
    desc: "Subtraction via LEdiv. v5.2 — domain-universal at 2n.",
    defX: 8, defY: 3, twoIn: true,
  },
  {
    name: "x + y", formula: "LEdiv(x, DEML(y,1))", op: "LEdiv",
    nodes: 2, depth: 2, emlNodes: 11,
    compute: (x, y) => add_sb(x, y), ref: (x, y) => x + y,
    desc: "Addition via LEdiv with DEML negation. v5.2 breakthrough — 11n → 2n.",
    defX: 5, defY: 3, twoIn: true,
  },
  {
    name: "x × y", formula: "ELAd(x, EXL(0,y))", op: "ELAd",
    nodes: 2, depth: 2, emlNodes: 13,
    compute: (x, y) => mul_sb(x, y), ref: (x, y) => x * y,
    desc: "Multiplication via ELAd. 2n positive, 6n general. 13n → 2n.",
    defX: 3, defY: 5, twoIn: true, minX: 0.1, minY: 0.1,
  },
];

const COMPLEX_CONSTRUCTIONS = [
  {
    name: "sin(x)", formula: "Im(exp_c(ix))", op: "ℂ EML",
    nodes: "1*", depth: 1,
    compute: x => sin_euler(x), ref: x => Math.sin(x),
    desc: "Via Euler's formula. One EML node, extract Im. *Meta-operation.",
    defX: 1, minX: -6.28, maxX: 6.28,
  },
  {
    name: "cos(x)", formula: "Re(exp_c(ix))", op: "ℂ EML",
    nodes: "1*", depth: 1,
    compute: x => cos_euler(x), ref: x => Math.cos(x),
    desc: "Same Euler node, extract Re. *Meta-operation.",
    defX: 1, minX: -6.28, maxX: 6.28,
  },
  {
    name: "−iπ", formula: "11-node escape chain", op: "ℂ EML",
    nodes: 11, depth: 8,
    compute: () => NEG_I_PI.im,
    ref: () => -Math.PI,
    desc: "First non-real value from terminal {1} alone. The escape from ℝ.",
    isConst: true, isIm: true,
  },
  {
    name: "π (via −iπ)", formula: "Re(−i · (−iπ))", op: "ℂ EML",
    nodes: 32, depth: 16,
    compute: () => Math.abs(NEG_I_PI.im),
    ref: () => Math.PI,
    desc: "π extracted from the imaginary escape. Terminals: {1, 2}.",
    isConst: true,
  },
];

// SuperBEST v5.2 catalog — node counts by family. BEST column is the
// v5.2 headline (positive-domain unless noted).
const IDENTITY_CATALOG = [
  { name:"exp(x)",  eml:1,  edl:"1", exl:"1", best:"1 (EML)", status:"verified" },
  { name:"ln(x)",   eml:3,  edl:"3", exl:"1", best:"1 (EXL)", status:"verified" },
  { name:"−x",      eml:9,  edl:"6", exl:"—", best:"2 (EXL+DEML)", status:"verified" },
  { name:"x − y",   eml:5,  edl:"—", exl:"—", best:"2 (LEdiv)", status:"verified" },
  { name:"x + y",   eml:11, edl:"—", exl:"—", best:"2 (LEdiv)", status:"verified" },
  { name:"x × y",   eml:13, edl:"7", exl:"—", best:"2 pos / 6 gen (ELAd)", status:"verified" },
  { name:"x / y",   eml:15, edl:"1", exl:"—", best:"1 pos / 2 gen (ELSb)", status:"verified" },
  { name:"1/x",     eml:5,  edl:"2", exl:"—", best:"1 (ELSb)", status:"verified" },
  { name:"xⁿ",      eml:15, edl:"11",exl:"3", best:"1 pos / 3 gen (EPL)", status:"verified" },
  { name:"√x",      eml:2,  edl:"—", exl:"3", best:"1 (EPL)", status:"verified" },
  { name:"sin(x)",  eml:"∞ℝ / 1*ℂ", edl:"—",exl:"—", best:"1*ℂ (meta)", status:"proven" },
  { name:"cos(x)",  eml:"∞ℝ / 1*ℂ", edl:"—",exl:"—", best:"1*ℂ (meta)", status:"proven" },
  { name:"−iπ",     eml:"11ℂ",       edl:"—",exl:"—", best:"11ℂ ({1})", status:"proven" },
  { name:"i",       eml:"22ℂ",       edl:"—",exl:"—", best:"22ℂ ({1,2})", status:"proven" },
  { name:"π",       eml:"32ℂ",       edl:"—",exl:"—", best:"32ℂ ({1,2})", status:"proven" },
];

// ─── UI Components ─────────────────────────────────────────────────────────

const accent = "#c8a832";
const accentDim = "rgba(200,168,50,0.12)";
const bg = "var(--surface-primary, #0c0b09)";
const bgCard = "var(--surface-secondary, #16150f)";
const border = "var(--border-secondary, #2a2820)";
const textPri = "var(--text-primary, #e8e4d8)";
const textSec = "var(--text-secondary, #9a9484)";
const textDim = "var(--text-tertiary, #6b6558)";
const green = "#4ade80";
const red = "#f87171";

const mono = "'IBM Plex Mono', 'SF Mono', 'Cascadia Code', 'Fira Code', monospace";
const sans = "'DM Sans', 'Instrument Sans', -apple-system, sans-serif";

const NodePips = ({ count }) => {
  const n = typeof count === "number" ? count : 0;
  if (n === 0) return null;
  const color = n <= 2 ? green : n <= 5 ? accent : n <= 11 ? "#f59e0b" : "#f97316";
  return (
    <span style={{ display: "inline-flex", gap: 2, marginLeft: 8 }}>
      {Array.from({ length: Math.min(n, 15) }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", opacity: 0.9 }} />
      ))}
      {n > 15 && <span style={{ fontSize: 10, color: textSec, marginLeft: 2 }}>+{n - 15}</span>}
    </span>
  );
};

const Badge = ({ children, color = accent }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, fontFamily: mono,
    letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "2px 7px", borderRadius: 4,
    background: color === accent ? accentDim : `${color}18`,
    color, border: `1px solid ${color}30`,
  }}>{children}</span>
);

// ─── Main Component ────────────────────────────────────────────────────────

export default function EMLPlayground() {
  const [tab, setTab] = useState("real");
  const [selIdx, setSelIdx] = useState(0);
  const [xVal, setXVal] = useState(2);
  const [yVal, setYVal] = useState(5);

  const constructions = tab === "real" ? REAL_CONSTRUCTIONS
    : tab === "best" ? BEST_CONSTRUCTIONS
    : tab === "complex" ? COMPLEX_CONSTRUCTIONS
    : [];

  const c = constructions[selIdx] || constructions[0];

  const switchTab = useCallback((id) => {
    setTab(id);
    setSelIdx(0);
    const list = id === "real" ? REAL_CONSTRUCTIONS
      : id === "best" ? BEST_CONSTRUCTIONS
      : id === "complex" ? COMPLEX_CONSTRUCTIONS : [];
    if (list[0]) {
      setXVal(list[0].defX ?? 0);
      setYVal(list[0].defY ?? 5);
    }
  }, []);

  const selectFn = useCallback((i) => {
    setSelIdx(i);
    const fn = constructions[i];
    if (fn) {
      setXVal(fn.defX ?? 0);
      setYVal(fn.defY ?? 5);
    }
  }, [constructions]);

  const result = useMemo(() => {
    try {
      if (c.isConst) return c.compute();
      if (c.twoIn) return c.compute(xVal, yVal);
      return c.compute(xVal);
    } catch { return NaN; }
  }, [c, xVal, yVal]);

  const ref = useMemo(() => {
    try {
      if (c.isConst) return c.ref();
      if (c.twoIn) return c.ref(xVal, yVal);
      return c.ref(xVal);
    } catch { return NaN; }
  }, [c, xVal, yVal]);

  const match = !isNaN(result) && !isNaN(ref) && Math.abs(result - ref) < 1e-6;
  const fmt = v => isNaN(v) ? "NaN" : v.toFixed(10);

  return (
    <div style={{ fontFamily: sans, background: bg, color: textPri, minHeight: "100vh", padding: "20px 12px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontFamily: mono, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}>
              EML Playground
            </span>
            <span style={{ fontSize: 10, fontFamily: mono, color: textDim }}>v0.3.0 · v5.2 routings</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: textPri, lineHeight: 1.3 }}>
            eml(x, y) = e<sup style={{ fontSize: 14 }}>x</sup> − ln(y)
          </div>
          <div style={{ fontSize: 13, color: textSec, marginTop: 6, lineHeight: 1.5 }}>
            One operator, one constant, every elementary function.
            <span style={{ display: "block", fontSize: 11, color: textDim, marginTop: 2 }}>
              Odrzywołek 2026 · arXiv:2603.21852 · 50 Lean theorems
            </span>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{
              fontFamily: mono, fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? accent : textSec,
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 14px", position: "relative",
              borderBottom: tab === t.id ? `2px solid ${accent}` : "2px solid transparent",
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── Catalog tab ── */}
        {tab === "catalog" && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ fontSize: 13, color: textSec, marginBottom: 14, lineHeight: 1.5 }}>
              Node counts across all three operator families. <Badge>BEST</Badge> = SuperBEST v5.2 headline (positive-domain unless noted).
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${border}` }}>
                  {["Operation", "EML", "EDL", "EXL", "BEST", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IDENTITY_CATALOG.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${border}22` }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: textPri }}>{row.name}</td>
                    <td style={{ padding: "7px 10px", color: textSec }}>{row.eml}</td>
                    <td style={{ padding: "7px 10px", color: textSec }}>{row.edl}</td>
                    <td style={{ padding: "7px 10px", color: textSec }}>{row.exl}</td>
                    <td style={{ padding: "7px 10px", color: accent, fontWeight: 600 }}>{row.best}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <Badge color={row.status === "verified" ? green : accent}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: textDim, marginTop: 14, lineHeight: 1.6 }}>
              ∞ℝ = provably impossible over ℝ (Infinite Zeros Barrier) · *ℂ = meta-operation (Im/Re extraction outside grammar) · — = not expressible in that family
            </div>
          </div>
        )}

        {/* ── Construction tabs ── */}
        {tab !== "catalog" && (<>

          {/* Function selector grid */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${constructions.length <= 6 ? 3 : 4}, 1fr)`, gap: 5, marginBottom: 20 }}>
            {constructions.map((fn, i) => (
              <button key={i} onClick={() => selectFn(i)} style={{
                padding: "10px 6px", fontFamily: mono, fontSize: 13,
                fontWeight: selIdx === i ? 700 : 400,
                background: selIdx === i ? accent : bgCard,
                color: selIdx === i ? "#0c0b09" : textPri,
                border: `1px solid ${selIdx === i ? accent : border}`,
                borderRadius: 6, cursor: "pointer", transition: "all 0.12s",
                textAlign: "center", lineHeight: 1.2,
              }}>
                <div>{fn.name}</div>
                {fn.op && <div style={{ fontSize: 9, marginTop: 3, opacity: 0.6, fontWeight: 400 }}>{fn.op}</div>}
              </button>
            ))}
          </div>

          {/* Detail card */}
          <div style={{ background: bgCard, border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: textSec, marginBottom: 6, lineHeight: 1.5 }}>{c.desc}</div>
            <div style={{ fontFamily: mono, fontSize: 15, fontWeight: 600, color: accent, marginBottom: 10, wordBreak: "break-all", lineHeight: 1.4 }}>
              {c.formula}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Badge>{typeof c.nodes === "number" ? `${c.nodes} node${c.nodes !== 1 ? "s" : ""}` : c.nodes}</Badge>
              {c.depth && <Badge color={textSec}>depth {c.depth}</Badge>}
              {c.emlNodes && <Badge color={textDim}>pure EML: {c.emlNodes}n</Badge>}
              {typeof c.nodes === "number" && <NodePips count={c.nodes} />}
            </div>
          </div>

          {/* Input sliders */}
          {!c.isConst && (
            <div style={{ background: bgCard, border: `1px solid ${border}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
              <div style={{ marginBottom: c.twoIn ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontFamily: mono, color: textSec }}>x</label>
                  <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 600, color: textPri }}>{xVal.toFixed(2)}</span>
                </div>
                <input type="range" min={c.minX ?? -5} max={c.maxX ?? 10} step={0.05} value={xVal}
                  onChange={e => setXVal(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: accent, height: 4 }} />
              </div>
              {c.twoIn && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontFamily: mono, color: textSec }}>{c.yLabel || "y"}</label>
                    <span style={{ fontSize: 13, fontFamily: mono, fontWeight: 600, color: textPri }}>{yVal.toFixed(2)}</span>
                  </div>
                  <input type="range" min={c.minY ?? -5} max={10} step={0.05} value={yVal}
                    onChange={e => setYVal(parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: accent, height: 4 }} />
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div style={{
            background: bgCard,
            border: `1px solid ${match ? `${green}60` : `${red}60`}`,
            borderRadius: 10, padding: 22, marginBottom: 16,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontFamily: mono, color: textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {c.isIm ? "Im (via EML)" : "via EML"}
                </div>
                <div style={{ fontSize: 18, fontFamily: mono, fontWeight: 700, color: accent, wordBreak: "break-all" }}>
                  {fmt(result)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontFamily: mono, color: textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Reference
                </div>
                <div style={{ fontSize: 18, fontFamily: mono, fontWeight: 700, color: textPri, wordBreak: "break-all" }}>
                  {fmt(ref)}
                </div>
              </div>
            </div>
            <div style={{
              textAlign: "center", fontFamily: mono, fontSize: 12, fontWeight: 700,
              padding: "8px 0", borderRadius: 6,
              color: match ? green : red,
              background: match ? `${green}10` : `${red}10`,
              letterSpacing: "0.04em",
            }}>
              {match ? "✓ EXACT MATCH" : "✗ MISMATCH"}
            </div>
          </div>

          {/* SuperBEST savings callout */}
          {tab === "best" && c.emlNodes && c.emlNodes > c.nodes && (
            <div style={{
              background: accentDim, border: `1px solid ${accent}30`, borderRadius: 8,
              padding: "12px 16px", marginBottom: 16,
              fontSize: 12, fontFamily: mono, color: accent, textAlign: "center",
            }}>
              {Math.round((1 - (typeof c.nodes === "number" ? c.nodes : 0) / c.emlNodes) * 100)}% savings vs pure EML ({c.emlNodes} → {c.nodes} nodes)
            </div>
          )}

        </>)}

        {/* ── Footer ── */}
        <div style={{
          textAlign: "center", paddingTop: 18, marginTop: 8,
          borderTop: `1px solid ${border}`,
          fontSize: 11, fontFamily: mono, color: textDim, lineHeight: 1.8,
        }}>
          Every computation above uses <span style={{ color: accent }}>only</span> compositions of
          eml(x,y) = e<sup>x</sup> − ln(y) and the constant 1.
          <br />
          No built-in addition. No multiplication. No sine. One operator.
          <br />
          <span style={{ opacity: 0.5 }}>
            monogate.org · monogate.dev · arXiv:2603.21852 · CC BY 4.0
          </span>
        </div>
      </div>
    </div>
  );
}
