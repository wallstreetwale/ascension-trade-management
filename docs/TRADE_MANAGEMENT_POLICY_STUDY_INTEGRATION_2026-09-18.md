# Trade-Management Policy Study — Integration and Governance

**Date:** 2026-09-18
**Policy:** `ASCENSION_MODEL_1PCT_25_50_25_V1` · status `SHADOW_ONLY`
**Sources:** `trade-management-blueprint.docx` (`f1791ce9ec261b57…`) and the
supplied policy-study specification
**Status:** Mapping and governance. **No code written. No ticket issued** — see §7.

---

## 1. Integration decision

**Accepted as a formal workstream**, under the controlling decision as written:
no separate autonomous Trade Management Agent, no broker execution, no parallel
mutable trade state. `entryLatch` remains canonical; the policy module extends
the existing boundaries rather than competing with them.

Registered as **track H** in the Open Items Register. Track G (blueprint
findings) stays separate — G is *what the numbers say*, H is *what gets built*.

### 1.1 Why this is strategically significant, stated precisely

The specification frames this as the first complete Scanner-model policy-learning
loop. That is correct, and it is worth being exact about why: **it is the first
workstream in this project that would produce a decision, rather than a control
that permits a decision.**

Everything built so far — runbook, RULE-01, the experiment validator,
`w4collect` — is machinery for establishing that facts are trustworthy. This is
the first thing that *consumes* trustworthy facts to answer a question. The null
hypothesis being admissible, and a clean rejection being a valid result, is what
makes it research rather than justification.

### 1.2 Four design findings that should be resolved before Phase C begins

**H-F1 · Percentage accounting cannot work in shadow mode.**

The proposed schema carries `initialRiskPct: 0.01` and
`riskBasis: 'CURRENT_EQUITY'` while `mode: 'SHADOW_ONLY'` and
`executionAuthority: 'scanner_virtual'`. **There is no account, so there is no
current equity.** Any percentage figure would require an invented equity curve,
and an equity curve requires an assumed trade *sequence* — which reintroduces
exactly the sequence-blindness recorded as G3.

**Recommendation: compute in R only for the whole of Phase C.** Set
`initialRiskPct: null` and `riskBasis: 'R_ONLY_NO_EQUITY_BASIS'`. Percentage and
compounding belong in Phase E, where portfolio-level controls and a declared
equity model exist. This also keeps the policy's own rule — *"report
Scanner-model results separately from broker-reconciled performance"* — from
being quietly undermined by a percentage that looks like an account return.

**H-F2 · `RECONCILIATION_REQUIRED` collides with an existing status.**

The Operations surface already uses **RECONCILIATION REQUIRED** for the Packet 4
Scanner/SRGA semantic conflict. Two different meanings, one string, in the same
system. That is the cross-repository semantic drift the shared-contract
discipline exists to prevent, and it would be introduced deliberately.

**Recommendation: rename to `POLICY_STATE_AMBIGUOUS`,** with
`CLOSED_POLICY_EXCEPTION` as its terminal. Cheap now; expensive once it is in
persisted records.

**H-F3 · The state machine has no gap-through path.**

The rules require TP2 confirmed before TP3, and TP1 before TP2. On a weekend gap
or a news spike, price can traverse TP1, TP2 and TP3 between two observations, or
gap *through* the initial stop. The machine has no way to express either.

Unhandled, a gap-through resolves one of two ways, and both are wrong: it is
refused as an invalid transition and lands in the ambiguity state, or it is
processed sequentially at target prices that were never available. **The second
is the dangerous one — it silently becomes a favorable result**, which the
specification's own rules forbid.

**Recommendation: add explicit handling.**

```
GAP_THROUGH_TARGETS    one observation crosses two or more milestones
GAP_THROUGH_STOP       fill is worse than the stop price
```

Both must record the observed price, both must be excluded from the primary
cohort by default, and `GAP_THROUGH_STOP` must be able to produce a result worse
than −1.00R. The blueprint's −1.00R assumes a clean fill at the stop; stops slip
and targets generally do not.

