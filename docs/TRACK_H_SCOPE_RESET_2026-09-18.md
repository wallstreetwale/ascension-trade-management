# Track H — Scope Reset Accepted

**Date:** 2026-09-18
**Policy:** `ASCENSION_MODEL_1PCT_25_50_25_V1` · `SHADOW_ONLY`
**Supersedes:** priority notes in `TRADE_MANAGEMENT_POLICY_STUDY_INTEGRATION_2026-09-18.md` §3
**Status:** No code written. Ticket **not issued** — §3.

---

## 0. One finding that changes the schema

The four standard paths assume the stop move was actually applied. **H22 records
`stopMoveActuallyApplied` as `unknown`.** When it is `false`, two outcomes exist
that the model has no way to express:

```
TP1 hit · breakeven stop NOT applied · price to original stop
    0.25(+1R) + 0.75(-1R)              = -0.50R

TP2 hit · runner stop NOT moved to TP1 · price to original stop
    0.25(+1R) + 0.50(+3R) + 0.25(-1R)  = +1.50R
```

**−0.50R is neither −1.00R nor +0.25R.** Under the four-path model it has
nowhere to go. It would either be forced into `INITIAL_STOP` (understating by
0.50R) or into `TP1_BREAKEVEN` (**overstating by 0.75R, and silently crediting a
protected-profit result to a trade whose protection failed**). The second is the
failure the correction explicitly forbids.

Magnitude, at the blueprint distribution, if every stop move failed:

```
as specified        +8.00R
stop moves failing  +1.50R        delta  -6.50R
```

This is not an edge case and not a cost model. It is the direct, deterministic
consequence of a field the schema already carries as unknown — and it is a
state-machine correctness requirement of exactly the kind the gap-through work
is.

**Proposal H-F5: add two conditional standard paths.**

```
TP1_STOP_NOT_MOVED          -0.50R   requires stopMoveActuallyApplied === false
TP2_RUNNER_STOP_NOT_MOVED   +1.50R   requires stopMoveActuallyApplied === false

If stopMoveActuallyApplied === 'unknown'  ->  POLICY_STATE_AMBIGUOUS
```

The `unknown` rule matters as much as the paths. Today the field is unknown for
every historical trade, so **every TP1-and-reverse record resolves to ambiguous
until H22 is measured.** That is the correct and uncomfortable answer: the engine
should return `POLICY_STATE_AMBIGUOUS` at first run for a large share of the
record, and that number is itself the first useful finding.

### A second, smaller gap

The blueprint's own ledger lists closure reasons including **manual exit** and
**invalidation**. Neither maps to any of the four paths. They should be named
rather than falling into an unlabelled exception, because they are likely common
and lumping them with gap-throughs destroys the distinction between *a trader
overrode the plan* and *the data was ambiguous*.

```
CLOSED_MANUAL_EXIT        operator closed outside the policy. Record observed R.
CLOSED_INVALIDATION       setup invalidated before a milestone. Record observed R.
```

Both terminal, both non-standard, neither credited to a standard path.

---

## 1. Adjusted Track H priority sequence

Accepted as specified, with H8/H9/H10 now **closed by the correction document
itself**, and one gate question in §1.1.

| # | ID | Item | Status |
|---|---|---|---|
| 1 | **H7** | Lifecycle call-site inventory — 10 functions | **OPEN — GATE** |
| 2 | **H1** | Freeze and document the current baseline policy | **OPEN — GATE** |
| 2a | **H22** | Verify stop-move application, persistence, restore, provenance. Defines cohort eligibility, so H11 cannot seal without it | **OPEN** |
| 3 | H8 | R-only accounting: `initialRiskPct: null`, `riskBasis: 'R_ONLY_NO_EQUITY_BASIS'` | **CLOSED** — decided in the correction |
| 4 | H9 | Rename to `POLICY_STATE_AMBIGUOUS` | **CLOSED** — decided in the correction |
| 5 | H10 | Gap-through handling: `GAP_THROUGH_TARGETS`, `GAP_THROUGH_STOP`, `CLOSED_POLICY_EXCEPTION` | **CLOSED** — decided in the correction |
| — | **H25** | **H-F5 — stop-not-moved paths and the `unknown` rule** | **OPEN — NEW, decision needed** |
| — | **H26** | **Named manual-exit and invalidation terminals** | **OPEN — NEW, decision needed** |
| 6 | H12 | `config/tradeManagementPolicies.js` — standalone versioned policy contract | BLOCKED |
| 7 | H13 | Shadow-only lifecycle-policy representation, no mutation changes | BLOCKED |
| 8 | H14 | Deterministic replay | BLOCKED |
| 9 | H15 | Policy-isolated counterfactual simulation | BLOCKED |
| 10 | H16 | Preregister, after policy/baseline/taxonomy/unknown-path rules are stable | BLOCKED |

### 1.1 A gate question, not a unilateral relaxation

The specification says the call-site map is delivered *"before policy code is
approved."* H7 exists to protect the lifecycle from destabilization.

