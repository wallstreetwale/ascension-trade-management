# Response to External Review — Track H Amendment

**Date:** 2026-09-18
**To:** External reviewer
**Re:** Amendment to the Track H trade-management policy study design
**From:** Ascension, single operator
**Status:** Amendment adopted. Four additions proposed for your comment.

---

## 1. The table criticism is accepted, and the fault was worse than arithmetic

You are right that the sensitivity table had to be withdrawn before circulation.

The figures were arithmetically correct — but under a construction I never
stated. Three constructions exist and all three are valid:

```
tp3 = 1

  other counts held at 8/6/4, N varies          staged +4.75   baseline +2.00
  N=20, locked = 6 − tp3                        staged +6.75   baseline +3.00
  N=20, remainder of 12 split at 6:4 ratio      staged +5.00   baseline +2.00   <- mine
```

I used the third and omitted the intermediate columns from the review request,
which removed any means of reconstructing it. **An undeclared construction makes
a table unverifiable**, which is a worse defect than a wrong number — a wrong
number can be caught.

The amendment's corrected table declares its construction
(*"TP2-to-TP1-locked count = 6 − TP3 count"*) and matches our independent
calculation at every row. Adopted.

Your correction to the discriminator claim is also adopted:
`ΔR = 0.25B + 1.00L − 2.75T`, with TP3 decisive *at the planning distribution*
because the two intermediate contributions exactly offset it, not decisive in
general.

---

## 2. Adopted without reservation

**Mean paired ΔR as the primary estimand.** This closes the largest defect in
the prior design. The earlier primary metric — proportion of TP1-reaching paths
finishing at or below 0R — was `B/(B+L+T)` for baseline and **exactly 0** for
staged, for any `B > 0`. It could not produce a negative result. A primary
metric that cannot fail is a restatement of the policy definition, not a test of
it. Paired ΔR can be zero or negative, so the null is genuinely admissible.

**Three-outcome decision framework.** RETAIN / REJECT / INCONCLUSIVE. Without
the third state, "insufficient evidence" silently becomes a verdict in one
direction or the other.

**Distribution-shape rather than variance.** Correct, and the specific reason
matters: a policy can reduce dispersion purely by truncating favourable tail
outcomes, which is exactly what this one does at TP3.

**Policy outcome and control metric as separate variables**, with study pause if
ambiguity exceeds a preregistered ceiling. Adopted, including the point that a
large excluded population is a promotion-blocking result rather than a footnote.

**Five additional state-machine paths**, plus the amendment's expansion to
quantity-contradictory, duplicate, out-of-order and terminal-state conflict.
Adopted.

**25/50/25 as a design hypothesis, with neighbours as predeclared sensitivity
arms that cannot be promoted from the same study.** Adopted.

---

## 3. Four additions, offered for your comment

These follow from your own recommendations rather than disputing them.

### 3.1 The study has no minimum meaningful effect size, and needs one

The primary hypothesis is `H0: E[ΔR] ≤ 0` against `H1: > 0`.

**The planning distribution implies a true effect of exactly 0.00R.** That is
what the indifference point means. A superiority test against a true value of
zero returns INCONCLUSIVE at any sample size, and nothing in the current design
says so in advance.

What is missing is a preregistered statement of **how much improvement would
matter** — an MMES — separate from the sample threshold. Without it the study
cannot distinguish "no effect" from "insufficient sample", and those are the two
results it is most likely to produce.

### 3.2 The decision boundary can be derived rather than negotiated

ΔR takes exactly four values — `0`, `+0.25`, `+1.00`, `−2.75` — so its variance
is fully determined by the path probabilities. At the planning distribution:

```
SD(ΔR) = 0.987R
```

One-sided 95% superiority then requires observed mean ΔR to exceed:

```
N = 100   ->   0.162R
N = 200   ->   0.115R
N = 300   ->   0.094R
N = 500   ->   0.073R
```

This is more defensible than a chosen non-inferiority margin, because it comes
from the estimand's own variance. We propose preregistering the boundary this
way.

A related observation: **TP3 contributes 77.6% of ΔR's variance** (locked 20.5%,
breakeven 1.9%). This reconciles the dispute about TP3's role — it is not the
estimand, as you correctly argued, but it determines the study's precision and
therefore its sample requirement. We propose recording it as the decision
variable on that basis.

### 3.3 The 200-path threshold is unreachable at the assumed TP3 rate

The amendment requires 200 eligible paths **and** at least 30 eligible TP3 paths
for a serious decision.

```
30 TP3 at a 10% rate  ->  N ≈ 300
30 TP3 at a 15% rate  ->  N  = 200
```

At the blueprint's 10%, TP3 is the binding constraint and 200 cannot satisfy
both. The effective minimum is ~300. We propose either stating that collection
continues past 200 until 30 TP3 accrue, or lowering the TP3 minimum with the
tail uncertainty explicitly accepted.

### 3.4 The secondary TP1-protection metric is deterministic

Demoting it from primary was the right call. But it remains
`B/(B+L+T)` for baseline and exactly 0 for staged — a restatement of the path
counts, carrying no information beyond them.

That is fine for a mechanism metric. We propose the preregistration state that
its value is **known in advance**, so that a later report cannot present "the
staged policy eliminated flat post-TP1 outcomes" as a discovered finding. It is
true by construction.

---

## 4. A process note

Your items were proposed as H25–H30. Those IDs are taken twice over — by earlier
decisions in this workstream and by the first review's mapping. Your six items
already existed in the register and have been refined in place rather than
duplicated:

```
H25 -> H31    H26 -> H32    H27 -> H33 + H40 + H41 + H44
H28 -> H34    H29 -> H35 + H37 + H42    H30 -> H45 (expanded)
```

The cause is that reviews are being written against the review request rather
than against the register. We will send the register's track H section with the
next request.

---

## 5. Where this leaves the study

Your closing position is accepted: **do not reject the design; fix the
arithmetic presentation, formalise the estimand, separate return from
distributional risk, and set the thresholds before any observation is used to
tune the policy.**

One thing worth stating plainly, because the design now makes it visible. Given
the indifference point, the most likely honest outcome of the first study is
**INCONCLUSIVE on the primary estimand with a measurable distributional
finding.** That is not a failure of the study. It is the study working, and the
preregistration should say so in advance so that it is not later reframed as
either success or failure.

The policy remains worth building the capability for precisely because it can be
rejected honestly.

---

## 6. Sequencing is unchanged

No implementation ticket is issued. The gate remains:

```
H7   lifecycle call-site inventory
H1   frozen baseline policy with immutable source reference
```

Both close in one Scanner source-reading pass. That pass is the next physical
action, and it is genuinely parallel to the W4 evidence track.
