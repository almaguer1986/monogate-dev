import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg: "#08060E", surface: "rgba(255,255,255,0.025)", border: "rgba(255,255,255,0.06)",
  text: "#E2E8F0", muted: "rgba(226,232,240,0.45)", accent: "#e8a020",
  oneop: "#c4a77d",
  mono: "var(--font-mono, monospace)",
};

// Developer tools that stay on monogate.dev/lab.
// Play-friendly experiences (fractals, audio, interactive lessons) moved to 1op.io.
const DEV_TOOLS = [
  {
    id: "optimizer", title: "Live Optimizer", icon: "⚡", color: "#e8a020",
    tagline: "Type any equation. Watch it shrink.",
    desc: "Real-time EML node-cost analyzer in the browser. Every mathematical expression gets naïve-vs-SuperBEST costs, operator breakdown, savings bar, and an ELC-class badge. The same recursive-descent optimizer that ships in the Python CLI, running on paste-and-type.",
  },
  {
    id: "calculator", title: "EML Calculator", icon: "🧮", color: "#c4a77d",
    tagline: "Every function on your calculator, from one operator.",
    desc: "Scientific calculator where every button computes via eml(x, y) = exp(x) − ln(y) and the constant 1. Each press shows the EML decomposition, the SuperBEST v5.2 routing, the node count, and the cost class. 34 of 36 standard scientific functions; factorial and mod are honestly outside the elementary class.",
  },
  {
    id: "playground", title: "EML Playground", icon: "▤", color: "#c8a832",
    tagline: "Real EML, SuperBEST v5.2, complex bypass.",
    desc: "Side-by-side explorer for the three operator regimes. Real EML pure compositions (11n add, 13n mul) next to v5.2 SuperBEST headlines (2n add via LEdiv, 1n recip via ELSb), plus the complex Euler bypass that unlocks sin/cos in one node. Catalog tab cross-references every identity against EML / EDL / EXL / BEST.",
  },
  {
    id: "em-cost", title: "EM Cost Calculator", icon: "∑", color: "#4facfe",
    tagline: "F16-node decomposition of EM formulas.",
    desc: "Decompose any expectation-maximization or scoring expression into the F16 operator basis. Compare the naïve cost against SuperBEST routing and see exactly which terms route through which operators.",
  },
];

