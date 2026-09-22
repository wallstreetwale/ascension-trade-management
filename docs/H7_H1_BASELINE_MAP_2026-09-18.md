# H7 + H1 — Lifecycle Map and Frozen Baseline

**Date:** 2026-09-18
**Status:** DRAFT — substantially complete, three items outstanding (§6)
**Method:** direct read of deployed source in a running container

---

## 1. Source identity

Git is not installed in the container, so no commit SHA is available. File
hashes are the immutable reference in its place.

```
container:   3fa95214ef7b:/app
package:     forex-market-data-api  v1.0.0   (flat; carries no release identity)
mtime:       2026-09-08 11:08:36 UTC  (identical across all four files)

9a4863e1472ca0dca67f42c9f595e12eb4c0c7f3b54fb2de99e79262cd8e5571  index.js         606,631 B
9d16739bbfab67969739efa029f68539d7de8099db9bb7f99201cd896a9b0301  stateStore.js     46,723 B
0e8d5275a4bf7f56ec79a912891cb0ea32a8e6ee4506221da2e965cf054989cc  candidateEventBuffer.js  9,677 B
c7497354ac07ebc8ce511bd5e613b15a12c46559565818023b65e43aa00448ec  candidateAck.js   15,926 B

baselineId:  SCANNER_BASELINE_2026-09-18_idx9a4863e1
```

**This is stronger evidence than a repository read.** It is the artifact that is
actually running, which is the correspondence the CI 403 has been blocking
(register item F3). Deployment identity for these four files can move from
`ASSERTED` to `OBSERVED`.

---

## 2. H7 — Lifecycle authority map

### 2.1 Definitions

| Function | Location | Role |
|---|---|---|
| `applyTp1Mutation` | `index.js:711` | TP1 fact + **calls `applyStopMove('tp1_breakeven')`** |
| `applyTp2Mutation` | `index.js:747` | TP2 fact only — **no stop move** |
| `applyStopMove` | `index.js:2457` | **Sole live-stop writer.** Monotonic; records provenance |
| `setEntryLatch` | `index.js:767` | Latch creation; declines incoherent latches |
| `clearFullLifecycle` | `index.js:1459` | Terminal clear; calls `recordTradeOutcome` first |
| `recordTradeOutcome` | `index.js:2866` | Outcome record; fires on **every** `clearFullLifecycle` |
| `deriveOutcome` | `index.js:1836` | Close reason + latch → categorical outcome |
| `loadLatchFromDisk` | `index.js:535` | Hydration; quarantines invariant violations |
| `saveLatchToDisk` | `index.js:388` | Async wrapper over `stateStore` |
| `checkLatchInvariants` | `index.js:4328` | Post-transition and restore boundary |

### 2.2 Authority — confirmed by the codebase's own tests

**Stop mutation: exactly one writer.** Asserted twice:

```
incident_replay_tests.js:572   EXACTLY ONE live-stop writer in the whole file (applyStopMove)
transition_audit.js:241        EXACTLY ONE writer mutates a live stop (applyStopMove)
```

Three callers compute *where*; the owner decides *whether*:

```
applyTp1Mutation   -> tpsl.entry    'tp1_breakeven'      index.js:731
A5 P1              -> tpsl.tp1      'a5p1_secure_tp1'    index.js:4630
Rule A             -> trail target  'rule_a_trail'       index.js:5898
```

### 2.3 Terminal clear — the stated invariant is wrong

`index.js:21–24` declares:

> *"clearFullLifecycle() is the ONLY approved path for terminal state clears."*

`transition_audit.js:149` enforces something different:

```js
const APPROVED_DELETERS = ['clearFullLifecycle', 'loadLatchFromDisk', 'assertTerminalCleared'];
```

**Three deleters.** Both extras are legitimate and record an outcome first —
`loadLatchFromDisk` quarantines invariant violations (`index.js:643`),
`assertTerminalCleared` force-removes a latch that survived a terminal path
(`index.js:4358`).

