# Trade-Management Blueprint — Review and Integration

**Reviewed:** 2026-09-18
**Source:** `trade-management-blueprint.docx` · SHA-256 `f1791ce9ec261b57…`
**Reviewer:** Evidence and Safety Reviewer
**Status:** Review. No changes made to the blueprint.

---

## 0. Arithmetic verification — all of it checks out

Every calculation in the document is correct. Verified independently:

```
TP1 only      0.25(1R) + 0.75(0R)              = +0.25R   ✓
TP2 → TP1     0.25(1R) + 0.50(3R) + 0.25(1R)   = +2.00R   ✓
TP3           0.25(1R) + 0.50(3R) + 0.25(6R)   = +3.25R   ✓
20-trade net  8(-1) + 6(0.25) + 4(2) + 2(3.25) = +8.00R   ✓
Expectancy    8.00 / 20                        = +0.40R   ✓
5% threshold  ((1.05)^(1/20) − 1) / 0.01        = +0.244R  ✓
```

The document is also unusually disciplined about what it is: *"a planning
framework, not a promise of performance"*, costs must be recorded, actual exit
prices not alert prices, rules frozen before forward-testing, 100 entries before
strong claims, out-of-sample testing for rule changes, and a four-way separation
of hypothetical / alert-path / forward-tested / broker-verified.

**That last item is the most valuable thing in the document**, and §4 below
proposes promoting it into the Ascension claims policy.

The findings that follow are not errors. They are places where correct
arithmetic rests on inputs that have no evidence behind them yet.

---

## 1. Finding — everything depends on four unmeasured numbers

The distribution `40% / 30% / 20% / 10%` is labelled *"illustrative expected."*
It is the sole input producing +8R, +0.40R, and the conclusion that expectancy
"exceeds that threshold."

**The sensitivity is much tighter than the document suggests.** Holding the
win-mix ratio constant at 3:2:1 and varying only the stop-out rate:

| Stop rate | Net R | E(R)/trade | Meets 5% objective |
|---:|---:|---:|---|
| 30% | +12.67 | +0.633 | yes |
| 35% | +10.33 | +0.517 | yes |
| **40%** | **+8.00** | **+0.400** | **yes — the document's case** |
| 45% | +5.67 | +0.283 | yes, barely |
| 50% | +3.33 | +0.167 | **no** |
| 55% | +1.00 | +0.050 | no |
| 60% | −1.33 | −0.067 | **negative** |

```
Breakeven stop rate for the 5% objective : 46.7%
Breakeven stop rate for zero expectancy  : 57.1%
```

So the framework tolerates a stop-out rate up to roughly **47%** and still meets
its objective, and goes negative above roughly **57%**. The assumed 40% sits
about seven points from the first cliff.

**That is a usable safety margin, and it is the single most important fact about
this model — but it appears nowhere in the document.** A reader takes away
"+8% per month" rather than "this works while stop-outs stay under 47%."

**Proposal T1:** add the sensitivity table. It converts a single illustrative
case into a stated operating tolerance, and it tells you exactly which number to
measure first.

---

## 2. Finding — staged exits triple the transaction count, and costs are never subtracted

The document requires recording spread, commissions, slippage, swap, partial
fills, and missed fills. It never subtracts them from +8R.

The exit model makes this worse than it looks. A stopped-out trade is 2
executions. **A TP3 trade is 4** — entry, TP1, TP2, TP3. Across a 20-trade block
at the assumed distribution that is **58 executions, not 40.**

| Cost per execution | Monthly drag | Net | E(R)/trade | Meets 5% |
|---:|---:|---:|---:|---|
| 0.02R | −1.16R | +6.84R | +0.342 | yes |
| 0.05R | −2.90R | +5.10R | +0.255 | yes, barely |
| 0.10R | −5.80R | +2.20R | +0.110 | **no** |

At 0.10R per execution the strategy misses its objective on costs alone, with
the win distribution fully intact.

Two further cost details the document does not surface:

**The breakeven stop is not breakeven.** Moving the remaining 75% to entry after
TP1 exits at 0R *gross*. Entry costs were already paid and exit costs will be
paid, so that leg is a small realized loss. The +0.25R TP1-only path is
optimistic by roughly two execution costs.

**Stops slip; targets generally do not.** A stop is a market order at the worst
moment. −1.00R assumes a clean fill at the stop price. Eight stopped trades at
0.05R of adverse slippage is another −0.40R per month — and it lands entirely on
the losing side, which is where it hurts most.

**Proposal T2:** add a costed-outcome matrix alongside the gross one, with
per-execution cost as an explicit parameter, and model stop slippage separately
from target fills.

---

## 3. Finding — the model is sequence-blind

The document compounds correctly for the 5% threshold — `(1 + 0.01·E)^20 = 1.05`
— but reports the monthly result linearly as `+8.00R × 1% = +8.00%`. Two methods,
two adjacent calculations.

The real issue is deeper. At 1% of *current* equity, **order matters**. Eight
consecutive stop-outs first is `0.99^8 = 0.923` — a 7.7% drawdown — and every
subsequent 1% is sized off the smaller base. The same 20 trades in a different
order produce a different month.

The document has no drawdown model and no sequence analysis, yet it specifies
daily loss limits, weekly loss limits, and a losing-streak pause — controls that
exist *precisely because* sequence matters.

**Proposal T3:** run a Monte Carlo over the assumed distribution, 10,000 orderings
of 20 trades, and report the distribution of monthly outcomes and maximum
drawdown rather than a single point estimate. This is cheap, it is offline, and
it is the analysis that sets the daily and weekly loss limits with a basis
instead of a guess.

---

## 4. Finding — the strongest thing in the document should be promoted

The Performance Disclosure section requires distinguishing:

