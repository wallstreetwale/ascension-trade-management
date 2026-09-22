# RST — Secure-Threshold Risk-Admission Refinement

## Design Assessment

**Date:** 2026-09-20
**Requested deliverables:** 11
**Delivered:** 1 (executive assessment), 6 (prerequisite grading), 11 (recommendation)
**Deferred:** 2–5, 7–10, with reasons in §5

---

## 1. Executive assessment

**RST is well specified. It is not implementable in the current architecture, and
the gap is structural rather than a matter of missing data.**

The request's own architecture diagram names five layers:

```
Broker / execution authority
Authoritative account and position truth
RST account-level risk-admission layer
Order authorization
Execution and reconciliation
```

**Ascension has none of them.** It has a Scanner that observes markets and
models trade state, and a Ledger that stores evidence. RST is specified to sit
between an order authorizer and an execution path, and neither exists.

That is not a criticism of the design. §2's boundary — *"do not make an
architecture claim that Ascension currently has broker-reconciled execution truth
unless the evidence establishes it"* — is exactly right, and the honest answer to
it is that the evidence establishes the opposite.

### 1.1 What is OBSERVED

From deployed-source reading on 2026-09-18, at
`index.js 9a4863e1472ca0dca67f42c9f595e12eb4c0c7f3b54fb2de99e79262cd8e5571`:

```
the Scanner tracks stop state in its OWN model
at TP1 it records the model stop at breakeven
at TP2 it records nothing; A5 P1 may move it later on a bias flip
it closes NO portion of any position
it is NOT connected to a broker
it does not affect any customer's trade
```

And in the H12 policy configuration, committed and verified today:

```
executionAuthority:          scanner_virtual
brokerReconciliationStatus:  not_available
initialRiskPct:              null
riskBasis:                   R_ONLY_NO_EQUITY_BASIS
netModelRUnavailableReason:  OUT_OF_SCOPE_PHASE_C_R_ONLY
```

**There is no account.** That is why Phase C computes in R-multiples only —
percentages require an equity curve, an equity curve requires a sequence, and a
sequence requires an account.

### 1.2 What this means for RST

Every calculation in §3 is denominated in dollars against a realized account
balance:

```
monthlyStartingBalance · realizedAccountBalance · realizedCushion
ordinaryBaseRiskDollars · aggregateCommittedRisk · availableNewRisk
effectivePlannedRisk = loss to stop + fees + slippage reserve
```

**Not one of these quantities exists anywhere in the system today.** Not stale,
not unreconciled, not uncertain — absent. There is no broker, so there are no
fills, no fees, no slippage, no realized P&L, and no executable protective stop.

### 1.3 Where RST belongs in the phase model

```
Phase C   R-only shadow policy study                   in progress
Phase D   governed Scanner-model promotion             gated
Phase E   account equity, sizing, drawdown, correlation LATER
Phase F   broker execution, fills, costs, reconciliation OUT OF SCOPE
```

**RST spans E and F and depends on F.** It cannot precede broker execution
integrity, because every input it consumes is produced by that layer.

---

## 2. §6 prerequisite grading

The request asks for OBSERVED / INFERRED / UNKNOWN / UNAVAILABLE.

**A distinction worth holding:** `UNKNOWN` means it may exist and has not been
established. `UNAVAILABLE` means it does not exist. Most of this table is the
second, and grading it as the first would overstate readiness.

| Prerequisite | Status |
|---|---|
| Realized account balance | **UNAVAILABLE** — no account |
| Account cash/equity distinction | **UNAVAILABLE** |
| Open broker positions | **UNAVAILABLE** — no broker connection |
| Pending and working orders | **UNAVAILABLE** — no order path |
| Actual fills, partials, cancellations | **UNAVAILABLE** |
| Executable protective-stop orders | **UNAVAILABLE** — stops are model-state only |
| Position average entry, realized P&L | **UNAVAILABLE** |
| Fees, commissions, financing, funding | **UNAVAILABLE** |
| Slippage data or conservative reserve | **UNAVAILABLE** |
| Broker reconciliation status, freshness | **UNAVAILABLE** |
| Broker/account time source | **UNAVAILABLE** |
| Atomic pre-order risk reservation | **UNAVAILABLE** — nothing to reserve against |
| Correlated / aggregate exposure | **UNAVAILABLE** |
| Fail-closed on stale authoritative state | **N/A** — no authoritative state to be stale |

**Fourteen of fourteen unavailable.** RST is not blocked on evidence quality. It
is blocked on the existence of an execution layer.

One adjacent item that *is* graded differently:

| Scanner model stop state | **OBSERVED** — `stopProtectionState`, `stopMoveActuallyApplied`, persisted and restored |

**That is model state, not broker truth, and RST must not substitute one for the
other.** §11's rule — *"do not bridge Unknown with Scanner/model assumptions"* —
is the exact trap here. A Scanner-side `BREAKEVEN` stop state says the model
believes the stop is at entry. It says nothing about whether any order exists at
any broker.

---

## 3. Findings on the policy itself

These stand independent of implementability.

### 3.1 The 8% figure is an illustration, not an expectation

§1 describes *"expected monthly system output: approximately 8%, based on the
established equation."*

The +8R figure comes from the blueprint's 20-trade planning distribution — 8
stops, 6 breakeven, 4 TP2-locked, 2 TP3. **That distribution is assumed, not
measured.** It was explicitly labelled *"a design illustration only… not a live
distribution, forecast, forward-test result, account-return claim, or broker
performance claim."*

