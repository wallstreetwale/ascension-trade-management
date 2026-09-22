# H2 — Eligible Trade Cohort

**Date:** 2026-09-18
**Study:** first policy study — `ASCENSION_MODEL_1PCT_25_50_25_V1` against
`BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1`
**Status:** **DRAFT — conceptually approved, NOT ready to seal.**
Feeds H4 (denominators), H16 (preregistration), H32 (populations).

**Depends on:**

```
H1    deployed baseline                              OBSERVED
A22   ratified procedure amendment                   drafted, not ratified
      candidate persistence/hydration facts
        sufficient to classify collection epochs     partial
      authoritative event-order specification        NOT STARTED
H22b  policy-grade stop-transition classification    OPEN
H46   control-failure rate ceiling                   UNSET
H59   measured flip-history availability             UNMEASURED
```

**Seal-readiness for H16 requires all seven.** A16 is substantially complete for
structure but not closed — `lowestRetainedSeq` is absent, the `hasMore` defect
stands, and the deployed HTTP response contract is still unverified against the
module source.

---

## 1. What a cohort decision is for

The study computes a paired difference over the *same* observed lifecycle path.
Both policies are deterministic functions of that path, so the only empirical
quantities are the path distribution and the classifiable fraction. **The cohort
definition is therefore the study's single largest lever**, and the reason it is
written before any result is seen.

Every criterion below is stated as a predicate on recorded facts. None requires
judgement at classification time. That is deliberate: a criterion needing a
decision per trade is a criterion that can be decided to taste.

---

## 2. The four accounting groups

Every record in the declared window lands in exactly one. **All four counts are
reported before any R comparison**, per H32.

```
1  STANDARD COHORT          eligible for paired ΔR
2  CONTROL-FAILURE COHORT   a required lifecycle control failed or was contradicted
3  AMBIGUITY / EXCEPTION    facts insufficient to establish a policy classification
4  NAMED EXCLUSIONS         outside the frozen study population by predeclared rule:
                            manual exit · invalidation · never announced ·
                            policy-version mismatch · other explicitly named
```

An earlier draft called this a three-population model and then placed named
exclusions "outside all three." Both cannot hold, and the denominator every
percentage depends on is exactly what breaks when they do. Four groups, complete
partition.

A trade may not be silently excluded. Exclusion is an assignment to group 2, 3
or 4, with a reason code — from `EXCEPTION_CLASSES` for group 3, from §7's named
list for group 4.

**A large excluded population is a study result, not a footnote.** If the
standard cohort is a minority of the window, the comparison is not interpretable
regardless of what it shows.

---

## 3. Window

```
earliest candidate-identity eligible   2026-09-07T00:00:00.000Z
latest eligible                        the preregistration seal date

candidate-buffer completeness          CONTINGENT on the amended W4 procedure,
                                       runtime epoch continuity, persistence
                                       status, and lowestRetainedSeq availability
```

**A calendar boundary is not evidence coverage.** The post-2026-09-07 window may
still contain process-local sequence resets, fire-and-forget persistence lag, or
start-boundary uncertainty. The date removes one known contamination; it does not
establish that the remaining window is complete.

### 3.1 Why the start date is fixed and not negotiable

Before 2026-09-07, `_candidatePriorState` was in-memory only. On restart it was
empty, so `candidateVersion` reset to 1 — and because `candidateKey` is stable
across restarts by design, **every one of the first N post-restart events for a
live candidate collided as a duplicate**. Counted as `skipped`, indistinguishable
from a quiet market.

The blind window was roughly as long as that candidate's pre-restart age. A
window crossing this date contains periods that look like inactivity and are
not — which would bias the path distribution in an unknown direction.

This is a hard date, observed in deployed source, not a judgement.

### 3.2 A trade spanning the boundary

A trade opened before and concluded after 2026-09-07 is **excluded**. Its
pre-boundary lifecycle facts carry the same risk as any other pre-boundary
record.

---

## 4. Standard-cohort eligibility

All eight must hold. Any failure assigns the trade to §5 or §6.

```
E1  tradeActivatedAt is present        see the rationale below — a study-population
                                       choice, not a claim about what is an outcome
E2  concluded within the window        a terminal outcome record exists
E3a terminal reached through an
    approved deleter                   clearFullLifecycle · loadLatchFromDisk ·
                                       assertTerminalCleared
E3b terminal was NOT a restore
    quarantine, invariant quarantine,
    or cleanup conflict                unless the record independently satisfies
                                       E4–E8. An approved deletion path is
                                       necessary, not sufficient: a quarantined
                                       trade produces an outcome record and may
                                       still be unfit for paired classification
E4a milestone order established        TP1 before TP2 before TP3, each with its
                                       own timestamp; no gap-through
E4b authoritative event-order source
    available for this record          order is never inferred from a terminal
                                       endpoint
E4c source cadence and timestamp
    precision sufficient               no unresolved same-window target/stop
                                       collision or multi-target traversal
E5  stop-transition evidence exact     per §4.1
E6a terminal lifecycle fact
    sufficient to establish the
    standard terminal state            milestone sequence + stop state + terminal
                                       reason. This is what a gross R depends on
E6b Scanner-model terminal price
    observation, WHERE REQUIRED        to resolve event order, distinguish a
                                       gap-through, or derive a nonstandard result.
                                       closePrice for classified reversal closes;
                                       exitPrice for stop-outs; neither assumed
                                       populated. Neither is a broker fill price
                                       or realized broker P&L
E7  flip history available             required only where §4.2 applies
E8  both policies classifiable         the same path yields a standard terminal
                                       under BOTH policies, or neither
```