**Consequence for track H:** the proposed invariant *"no terminal record produced
outside `clearFullLifecycle`"* is false as written. Left uncorrected, H45's
`TERMINAL_STATE_CONFLICT` will fire on legitimate quarantine paths. It must name
all three.

**No eleventh writer found.** Q3 answered.

---

## 3. Stop-move fact chain — complete, and the field already exists

**`stopMoveActuallyApplied` is in production at `index.js:2497`**, with the same
name and the same meaning the policy schema proposed.

```
1 intended    applyStopMove(pair, target, reason)              731 / 4630 / 5898
2 in-memory   tpsl.stopLoss + stopProtectionState + flag       2472–2497
3 persisted   bumpLatchVersion -> saveLatchToDisk              2498–2499
4 restored    loadLatchFromDisk preserves both fields          593–594
5 recorded    stamped into every outcome record                2927–2928
```

Restore is deliberate — `index.js:591`: *"a restart must not erase how the stop
got where it is, or the P11 exemption would re-derive it from prices and lose
the distinction."*

**The richer field is `stopProtectionState`** (`2488–2494`):

```
ORIGINAL            still behind entry, or non-finite inputs
BREAKEVEN           at entry within float noise
PROFIT_PROTECTED    trailed beyond entry, in profit
```

**H22 can close.** The evidence exists, survives restart, and is in historical
outcome records.

### 3.1 Three cautions for the study

**The boolean is move-generic.** `stopMoveActuallyApplied = true` fires on *any*
successful move. A Rule A trail sets it identically to a TP1 breakeven. It cannot
distinguish *which* move happened — `stopProtectionState === 'BREAKEVEN'` is the
usable fact.

**`PROFIT_PROTECTED` does not identify the TP1-locked state.** It covers both a
runner at TP1 and any Rule A trail. Classifying `CLOSED_TP1_LOCKED` needs
`stopLoss` compared against `tpsl.tp1`.

**Absent silently becomes a known value.** `|| 'ORIGINAL'` and `=== true` at 593,
594, 2927, 2928 coerce missing to a default. The direction is conservative — it
never credits unevidenced protection — but a pre-field historical record must be
read as `unknown`, not as `ORIGINAL` / `false`.

---

## 4. H1 — Frozen baseline

```
At SCANNER_BASELINE_2026-09-18_idx9a4863e1, the Scanner is a
stop-state / target-state model. It holds no quantity and closes no portion
of any position.
```

### At TP1 — `applyTp1Mutation`, 711

```
records tp1Hit, tp1HitAt, tp1HitPrice
moves the modeled stop to entry     UNCONDITIONALLY, via applyStopMove  (731)
represents partial quantity closure NO
persisted                            bumpLatchVersion -> saveLatchToDisk (744)
restored                             yes (593–594)
idempotent                           yes — second call returns false (748)
```

### At TP2 — `applyTp2Mutation`, 747

```
records tp2Hit, tp2HitAt, tp2HitPrice
moves the modeled stop               NO — the function contains no applyStopMove call
represents partial quantity closure  NO
persisted / restored / idempotent    yes
```

### The runner stop moves on a bias flip, not at TP2

`index.js:4609` — the A5 P1 branch:

```js
if (_flipActionable && postTP2Runner) { ...
    if (_r.tpsl && _r.tpsl.tp1) applyStopMove(pair, _r.tpsl.tp1, 'a5p1_secure_tp1');
```

`_flipActionable = biasFlipped || _flipConfirmed` (4576, 4585). The subscriber
message at 4294 is gated on `tp2HoldAlertFired`, set only inside that same branch
(4626).

**A trade that reaches TP2 and runs to TP3 without a bias flip never has its stop
moved to TP1.** It carries the TP1 breakeven stop throughout. The model and the
subscriber message agree with each other — both are conditional on an event
unrelated to reaching TP2.

### The baseline's third path is actually two

```
TP2 hit, no flip,    price reverses  ->   0.00R   breakeven stop from TP1
TP2 hit, flip fired, price reverses  ->  +1.00R   A5 P1 moved it to TP1
```