function ToolCard({ tool, visible, index }) {
  const nav = useNavigate();
  const [hovered, setHovered] = useState(false);
  const color = tool.color;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => nav(`/${tool.id}`)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + index * 0.12}s`,
        marginBottom: 20,
        background: hovered
          ? `linear-gradient(135deg, ${color}1a, ${color}05)`
          : `linear-gradient(135deg, ${color}10, rgba(8,6,14,0))`,
        border: `1px solid ${hovered ? color + "66" : color + "28"}`,
        borderRadius: 16, padding: "36px 36px 32px",
        position: "relative", overflow: "hidden", cursor: "pointer",
        boxShadow: hovered
          ? `0 0 40px ${color}22, 0 8px 24px rgba(0,0,0,0.35)`
          : "0 4px 16px rgba(0,0,0,0.25)",
      }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: hovered ? 2 : 1,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        transition: "height 0.3s",
      }} />
      <div style={{
        position: "absolute", top: -80, right: -80, width: 300, height: 300,
        background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 26, color, lineHeight: 1,
          filter: hovered ? `drop-shadow(0 0 6px ${color}90)` : "none",
          transition: "filter 0.25s" }}>{tool.icon}</span>
        <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
          color, fontFamily: C.mono }}>developer tool</span>
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#F1F5F9",
        margin: "0 0 6px", letterSpacing: -0.5 }}>{tool.title}</h2>
      <div style={{ fontSize: 14, color, fontStyle: "italic",
        marginBottom: 14, opacity: 0.9 }}>{tool.tagline}</div>
      <p style={{ fontSize: 13, color: "rgba(226,232,240,0.6)",
        margin: "0 0 20px", maxWidth: 560, lineHeight: 1.7 }}>{tool.desc}</p>
      <button
        onClick={(e) => { e.stopPropagation(); nav(`/${tool.id}`); }}
        style={{
          fontFamily: C.mono, fontSize: 12, padding: "10px 24px",
          background: hovered ? color : `${color}22`,
          border: `1px solid ${hovered ? color : color + "55"}`,
          color: hovered ? "#08060E" : color,
          borderRadius: 6, cursor: "pointer", fontWeight: 700, letterSpacing: 1,
          transition: "all 0.2s", textTransform: "uppercase",
        }}>OPEN →</button>
    </div>
  );
}

function OneopBanner({ visible }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="https://1op.io"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block", textDecoration: "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.4s",
        marginBottom: 48,
        padding: "24px 28px",
        background: hovered
          ? `linear-gradient(135deg, ${C.oneop}1a, ${C.oneop}05)`
          : `linear-gradient(135deg, ${C.oneop}10, rgba(8,6,14,0))`,
        border: `1px solid ${hovered ? C.oneop + "55" : C.oneop + "28"}`,
        borderRadius: 12,
        cursor: "pointer",
      }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: C.oneop,
        textTransform: "uppercase", marginBottom: 8, fontFamily: C.mono }}>
        new
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9",
          margin: 0, letterSpacing: -0.5 }}>
          Looking for fractals, audio, and interactive lessons?
        </h2>
      </div>
      <p style={{ fontSize: 13, color: "rgba(226,232,240,0.65)",
        margin: "10px 0 14px", lineHeight: 1.7, maxWidth: 600 }}>
        All play experiences moved to <strong style={{ color: C.oneop }}>1op.io</strong>:
        Fractal Studio, Zen Garden, the Depth Organ, Equation Genome, and
        ~25 other experiments. monogate.dev now focuses on developer tools.
      </p>
      <span style={{
        fontFamily: C.mono, fontSize: 11, color: C.oneop,
        letterSpacing: 1.5, textTransform: "uppercase",
      }}>
        Visit 1op.io →
      </span>
    </a>
  );
}

export default function Hub() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "var(--font-sans, system-ui, sans-serif)", position: "relative" }}>

      <div style={{ position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(232,160,32,0.015) 1px, transparent 0)",
        backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 80px", position: "relative" }}>

        <header style={{
          padding: "48px 0 40px", textAlign: "center",
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-12px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ fontSize: 11, fontFamily: C.mono, color: C.muted, letterSpacing: 2,
            textTransform: "uppercase", marginBottom: 16 }}>
            monogate.dev · lab
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, margin: "0 0 16px", color: "#F1F5F9",
            letterSpacing: -0.8, lineHeight: 1.15 }}>
            Developer tools for<br />the F16 operator family.
          </h1>
          <p style={{ fontSize: 14, color: C.muted, maxWidth: 460, margin: "0 auto", lineHeight: 1.75 }}>
            <span style={{ fontFamily: C.mono, color: "#C4B5FD" }}>eml(x,y) = exp(x) − ln(y)</span>
            {" "}— a single binary operator that generates every elementary function.
            The lab keeps the SuperBEST cost analyzers and equation tools that engineers reach for.
          </p>
        </header>

        <OneopBanner visible={visible} />

        <div style={{ marginBottom: 48 }}>
          {DEV_TOOLS.map((t, i) => <ToolCard key={t.id} tool={t} visible={visible} index={i} />)}
        </div>

        <div style={{
          marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}`,
          fontSize: 11, fontFamily: C.mono, color: C.muted, lineHeight: 1.8,
          opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.6s",
        }}>
          Monogate Research ·{" "}
          <a href="https://arxiv.org/abs/2603.21852" style={{ color: "#4facfe" }}>arXiv:2603.21852</a>
          {" "}·{" "}
          <a href="https://monogate.org" style={{ color: "#4facfe" }}>monogate.org</a>
          {" "}·{" "}
          <a href="https://1op.io" style={{ color: C.oneop }}>1op.io</a>
        </div>

      </div>
    </div>
  );
}
