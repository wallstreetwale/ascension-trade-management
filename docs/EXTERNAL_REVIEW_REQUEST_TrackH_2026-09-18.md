# External Review Request — Track H Trade-Management Policy Study

**Date:** 2026-09-18
**Requested by:** Ascension, single operator
**Subject:** `ASCENSION_MODEL_1PCT_25_50_25_V1` · `SHADOW_ONLY` · study design
**Response wanted:** challenge to the findings in §3, answers to §4

---

## 0. Note on this reviewer's provenance

Earlier reviews in this workstream were AI-generated reasoning support. Under
the operating model that is explicitly **not independent factual corroboration**
— AI reasoning may be adopted after checking; AI factual premises may not be
treated as verified because they were stated confidently.

Three times in this project, a confident external review asserted a checkable
fact that turned out not to be in the source material: a Markdown handoff that
was a `.docx`, Ledger ingest records described as flagged, and a `~*` ACL key
pattern. Each control was adopted; each premise was declined.

**If this package goes to an AI reviewer, that rule applies again.** What is most
wanted here is challenge to the *reasoning* in §3 — particularly the arithmetic,
which is checkable in a spreadsheet and does not require trusting anyone.

**If a human with derivatives or systematic-trading experience is available, that
is materially more valuable**, specifically on §4 Q1 and Q3.

---

## 1. What is being reviewed

The **design** of a shadow policy study. Not code — none is written. Not
performance — none is claimed.

The study asks whether a staged partial-exit policy improves Scanner-model
outcomes relative to the current behavior.

### 1.1 What the Scanner does today — the baseline

The Scanner tracks stop state in its own model. At TP1 it records the model stop
at breakeven; at TP2 it records it at TP1. **It closes no portion of the
position, is not connected to a broker, and does not affect any customer's
trade.** It emits alerts to subscribers.

```
BASELINE_MODEL_STOPS_ONLY_V1        100% carried to whichever stop terminates

  initial stop before TP1                          -1.00R
  TP1 hit, model stop to breakeven, price returns   0.00R
  TP2 hit, model stop to TP1, price returns        +1.00R
  TP3 hit                                          +6.00R
```

### 1.2 The proposed policy

```
ASCENSION_MODEL_1PCT_25_50_25_V1    allocations ALWAYS of ORIGINAL quantity

  TP1 = +1R   close 25% of original,  move stop on remaining 75% to breakeven
  TP2 = +3R   close 50% of original,  move stop on remaining 25% to TP1
  TP3 = +6R   close final 25% of original

  initial stop before TP1                          -1.00R
  TP1, remainder closes at breakeven    0.25(+1) + 0.75(0)              = +0.25R
  TP1+TP2, runner closes at TP1         0.25(+1) + 0.50(+3) + 0.25(+1)  = +2.00R
  TP1+TP2+TP3                           0.25(+1) + 0.50(+3) + 0.25(+6)  = +3.25R
```

Study unit is R-multiple per original trade. Phase C models no account equity, no
percentage return, no compounding, no spread, commission, slippage or swap, and
no broker fills. Those are deferred to later phases by deliberate scope decision.

---

## 2. Scope of the review

**In scope:** the study design, the arithmetic, the discriminating-metric
problem, the state-machine completeness, and the treatment of unknowns.

**Out of scope, by the operator's decision — please do not spend time here:**
cost models, execution-leg counts, spread or commission analysis, account-equity
compounding, Monte Carlo over assumed win rates, broker integration, and any
performance claim. These are recorded as deferred Phase E/F work.

---

## 3. Findings requiring challenge

### 3.1 The assumed distribution is the exact indifference point

This is the finding most in need of a second pair of eyes.

The blueprint's planning distribution is 8 stops / 6 breakeven / 4 TP1-locked /
2 TP3 across 20 trades. Under both policies:

```
staged    8(-1.00) + 6(+0.25) + 4(+2.00) + 2(+3.25)  =  +8.00R
baseline  8(-1.00) + 6( 0.00) + 4(+1.00) + 2(+6.00)  =  +8.00R
```

Identical. The per-path advantage of staged over baseline is `+0.25R`, `+1.00R`
and `−2.75R`, and at 6/4/2 those cancel exactly:

```
0.25(6) + 1.00(4) = 5.50 = 2.75(2)
```

**TP3 frequency is the sole discriminator:**