**H12 touches no lifecycle code.** It is a config module with validation —
allocations sum to 1.00, target and stop-state ordering, default `SHADOW_ONLY`.
It imports nothing from `entryLatch`, calls no mutation function, and cannot
affect live behavior whether or not the call-site map exists.

**Recommendation:** re-scope the gate to *"H7 before H13"* rather than *"H7
before any policy code."* H13 is where lifecycle contact begins and where the
map's protective purpose actually applies.

**This is your gate to relax, not mine.** The practical value: H12 becomes
buildable immediately, in parallel with W4 *and* in parallel with the source
reading that H7 and H1 both require. If you prefer the gate as written, H12 waits
— that is a defensible choice and costs only sequencing.

### 1.2 Deferred, not deleted

Recorded as deferred dependencies per the correction. **None blocks the first
build.**

```
G1  sensitivity table                      DEFERRED — Phase E
G2  costed outcome matrix, execution legs   DEFERRED — Phase F
G3  Monte Carlo over trade ordering         DEFERRED — Phase E
G5  correlation cap, daily/weekly limits    DEFERRED — Phase E
    spread · commission · slippage · swap   DEFERRED — Phase F
    account equity · compounding · % return DEFERRED — Phase E
    broker integration · live partials      DEFERRED — Phase F
    performance claims                      DEFERRED — indefinitely
```

**G4 stays active.** The four-way performance vocabulary is claims discipline,
not cost modelling, and it governs how any future result may be described.

**G6 stays active.** The Validation Ledger field list is the decision-lineage
schema; it informs what the shadow record must carry.

---

## 2. Revised minimum schema and state vocabulary

### 2.1 State machine

```
NOT_ACTIVE
  → ACTIVE_INITIAL_RISK

ACTIVE_INITIAL_RISK
  → CLOSED_INITIAL_STOP              -1.00R
  → TP1_PARTIAL_BE

TP1_PARTIAL_BE
  → CLOSED_BREAKEVEN                 +0.25R   requires stopMoveActuallyApplied === true
  → CLOSED_TP1_STOP_NOT_MOVED        -0.50R   requires stopMoveActuallyApplied === false   [NEW]
  → TP2_PARTIAL_RUNNER_AT_TP1

TP2_PARTIAL_RUNNER_AT_TP1
  → CLOSED_TP1_LOCKED                +2.00R   requires stopMoveActuallyApplied === true
  → CLOSED_RUNNER_STOP_NOT_MOVED     +1.50R   requires stopMoveActuallyApplied === false   [NEW]
  → CLOSED_TP3                       +3.25R

Any ambiguous, inconsistent, missing, failed-persistence, or unknown-stop-state path
  → POLICY_STATE_AMBIGUOUS
  → CLOSED_POLICY_EXCEPTION

Named non-standard terminals                                                       [NEW]
  → CLOSED_MANUAL_EXIT               observed R, not a standard path
  → CLOSED_INVALIDATION              observed R, not a standard path
  → GAP_THROUGH_TARGETS              ambiguous; no sequential credit
  → GAP_THROUGH_STOP                 observed terminal worse than planned stop
```

### 2.2 Result vocabulary

| Terminal | Gross model R | Condition |
|---|---:|---|
| `CLOSED_INITIAL_STOP` | −1.00 | — |
| `CLOSED_BREAKEVEN` | +0.25 | stop move applied |
| `CLOSED_TP1_STOP_NOT_MOVED` | **−0.50** | stop move **not** applied |
| `CLOSED_TP1_LOCKED` | +2.00 | runner stop moved |
| `CLOSED_RUNNER_STOP_NOT_MOVED` | **+1.50** | runner stop **not** moved |
| `CLOSED_TP3` | +3.25 | — |
| `CLOSED_MANUAL_EXIT` | observed | outside policy |
| `CLOSED_INVALIDATION` | observed | setup invalidated |
| `CLOSED_POLICY_EXCEPTION` | **null** | gap-through, ambiguous, incomplete |

**`CLOSED_POLICY_EXCEPTION` carries `grossModelR: null`, never a number.** An
exception path with a computed R is an exception that has been quietly resolved.

### 2.3 Minimum record

```
tradeManagement: {
  policyId:                   'ASCENSION_MODEL_1PCT_25_50_25_V1',
  policySchemaVersion:        1,
  mode:                       'SHADOW_ONLY',

  state:                      <state machine value>,
  resultLayer:                'scanner_model',
  executionAuthority:         'scanner_virtual',
  brokerReconciliationStatus: 'not_available',

  initialRiskR:               1.00,
  initialRiskPct:             null,                          // H8
  riskBasis:                  'R_ONLY_NO_EQUITY_BASIS',      // H8

  originalQuantity:           null,
  openQuantity:               null,

  allocations:    { tp1: 0.25, tp2: 0.50, tp3: 0.25 },        // of ORIGINAL
  plannedTargetsR:{ tp1: 1.00, tp2: 3.00, tp3: 6.00 },

  milestoneObserved: { tp1: null, tp2: null, tp3: null },
  partials: { tp1ClosedOriginalQty: 0, tp2ClosedOriginalQty: 0, tp3ClosedOriginalQty: 0 },

  stopState:                  'ORIGINAL',
  stopMoveActuallyApplied:    'unknown',                      // H22 — gates H-F5
  stopMoveEvidence:           null,                           // how it was established

  grossModelR:                null,
  netModelR:                  null,                           // stays null in Phase C
  netModelRUnavailableReason: 'NO_BROKER_COST_DATA_IN_SHADOW_MODE',

  terminalReason:             null,
  nonStandardPathReason:      null,
  observedTerminalPrice:      null,  // Scanner-model observed price;
                                    // NOT a broker fill price
  evidenceClassification:     'UNKNOWN',
  contaminationState:         'unknown'
}
```

