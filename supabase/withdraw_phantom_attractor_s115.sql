-- Withdraw the phantom-attractor-identity challenge.
-- Run in Supabase SQL editor.
-- Date: 2026-04-27 LATE
--
-- Reason: cannot reproduce alpha = 6.21444185... at any node of
-- the published EMLTree(depth=3) targeting pi. 22 probes (10
-- deterministic init=1.0 + 12 random init U[0.8, 1.2]) all
-- converge to the 3.169642 phantom but no internal-node value
-- lands within 0.5 of alpha. The original experimental fixture
-- that claimed "appears in 60%+ of depth-3 runs" is undocumented;
-- without it, the PSLQ target number is not reproducible.
--
-- Findings: monogate-research/exploration/alpha-6.214-recheck-2026-04-27/FINDINGS.md
-- Audit log: monogate-research/data/audit_log.md (entry under 2026-04-27 LATE)
--
-- Reopen condition: an experimental fixture (script + seed +
-- training setup) that reproducibly yields alpha = 6.21444... at
-- the documented frequency. Until then this challenge is parked.

UPDATE challenges
SET
  status         = 'withdrawn',
  result_summary = 'Withdrawn pending reproducibility verification. The claim that alpha = 6.21444185... appears in 60%+ of depth-3 EML training runs targeting pi cannot be reproduced under the published EMLTree(depth=3) setup (22 probes: 10 deterministic init=1.0, 12 random init U[0.8, 1.2]). The original experimental fixture is undocumented. Findings: monogate-research/exploration/alpha-6.214-recheck-2026-04-27/. The challenge will be reopened if/when the fixture is identified.',
  proof_reference = NULL,
  proof_link      = NULL
WHERE id = 'phantom-attractor-identity';