| TP3 per 20 | staged | baseline | winner |
|---:|---:|---:|---|
| 0 | +3.75R | −3.00R | staged |
| 1 | +5.00R | +2.00R | staged |
| **2** | **+8.00R** | **+8.00R** | **tie — the assumed distribution** |
| 3 | +11.00R | +14.00R | baseline |
| 4 | +12.25R | +19.00R | baseline |
| 6 | +16.50R | +30.00R | baseline |

**Consequence:** a study preregistered as a total-R comparison, run at anything
near the assumed distribution, returns "no difference" and answers nothing.

**Challenge wanted:** is this arithmetic right, and is the conclusion — that a
total-R comparison is the wrong primary metric — correct?

### 3.2 The real question is a variance trade, not a returns question

If 3.1 holds, the staged policy converts tail outcomes into consistency. It wins
the two middle paths and gives up 2.75R on every TP3.

**Challenge wanted:** what is the right primary metric for that? Candidates
considered — outcome variance, maximum drawdown depth, the shape of the loss
distribution, TP3 frequency measured directly as the deciding variable. None is
obviously correct, and the choice must be preregistered before results are seen.

### 3.3 `stopMoveActuallyApplied` defaults to unknown

Until the model's stop-state transition is established per trade, every
TP1-and-reverse record classifies `POLICY_STATE_AMBIGUOUS` rather than +0.25R.

A stop-move failure is treated as a **lifecycle control exception**, not an
alternative policy payoff path. An earlier proposal to add −0.50R and +1.50R as
standard outcomes was rejected on the grounds that it would normalize a defect
into the payoff model.

**Challenge wanted:** is that the right call, or does refusing to model the
failure mode hide something a study should measure?

### 3.4 State-machine completeness

Explicit handling exists for `GAP_THROUGH_TARGETS`, `GAP_THROUGH_STOP`,
`POLICY_STATE_AMBIGUOUS`, `CLOSED_POLICY_EXCEPTION`, `CLOSED_MANUAL_EXIT`,
`CLOSED_INVALIDATION`. `CLOSED_POLICY_EXCEPTION` carries `grossModelR: null`.

The governing invariant: **no unknown event order, missing quantity, or uncertain
stop state may become a positive R result.**

**Challenge wanted:** what path is still missing?

---

## 4. Questions

**Q1 · Discriminating metric.** Given 3.1, what should the study's preregistered
primary metric be? A concrete recommendation is more useful than a list of
options.

**Q2 · Sample threshold.** How many completed trades before a retain / reject
conclusion is defensible, given the outcome distribution is four-valued and the
deciding category (TP3) is the rarest?

**Q3 · Allocation shape.** 25/50/25 of original is asserted as the design target,
not derived. Is there a reason to expect it dominates neighbours — 33/33/33,
50/25/25, 25/25/50 — or should the study compare several allocations rather than
one against the baseline?

**Q4 · Null hypothesis.** *"The staged allocation model does not improve
Scanner-model outcomes or downside characteristics relative to
stop-tracking-without-partials."* Is that correctly specified and falsifiable as
written?

**Q5 · Anything in §3 that is simply wrong.**

---

## 5. Artifacts

```
6f963603868233c6  TRADE_MANAGEMENT_BLUEPRINT_REVIEW_2026-09-18.md
c39048527cafa979  TRADE_MANAGEMENT_POLICY_STUDY_INTEGRATION_2026-09-18.md
6c78a9ac0a4c266a  TRACK_H_SCOPE_RESET_2026-09-18.md
cd0a2b6e99889bdf  H7_H1_SOURCE_READING_WORKSHEET.md
e7fb7a4bd22f8b7d  OPEN_ITEMS_REGISTER.md          (track H section)

source:
f1791ce9ec261b57  trade-management-blueprint.docx
0e5a77efb2d34ff6  Ascension_New_Agent_Handoff_Updated.docx
```

Send §1–§4 alone for a focused review. Include the artifacts for a full one.

---

## 6. Constraints a reviewer should know

```
Single operator. No second engineer today.
No broker connection. No execution. No customer position is affected.
No performance claim exists or is sought.
Scanner-model evidence is not broker-reconciled performance.
Track A (evidence custody) is the critical path; this study may be built in
  parallel but may not be promoted or externally claimed before it completes.
The null hypothesis is admissible. A clean rejection is a valid, successful
  outcome and should be recommended if the evidence supports it.
```

**That last line is meant literally.** A reviewer who concludes the staged policy
is not worth building has delivered the most valuable possible result, and should
say so plainly.