**H-F4 · `netModelR` can never be computed in Phase C, and that bounds the study.**

Cost data is broker-side. In shadow mode there is no broker, and the
specification correctly states that unknown cost data does not become zero. So
`netModelR` stays `null` for the entire study.

**Consequence, which should be stated in the preregistration rather than
discovered at analysis:** Phase C can rank policies against each other on gross
model R, and it cannot establish that any policy clears the +0.25R *net*
expectancy objective. Per the track G analysis, at 0.10R per execution the
objective fails on costs alone with the win distribution fully intact — and
staged exits mean 58 executions per 20 trades, not 40.

**The study's answerable question is therefore comparative, not absolute:** does
the staged policy improve gross model outcomes and downside characteristics
relative to the frozen baseline? Whether it clears a net objective is a Phase F
question requiring broker truth.

---

## 2. Roadmap placement

The specification's phase assignment is accepted without change. What follows is
the placement relative to work already in flight.

```
PHASE A — Observation and evidence integrity          IN FLIGHT, BLOCKED
  W4 preflight 0a/0b/0c/P4 · candidate identity · custody · deployment identity
  Register track A (18 items). Gate: A5 seal decision.

PHASE B — First research                              CAN START NOW
  Baseline definition · cohort · outcome taxonomy · denominators · exclusions
  · cost treatment · data-quality limits · current TP1→TP2→TP3 conversion
  Register track H, items H1–H6.

PHASE C — Controlled experiments                      PARTIALLY PARALLEL
  ASCENSION_MODEL_1PCT_25_50_25_V1 · versioned policy config · shadow-only
  accounting · stateful replay · policy-isolated counterfactual · preregistration
  Register track H, items H7–H16.
  BUILD may run parallel to W4. CONCLUDE may not — see §4.

PHASE D — Promotion                                   GATED
  Predeclared criteria · review · rollback readiness · explicit approval
  Scanner-model lifecycle policy change only. Not broker-native execution.

PHASE E — Institutional portfolio risk                LATER
  Aggregate open risk · correlation · daily/weekly loss behavior · drawdown
  · scenario analysis · independent model performance
  Percentage and compounding accounting belongs here, not in Phase C (H-F1).

PHASE F — Broker execution integrity                  OUT OF SCOPE
  Separate architecture and approval boundary. Net expectancy lives here (H-F4).
```

**One placement correction.** The specification places the 1% risk rule in Phase
C. Per H-F1 it should not be exercised as a percentage until Phase E. Phase C
uses R-multiples only; Phase E introduces equity, sequence, and compounding
together, because they are inseparable.

---

## 3. Open Items Register — track H

Full schema as requested: ID, item, owner, status, dependencies, closure
evidence, next physical action.

### Phase B — baseline and cohort

| ID | Item | Owner | Status | Depends on | Closure evidence | Next physical action |
|---|---|---|---|---|---|---|
| H1 | **Define the frozen baseline policy.** What does the Scanner do today — single exit, different allocations, no staged exits? The comparison is meaningless without it | OPERATOR | **OPEN** | — | Written baseline spec with a version identifier and hash | Read the current exit handling in Scanner source and write it down |
| H2 | Define the compatible trade cohort — which historical candidates support the TP1/TP2/TP3 structure after costs | OPERATOR | OPEN | H1 | Cohort definition with inclusion and exclusion criteria | Draft against runbook §4.2 identity discipline |
| H3 | Define the outcome taxonomy and map it to existing categorical labels | OPERATOR | OPEN | H1 | Mapping table, old label → policy state | — |
| H4 | Define denominators and exclusions. Gap-throughs excluded by default (H-F3) | OPERATOR | OPEN | H2, H12 | Written derivation, no caller-supplied denominators | — |
| H5 | Declare data-quality limitations — what the historical record cannot answer | OPERATOR | OPEN | Track A findings | Limitations section in the preregistration | — |
| H6 | Analyze current TP1→TP2 and TP2→TP3 conversion, breakeven-return rate, runner giveback, lifecycle-failure patterns | RESEARCHER | BLOCKED | H1–H5 | Analysis with uncertainty reporting | — |

