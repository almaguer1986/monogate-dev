import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg: "#08060E", surface: "rgba(255,255,255,0.025)", border: "rgba(255,255,255,0.06)",
  text: "#E2E8F0", muted: "rgba(226,232,240,0.45)", accent: "#e8a020",
  mono: "var(--font-mono, monospace)",
};

const FEATURED = [
  {
    id: "eml-synthesizer", title: "EML Synthesizer", icon: "♫", color: "#5ec47a",
    tagline: "Timbre is node count.",
    desc: "Fourier synthesis where each harmonic is one complex EML node: Im(eml(i·2πft,1)) = sin(2πft). A sine wave costs 1 node. A violin costs 12.",
  },
  {
    id: "weierstrass-machine", title: "Weierstrass Machine", icon: "≈", color: "#10B981",
    tagline: "Build any continuous function from EML atoms.",
    desc: "T02 Universality in action: compose EML atoms to approximate any continuous f on [0.2, 3.0]. Depth-1, -2, and -3 atoms. Watch convergence live.",
  },
  {
    id: "phantom-attractor", title: "Phantom Attractor", icon: "⊕", color: "#F97316",
    tagline: "Why gradient descent stalls at 3.1696.",
    desc: "Simulate EML tree training dynamics. 92% of runs collapse to the phantom attractor — not π. Raise λ past the critical threshold. Phase transition. Real data from §5.",
  },
  {
    id: "negative-exponent", title: "Negative Exponent", icon: "⁻¹", color: "#EC4899",
    tagline: "Only one operator reaches exp(−x).",
    desc: "EML fails. EDL fails. EXL only approximates. DEML wins: deml(x,1) = exp(−x). Discover why each operator either succeeds or gets blocked.",
  },
  {
    id: "billion-trees", title: "Search Log", icon: "⏱", color: "#EF4444",
    tagline: "1,704,034,304 trees. Zero candidates.",
    desc: "The exhaustive EML search (§35) made interactive. Reveal each depth level: 4 trees at N=1 up to 1.7B at N=12. Best-MSE stalls above 0.1. sin(x) never appears.",
  },
  {
    id: "identity-theorem", title: "Identity Theorem", icon: "∴", color: "#06B6D4",
    tagline: "Step through the proof that eml gives you everything.",
    desc: "Walk each algebraic step: eml(x,1)=exp(x), eml(1,exp(x))=e−x, eml(e−x,1)=exp(e−x). Prove neg(x)=−x in 4 steps from first principles.",
  },
];

const COMPACT = [
  { id: "eml-builder", title: "EML Builder", icon: "⧈", color: "#06B6D4", tagline: "Snap. Compose. Create." },
  { id: "closure", title: "Closure", icon: "⊘", color: "#EF4444", tagline: "You can't escape. Unless…" },
  { id: "the-gap", title: "The Gap", icon: "∎", color: "#EF4444", tagline: "Real vs complex. Different depths." },
];

function FractalHero({ visible }) {
  const nav = useNavigate();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        marginBottom: 48,
        background: hovered
          ? "linear-gradient(135deg, rgba(232,160,32,0.1), rgba(232,160,32,0.03))"
          : "linear-gradient(135deg, rgba(232,160,32,0.06), rgba(8,6,14,0))",
        border: `1px solid ${hovered ? "rgba(232,160,32,0.4)" : "rgba(232,160,32,0.15)"}`,
        borderRadius: 16, padding: "40px 40px 36px",
        position: "relative", overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: hovered ? 2 : 1,
        background: "linear-gradient(90deg, transparent, #e8a020, transparent)",
        transition: "height 0.3s",
      }} />
      <div style={{
        position: "absolute", top: -80, right: -80, width: 300, height: 300,
        background: "radial-gradient(circle, rgba(232,160,32,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28, color: C.accent, lineHeight: 1 }}>◈</span>
        <span style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.accent, fontFamily: C.mono }}>
          FLAGSHIP · FRACTAL EXPLORER
        </span>
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", margin: "0 0 10px", letterSpacing: -0.5 }}>
        Eight operators. Eight universes.
      </h2>
      <p style={{ fontSize: 14, color: "rgba(226,232,240,0.6)", margin: "0 0 24px", maxWidth: 520, lineHeight: 1.7 }}>
        Real-plane escape-time fractals for all 8 EML-family operators: EML, DEML, EXL, EDL, EAL, EMN, EPL, LEAd.
        The EML operator produces the Devaney exponential family — boundary dimension 1.716.
        EAL, DEML, and EMN generate entirely different geometry.
      </p>

      <button
        onClick={() => nav("/fractal-explorer")}
        style={{
          fontFamily: C.mono, fontSize: 12, padding: "10px 24px",
          background: hovered ? C.accent : "rgba(232,160,32,0.12)",
          border: `1px solid ${hovered ? C.accent : "rgba(232,160,32,0.3)"}`,
          color: hovered ? "#08060E" : C.accent,
          borderRadius: 6, cursor: "pointer", fontWeight: 700, letterSpacing: 1,
          transition: "all 0.2s", textTransform: "uppercase",
        }}>
        ENTER EXPLORER →
      </button>
    </div>
  );
}