**E1 rationale.** The first study is limited to activated Scanner-model trades
because the baseline lifecycle and outcome semantics are most complete for that
population. Records without `tradeActivatedAt` are **named exclusions from this
first study population** — they are not assumed to be non-events or non-outcomes
in general. The Scanner may have latched and modelled a trade that went
unannounced because of a policy gate, an alert condition, or a dispatch failure,
and that could matter to a later research population. Treatment of that
population is a separate scope decision.

**E8 is the one that makes the difference paired.** A path classifiable under
one policy and not the other cannot contribute a ΔR, and admitting it under a
substituted value would silently favour whichever policy had the evidence.

### 4.1 Stop-transition evidence, by terminal

Values are `STOP_TRANSITION_EVIDENCE` members from
`config/tradeManagementPolicies.js`, referenced rather than restated so they
cannot drift.

```
CLOSED_INITIAL_STOP    null                            the stop never moved
CLOSED_BREAKEVEN       TP1_BREAKEVEN_ESTABLISHED
CLOSED_TP1_LOCKED      TP2_TP1_LOCK_ESTABLISHED        + requiredConditionEvidence
                                                         (baseline only)
CLOSED_TP3             null                            no STOP-transition evidence
                                                       required. Milestone sequence
                                                       and event-order evidence
                                                       remain required under E4 —
                                                       a TP3 endpoint is not
                                                       sufficient if TP1/TP2 order
                                                       is unresolved

NOT sufficient for either protected path:
  OTHER_PROFIT_TRAIL_ESTABLISHED · ORIGINAL_STOP_ESTABLISHED

NOT eligible for the standard cohort:
  UNKNOWN · CONTRADICTORY · ATTEMPT_FAILED ·
  PERSISTENCE_FAILED · RESTORE_FAILED · NOT_ATTEMPTED
```

**Where `OTHER_PROFIT_TRAIL_ESTABLISHED` goes.** Saying it is insufficient is not
enough; it needs a destination, or "profitable is close enough" becomes the
shortcut.

```
if the trail changes the standard terminal payoff, or makes the counterfactual
  path non-comparable
    -> AMBIGUITY / EXCEPTION, with a specific trail or transition reason

if sufficient facts establish a distinct nonstandard outcome
    -> recorded OUTSIDE the standard paired cohort, carrying grossModelR only
       where reproducibly derivable

never
    -> silently remapped to TP1_BREAKEVEN_ESTABLISHED or TP2_TP1_LOCK_ESTABLISHED
```

`stopMoveActuallyApplied` alone is **insufficient** — it is move-generic, set by
any successful `applyStopMove`, so a Rule A trail sets it identically to a TP1
breakeven. `stopProtectionState === 'BREAKEVEN'` establishes the breakeven
transition. The TP2 lock requires comparing `stopLoss` against `tpsl.tp1`, because
`PROFIT_PROTECTED` covers any stop beyond entry.

Absent evidence on a pre-field record is `unknown`, never `ORIGINAL` or `false`.
The `|| 'ORIGINAL'` and `=== true` coercions at `index.js` 593, 594, 2927, 2928
are conservative but they are defaults, and a default is not an observation.

**A missing terminal price does not by itself disqualify a record.** The four
standard terminals are defined by target and stop state, not by price, and Phase
C is R-only classification from lifecycle facts rather than fill-level
measurement. Requiring a price everywhere would exclude valid model-state paths —
particularly stop-outs, where the Scanner deliberately stores different fields.

If governance prefers the stricter requirement anyway, record it as a deliberate
coverage trade-off rather than as a logical necessity.

### 4.2 Flip history — required for one path only

The baseline moves the runner stop to TP1 only when A5 P1 fires on
`bias_flip_actionable && post_tp2_runner`. So a TP2 reversal is:

```
flip fired     baseline CLOSED_TP1_LOCKED  +1.00R
no flip        baseline CLOSED_BREAKEVEN    0.00R
```

**A 2.00R swing on the same observed price path.** Without flip history the
trade is not classifiable under the baseline and fails E8.

