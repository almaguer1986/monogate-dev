"use client";

/**
 * PETAL Lab — client-side interactive layer for Lane 1.
 *
 * Connects to a running PETAL API (default http://localhost:8000)
 * and lets visitors:
 *   1. Set their agent_id (persisted in localStorage)
 *   2. Toggle per-theorem completion (persisted in localStorage)
 *   3. Log attempts (POST /api/petal/attempt)
 *   4. Submit solutions (POST /api/petal/solved)
 *   5. Pull live failure data per theorem (GET /api/petal/mistakes/{tid})
 *
 * No build step — pure React + fetch. Works against either localhost
 * or any deployed PETAL API. The API URL is configurable per visitor.
 */

import { useEffect, useMemo, useRef, useState } from "react";

type Health = {
  status: string;
  dataset_version?: string;
  records?: number;
  lanes?: number[];
  attempts_logged?: number;
};

type Mistake = {
  tactic_tried?: string;
  tactic?: string;
  error_message?: string;
  why_it_fails?: string;
  contributed_by?: string;
  timestamp?: string;
};

type AgentFailure = {
  theorem_id: string;
  agent_id: string;
  tactics_tried: string[];
  error_message?: string;
  result: string;
  timestamp?: string;
};

type MistakesResp = {
  theorem_id: string;
  common_mistakes: Mistake[];
  failed_tactics: string[];
  agent_reported_failures: AgentFailure[];
};

const STORAGE_KEY = "petal-lab-v1";
const DEFAULT_API = "http://localhost:8000";

const ACCENT = "#06B6D4";
const ACCENT_DIM = "#06B6D440";
const GREEN = "#5ec47a";
const ORANGE = "#e8a020";
const RED = "#e05060";
const TEXT = "#e5e5e5";
const TEXT_DIM = "#aaa";
const TEXT_DIMMER = "#777";
const BG_PANEL = "#0d0d10";
const BORDER = "#222";

type LabState = {
  apiUrl: string;
  agentId: string;
  completed: string[];
};

function loadState(): LabState {
  if (typeof window === "undefined") {
    return { apiUrl: DEFAULT_API, agentId: "", completed: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LabState>;
      return {
        apiUrl: parsed.apiUrl || DEFAULT_API,
        agentId: parsed.agentId || "",
        completed: parsed.completed || [],
      };
    }
  } catch {
    // ignore
  }
  return { apiUrl: DEFAULT_API, agentId: "", completed: [] };
}

