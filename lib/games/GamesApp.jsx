import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Hub from "./monogate-games-hub";
import EmCostCalculator from "./em-cost-calculator";
import LiveOptimizer from "./live-optimizer";
import EMLPlayground from "./eml-playground-v2";
import EMLCalculator from "./eml-calculator";

function BackButton() {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav("/")}
      style={{
        position: "fixed", top: 16, left: 16, zIndex: 9999,
        background: "rgba(8,6,14,0.75)", border: "1px solid rgba(232,160,32,0.2)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        color: "#e8a020", borderRadius: 8, padding: "7px 14px", cursor: "pointer",
        fontSize: 13, fontFamily: "monospace",
        display: "flex", alignItems: "center", gap: 6,
        transition: "border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(232,160,32,0.5)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(232,160,32,0.2)"}
    >
      ← lab
    </button>
  );
}

function Game({ children }) {
  return (
    <>
      <BackButton />
      {children}
    </>
  );
}

// Renders for any old route that has moved off monogate.dev to 1op.io.
// We keep the .jsx files in the repo (they're the source-of-truth for
// the migrated 1op.io copies); we only stop routing visitors to them here.
function MovedNotice() {
  const nav = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", background: "#08060E", color: "#E2E8F0",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "2rem", textAlign: "center",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#7d9ec4",
        textTransform: "uppercase", marginBottom: 12, fontFamily: "monospace" }}>
        moved
      </div>
      <h1 style={{ fontSize: 28, margin: "0 0 16px", color: "#F1F5F9",
        fontFamily: "var(--font-serif, Georgia, serif)", fontStyle: "italic" }}>
        This experience now lives at 1op.io
      </h1>
      <p style={{ fontSize: 14, color: "rgba(226,232,240,0.6)",
        maxWidth: 480, lineHeight: 1.7, marginBottom: 28 }}>
        Fractals, audio, interactive lessons, and visual explorations
        moved to <strong style={{ color: "#c4a77d" }}>1op.io</strong>.
        monogate.dev is now the developer-tools home: Live Optimizer
        and EM Cost Calculator stay here.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a href="https://1op.io" style={{
          padding: "10px 24px", background: "#c4a77d22", border: "1px solid #c4a77d55",
          color: "#c4a77d", borderRadius: 6, fontSize: 12, letterSpacing: 1,
          textDecoration: "none", textTransform: "uppercase", fontWeight: 700,
          fontFamily: "monospace",
        }}>Visit 1op.io →</a>
        <button onClick={() => nav("/")} style={{
          padding: "10px 24px", background: "transparent", border: "1px solid #4facfe55",
          color: "#4facfe", borderRadius: 6, fontSize: 12, letterSpacing: 1,
          cursor: "pointer", textTransform: "uppercase", fontWeight: 700,
          fontFamily: "monospace",
        }}>← Back to lab</button>
      </div>
    </div>
  );
}

export default function GamesApp() {
  return (
    <BrowserRouter basename="/lab">
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/optimizer" element={<Game><LiveOptimizer /></Game>} />
        <Route path="/em-cost" element={<Game><EmCostCalculator /></Game>} />
        <Route path="/playground" element={<Game><EMLPlayground /></Game>} />
        <Route path="/calculator" element={<Game><EMLCalculator /></Game>} />
        {/* Everything else moved to 1op.io */}
        <Route path="*" element={<MovedNotice />} />
      </Routes>
    </BrowserRouter>
  );
}