```
Hypothetical or modeled outcomes
Alert-path target movement
Forward-tested results
Actual broker-verified net performance
```

**This is the Scanner-model versus broker-reconciled distinction, stated in
trading terms.** It is the same problem gate 0b exists to solve, arrived at
independently from the trading side.

It is also more precise than the deck's current taxonomy, which has one line —
*"Current outcomes are Scanner-model evidence, not broker-reconciled
performance."* The blueprint's version has four rungs and names alert-path
separately, which matters because alert-path is the one most likely to be
mistaken for performance.

**Proposal T4:** promote the four-way distinction into appendix A3 (claims
policy) and A2 (evidence status) as the required vocabulary for any performance
statement. Nothing about trading performance goes into a deck, an email, or a
meeting without one of those four labels attached.

---

## 5. Finding — three controls are specified without values

Same pattern as everywhere else in this project: the control exists, the number
is missing.

```
"Cap combined open risk across correlated positions"    — no cap given
"Define a daily loss limit"                             — no value
"Define a weekly loss limit"                            — no value
"Pause after a predefined losing streak"                — not defined
```

A limit without a number is not a limit. It becomes whatever seems reasonable in
the moment, which is precisely when judgment is worst.

**Proposal T5:** set all four before the forward test begins, and record them in
the same frozen-rules artifact. T3's Monte Carlo gives the basis for the daily
and weekly figures.

---

## 6. How this rolls into the Ascension plan

This is the **trade-management layer** — what a Scanner candidate becomes once a
human acts on it. It connects at four points, and one of them is exact.

### 6.1 The Validation Ledger *is* the decision-lineage schema

The deck's asset slide lists: market context · why a candidate existed ·
lifecycle history · **what a human decided** · what happened next · provenance.

The blueprint's ledger specifies: trade ID and timestamp · pair, direction,
session · setup score and component conditions · entry, stop, TP1/TP2/TP3 ·
position size and account equity · actual fills and all costs · percentage closed
at each target · stop movement timestamps · final realized R · MFE/MAE · closure
reason · correlated exposure at entry.

**That is the same record, specified to field level.** The deck has been
describing decision lineage abstractly for four revisions. This document just
wrote the schema.

**Proposal T6:** adopt the Validation Ledger as the canonical field list for the
member decision record. It makes the asset slide concrete and it gives the
product something specific to build.

### 6.2 "Actual exit price, not alert price" is gate 0b

*"Use the actual exit price, not the alert price, for performance reporting"* and
*"Report actual realized results separately from theoretical target-path or
alert-path performance"* are the reconciliation requirement, stated from the
trading side.

**Proposal T7:** when the W4 0b reconciliation model is finalised, use the same
vocabulary in both places. One definition of what "realized" means, not two.

### 6.3 The Validation Standard is a pre-registered experiment

Freeze the rules first · 100 completed forward-tested entries · include all
entries, losses, filtered setups, re-entries, and costs · test rule changes on
data not used to develop them · do not optimize exits from a small winning
sample.

That is the experiment-proposal schema in plain language — pre-commitment,
declared population, no post-hoc optimization, out-of-sample validation.

**Proposal T8:** file the forward test as the first real proposal through the
Experiment Proposal Agent. It would be the first non-synthetic use of that
package, and it is a `measurement_only` proposal, which is exactly the class the
prototype was built to accept.

### 6.4 Product implication

Slide 4's **REVIEW** component has been abstract. The blueprint says precisely
what a review compares: planned R-multiples against realized R, adherence to the
exit model, whether the stop moves were actually executed, and MFE/MAE against
target placement.

**Proposal T9:** specify the review surface against the blueprint's ledger fields
rather than inventing a schema separately.

---

## 7. What this does *not* change

- **No performance claim becomes available.** +8R is arithmetic over assumed
  inputs. Until 100 forward-tested entries exist with costs included, the deck's
  position is unchanged: outcomes are model evidence, not performance.
- **The investor deck needs no edits from this.** T4's vocabulary upgrade is an
  appendix change, not a slide change.
- **W4 is unaffected.** This is a separate track that shares a reconciliation
  problem, not a dependency.

---

## 8. New open items

To be added to the register as track **G — trade management**.

| ID | Item | Owner | Blocked by |
|---|---|---|---|
| G1 | Add the sensitivity table; state the operating tolerance (47% / 57%) | OPERATOR | — |
| G2 | Add a costed-outcome matrix; parameterise per-execution cost; model stop slippage separately | OPERATOR | Broker cost data |
| G3 | Monte Carlo over trade ordering — distribution of monthly outcomes and max drawdown | AGENT | — buildable now |
| G4 | Promote the four-way performance vocabulary into appendix A2 and A3 | AGENT | — buildable now |
| G5 | Set values: correlation cap, daily loss limit, weekly loss limit, losing-streak pause | OPERATOR | G3 |
| G6 | Adopt the Validation Ledger as the canonical decision-lineage field list | OPERATOR | — |
| G7 | Align 0b reconciliation vocabulary with "realized vs alert-path" | AGENT | W4 0b design |
| G8 | File the 100-entry forward test as the first real Experiment Proposal | OPERATOR | G1, G5, EPA ratification |
| G9 | Specify the product review surface against the ledger fields | OPERATOR | G6 |
| G10 | Freeze the rule set and record its hash before the forward test begins | OPERATOR | G1, G2, G5 |

**G10 is the gate.** Everything in the validation standard depends on the rules
being frozen and identifiable before the first forward-tested entry. If the rules
are still moving when trade one is taken, the 100-entry block proves nothing —
and that is the same ordering problem as sealing an authorization before
collecting evidence.

**G3 and G4 I can build now.** The rest need your numbers or a decision.
