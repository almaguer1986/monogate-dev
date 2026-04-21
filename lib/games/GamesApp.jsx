import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Hub from "./monogate-games-hub";
import EmlBuilder from "./eml-builder";
import Closure from "./closure";
import TheGap from "./the-gap";
import PhantomAttractor from "./phantom-attractor";
import IdentityTheorem from "./identity-theorem";
import NegativeExponent from "./negative-exponent";
import WeierstrassMachine from "./weierstrass-machine";
import BillionTrees from "./billion-trees";
import EMLFractalExplorer from "./EMLFractalExplorer";
import EMLSynthesizer from "./eml-synthesizer";

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

export default function GamesApp() {
  return (
    <BrowserRouter basename="/lab">
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/fractal-explorer" element={<Game><EMLFractalExplorer /></Game>} />
        <Route path="/eml-synthesizer" element={<Game><EMLSynthesizer /></Game>} />
        <Route path="/weierstrass-machine" element={<Game><WeierstrassMachine /></Game>} />
        <Route path="/phantom-attractor" element={<Game><PhantomAttractor /></Game>} />
        <Route path="/negative-exponent" element={<Game><NegativeExponent /></Game>} />
        <Route path="/billion-trees" element={<Game><BillionTrees /></Game>} />
        <Route path="/identity-theorem" element={<Game><IdentityTheorem /></Game>} />
        <Route path="/eml-builder" element={<Game><EmlBuilder /></Game>} />
        <Route path="/closure" element={<Game><Closure /></Game>} />
        <Route path="/the-gap" element={<Game><TheGap /></Game>} />
      </Routes>
    </BrowserRouter>
  );
}
