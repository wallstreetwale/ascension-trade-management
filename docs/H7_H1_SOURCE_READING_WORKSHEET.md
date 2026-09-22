# H7 + H1 — Scanner Source-Reading Worksheet

**Purpose:** close H7 (lifecycle call-site inventory) and H1 (frozen baseline
policy) in one comprehensive pass, in the exact form §9 of the final instruction
requires.
**Prepared:** 2026-09-18
**Prepared by:** Evidence and Safety Reviewer — **no Scanner source access**
**Status:** Template. Every field below is unfilled and must be filled from
direct source reading, not from inference.

---

## 0. Why this is a worksheet and not a completed map

The final instruction directs completion of H7 and H1 from one Scanner-source
reading pass. **I cannot perform it.** I have no access to the Scanner
repository — it is not among the repositories in this session, and nothing in my
environment reaches it.

A call-site map produced by inference would look complete, would be wrong in ways
nobody could detect from the output, and would then be committed to code, schema
and tests as H12's foundation. That is the precise failure mode this workstream
exists to prevent, applied to its own first artifact.

**This worksheet is the alternative:** structure the pass so that whoever has
access returns a gradeable result on the first attempt, rather than a summary
that has to be re-done.

---

## 1. Session identity — fill before reading

```
repository:              [exact repo identifier]
immutableRef:            [commit SHA or tag — NOT a branch name]
refObtainedBy:           [git rev-parse HEAD | GitHub commit URL | other]
readingPerformedBy:      [named person]
readingStartedAt (UTC):
readingCompletedAt (UTC):
toolsUsed:               [grep, IDE search, GitHub search — record which]
```

**A branch name is not an immutable reference.** `main` moves. If the baseline
cites `main`, H1 has no fixed source and the whole comparison loses its anchor.

---

## 2. H7 — Lifecycle call-site inventory

Ten functions. **One table per function.** Copy the block below for each.

```
applyTp1Mutation        applyTp2Mutation        applyStopMove
clearFullLifecycle      recordTradeOutcome      deriveOutcome
setEntryLatch           saveLatchToDisk         loadLatchFromDisk
checkLatchInvariants
```

### 2.1 Per-function block — copy ten times

```
FUNCTION: ____________________

DEFINITION
  file path:
  line range:
  signature:
  returns:

CALL SITES  (one row per site — add rows as needed)
  ┌──────────────────────────────────────────────────────────────────────┐
  │ # │ file path │ line │ calling function/context │ read or MUTATION │
  └──────────────────────────────────────────────────────────────────────┘
  1.
  2.
  3.

LATCH FIELDS AFFECTED
  read:
  written:
  deleted:

PERSISTENCE BEHAVIOR
  writes to stateStore/Redis:       yes / no / conditional
  writes to disk:                   yes / no / conditional
  write is synchronous:             yes / no / unknown
  failure handling on write error:
  schema/version field written:     yes / no — which field

ALERT / PUBLICATION BEHAVIOR
  emits alert or notification:      yes / no
  publishes to cache or dashboard:  yes / no
  could a consumer treat that output as lifecycle truth:  yes / no / unclear

EXISTING TEST COVERAGE
  test files:
  what is asserted:
  what is NOT asserted:

CONCURRENCY / RACE IMPLICATIONS
  can two callers invoke concurrently:   yes / no / unknown
  guarded by lock, queue, or single-flight:
  observed or suspected race:

RESTART / HYDRATION IMPLICATIONS
  state survives restart:            yes / no / partial
  what is lost on restart:
  hydration path:
  TP1/TP2 stop provenance preserved: yes / no / unknown

DIVERGENCE FROM INTENDED POLICY
  [anything the implementation does that the blueprint does not describe,
   or does not do that the blueprint assumes]
```

### 2.2 Cross-function findings — fill after all ten

```
ALL LIFECYCLE WRITERS
  [every code path that mutates trade state, including any found outside the
   ten named functions. If one exists that is not on the list, that is the
   single most important finding in this document.]

RACE RISKS IDENTIFIED

RESTART RISKS IDENTIFIED

UNGUARDED MUTATION PATHS

PATHS THAT PRODUCE A TERMINAL RECORD OUTSIDE clearFullLifecycle(...)
  [the invariant says none may exist. Record any that do.]
```

**The last two are the ones to read for.** The authority model assumes
`clearFullLifecycle` is the sole terminal path and that the named functions are
the mutation owners. **If the inventory finds an eleventh writer, H12's
vocabulary is being designed against an incomplete model** and the finding
outranks everything else in track H.

### 2.3 Target / stop event-order authority

Required by `AUTHORITATIVE_EVENT_ORDER_SOURCE`. **The study cannot assign the
four standard payoff paths unless it can establish whether a target or a stop
happened first.** A price endpoint alone is insufficient when several levels are
crossed between observations.

