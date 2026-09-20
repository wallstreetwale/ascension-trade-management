# Ascension Trade-Management Policy

**Status:** `SHADOW_ONLY` · not ratified · not deployed · imported by nothing.

This repository holds a versioned declaration of two trade-management policies
and the state vocabulary a policy study may use, plus pure validation over them.
It does not execute, observe, or change anything.

```
node config/tradeManagementPolicies.selftest.js     →  84 checks, 0 failed

sha256sum config/*.js
cff42c11276bf9df157e0244d59e9f452538582dc0531d2c8f0cc7f042898502  tradeManagementPolicies.js
e004569f2c95eec8f70f4c191871b2762e64efd646cdd4a4a5e71320147a2806  tradeManagementPolicies.selftest.js
```

**Check the hashes, not the check count.** An earlier generation of these files
runs cleanly and reports **76 passed, 0 failed** — no error, no warning, nothing
to notice. It is missing section 7c, the frozen-baseline pin, which is the
control that refuses a baseline rewritten into a cleaner policy. A passing run
is not evidence you have the right file.

---

## What this is

Two named policies, declared as data:

```
ASCENSION_MODEL_1PCT_25_50_25_V1
  the proposed staged policy — 25% of ORIGINAL at TP1, 50% at TP2, 25% at TP3,
  with the runner stop moved to TP1 at the TP2 milestone, unconditionally

BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1
  what the deployed Scanner does today — model stop tracking, no partial closes,
  and the runner stop moved to TP1 only when an actionable bias flip occurs
```

## What this is not

```
not a cost model              not a spread, commission, slippage or swap model
not an equity model           not a percentage-return or compounding calculator
not a broker executor         not a performance-reporting system
not a live partial-close      not a stop-amendment mechanism
not an autonomous agent       not a source of any performance claim
```

The module contains **zero `require()` calls**. It imports nothing, references
no `entryLatch`, calls no lifecycle function, and every export is deeply frozen.
It cannot affect anything, because there is nothing in it but data and functions
over that data.

Phase C is R-multiple only. `initialRiskPct` is `null` by construction and
`netModelR` is permanently unavailable in this phase — recorded as a stated
reason, never as a zero.

---

## The baseline is a record, not a design

`BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1` mirrors deployed
Scanner source read on 2026-09-18:

```
index.js  9a4863e1472ca0dca67f42c9f595e12eb4c0c7f3b54fb2de99e79262cd8e5571

711   applyTp1Mutation
731   applyStopMove(pair, latch.tpsl.entry, 'tp1_breakeven')
747   applyTp2Mutation — contains NO applyStopMove call
4609  A5 P1 branch, condition `_flipActionable && postTP2Runner`
4630  applyStopMove(pair, _r.tpsl.tp1, 'a5p1_secure_tp1')
```

**It may only change when the source it mirrors changes.** The validator pins it
— `E_BASELINE_TP2_MILESTONE_SEMANTICS`, `E_BASELINE_A5_P1_RULE_COUNT`,
`E_BASELINE_A5_P1_SEMANTICS`, `E_BASELINE_TP1_LOCK_EVIDENCE` — so a "tidier"
baseline that claims an unconditional TP2 milestone lock is refused rather than
accepted. An earlier draft of this file made exactly that mistake, and
`E_MILESTONE_TRANSITION_CONDITIONAL` exists to catch it.

---

## Why it lives here and not in the Scanner repo

`config/` eventually belongs in the Scanner repository at the same relative
path, so the move is a straight copy with no import rewrites.

It is here because:

- putting it there is a Scanner change and needs a RULE-01 record — see
  `RULE01-H13-shadow-policy-representation.md`;
- a Scanner deploy would invalidate the deployment-identity evidence captured
  on 2026-09-18, which is the only artifact correspondence available while CI
  access is unavailable;
- the study this configures has not been preregistered.

---

## Layout

```
config/
  tradeManagementPolicies.js            the declaration and its validator
  tradeManagementPolicies.selftest.js   84 checks, no framework, no dependencies
```

Node 18+. No dependencies, no `package.json`, nothing to install.

---

## What the self-test proves

```
1   the module is inert — no imports, no entryLatch, no lifecycle calls, frozen
2   both named policies validate
3   payoffs are DERIVED from allocations and targets, not asserted separately
4   the baseline records flip-conditional TP2 behaviour
5   the joint intervention is declared, not implied
6   the paired-difference spec matches the payoff tables
7   the validator refuses mistakes this project has already made once
7b  terminal evidence must be exact — a Rule A trail cannot stand in for a TP2 lock
7c  the frozen baseline cannot be rewritten into a cleaner policy
8   malformed input fails closed and never mutates its input
9   governance facts are carried in code, not in memory
```

Section 3 matters most: if someone edits an allocation, the payoff table stops
matching and the test fails. The arithmetic cannot drift away from the policy.

---

## The intervention changes two things

```
1  ALLOCATION    25% / 50% / 25% of ORIGINAL quantity
2  STOP TIMING   runner stop to TP1 at the TP2 milestone, unconditionally —
                 the baseline does this only on an actionable bias flip
```

**A positive study result would not be attributable to either change alone.**
The first study is declared a joint intervention for that reason
(`FIRST_STUDY.isJointIntervention`). Decomposition requires a separate
preregistered study.

Neighbouring allocations — 33/33/33, 50/25/25, 25/25/50 — are predeclared
descriptive sensitivity arms. **They cannot be promoted from the same study.**

---

## Related artifacts

Not in this repository; held with the project's governance records.

```
H12   this module — done
H13   shadow representation — RULE-01 record prepared, NOT executable
H2    eligible cohort definition — draft, not seal-ready
H16   preregistration — blocked
H22b  policy-grade stop-transition classification — open
H59   flip-history availability — unmeasured, and it decides the study's
      effect size, variance and sample requirement
```

---

## Standing constraints

```
no performance claim exists or is sought
Scanner-model evidence is not broker-reconciled performance
the null hypothesis is admissible — a clean rejection is a successful result
this configuration may not be deployed without a RULE-01 record
```