function saveState(state: LabState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function generateAgentId(): string {
  const ts = new Date().toISOString().slice(0, 10);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `petal-lab-${ts}-${rnd}`;
}

export function PetalLab({
  theoremIds,
}: {
  theoremIds: string[];
}) {
  const [state, setState] = useState<LabState>(() => loadState());
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string>("");
  const [healthChecking, setHealthChecking] = useState(false);

  const total = theoremIds.length;
  const done = state.completed.filter((id) => theoremIds.includes(id)).length;

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-health-check on apiUrl change (debounced)
  const healthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (healthTimer.current) clearTimeout(healthTimer.current);
    healthTimer.current = setTimeout(() => {
      checkHealth();
    }, 200);
    return () => {
      if (healthTimer.current) clearTimeout(healthTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.apiUrl]);

  async function checkHealth() {
    if (!state.apiUrl) return;
    setHealthChecking(true);
    setHealthError("");
    try {
      const r = await fetch(state.apiUrl.replace(/\/+$/, "") + "/api/petal/health");
      if (!r.ok) {
        setHealth(null);
        setHealthError(`HTTP ${r.status}`);
      } else {
        const body = (await r.json()) as Health;
        setHealth(body);
      }
    } catch (e) {
      setHealth(null);
      setHealthError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setHealthChecking(false);
    }
  }

  function setApiUrl(url: string) {
    setState((s) => ({ ...s, apiUrl: url }));
  }
  function setAgentId(id: string) {
    setState((s) => ({ ...s, agentId: id }));
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: BG_PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 24,
        fontSize: 11,
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            color: ACCENT,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          PETAL Lab
        </span>

        <HealthBadge
          health={health}
          error={healthError}
          checking={healthChecking}
        />

        <span style={{ color: TEXT_DIM }}>
          Progress:{" "}
          <span style={{ color: done > 0 ? GREEN : TEXT_DIMMER }}>
            {done}/{total}
          </span>
        </span>

        <details style={{ flex: 1 }}>
          <summary
            style={{
              cursor: "pointer",
              color: TEXT_DIMMER,
              userSelect: "none",
            }}
          >
            settings
          </summary>
          <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ flex: "1 1 240px" }}>
              <span style={{ display: "block", color: TEXT_DIMMER, marginBottom: 3 }}>
                API URL
              </span>
              <input
                type="text"
                value={state.apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                style={inputStyle}
                placeholder={DEFAULT_API}
              />
            </label>
            <label style={{ flex: "2 1 320px" }}>
              <span style={{ display: "block", color: TEXT_DIMMER, marginBottom: 3 }}>
                agent_id (used for attempts + CapCard)
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={state.agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="petal-lab-..."
                />
                <button
                  type="button"
                  onClick={() => setAgentId(generateAgentId())}
                  style={btnStyle()}
                >
                  generate
                </button>
              </div>
            </label>
            <label style={{ flex: "0 0 auto", alignSelf: "flex-end" }}>
              <button type="button" onClick={checkHealth} style={btnStyle()}>
                check API
              </button>
            </label>
          </div>
          {healthError && (
            <div style={{ marginTop: 8, color: RED }}>
              error: {healthError} (running uvicorn?)
            </div>
          )}
        </details>
      </div>
    </div>
  );
}

function HealthBadge({
  health,
  error,
  checking,
}: {
  health: Health | null;
  error: string;
  checking: boolean;
}) {
  let color = TEXT_DIMMER;
  let label = "—";
  if (checking) {
    color = ORANGE;
    label = "checking…";
  } else if (health) {
    color = GREEN;
    label = `ok · v${health.dataset_version} · ${health.records} records · ${health.attempts_logged ?? 0} attempts`;
  } else if (error) {
    color = RED;
    label = "down";
  }
  return (
    <span
      style={{
        padding: "2px 8px",
        border: `1px solid ${color}`,
        background: color + "1A",
        color,
        borderRadius: 3,
      }}
    >
      API {label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${BORDER}`,
  color: TEXT,
  padding: "5px 8px",
  borderRadius: 4,
  fontFamily: "monospace",
  fontSize: 11,
  width: "100%",
  boxSizing: "border-box",
};

function btnStyle(variant: "default" | "solved" | "failed" = "default"): React.CSSProperties {
  const c =
    variant === "solved" ? GREEN : variant === "failed" ? RED : ACCENT;
  return {
    padding: "5px 10px",
    border: `1px solid ${c}`,
    background: c + "1A",
    color: c,
    fontFamily: "monospace",
    fontSize: 11,
    borderRadius: 4,
    cursor: "pointer",
  };
}

/**
 * Per-theorem interactive widget. Drop it into each theorem card.
 * Reads agent_id + apiUrl from localStorage (same key as PetalLab).
 *
 * Renders:
 *   - "Mark complete" toggle (localStorage-only — UI tracking)
 *   - "Log attempt" expandable form (POSTs to /api/petal/attempt)
 *   - "Live failures" panel (GETs /api/petal/mistakes/{tid})
 */
export function TheoremActions({
  theoremId,
  canonicalProof,
}: {
  theoremId: string;
  canonicalProof?: string;
}) {
  const [state, setState] = useState<LabState>(() => loadState());
  const [open, setOpen] = useState<"none" | "attempt" | "failures">("none");
  const [tactics, setTactics] = useState<string>("");
  const [proof, setProof] = useState<string>("");
  const [errMsg, setErrMsg] = useState<string>("");
  const [why, setWhy] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<{
    kind: "ok" | "err" | "";
    msg: string;
  }>({ kind: "", msg: "" });
  const [failures, setFailures] = useState<MistakesResp | null>(null);
  const [failError, setFailError] = useState("");

  const isDone = state.completed.includes(theoremId);

  // Sync state on mount + when localStorage changes (cross-tab)
  useEffect(() => {
    function onStorage() {
      setState(loadState());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleDone() {
    const next = isDone
      ? state.completed.filter((id) => id !== theoremId)
      : [...state.completed, theoremId];
    const newState = { ...state, completed: next };
    saveState(newState);
    setState(newState);
  }

  async function postAttempt(result: "solved" | "failed") {
    if (!state.agentId) {
      setPostStatus({
        kind: "err",
        msg: "Set agent_id in PETAL Lab settings first.",
      });
      return;
    }
    setPosting(true);
    setPostStatus({ kind: "", msg: "" });
    try {
      const r = await fetch(
        state.apiUrl.replace(/\/+$/, "") + "/api/petal/attempt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theorem_id: theoremId,
            agent_id: state.agentId,
            tactics_tried: tactics
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            result,
            proof_text: proof || null,
            error_message: errMsg || null,
            failure_reason: why || null,
            lane: 1,
          }),
        }
      );
      if (!r.ok) {
        const body = await r.text();
        setPostStatus({ kind: "err", msg: `HTTP ${r.status}: ${body.slice(0, 200)}` });
      } else {
        const body = (await r.json()) as { total_attempts?: number };
        setPostStatus({
          kind: "ok",
          msg: `logged · total attempts: ${body.total_attempts ?? "?"}`,
        });
        if (result === "solved") {
          // Auto-mark complete on success
          if (!isDone) toggleDone();
        }
      }
    } catch (e) {
      setPostStatus({
        kind: "err",
        msg: e instanceof Error ? e.message : "fetch failed",
      });
    } finally {
      setPosting(false);
    }
  }

  async function loadFailures() {
    setFailError("");
    try {
      const r = await fetch(
        state.apiUrl.replace(/\/+$/, "") +
          "/api/petal/mistakes/" +
          encodeURIComponent(theoremId)
      );
      if (!r.ok) {
        setFailError(`HTTP ${r.status}`);
        return;
      }
      const body = (await r.json()) as MistakesResp;
      setFailures(body);
    } catch (e) {
      setFailError(e instanceof Error ? e.message : "fetch failed");
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${BORDER}` }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={toggleDone}
          style={btnStyle(isDone ? "solved" : "default")}
        >
          {isDone ? "✓ done" : "○ mark done"}
        </button>
        <button
          onClick={() => {
            setOpen(open === "attempt" ? "none" : "attempt");
            if (proof === "" && canonicalProof) setProof(canonicalProof);
          }}
          style={btnStyle()}
        >
          {open === "attempt" ? "▼" : "▶"} log attempt
        </button>
        <button
          onClick={() => {
            setOpen(open === "failures" ? "none" : "failures");
            if (open !== "failures") loadFailures();
          }}
          style={btnStyle()}
        >
          {open === "failures" ? "▼" : "▶"} live failures
        </button>
      </div>

      {open === "attempt" && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          <label>
            <div style={{ color: TEXT_DIMMER, marginBottom: 3 }}>tactics_tried (comma-sep)</div>
            <input
              type="text"
              value={tactics}
              onChange={(e) => setTactics(e.target.value)}
              placeholder="rfl"
              style={inputStyle}
            />
          </label>
          <label>
            <div style={{ color: TEXT_DIMMER, margin: "8px 0 3px" }}>proof_text (if solved)</div>
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={3}
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            />
          </label>
          <label>
            <div style={{ color: TEXT_DIMMER, margin: "8px 0 3px" }}>error_message (if failed)</div>
            <input
              type="text"
              value={errMsg}
              onChange={(e) => setErrMsg(e.target.value)}
              placeholder="optional"
              style={inputStyle}
            />
          </label>
          <label>
            <div style={{ color: TEXT_DIMMER, margin: "8px 0 3px" }}>why_it_fails (optional but valuable)</div>
            <input
              type="text"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="e.g. linarith can't handle exp(x)"
              style={inputStyle}
            />
          </label>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => postAttempt("solved")}
              disabled={posting}
              style={btnStyle("solved")}
            >
              POST result=solved
            </button>
            <button
              onClick={() => postAttempt("failed")}
              disabled={posting}
              style={btnStyle("failed")}
            >
              POST result=failed
            </button>
            {posting && <span style={{ color: TEXT_DIMMER, fontSize: 11 }}>posting…</span>}
          </div>
          {postStatus.msg && (
            <div
              style={{
                marginTop: 8,
                color: postStatus.kind === "ok" ? GREEN : RED,
              }}
            >
              {postStatus.msg}
            </div>
          )}
        </div>
      )}

      {open === "failures" && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 11,
          }}
        >
          {failError && <div style={{ color: RED }}>error: {failError}</div>}
          {!failures && !failError && <div style={{ color: TEXT_DIMMER }}>loading…</div>}
          {failures && (
            <div>
              <div style={{ color: TEXT_DIMMER, marginBottom: 8 }}>
                <strong>{failures.common_mistakes.length}</strong> documented mistakes ·{" "}
                <strong>{failures.agent_reported_failures.length}</strong> live agent failures
              </div>
              {failures.agent_reported_failures.length > 0 && (
                <div>
                  <div style={{ color: ORANGE, fontWeight: 700, marginBottom: 4 }}>
                    Agent failures (live data):
                  </div>
                  <ul style={{ paddingLeft: 18, color: TEXT_DIM }}>
                    {failures.agent_reported_failures.slice(0, 10).map((f, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <span style={{ color: ACCENT }}>{f.agent_id}</span>:{" "}
                        tried <code style={{ color: TEXT }}>{f.tactics_tried.join(" ; ")}</code>
                        {f.error_message && (
                          <>
                            {" "}— <span style={{ color: RED }}>{f.error_message}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