For every TP1, TP2, TP3 and stop-breach path:

```
event source:            monitor live price | scan cache price | candle high/low
                       | candle close | external feed | other
source update cadence:
timestamp field and precision:
source persists the raw crossing event:        yes / no
can this source establish ORDER when multiple thresholds are crossed:  yes / no / unknown
same-observation target/stop collision handling:
gap-through handling:
source consistency across:
    TP milestone mutation:
    stop breach detection:
    terminal outcome recording:
    replay input:
file:line:
```

**If the four consistency rows do not name the same source, that is a finding.**
A replay that reads a different price series than the one that drove the
original transition is not a replay.

---

## 3. H1 — Frozen baseline policy

What the Scanner **does today**, not what it should do. Each answer cites file
and line.

```
BASELINE IDENTITY
  baselineId:              [e.g. SCANNER_BASELINE_2026-09-18_<shortsha>]
  immutableRef:            [same commit as §1]
  documentedBy:
  documentedAt (UTC):
```

### 3.1 Behavior at each stage

```
ENTRY

  Does the Scanner create a real or virtual quantity field?
    [ yes | no | model-only | unknown ]

  If yes:
    quantity source:
    quantity field:
    quantity semantics:  real broker quantity | Scanner-model quantity
                       | presentation-only quantity | other

  If no, state explicitly:
    "Current baseline is stop-state / target-state only. It does not represent
     partial quantity allocation."

  position sizing logic:          stop distance | fixed lot | model only | none | other
  initial stop recorded:          yes / no — field name
  targets recorded at entry:      yes / no — list fields
  file:line:

**If there is no quantity model, that is not a Scanner defect.** It means the
25/50/25 allocations cannot be *replayed* as historical partial allocations —
they can only be *calculated* as a policy counterfactual over the observed
target path. That distinction must be settled before H12, because it determines
whether the replay engine reconstructs allocations or derives them.

TP1
  does a TP1 milestone exist:     yes / no
  partial close performed:        yes / no — what percentage, of what base
  ** of ORIGINAL or of REMAINING quantity: ______________  **
  stop moved:                     yes / no — to what price
  moved via applyStopMove:        yes / no
  file:line:

TP2
  does a TP2 milestone exist:     yes / no
  partial close performed:        yes / no — what percentage, of what base
  ** of ORIGINAL or of REMAINING quantity: ______________  **
  stop moved:                     yes / no — to what price
  file:line:

TP3
  does a TP3 milestone exist:     yes / no
  behavior:
  file:line:

STOP MOVEMENT
  every stop change routed through applyStopMove:  yes / no
  any other code path that changes a stop:
  file:line:

STOP-MOVE FACT CHAIN
  Four separable facts. Record each; do not collapse them.

  1. intended stop target:                  what stop does the model intend after TP1/TP2
  2. in-memory latch updated:               yes / no / unknown
     latch version bumped:                  yes / no / unknown
  3. persistent write attempted:            yes / no / unknown
     persistent write success observable:   yes / no
     persistent write failure behavior:
  4. restored after restart:                yes / no / unknown

  explicit field recording successful application:   yes / no — field name
  exact semantics of stopMoveActuallyApplied:
     [ not present | intended | in-memory mutation | persistence success
     | external execution confirmation | unclear ]
  file:line:

**"Actually applied" must not imply broker confirmation here** — there is no
broker. The project-specific definition should be:

> The canonical Scanner latch transitioned to the intended stop state, its
> version was persisted through the declared durable state path, and restore
> logic recognises that state without semantic loss.

If the source cannot establish all three, the field stays `unknown`. It is a
three-valued fact by contract.

TERMINAL CLOSURE
  sole path is clearFullLifecycle: yes / no
  other terminal paths found:
  outcome recorded via recordTradeOutcome / deriveOutcome:  yes / no
  existing categorical outcome labels:
  file:line:

MANUAL / INVALIDATION CLOSURE
  manual close path exists:        yes / no
  invalidation path exists:        yes / no
  distinguishable in the record:   yes / no
  file:line:

PERSISTENCE
  what is persisted:
  where:
  when:
  schema version field:

RESTART RESTORE
  what is restored:
  what is not:
  post-TP1 breakeven stop state recognized on restore:   yes / no
  post-TP2 runner-at-TP1 state recognized on restore:    yes / no
  file:line:
```

### 3.2 The three questions that matter most

Marked `**` above, and worth isolating because H12's vocabulary depends on them:

**Q1 · Are existing partial closes calculated from ORIGINAL or REMAINING
quantity?** The policy's critical invariant is that all allocations are of
original quantity, and that TP2 never means 50% of the remaining 75%. **If the
current implementation uses remaining quantity, the baseline is a different
policy** — and the study is comparing two allocation models, not one policy
against a variant. That changes the research design, not just a config value.