`tp2HoldAlertFired` marks exactly the trades where A5 P1 fired
(`index.js:4626`), which makes this reconstructable — but it must be
*established per trade*, not inferred from a rate.

---

## 5. Control-failure cohort

A required lifecycle control failed or was contradicted. The facts are present
enough to see the failure; the policy classification is not supported.

```
stop transition attempted and refused        attempt_failed
mutated but not persisted                    persistence_failed
persisted but not restored                   restore_failed
stop state contradicted by durable state     contradictory
```

**Counted and reported separately, never folded into exceptions.** A control
failure says something specific about the system; an ambiguity says something
about the evidence. Merging them destroys both signals.

**Rate ceiling:** if this cohort exceeds a preregistered fraction of the window,
the comparison pauses rather than proceeding on the remainder (H46).

---

## 6. Ambiguity and exception cohort

Reason codes from `EXCEPTION_CLASSES`, each preserving raw facts:

```
gap_through_targets · gap_through_stop · event_order_ambiguous
quantity_unavailable · quantity_contradictory · duplicate_milestone_event
out_of_order_milestone_event · terminal_state_conflict
```

Plus:

```
event order unestablished                     -> POLICY_STATE_AMBIGUOUS /
                                                 event_order_ambiguous
stop transition unknown                       -> POLICY_STATE_AMBIGUOUS
flip history unavailable for a TP2 reversal   -> POLICY_STATE_AMBIGUOUS
terminal price unavailable                    -> CLOSED_POLICY_EXCEPTION, grossModelR null
```

**Expect this cohort to be large on first run.** `stopMoveActuallyApplied` is
`unknown` across pre-field records, so a substantial share of TP1-and-reverse
trades will classify here rather than at `+0.25R`. That is the engine working
correctly, and the size of the share is itself the first finding.

---

## 7. Named exclusions

Outside all three populations. Counted, reported, never analysed.

```
manual exit                 CLOSED_MANUAL_EXIT      the operator overrode the policy
invalidation                CLOSED_INVALIDATION     setup invalidated pre-milestone
never announced             tradeActivatedAt null   Cancelled, not an outcome
policy version changed
  mid-window                excluded from the frozen-policy primary cohort
```

Manual exits and invalidations may carry a separately derived R **only** where
entry, stop, direction, allocation history, remaining quantity, terminal price
and event order are all established — and even then they sit outside the
primary cohort.

---

## 8. Denominator derivation — input to H4

```
denominator = count of trades satisfying E1–E8 within the window

derived from     the enumerated window, not supplied by a caller
never            total alerts · total candidates · total lifecycle events ·
                 any count selected after results are known
```

Reported alongside it, always:

```
window trades total
standard cohort            n and %
control-failure cohort     n and %
ambiguity / exception      n and %
named exclusions           n and % by reason
```

The four groups are a complete partition of the window. Nothing falls outside
them.

```
standard cohort
+ control-failure cohort
+ ambiguity / exception cohort
+ named exclusions
= declared window total
```

**A residual is a classifier defect, not a rounding artifact.**

---

## 9. Path counts the study actually consumes

Within the standard cohort, ΔR depends on exactly four counts:

```
n0  CLOSED_INITIAL_STOP           contributes 0 to ΔR — both policies assign -1.00R
B   CLOSED_BREAKEVEN              +0.25R
L   CLOSED_TP1_LOCKED             split by flip: L_noflip +2.00R · L_flip +1.00R
T   CLOSED_TP3                    -2.75R
```

`L` **must** be reported split. Reporting it whole loses the largest single term
in the difference and reproduces the superseded formula.

---

## 10. What this cohort cannot support

Stated so it is not discovered at analysis:

```
no net expectancy claim       netModelR is null in Phase C; no cost data exists
no percentage return          no account, no equity curve, no sequence
no drawdown                   sequence-dependent; Phase E
no live or forward claim      historical Scanner-model paths only
no allocation optimisation    neighbouring shapes are descriptive only
```

---

## 11. Open dependencies

```
H4   denominators and exclusions — consumes §8
H16  preregistration — seals this document
H32  three-population reporting template — consumes §2
H46  control-failure rate ceiling — the value is unset
H59  flip-history AVAILABILITY is unmeasured — not merely the rate. The prior
     question was the wrong one: before a rate means anything, the study must
     establish whether flip history can be reconstructed per eligible TP2
     reversal at all. Required outputs:
       eligible TP2 reversals, total
       flip history available            n and %
       actionable flip fired             n and %
       no actionable flip                n and %
       flip history unavailable          n and %
       inconsistencies between tp2HoldAlertFired and source stop-state facts
A31  window start fixed at 2026-09-07
```

**H46's ceiling is the one number this document cannot supply.** It is a risk
tolerance, not an observation, and it must be set before the first run rather
than after seeing how large the excluded population turns out to be.