### Phase C — build

| ID | Item | Owner | Status | Depends on | Closure evidence | Next physical action |
|---|---|---|---|---|---|---|
| **H7** | **Lifecycle call-site inventory** — every caller, mutation, persistence path, notification and test for the ten named functions. Race and restart risks identified | OPERATOR | **OPEN — GATE** | — | Call-site map, reviewed, before any policy code is approved | Grep the Scanner repo for the ten symbols; record file, line, caller, and whether it mutates |
| H8 | Resolve H-F1 — R-only accounting, `initialRiskPct: null` | OPERATOR | OPEN | — | Schema decision recorded | Decision only |
| H9 | Resolve H-F2 — rename the ambiguity state | OPERATOR | OPEN | — | Schema decision recorded | Decision only |
| H10 | Resolve H-F3 — add gap-through states and allow worse-than-stop results | OPERATOR | OPEN | — | State machine revision | Decision only |
| H11 | Resolve H-F4 — record in the preregistration that `netModelR` stays null and the study is comparative | OPERATOR | OPEN | — | Preregistration scope statement | Decision only |
| H12 | `config/tradeManagementPolicies.js` — versioned policy contract, allocations sum to 1.00, target and stop-state order validated, default `SHADOW_ONLY` | ENGINEER | BLOCKED | H7–H10 | Module plus tests; change record | — |
| H13 | Shadow-only nested latch extension. **Must not create parallel mutable trade state** | ENGINEER | BLOCKED | H7, H12 | Extension plus invariant tests; RULE-01 record | — |
| H14 | Stateful lifecycle replay engine | ENGINEER | BLOCKED | H13 | Replay reproduces known lifecycles deterministically | — |
| H15 | Policy-isolated counterfactual simulation | ENGINEER | BLOCKED | H14 | Simulator writes nothing to `entryLatch`; proven by test | — |
| H16 | **Preregister** metrics, sample threshold, control/holdout method, exclusions, kill conditions — before any result is examined | GOVERNANCE | BLOCKED | H1–H11 | Sealed preregistration with external timestamp | — |

### Phase C — conclude, and Phase D

| ID | Item | Owner | Status | Depends on | Closure evidence | Next physical action |
|---|---|---|---|---|---|---|
| H17 | Run the study to the preregistered sample threshold | RESEARCHER | BLOCKED | H14–H16 | Raw results plus manifest | — |
| H18 | Critic review — event ordering, costs, sample bias, lifecycle defects, correlation blindness | CRITIC | BLOCKED | H17 | Written challenge and responses | — |
| H19 | Risk review — aggregate exposure, drawdown, loss concentration | RISK | BLOCKED | H17 | Written risk assessment | — |
| H20 | Retain / reject / promote recommendation | GOVERNANCE | BLOCKED | H17–H19 | Recommendation citing preregistered criteria | — |
| H21 | Promotion decision. **Gated on Phase A** — see §4 | OPERATOR | BLOCKED | H20, track A complete | RULE-01 change record; rollback readiness | — |

### Cross-cutting

| ID | Item | Owner | Status | Depends on | Closure evidence |
|---|---|---|---|---|---|
| H22 | **`stopMoveActuallyApplied` verification.** If the stop move was not applied, the +0.25R TP1 path may actually be −1.00R | SCANNER | **OPEN** | H7 | Observed evidence that stop moves execute, per trade |
| H23 | File the study as a proposal through the Experiment Proposal Agent | OPERATOR | BLOCKED | H16, D3 | Validator output, `readyForHumanReview: true` |
| H24 | Align the four-way performance vocabulary across blueprint, deck appendix, and policy schema | AGENT | OPEN | G4 | One vocabulary, three documents |