**Q2 · Does any record exist of whether a stop move was actually applied?**
`stopMoveActuallyApplied` defaults to `'unknown'`. If the Scanner already
persists evidence of applied stop moves, H22 is largely closed and a large share
of the historical record becomes classifiable. If it does not, **every
TP1-and-reverse record classifies as `POLICY_STATE_AMBIGUOUS` on first run**, and
that is the study's first finding rather than a defect in the engine.

**Q3 · Is there an eleventh lifecycle writer?** See §2.2.

### 3.3 Divergences between intended policy and implementation

```
[List every place where the blueprint assumes behavior the code does not have,
 or the code has behavior the blueprint does not describe. Each with file:line.]
```

**Expect this section to be non-empty.** The blueprint was written as a design
target; the Scanner was built over time. Divergences are the normal result of a
first baseline reading, and finding none would be more surprising than finding
several.

---

## 4. Deliverable checklist — §9 conformance

```
[ ] repository and immutable commit/tag                     §1
[ ] file path and exact line ranges                         every entry
[ ] caller/function context                                 §2.1
[ ] read versus mutation classification                     §2.1
[ ] latch fields affected                                   §2.1
[ ] persistence/version behavior                            §2.1, §3.1
[ ] alert/publication behavior                              §2.1
[ ] existing test coverage                                  §2.1
[ ] concurrency/race implications                           §2.1, §2.2
[ ] restart/hydration implications                          §2.1, §3.1
[ ] divergence between intended policy and implementation   §2.1, §3.3
[ ] baseline version identifier + immutable source ref      §3
```

---

## 4a. Recommended pass order

Searching function names alone will miss a writer that mutates state directly.
Four clusters, in this order:

**1 · Definitions first** — read all ten before reading any call site.

**2 · Direct call sites** — every caller of each definition.

**3 · Direct state-field writes** — the cluster most likely to surface an
eleventh writer:

```
entryLatch[        tp1Hit             tp2Hit            stopLoss
stopProtectionState                   stopMoveActuallyApplied
tradeActivatedAt   realizedClosePrice clearFullLifecycle(   delete entryLatch
```

**4 · Restore / hydration validation:**

```
loadLatchFromDisk  validateTpslCoherence  migrateLatchShape
quarantineRejectedLatch                   assertTerminalCleared
```

**5 · Milestone and stop-detection ordering:**

```
monitorActiveLatch  checkAlertTriggers  applyTransition
computeTransition   evaluateSLBreach    handleMilestoneHit
```

Clusters 3 and 5 are where a bypassed terminal path or an unlisted mutation is
most likely to appear. Neither is reachable by grepping the ten function names.

---

## 5. Handling discipline during the pass

Same rules as W4 collection, for the same reasons.

```
Read-only. No edits, no test runs that mutate, no branch creation.
Record what is there, not what was expected to be there.
A function that does not exist, or is not called anywhere, is a FINDING —
  record it, do not skip it.
Do not infer behavior from a function name. Read the body.
Do not resolve a contradiction between two call sites. Record both.
If a field's meaning is unclear, record it as unclear rather than guessing.
No credentials, tokens, connection strings, or key material in this document.
```

**The last rule has bitten before.** Source files carry configuration, and
configuration carries secrets. If a call site sits next to a credential, record
the call site and not the credential.

---

## 5a. What completion looks like

H7 and H1 are complete only when this can be written with line references:

```
At immutable ref [SHA], the Scanner is a stop-state / target-state model.

At TP1:
  It [does / does not] record a TP1 milestone.
  It [does / does not] change the canonical modeled stop to entry.
  It [does / does not] represent partial quantity closure.
  The stop state is [persisted / not persisted] through [path].
  Restore [does / does not] recognise the state.

At TP2:
  It [does / does not] record TP2.
  It [does / does not] move the modeled runner stop to TP1.
  It [does / does not] represent partial quantity closure.
  The state is [persisted / restored status].

Terminal state:
  It is [solely / not solely] cleared through clearFullLifecycle.
  It creates outcome records through [path].
  Manual / invalidation paths are [identified / not identified].
  Target/stop ordering is determined from [source / cadence], with [known limits].
```

Until every bracket is filled from source, H12 stays blocked.

---

## 6. What this unblocks

```
H7 complete   ->  H12 vocabulary can be committed against real semantics
H1 complete   ->  the study has a defined baseline to compare against
Q1 answered   ->  allocation model confirmed or the research design changes
Q2 answered   ->  H22 scope known; expected ambiguous rate known
Q3 answered   ->  authority model confirmed or track H is re-scoped
```

With H7, H1 and H11 recorded and the §11 checklist closed, **H12 is issuable and
I can write it in full detail** — a standalone, versioned, `SHADOW_ONLY` policy
configuration and pure validation module, importing no live mutable state,
calling no lifecycle mutation, altering no Scanner behavior.

Return the filled worksheet and the ticket follows immediately.