Separable only with flip history. **A replay cannot reconstruct this from target
crossings alone.**

### Revised baseline payoff

| Path | Condition | R |
|---|---|---:|
| Initial stop before TP1 | — | −1.00 |
| TP1 → reversal | stop at breakeven | 0.00 |
| TP2 → reversal, **no flip** | stop still at breakeven | **0.00** |
| TP2 → reversal, **flip fired** | A5 P1 moved stop to TP1 | +1.00 |
| TP3 | full size retained | +6.00 |

### Terminal, manual and invalidation

```
terminal clear      clearFullLifecycle (1459) + 2 approved deleters (§2.3)
outcome record      recordTradeOutcome on every clear (1494)
milestone floor     deriveOutcome('sl_breached', {tp1Hit}) === 'TP1'    (1365)
                    a post-TP1 stop-out is recorded as TP1, not a loss
manual exit         none found
invalidation        'bias_flip', 'latch_expired', 'rule_b_opposite_confirmed',
                    'invariant_quarantine:*'
```

---

## 5. What the policy actually changes

The staged policy makes **two** changes, not one:

```
1  ALLOCATION   sell 25% at TP1, 50% at TP2, 25% at TP3
2  STOP TIMING  move the runner stop to TP1 at TP2, UNCONDITIONALLY
                — the baseline does this only on a bias flip
```

The second was not previously identified. **A positive study result would not be
attributable to either change alone**, so the preregistration should either
declare the joint intervention explicitly, or add a third policy arm that
isolates the stop-timing change.

---

## 6. Outstanding

### 6.1 CLOSED — two deliberate provenance grades, not a key mismatch

`index.js:2882` states the split is intentional: *"triggerPrice is already
supplied by every SL path; closePrice by the reversal paths."*

For `sl_breached`, `closeCtx.closePrice` is absent, so the block at 2873–2881
is skipped entirely and `closeSource` never reaches the `|| 'unspecified'`
fallback. It stays **null** — absence stays explicit rather than becoming a
string. My predicted `'unspecified'` was wrong; the actual behaviour is better.

`exitPrice` and `exitPips` **are** populated for stop-outs, via `_rawExit`
falling back to `triggerPrice` (2886).

```
reversal closes  closePrice · closePriceSource · priceClassified=true   classification-grade
stop-out closes  exitPrice  · exitPips         · priceClassified=false  measurement-grade
                 closePrice=null · closePriceSource=null
staleness gate   90s; older prices ignored, never coerced (2872)
```

The design principle is stated at 2882–2885: exit facts are read *"for
MEASUREMENT ONLY — deliberately not fed into closeCtx, because outcomePips'
greaterOf() would then be able to change `pips`, which would make this an alpha
change rather than an observation."* A measurement that cannot alter what it
measures — the same discipline this project applies elsewhere, already in the
Scanner.

**Two consequences.** The policy engine must read `exitPrice` when `closePrice`
is null, or it will treat every stop-out as having no terminal price. And
`closePriceSource` exists only on reversal closes, so H31's event-order
authority is **established for reversals, absent for stop-outs** — a stated
limitation, not a defect.

### 6.2 Still outstanding

```
[ ] §2.3 event-order authority: price source and cadence for target crossings
[ ] candidateEventBuffer.js (9.7 KB) and candidateAck.js (15.9 KB)
    — separate pass, serves gates 0a and Packet 4
```

## 7. Register effects

```
H22   CLOSE — stopMoveActuallyApplied exists, persists, restores, is recorded
H1    baseline revised — the TP2 path splits on bias flip
H45   invariant must name three approved deleters, not one
H29   BASELINE_MODEL_STOPS_ONLY_V1 needs the flip-conditional branch
H31   partially answered; blocked on the closePriceSource question
F3    deployment identity OBSERVED for four files at the hashes in §1
NEW   the policy is a joint intervention — allocation AND stop timing
```