**H22 deserves attention out of proportion to its size.** The entire staged
policy rests on stop moves actually happening. `stopMoveActuallyApplied` is
correctly defaulted to `'unknown'` in the proposed schema — and until it is
measured, every TP1-and-reverse outcome in the historical record is
indeterminate between +0.25R and −1.00R. That is a 1.25R swing on the most
frequent winning path in the distribution.

---

## 4. Dependency graph — what runs parallel to W4, what does not

```
                    ┌─────────────────────────────────────────┐
                    │  TRACK A — W4 evidence (Phase A)        │
                    │  BLOCKED at A5 (seal decision)          │
                    └──────────────────┬──────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │ PARALLEL — no W4 dependency  │  GATED — requires W4         │
        │                              │                              │
   H7   lifecycle inventory            │   H21  promotion decision
   H8   R-only accounting decision     │   ─ any external claim about
   H9   state rename                   │     the study's results
   H10  gap-through states             │   ─ any Phase D re-cut
   H11  netModelR scope                │
   H12  policy config module           │   Reason: promoting a policy from
   H13  shadow latch extension         │   evidence whose custody is unproven
   H14  replay engine                  │   is the precise failure W4 exists
   H15  counterfactual simulator       │   to prevent.
   H16  preregistration                │
   H1-H5 baseline, cohort, taxonomy    │
        │                              │
        └──────────────┬───────────────┘
                       │
              H17 run ─┴─ H18 critic ─ H19 risk ─ H20 recommendation
                       │
                       └── STOP HERE until track A completes
```

**The distinction that matters: build is parallel, conclude is gated.**

Everything in Phase B and Phase C operates on Scanner-model facts. It needs those
facts to be *present*, not *custody-proven*. So the policy module, the shadow
accounting, the replay engine, the simulator and the preregistration can all be
built while W4 sits blocked — which is genuinely useful, because track A is
blocked on a decision only you can make.

What cannot happen is **promotion or external claim**. A retain/reject
recommendation may be produced and reviewed; acting on it requires Phase A.

**Two soft dependencies worth naming.** H5 (data-quality limitations) will be
sharper after W4 findings, but should be drafted now from what is already known.
And H6's analysis rests on the historical record whose completeness gate 0a is
designed to establish — so H6's conclusions carry a limitation until 0a closes,
which belongs in the preregistration rather than being discovered later.

---

## 5. Phased engineering plan that does not destabilize the lifecycle

Five stages. **Each is additive; none modifies existing mutation behavior.**

**Stage 0 — Inventory, no code.** H7. Map every caller of the ten named
functions. Identify writers, race conditions, restart paths. **No policy code is
approved until this map exists and has been reviewed.**

**Stage 1 — Policy contract, no lifecycle contact.** H12. A standalone config
module with validation and tests. Imports nothing from `entryLatch`. Zero risk
to existing behavior because nothing calls it yet.

**Stage 2 — Shadow accounting, read-only.** H13. The nested `tradeManagement`
block is populated by a *reader* that observes existing lifecycle transitions and
computes policy state alongside them. It calls no mutation function. Existing
categorical outcomes are untouched, per the specification's own rule that numeric
staged-policy R is computed separately.

Invariant to test explicitly: **disabling the shadow module changes nothing
observable in existing lifecycle behavior.** If that test cannot be written, the
boundary is not clean.

**Stage 3 — Replay and simulation, offline.** H14 and H15. Operate on persisted
records, never on live state. The simulator should be structurally incapable of
writing to `entryLatch` — separate process or a read-only interface, not a
convention. Same reasoning as the `w4collect` guard: a rule that depends on
remembering it will eventually be forgotten at 2am.

**Stage 4 — Preregistration and run.** H16 and H17. Sealed before results are
examined, with an external timestamp — the same mechanism as
`AUTH-W4-PREFLIGHT-001` §12, for the same reason.

### The destabilization risk, stated plainly