**An observed terminal price is a Scanner-model market observation.** It must not
be called an execution fill, realized P&L, or a broker-confirmed close price
unless a later broker-native execution and reconciliation layer establishes that
separately. The Scanner-model versus broker-reconciled distinction is
foundational to the shared contract, and this field is the most likely place for
it to erode — a price that looks like a fill will eventually be described as one.

**Costs removed entirely** per the correction — no `costs` block in v1. Its
absence is recorded by `netModelRUnavailableReason` so a later reader sees a
deliberate scope decision rather than an omission.

### 2.4 Invariants

```
allocations sum to exactly 1.00
allocations are ALWAYS of ORIGINAL quantity — never of the remaining position
TP2 not applicable unless TP1 confirmed in authoritative state
TP3 not applicable unless TP2 confirmed
duplicate milestone events create no duplicate allocation records
every transition idempotent
state survives restart without losing TP1/TP2 stop provenance
no terminal record produced outside clearFullLifecycle(...)
no unknown event order, missing quantity, or uncertain stop state
  becomes a positive R result
stopMoveActuallyApplied === 'unknown'  ->  POLICY_STATE_AMBIGUOUS
CLOSED_POLICY_EXCEPTION  ->  grossModelR is null
existing categorical outcomes unchanged; staged-policy R computed separately
disabling the shadow module changes nothing observable in lifecycle behavior
```

That last one is the test that proves the boundary is clean. If it cannot be
written, the separation is a convention rather than a fact.

---

## 3. First implementation ticket — **not issued**

The instruction is *"the first implementation ticket after confirming
H7/H1/H8/H9/H10 are complete."*

```
H8   CLOSED   decided in the correction document
H9   CLOSED   decided in the correction document
H10  CLOSED   decided in the correction document
H7   OPEN     lifecycle call-site inventory — not performed
H1   OPEN     baseline policy — not documented
```

Three of five closed. **Two remain, and both require the same act: reading the
Scanner source.** I have no access to it.

Two new decisions were also raised here — H25 and H26 — and both change what the
first ticket specifies. Writing it before them guarantees rewriting it.

### The single action that unblocks everything

One pass over the Scanner repository produces both open prerequisites.

**For H7**, record file, line, calling context, and whether the site mutates:

```
applyTp1Mutation · applyTp2Mutation · applyStopMove · clearFullLifecycle
recordTradeOutcome · deriveOutcome · setEntryLatch · saveLatchToDisk
loadLatchFromDisk · checkLatchInvariants
```

**For H1**, from the same reading: what the Scanner does today at each milestone
— allocations if any, stop movement if any, exit structure — written down with a
version identifier.

They are the same reading. Doing them together costs little more than doing
either alone.

### Ticket readiness

```
[ ] H7   call-site map delivered and reviewed
[ ] H1   baseline policy documented with a version identifier
[x] H8   R-only accounting
[x] H9   POLICY_STATE_AMBIGUOUS
[x] H10  gap-through states
[ ] H25  stop-not-moved paths — decision
[ ] H26  manual-exit and invalidation terminals — decision
[ ] gate question §1.1 — does H7 gate H12, or only H13?
```

With those closed, the first ticket is **H12**, and I can write it in full
detail immediately.

---

## 4. What the first deliverable is

**An R-only shadow-policy engine.**

It takes a known lifecycle path and returns exactly one classification and one
gross model R, in R-multiples, computed from policy facts, isolated from the live
mutation path.

**It is not:**

```
a cost model                     a spread, commission, slippage, or swap model
an equity model                  an account-percentage or compounding calculator
a broker executor                a performance-reporting system
a live partial-close mechanism   a stop-amendment mechanism
a new autonomous agent           a second trade authority
a risk-sizing change             a source of any performance claim
```

**Complete when** the four standard paths, the two conditional stop-not-moved
paths, and the non-standard terminals are versioned, persisted, restart-safe,
idempotent, replayable, auditable, and provably isolated from the live Scanner
mutation path — with `disabling the shadow module changes nothing` demonstrated
by test.

**Expect a high ambiguous rate on first run.** With
`stopMoveActuallyApplied: 'unknown'` across the historical record, a large share
of TP1-and-reverse trades will classify as `POLICY_STATE_AMBIGUOUS` rather than
`+0.25R`. That is the engine working correctly, and the size of that share is the
study's first real finding.