function FeaturedCard({ game, index, visible }) {
  const [hovered, setHovered] = useState(false);
  const nav = useNavigate();
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => nav(`/${game.id}`)}
      style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1 + index * 0.07}s`,
        background: hovered ? `linear-gradient(135deg, ${game.color}10, rgba(255,255,255,0.02))` : C.surface,
        border: `1px solid ${hovered ? game.color + "40" : C.border}`,
        borderRadius: 12, padding: "20px", cursor: "pointer",
        position: "relative", overflow: "hidden",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: hovered ? 2 : 0, background: game.color, transition: "height 0.25s" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 22, color: game.color, lineHeight: 1, flexShrink: 0,
          filter: hovered ? `drop-shadow(0 0 5px ${game.color}60)` : "none", transition: "filter 0.25s" }}>
          {game.icon}
        </span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 2 }}>{game.title}</div>
          <div style={{ fontSize: 11, color: game.color, opacity: 0.8, fontStyle: "italic" }}>{game.tagline}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "rgba(226,232,240,0.5)", margin: 0, lineHeight: 1.65 }}>{game.desc}</p>
    </div>
  );
}

function CompactCard({ game, visible, delay }) {
  const [hovered, setHovered] = useState(false);
  const nav = useNavigate();
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => nav(`/${game.id}`)}
      style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `all 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
        background: hovered ? `${game.color}0a` : "transparent",
        border: `1px solid ${hovered ? game.color + "30" : C.border}`,
        borderRadius: 8, padding: "12px 16px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
      <span style={{ fontSize: 18, color: game.color, lineHeight: 1, flexShrink: 0 }}>{game.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{game.title}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{game.tagline}</div>
      </div>
    </div>
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

        {/* Header */}
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
            One equation.<br />Every experiment.
          </h1>
          <p style={{ fontSize: 14, color: C.muted, maxWidth: 460, margin: "0 auto", lineHeight: 1.75 }}>
            <span style={{ fontFamily: C.mono, color: "#C4B5FD" }}>eml(x,y) = exp(x) − ln(y)</span>
            {" "}— a single binary operator that generates every elementary function.
            28 proved theorems. Each experiment below is grounded mathematics, not speculation.
          </p>
        </header>

        {/* Fractal hero */}
        <FractalHero visible={visible} />

        {/* Featured section */}
        <div style={{
          opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.2s",
          fontSize: 10, fontFamily: C.mono, color: C.muted, letterSpacing: 2,
          textTransform: "uppercase", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span>── FEATURED</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 48 }}>
          {FEATURED.map((g, i) => <FeaturedCard key={g.id} game={g} index={i} visible={visible} />)}
        </div>

        {/* Compact section */}
        <div style={{
          opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.4s",
          fontSize: 10, fontFamily: C.mono, color: C.muted, letterSpacing: 2,
          textTransform: "uppercase", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span>── ALL EXPERIMENTS</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {COMPACT.map((g, i) => <CompactCard key={g.id} game={g} visible={visible} delay={0.45 + i * 0.06} />)}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 60, paddingTop: 24, borderTop: `1px solid ${C.border}`,
          fontSize: 11, fontFamily: C.mono, color: C.muted, lineHeight: 1.8,
          opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.6s",
        }}>
          Research by Arturo R. Almaguer ·{" "}
          <a href="https://arxiv.org/abs/2603.21852" style={{ color: "#4facfe" }}>arXiv:2603.21852</a>
          {" "}· 24 theorems · 315+ equations ·{" "}
          <a href="https://monogate.org" style={{ color: "#4facfe" }}>monogate.org</a>
        </div>

      </div>
    </div>
  );
}