Stage 2 is where risk lives. A shadow accounting extension that reads lifecycle
transitions sits close enough to the mutation path that a subtle coupling — a
shared object mutated in place, a listener that throws and interrupts a
transition, a persistence write that races — could affect live behavior.

**Mitigation:** the shadow reader must fail *silently and completely*. If policy
computation throws, the lifecycle transition proceeds unaffected and the policy
record is marked `POLICY_STATE_AMBIGUOUS`. Never the reverse.

---

## 6. Role ownership

The supplied table is accepted. Three additions where it is silent.

| Role | Owns | Addition |
|---|---|---|
| Scanner / `entryLatch` | Canonical lifecycle facts | **Owns H22** — whether stop moves were actually applied is a lifecycle fact, not a policy inference |
| Versioned policy module | Allocations, target R, stop rules, policy and schema identity | — |
| Simulator | Stateful replay, policy-isolated counterfactuals | **Structurally** unable to write to `entryLatch`, not merely prohibited |
| Researcher | Cohort analysis, expectancy, conversion, policy comparison, uncertainty | — |
| Critic | Attacks assumptions, event ordering, costs, sample bias, lifecycle defects, correlation blindness | **Must attack H22 specifically** — a stop-move assumption is the single largest unexamined lever |
| Risk | Aggregate and correlated exposure, drawdown, loss concentration, scenarios | — |
| Governance | Preregistration, evidence review, promote/reject, rollback | — |
| Broker execution | Future, out of scope | — |

**No role owns cost data, and that is correct** — it does not exist in shadow
mode. It should be stated in the preregistration rather than left as an apparent
oversight, so that a later reader does not assume someone was supposed to supply
it (H-F4).

---

## 7. First implementation ticket — **not issued**

The request is explicit: *"produce a first engineer-ready implementation ticket
or change record **only if** the prerequisite inventory is complete."*

**It is not complete.** H7 — the lifecycle call-site inventory for
`applyTp1Mutation`, `applyTp2Mutation`, `applyStopMove`, `clearFullLifecycle`,
`recordTradeOutcome`, `deriveOutcome`, `setEntryLatch`, `saveLatchToDisk`,
`loadLatchFromDisk`, `checkLatchInvariants` — has not been performed. I have no
access to the Scanner source, and the specification states the call-site map must
be delivered before policy code is approved.

Issuing a ticket now would mean writing an implementation plan against a call
graph nobody has looked at. It would look complete and would be guesswork, which
is the failure mode this project has spent a week engineering against.

**Four further prerequisites are also open:** H8, H9, H10 and H11 are schema
decisions that change what the first ticket says. Writing the ticket before them
guarantees rewriting it.

### What would make a ticket issuable

```
[ ] H7  call-site map delivered and reviewed
[ ] H8  R-only accounting confirmed; initialRiskPct null
[ ] H9  ambiguity state renamed
[ ] H10 gap-through states added; worse-than-stop results permitted
[ ] H11 netModelR scope recorded in the preregistration
[ ] H1  frozen baseline policy written down with a version identifier
```

With those six closed, the first ticket is **H12 — the versioned policy config
module**, which is self-contained, touches no lifecycle code, and is the natural
first commit.

### The next physical action

Run this against the Scanner repository and record file, line, caller, and
whether each site mutates:

```
applyTp1Mutation · applyTp2Mutation · applyStopMove · clearFullLifecycle
recordTradeOutcome · deriveOutcome · setEntryLatch · saveLatchToDisk
loadLatchFromDisk · checkLatchInvariants
```

That single artifact unblocks H12 through H15 and is the gate the specification
itself sets.

---

## 8. What this does not change

- **No performance claim becomes available.** The study is comparative and
  gross-only (H-F4).
- **W4 remains the critical path.** Track H's build runs parallel; its
  conclusion does not.
- **No new agent authority is created.** `entryLatch` stays canonical; the
  simulator writes nothing; promotion stays with governance and a human.
- **The null hypothesis stays admissible.** A clean rejection closes this
  workstream successfully, and that outcome should carry the same standing as a
  promotion.