The arithmetic converting +8R to ~8% at 1% risk is sound. The input is not
established.

**Recommendation:** replace *"expected monthly system output"* with *"the
planning illustration's modelled output"*. §11 already forbids treating 8% as a
promise; the same discipline should apply to calling it expected. It is the
output of an unmeasured distribution.

This matters operationally: if RST is designed around an 8% expectation and the
real distribution has more TP3s, the cushion behaves differently from the design
assumption.

### 3.2 Partial closes are simultaneously realized gain AND risk reduction

This is the largest gap in §3, and it comes directly from the H12 policy.

Under `ASCENSION_MODEL_1PCT_25_50_25_V1`, TP1 closes 25% of the original position
at +1R. That single event:

```
INCREASES realizedAccountBalance        -> realizedCushion grows
DECREASES effectiveRemainingRisk        -> aggregateCommittedRisk falls
and moves the stop to breakeven         -> remaining risk falls again
```

**Three changes to `availableNewRisk` from one milestone.** §9's test matrix
includes partial fills and partial closes, but §3's calculation specification
does not say how a mid-trade partial is recognised, in what order, or whether the
cushion updates atomically with the risk release.

If the order is wrong, two things go wrong in opposite directions: recognising
the gain before releasing the risk briefly overstates capacity; releasing the
risk before recognising the gain briefly understates it. The first is the
dangerous one.

**Recommendation:** specify partial-close handling as a single atomic
transaction, and add a test — *"TP1 partial close updates cushion and committed
risk atomically; no intermediate state admits risk that neither pre- nor
post-state would allow."*

### 3.3 `effectiveRemainingRisk` depends on a stop that may not exist at the broker

Post-TP1, the model stop is at breakeven, so remaining planned risk is
approximately zero plus friction. RST would read that as cushion.

**But the Scanner's stop is model-side.** Today it reaches no broker. Even after
Phase F, RST must read the *executable* stop order, not the model's belief about
it — and `stopMoveActuallyApplied` is move-generic, unable to distinguish a TP1
breakeven from a Rule A trail. That is open register item **H22b**.

**Recommendation:** `effectiveRemainingRisk` must be computed from
broker-confirmed executable stop orders only. Add an explicit rule: if the
executable stop cannot be confirmed, treat remaining risk as the full distance to
the original stop — the conservative direction — and record the substitution.

### 3.4 SECURE_OVERCOMMITTED is correctly identified, and the honesty should be kept

§5's example — $5 cushion, $8 committed risk — is the strongest part of the
document. It states plainly that blocking new trades does not achieve 5%
protection, because existing exposure can breach independently.

**Do not let that soften in implementation.** The threshold is not a floor, §11
says so, and the state name should keep saying so in every alert and record.

### 3.5 A minor simplification

`availableNewRisk = min(ordinaryBaseRiskDollars, realizedCushion − aggregateCommittedRisk)`
goes negative exactly when overcommitted. Since admission already requires
`availableNewRisk > 0`, the overcommitted condition is expressible as a negative
available risk rather than a separate predicate.

Keep `SECURE_OVERCOMMITTED` as a **state** — it drives alerting and operator
workflow — but the admission check needs only the one inequality.

---

## 4. Recommendation

```
APPROVE FOR DESIGN ONLY
```

Not BLOCKED: the policy is coherent, the state model is sound, the boundary
discipline in §2 is correct, and design work now would not be wasted.

Not READY FOR SHADOW MODE: **shadow mode requires the inputs to exist.** A
shadow RST would compute `availableNewRisk` from a realized balance that does not
exist, against committed risk on positions that do not exist. That is not a
shadow of anything — it would produce numbers indistinguishable in form from real
ones, which is worse than producing nothing.

### 4.1 Prerequisites, in order

```
1  Phase F broker execution integrity exists at all
     broker connection · order path · fills · reconciliation
2  Authoritative account truth with a defined freshness SLA
3  Executable stop-order truth, distinct from model stop state  (H22b)
4  Atomic risk reservation against a real account
5  Monthly accounting policy decided — §7, decision owner per item
6  The partial-close ordering question in §3.2 specified
7  RULE-01 change record for any component touching order authorization
```

**Items 1 through 4 are a programme, not a task.** None is in flight.

### 4.2 What can proceed now

```
policy decisions in §7          no implementation needed, and they age well
the state model in §4           design-ready, worth completing
the calculation spec in §3      once §3.2 and §3.3 are resolved
the test matrix in §9           good as written; add the two tests above
```

### 4.3 Why deliverables 2–5 and 7–10 are deferred

An architecture diagram, data contract, calculation specification, reservation
design and rollout plan for a layer whose every input is UNAVAILABLE would be
**design against an imagined system**. It would look complete, be unverifiable,
and carry the same risk as the call-site map I declined to write without source
access: convincing output with nothing underneath.

They become worth producing when prerequisite 1 exists — and the shape of what
Phase F actually delivers will change them substantially.

---

## 5. One structural observation

RST is the first piece of work in this project specified **top-down from a policy
objective** rather than bottom-up from observed system behaviour.

That is not wrong. It is how a risk control should be specified — the objective
first, then the mechanism.

But it inverts the discipline the rest of the project runs on, and the result is
visible: a fourteen-row prerequisite table that is entirely UNAVAILABLE. The same
document would have been shorter and equally correct had it opened with *"does
Ascension have an account?"*

**Worth asking that question first for the next refinement of this kind.** The
answer bounds everything downstream, and it takes one line to establish.
