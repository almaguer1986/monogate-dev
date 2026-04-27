import type { Metadata } from "next";
import data from "../petal_eml.json";
import { type PetalDataset, type PetalRecord, ghLink, LANE_DESCRIPTIONS } from "../petal-types";
import { PetalLab, TheoremActions } from "./PetalLab";

const dataset = data as unknown as PetalDataset;
const lane1Records = (dataset.records as PetalRecord[]).filter((r) => r.lane === 1);
const lane1TheoremIds = lane1Records.map((r) => r.theorem_id);

const ACCENT = "#06B6D4";
const ACCENT_DIM = "#06B6D440";
const TEXT = "#e5e5e5";
const TEXT_DIM = "#aaa";
const TEXT_DIMMER = "#888";
const BG_PANEL = "#0d0d10";
const BORDER = "#222";

export const metadata: Metadata = {
  title: "Lane 1 — First Contact — Learn — monogate.dev",
  description:
    "First Contact: your first Lean 4 proofs. Definitions, rfl, term-mode proofs. Powered by PETAL.",
};

export default function Lane1Page() {
  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px 120px" }}>
      <header style={{ marginBottom: 48 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: ACCENT,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginBottom: 8,
            fontFamily: "monospace",
          }}
        >
          <a
            href="/learn"
            style={{ color: ACCENT, textDecoration: "none" }}
          >
            ← Back to lanes
          </a>
          {"  ·  "}Lane 1 of 6
        </div>
        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          {LANE_DESCRIPTIONS[1].title}
        </h1>
        <p style={{ fontSize: "1.05rem", color: TEXT_DIM, lineHeight: 1.6 }}>
          {LANE_DESCRIPTIONS[1].subtitle} {lane1Records.length} theorems.
        </p>
      </header>

      <PetalLab theoremIds={lane1TheoremIds} />

      {lane1Records.map((rec, idx) => (
        <RecordCard key={rec.theorem_id} record={rec} index={idx} total={lane1Records.length} />
      ))}

      <footer
        style={{
          marginTop: 32,
          padding: 32,
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          background: BG_PANEL,
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: 8 }}>
          Try Lane 2 →
        </h3>
        <p style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 16 }}>
          Once you&apos;ve completed Lane 1, Lane 2 introduces composition and
          the <code>simp [..]</code> tactic. (Lane 2 walk-through: coming soon.)
        </p>
        <a
          href="/learn"
          style={{
            display: "inline-block",
            padding: "8px 18px",
            border: `1px solid ${ACCENT}`,
            borderRadius: 6,
            color: ACCENT,
            textDecoration: "none",
            fontSize: 13,
            fontFamily: "monospace",
          }}
        >
          ← All lanes
        </a>
      </footer>
    </main>
  );
}

function RecordCard({
  record,
  index,
  total,
}: {
  record: PetalRecord;
  index: number;
  total: number;
}) {
  return (
    <article
      style={{
        marginBottom: 48,
        padding: 32,
        borderRadius: 12,
        border: `1px solid ${ACCENT_DIM}`,
        background: BG_PANEL,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_DIMMER,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
          fontFamily: "monospace",
        }}
      >
        Theorem {index + 1} of {total} · difficulty {record.difficulty} · {record.domain}
      </div>
      <h2
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "#fff",
          marginBottom: 24,
          fontFamily: "monospace",
        }}
      >
        {record.theorem_id}
      </h2>

      <Section title="Statement (natural language)">
        <p style={{ fontSize: 15, color: TEXT, lineHeight: 1.7 }}>
          {record.statement.natural_language}
        </p>
      </Section>

      <Section title="Statement (Lean 4)">
        <CodeBlock>{record.statement.lean4}</CodeBlock>
      </Section>

      <Section title="Proof (Lean 4)">
        <CodeBlock>{record.proof.lean4_full}</CodeBlock>
      </Section>

      <Section title={`Walk-through (${record.proof.lean4_step_by_step.length} step${record.proof.lean4_step_by_step.length === 1 ? "" : "s"})`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {record.proof.lean4_step_by_step.map((step) => (
            <div
              key={step.step}
              style={{
                padding: "16px 20px",
                borderLeft: `2px solid ${ACCENT}`,
                background: "#08080a",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: ACCENT,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontFamily: "monospace",
                }}
              >
                Step {step.step}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  color: "#fff",
                  background: "#0a0a0c",
                  padding: "8px 12px",
                  borderRadius: 4,
                  marginBottom: 12,
                  overflowX: "auto",
                }}
              >
                {step.tactic}
              </div>
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, marginBottom: 10 }}>
                {step.explanation}
              </p>
              <details style={{ fontSize: 13, color: TEXT_DIM }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: TEXT_DIMMER,
                    fontSize: 11,
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    userSelect: "none",
                  }}
                >
                  Why this tactic?
                </summary>
                <p style={{ marginTop: 8, lineHeight: 1.6 }}>{step.tactic_rationale}</p>
              </details>
              {step.common_mistakes.length > 0 && (
                <details style={{ fontSize: 13, color: TEXT_DIM, marginTop: 8 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: "#d97777",
                      fontSize: 11,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      userSelect: "none",
                    }}
                  >
                    Common mistakes ({step.common_mistakes.length})
                  </summary>
                  <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.6 }}>
                    {step.common_mistakes.map((m, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>{m}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <a
          href={ghLink(record.source.file, record.source.line)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "6px 14px",
            border: `1px solid ${ACCENT}`,
            borderRadius: 5,
            color: ACCENT,
            textDecoration: "none",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        >
          View source · {record.source.file}:{record.source.line} ↗
        </a>
        {record.dependencies.length > 0 && (
          <span style={{ fontSize: 11, color: TEXT_DIMMER, alignSelf: "center", fontFamily: "monospace" }}>
            depends on: {record.dependencies.join(", ")}
          </span>
        )}
      </div>

      <TheoremActions
        theoremId={record.theorem_id}
        canonicalProof={record.proof.lean4_full}
      />
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_DIMMER,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 10,
          fontFamily: "monospace",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: "monospace",
        fontSize: 13,
        color: "#fff",
        background: "#08080a",
        border: "1px solid #1a1a1d",
        padding: "16px 20px",
        borderRadius: 6,
        overflowX: "auto",
        lineHeight: 1.55,
        margin: 0,
      }}
    >
      <code>{children}</code>
    </pre>
  );
}
