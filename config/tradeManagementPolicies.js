'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════
   TRADE-MANAGEMENT POLICY CONFIGURATION — H12

   WHAT THIS IS. A versioned, SHADOW_ONLY declaration of two named policies and the state
   vocabulary a policy study may use, plus pure validation over them.

   WHAT THIS IS NOT. It imports no live state, calls no lifecycle mutation, sends no order,
   reads no Redis, touches no entryLatch, and alters no Scanner behaviour. It cannot: there is
   nothing here but data and functions over that data.

   A NOTE ON WHY IT IS DATA AND NOT BEHAVIOUR. The study compares two policies over the same
   observed lifecycle path. Both are deterministic functions of that path, so the entire
   comparison is arithmetic once a path is classified. The only empirical quantities are the
   path distribution and the classifiable fraction. Encoding the policies as data keeps that
   honest: nothing here can compute a result, only describe what a result would mean.

   PHASE C IS R-ONLY. No account equity, no percentage return, no compounding, no spread,
   commission, slippage or swap, no broker fills. `initialRiskPct` is null by construction and
   `netModelR` is permanently unavailable in this phase — recorded as a reason, not a zero.
   ════════════════════════════════════════════════════════════════════════════════════════════ */

/* Scanner-local for now. Whether this becomes a shared-contract schema depends on whether any
   cross-repository consumer will receive these records — a decision to make before the first
   export, not because the constant exists. */
const POLICY_SCHEMA_VERSION = 1;

/* ── Cohort boundary ─────────────────────────────────────────────────────────────────────────
   Before 2026-09-07, `_candidatePriorState` was in-memory only. On restart it was empty, so
   candidateVersion reset to 1 — and because candidateKey is stable across restarts by design,
   every one of the first N post-restart events for a live candidate collided as a duplicate.
   Counted as `skipped`, indistinguishable from a quiet market.

   A study window crossing this date may contain blind periods that look like inactivity. This
   is a hard date, not a judgement. */
const FIRST_STUDY_COHORT_EARLIEST_ELIGIBLE_ISO = '2026-09-07T00:00:00.000Z';

/* ── Terminal clear authority ────────────────────────────────────────────────────────────────
   index.js:21 documents clearFullLifecycle as the ONLY terminal clear path. transition_audit.js
   enforces three. Both extras record an outcome before deleting and are legitimate; an
   invariant naming only the first would fire TERMINAL_STATE_CONFLICT on lawful quarantine. */
const APPROVED_TERMINAL_DELETERS = Object.freeze([
  'clearFullLifecycle',
  'loadLatchFromDisk',      // invariant quarantine — records the outcome first
  'assertTerminalCleared',  // force-removal of a latch that survived a terminal path
]);

/* ── Lifecycle states ────────────────────────────────────────────────────────────────────────
   Standard progression. A terminal carries a gross model R only when the facts establish it. */
const STATES = Object.freeze({
  NOT_ACTIVE: 'NOT_ACTIVE',
  ACTIVE_INITIAL_RISK: 'ACTIVE_INITIAL_RISK',
  TP1_PARTIAL_BE: 'TP1_PARTIAL_BE',
  TP2_PARTIAL_RUNNER_AT_TP1: 'TP2_PARTIAL_RUNNER_AT_TP1',

  CLOSED_INITIAL_STOP: 'CLOSED_INITIAL_STOP',
  CLOSED_BREAKEVEN: 'CLOSED_BREAKEVEN',
  CLOSED_TP1_LOCKED: 'CLOSED_TP1_LOCKED',
  CLOSED_TP3: 'CLOSED_TP3',

  POLICY_STATE_AMBIGUOUS: 'POLICY_STATE_AMBIGUOUS',
  CLOSED_POLICY_EXCEPTION: 'CLOSED_POLICY_EXCEPTION',
  CLOSED_MANUAL_EXIT: 'CLOSED_MANUAL_EXIT',
  CLOSED_INVALIDATION: 'CLOSED_INVALIDATION',
});

/* Exception and event classes. Each preserves raw facts and none may produce positive R credit
   where target/stop order, quantity, lifecycle order, or terminal authority is unestablished. */
/* Stable machine values. Prose belongs in the description map, not in the persisted value:
   a description that changes is a silent semantic change to every stored record. */
const EXCEPTION_CLASSES = Object.freeze({
  GAP_THROUGH_TARGETS: 'gap_through_targets',
  GAP_THROUGH_STOP: 'gap_through_stop',
  EVENT_ORDER_AMBIGUOUS: 'event_order_ambiguous',
  QUANTITY_UNAVAILABLE: 'quantity_unavailable',
  QUANTITY_CONTRADICTORY: 'quantity_contradictory',
  DUPLICATE_MILESTONE_EVENT: 'duplicate_milestone_event',
  OUT_OF_ORDER_MILESTONE_EVENT: 'out_of_order_milestone_event',
  TERMINAL_STATE_CONFLICT: 'terminal_state_conflict',
});

const EXCEPTION_CLASS_DESCRIPTIONS = Object.freeze({
  [EXCEPTION_CLASSES.GAP_THROUGH_TARGETS]:
    'One observation crosses two or more milestones without establishing order.',
  [EXCEPTION_CLASSES.GAP_THROUGH_STOP]:
    'Observed terminal price is beyond the planned stop.',
  [EXCEPTION_CLASSES.EVENT_ORDER_AMBIGUOUS]:
    'Target and stop reachable within one unorderable observation interval.',
  [EXCEPTION_CLASSES.QUANTITY_UNAVAILABLE]:
    'Original or remaining quantity cannot be established or derived.',
  [EXCEPTION_CLASSES.QUANTITY_CONTRADICTORY]:
    'Quantity facts conflict with original quantity, allocations, or prior events.',
  [EXCEPTION_CLASSES.DUPLICATE_MILESTONE_EVENT]: 'Repeat TP1/TP2/TP3 event.',
  [EXCEPTION_CLASSES.OUT_OF_ORDER_MILESTONE_EVENT]:
    'Milestone observed without its eligible predecessor state.',
  [EXCEPTION_CLASSES.TERMINAL_STATE_CONFLICT]:
    'Terminal recorded, then later events imply continued exposure.',
});

/* ── Stop-transition evidence ────────────────────────────────────────────────────────────────
   Three-valued by contract. `stopMoveActuallyApplied` in the Scanner is MOVE-GENERIC: it is set
   by any successful applyStopMove, so a Rule A trail sets it identically to a TP1 breakeven.
   `stopProtectionState === 'BREAKEVEN'` is the usable fact for the breakeven path.

   PROFIT_PROTECTED does NOT identify the TP1-locked state — it covers any stop beyond entry,
   including a Rule A trail. Classifying CLOSED_TP1_LOCKED requires comparing stopLoss against
   tpsl.tp1, not the protection state alone. */
/* A single NOT_APPLIED would collapse materially different cases: never attempted, attempted
   and refused by the monotonic guard, mutated but not persisted, persisted but not restored.
   Each has a different meaning for custody and a different remedy. */
const STOP_TRANSITION_EVIDENCE = Object.freeze({
  TP1_BREAKEVEN_ESTABLISHED: 'tp1_breakeven_established',
  TP2_TP1_LOCK_ESTABLISHED: 'tp2_tp1_lock_established',
  OTHER_PROFIT_TRAIL_ESTABLISHED: 'other_profit_trail_established',
  ORIGINAL_STOP_ESTABLISHED: 'original_stop_established',

  NOT_ATTEMPTED: 'not_attempted',
  ATTEMPT_FAILED: 'attempt_failed',
  PERSISTENCE_FAILED: 'persistence_failed',
  RESTORE_FAILED: 'restore_failed',

  UNKNOWN: 'unknown',
  CONTRADICTORY: 'contradictory',
});

/* Only the exact transition supports the payoff. `stopMoveActuallyApplied` in the Scanner is
   move-generic and `PROFIT_PROTECTED` covers any stop beyond entry including a Rule A trail,
   so neither alone can support CLOSED_TP1_LOCKED. */
const TERMINAL_EVIDENCE_REQUIREMENT = Object.freeze({
  [STATES.CLOSED_BREAKEVEN]: STOP_TRANSITION_EVIDENCE.TP1_BREAKEVEN_ESTABLISHED,
  [STATES.CLOSED_TP1_LOCKED]: STOP_TRANSITION_EVIDENCE.TP2_TP1_LOCK_ESTABLISHED,
});

/* A stop-transition failure is a LIFECYCLE CONTROL EXCEPTION, never an alternative payoff path.
   Encoding it as a standard outcome would make the policy's expected value depend on how often
   the system fails, and would remove the pressure to fix it. */
const STOP_FAILURE_TREATMENT = Object.freeze({
  policyOutcome: STATES.POLICY_STATE_AMBIGUOUS,
  controlMetric: 'stop_transition_failure',
  addToStandardPayoffTable: false,
  note: 'Policy outcome and control quality are separate variables. Record both; credit neither.',
});

/* ── Policies ────────────────────────────────────────────────────────────────────────────────
   Allocations are ALWAYS fractions of ORIGINAL quantity. TP2 = 0.50 means half the original
   position, never half of the 75% remaining after TP1. That would be a different policy. */

const ASCENSION_MODEL_1PCT_25_50_25_V1 = {
  policyId: 'ASCENSION_MODEL_1PCT_25_50_25_V1',
  policySchemaVersion: POLICY_SCHEMA_VERSION,
  mode: 'SHADOW_ONLY',

  resultLayer: 'scanner_model',
  executionAuthority: 'scanner_virtual',
  brokerReconciliationStatus: 'not_available',

  initialRiskR: 1.00,
  initialRiskPct: null,                         // no account exists in shadow mode
  riskBasis: 'R_ONLY_NO_EQUITY_BASIS',
  netModelRUnavailableReason: 'OUT_OF_SCOPE_PHASE_C_R_ONLY',

  allocationsOfOriginal: { tp1: 0.25, tp2: 0.50, tp3: 0.25 },
  plannedTargetsR: { tp1: 1.00, tp2: 3.00, tp3: 6.00 },

  stopTransitions: {
    atTp1: { to: 'entry', conditional: false, trigger: 'tp1_milestone' },
    atTp2: { to: 'tp1', conditional: false, trigger: 'tp2_milestone' },
    postTp2Transitions: [],        // nothing later; the lock happens AT the milestone
  },

  /* The four standard terminals. Each requires its stop transition to be ESTABLISHED; anything
     else is POLICY_STATE_AMBIGUOUS per STOP_FAILURE_TREATMENT. */
  standardTerminals: {
    [STATES.CLOSED_INITIAL_STOP]: { grossModelR: -1.00, requiredStopTransitionEvidence: null },
    [STATES.CLOSED_BREAKEVEN]:    { grossModelR: +0.25,
      requiredStopTransitionEvidence: 'tp1_breakeven_established' },
    [STATES.CLOSED_TP1_LOCKED]:   { grossModelR: +2.00,
      requiredStopTransitionEvidence: 'tp2_tp1_lock_established' },
    [STATES.CLOSED_TP3]:          { grossModelR: +3.25, requiredStopTransitionEvidence: null },
  },
};

/* The frozen baseline, from direct deployed-source reading on 2026-09-18.

   The Scanner holds no quantity and closes no portion of any position. At TP1 it moves the
   modeled stop to entry unconditionally (applyTp1Mutation -> applyStopMove 'tp1_breakeven').
   At TP2 it stamps the fact and moves nothing — applyTp2Mutation contains no applyStopMove
   call. The runner stop moves to TP1 only when A5 P1 fires, and A5 P1's condition is
   `_flipActionable && postTP2Runner` where _flipActionable = biasFlipped || _flipConfirmed.

   So a trade reaching TP2 and running to TP3 without a bias flip never has its stop moved. Its
   reversal path returns 0.00R, not +1.00R. That splits the baseline's TP2 reversal in two,
   separable only with flip history — a replay cannot reconstruct it from target crossings. */
const BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1 = {
  policyId: 'BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1',
  policySchemaVersion: POLICY_SCHEMA_VERSION,
  mode: 'SHADOW_ONLY',

  resultLayer: 'scanner_model',
  executionAuthority: 'scanner_virtual',
  brokerReconciliationStatus: 'not_available',

  initialRiskR: 1.00,
  initialRiskPct: null,
  riskBasis: 'R_ONLY_NO_EQUITY_BASIS',
  netModelRUnavailableReason: 'OUT_OF_SCOPE_PHASE_C_R_ONLY',

  allocationsOfOriginal: { tp1: 0, tp2: 0, tp3: 1.00 },   // full size carried to the terminal
  plannedTargetsR: { tp1: 1.00, tp2: 3.00, tp3: 6.00 },

  stopTransitions: {
    atTp1: { to: 'entry', conditional: false, trigger: 'tp1_milestone' },
    /* NOTHING happens at the TP2 milestone. applyTp2Mutation stamps the fact and saves;
       it contains no applyStopMove call. Encoding a conditional move here would describe
       the baseline more cleanly than the source implements it. */
    atTp2: { to: null, conditional: false, trigger: 'tp2_milestone' },
    postTp2Transitions: [
      { to: 'tp1', conditional: true,
        condition: 'bias_flip_actionable && post_tp2_runner',
        trigger: 'a5_p1' },
    ],
  },

  standardTerminals: {
    [STATES.CLOSED_INITIAL_STOP]: { grossModelR: -1.00, requiredStopTransitionEvidence: null },
    [STATES.CLOSED_BREAKEVEN]:    { grossModelR:  0.00,
      requiredStopTransitionEvidence: 'tp1_breakeven_established' },
    [STATES.CLOSED_TP1_LOCKED]:   { grossModelR: +1.00,
      requiredStopTransitionEvidence: 'tp2_tp1_lock_established',
      requiredConditionEvidence: 'bias_flip_actionable && post_tp2_runner' },
    [STATES.CLOSED_TP3]:          { grossModelR: +6.00, requiredStopTransitionEvidence: null },
  },

  /* The TP2 reversal WITHOUT an actionable flip. Not a fifth policy path — the same
     CLOSED_BREAKEVEN terminal, reached from a later state because no stop move occurred. */
  flipConditionalNote:
    'A TP2 reversal with no actionable bias flip terminates at CLOSED_BREAKEVEN (0.00R), not '
    + 'CLOSED_TP1_LOCKED. Flip history is required to distinguish them; target crossings alone '
    + 'are insufficient.',
};

/* Object.freeze is shallow. A configuration contract whose nested tables can be mutated is
   not a contract. */
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

const POLICIES = deepFreeze({
  [ASCENSION_MODEL_1PCT_25_50_25_V1.policyId]: ASCENSION_MODEL_1PCT_25_50_25_V1,
  [BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1.policyId]:
    BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1,
});

/* The first study compares exactly these two. Neighbouring allocations are predeclared
   descriptive sensitivity analyses and cannot be promoted from the same study. */
const FIRST_STUDY = deepFreeze({
  intervention: ASCENSION_MODEL_1PCT_25_50_25_V1.policyId,
  comparator: BASELINE_MODEL_STOPS_ONLY_FLIP_CONDITIONAL_TP2_LOCK_V1.policyId,
  isJointIntervention: true,
  jointComponents: Object.freeze(['allocation_25_50_25', 'unconditional_tp2_stop_lock']),
  jointNote:
    'The intervention changes TWO things: allocation, and stop timing at TP2. A positive result '
    + 'is not attributable to either alone. Decomposition requires a separate preregistered study.',
  sensitivityArmsDescriptiveOnly: Object.freeze(['33/33/33', '50/25/25', '25/25/50']),
});

/* ── Validation ──────────────────────────────────────────────────────────────────────────────
   Pure. Returns a report; never throws, never mutates, never repairs. */

function isFiniteNumber(v) { return typeof v === 'number' && Number.isFinite(v); }

function validatePolicy(policy) {
  const errors = [];
  const E = (code, field, message) => errors.push({ code, field, message });

  if (!policy || typeof policy !== 'object') {
    return { policyId: null, valid: false,
             errors: [{ code: 'E_NOT_OBJECT', field: '(root)', message: 'Policy must be an object.' }] };
  }

  if (typeof policy.policyId !== 'string' || !policy.policyId.trim()) {
    E('E_MISSING_POLICY_ID', 'policyId', 'A policy must carry a stable identifier.');
  }
  if (policy.policySchemaVersion !== POLICY_SCHEMA_VERSION) {
    E('E_SCHEMA_VERSION', 'policySchemaVersion',
      `Unsupported schema version. Expected ${POLICY_SCHEMA_VERSION}, never defaulted.`);
  }
  if (policy.mode !== 'SHADOW_ONLY') {
    E('E_MODE_NOT_SHADOW', 'mode', 'Phase C policies are SHADOW_ONLY. No other mode is permitted.');
  }

  // R-only invariants
  if (policy.initialRiskPct !== null) {
    E('E_RISK_PCT_NOT_NULL', 'initialRiskPct',
      'No account exists in shadow mode, so no percentage basis exists. Must be null.');
  }
  if (policy.riskBasis !== 'R_ONLY_NO_EQUITY_BASIS') {
    E('E_RISK_BASIS', 'riskBasis', 'Phase C computes in R-multiples only.');
  }
  if (policy.resultLayer !== 'scanner_model') {
    E('E_RESULT_LAYER', 'resultLayer', 'Scanner-model evidence is not broker-reconciled.');
  }
  if (policy.brokerReconciliationStatus !== 'not_available') {
    E('E_BROKER_STATUS', 'brokerReconciliationStatus', 'No broker path exists in this phase.');
  }

  // Allocations
  const a = policy.allocationsOfOriginal;
  if (!a || typeof a !== 'object') {
    E('E_ALLOCATIONS_MISSING', 'allocationsOfOriginal', 'Allocations are required.');
  } else {
    for (const k of ['tp1', 'tp2', 'tp3']) {
      if (!isFiniteNumber(a[k]) || a[k] < 0 || a[k] > 1) {
        E('E_ALLOCATION_RANGE', `allocationsOfOriginal.${k}`,
          'Each allocation is a fraction of ORIGINAL quantity in [0, 1].');
      }
    }
    const sum = ['tp1', 'tp2', 'tp3'].reduce((s, k) => s + (isFiniteNumber(a[k]) ? a[k] : NaN), 0);
    if (!Number.isFinite(sum) || Math.abs(sum - 1.00) > 1e-9) {
      E('E_ALLOCATIONS_SUM', 'allocationsOfOriginal',
        `Allocations must sum to exactly 1.00 of ORIGINAL quantity. Got ${sum}.`);
    }
  }

  // Target ordering
  const t = policy.plannedTargetsR;
  if (!t || typeof t !== 'object') {
    E('E_TARGETS_MISSING', 'plannedTargetsR', 'Planned targets are required.');
  } else if (!(isFiniteNumber(t.tp1) && isFiniteNumber(t.tp2) && isFiniteNumber(t.tp3))) {
    E('E_TARGETS_NOT_FINITE', 'plannedTargetsR', 'Targets must be finite R-multiples.');
  } else if (!(t.tp1 > 0 && t.tp2 > t.tp1 && t.tp3 > t.tp2)) {
    E('E_TARGET_ORDER', 'plannedTargetsR',
      `Targets must be strictly increasing and positive. Got ${t.tp1}, ${t.tp2}, ${t.tp3}.`);
  }

  // Stop transitions
  const st = policy.stopTransitions;
  if (!st || typeof st !== 'object') {
    E('E_STOP_TRANSITIONS_MISSING', 'stopTransitions', 'Stop transitions are required.');
  } else {
    if (!st.atTp1 || st.atTp1.to !== 'entry') {
      E('E_TP1_STOP_TARGET', 'stopTransitions.atTp1', 'TP1 moves the stop to entry.');
    }
    if (!st.atTp2 || !('to' in st.atTp2)) {
      E('E_TP2_TRANSITION_MISSING', 'stopTransitions.atTp2',
        'A policy must state what happens at the TP2 milestone, including "nothing" as to: null.');
    } else if (st.atTp2.to !== null && st.atTp2.to !== 'tp1') {
      E('E_TP2_STOP_TARGET', 'stopTransitions.atTp2',
        'The TP2 milestone either moves the stop to TP1 or does nothing (to: null).');
    }
    /* A milestone transition fires at the milestone. One that depends on a later, unrelated
       event is not a milestone transition — it belongs in postTp2Transitions. This is the
       exact error the first draft of this file made about the baseline. */
    if (st.atTp2 && st.atTp2.to !== null && st.atTp2.conditional === true) {
      E('E_MILESTONE_TRANSITION_CONDITIONAL', 'stopTransitions.atTp2',
        'A milestone transition cannot be conditional on a later event. Move it to '
        + 'postTp2Transitions and name its trigger.');
    }
    if (!Array.isArray(st.postTp2Transitions)) {
      E('E_POST_TP2_MISSING', 'stopTransitions.postTp2Transitions',
        'Declare post-TP2 transitions explicitly, as [] when there are none.');
    } else {
      for (let i = 0; i < st.postTp2Transitions.length; i += 1) {
        const p2 = st.postTp2Transitions[i];
        if (!p2 || typeof p2 !== 'object') {
          E('E_POST_TP2_SHAPE', `stopTransitions.postTp2Transitions[${i}]`, 'Must be an object.');
          continue;
        }
        if (p2.conditional === true && !p2.condition) {
          E('E_CONDITION_UNNAMED', `stopTransitions.postTp2Transitions[${i}].condition`,
            'A conditional transition must name its condition. An unnamed condition cannot be replayed.');
        }
        if (!p2.trigger) {
          E('E_TRIGGER_UNNAMED', `stopTransitions.postTp2Transitions[${i}].trigger`,
            'A later transition must name the rule that fires it.');
        }
      }
      if (st.atTp2 && st.atTp2.to === 'tp1' && st.postTp2Transitions.some(x => x && x.to === 'tp1')) {
        E('E_DUPLICATE_TP1_LOCK', 'stopTransitions',
          'The runner stop cannot lock to TP1 both at the milestone and again later.');
      }
    }
  }

  // Standard terminals
  const term = policy.standardTerminals;
  const REQUIRED = [STATES.CLOSED_INITIAL_STOP, STATES.CLOSED_BREAKEVEN,
                    STATES.CLOSED_TP1_LOCKED, STATES.CLOSED_TP3];
  if (!term || typeof term !== 'object') {
    E('E_TERMINALS_MISSING', 'standardTerminals', 'Standard terminals are required.');
  } else {
    for (const k of REQUIRED) {
      if (!term[k]) { E('E_TERMINAL_MISSING', `standardTerminals.${k}`, 'Required terminal absent.'); continue; }
      if (!isFiniteNumber(term[k].grossModelR)) {
        E('E_TERMINAL_R', `standardTerminals.${k}.grossModelR`,
          'A standard terminal must carry a finite gross model R.');
      }
      if (!('requiredStopTransitionEvidence' in term[k])) {
        E('E_EVIDENCE_UNSTATED', `standardTerminals.${k}.requiredStopTransitionEvidence`,
          'State the exact transition evidence required, or null where none is. A boolean '
          + 'cannot distinguish a TP1 breakeven from a Rule A trail.');
      } else {
        const req = term[k].requiredStopTransitionEvidence;
        const allowed = Object.values(STOP_TRANSITION_EVIDENCE);
        if (req !== null && !allowed.includes(req)) {
          E('E_EVIDENCE_UNKNOWN_VALUE', `standardTerminals.${k}.requiredStopTransitionEvidence`,
            `Not a member of STOP_TRANSITION_EVIDENCE. Got ${JSON.stringify(req)}.`);
        }
        const expected = TERMINAL_EVIDENCE_REQUIREMENT[k];
        if (expected && req !== expected) {
          E('E_EVIDENCE_MISMATCH', `standardTerminals.${k}.requiredStopTransitionEvidence`,
            `${k} is supported only by ${expected}. A generic or other transition cannot carry it.`);
        }
      }
    }
    for (const k of Object.keys(term)) {
      if (!REQUIRED.includes(k)) {
        E('E_TERMINAL_UNEXPECTED', `standardTerminals.${k}`,
          'Only the four standard terminals may carry a payoff. Exceptions carry null.');
      }
    }
    const stopR = term[STATES.CLOSED_INITIAL_STOP];
    if (stopR && stopR.grossModelR !== -1.00) {
      E('E_INITIAL_STOP_R', `standardTerminals.${STATES.CLOSED_INITIAL_STOP}`,
        'The initial-stop path is -1.00R by definition of R.');
    }
  }

  return { policyId: policy.policyId || null, valid: errors.length === 0, errors };
}

function validateAll() {
  const reports = Object.values(POLICIES).map(validatePolicy);
  return { valid: reports.every(r => r.valid), reports };
}

/* The paired difference between the two named policies, as a formula over path counts.
   Returned as data, not computed over evidence — this module never sees a trade. */
function pairedDifferenceSpec() {
  const s = POLICIES[FIRST_STUDY.intervention].standardTerminals;
  const b = POLICIES[FIRST_STUDY.comparator].standardTerminals;
  return Object.freeze({
    formula: 'dR = 0.25*B + 2.00*L_noflip + 1.00*L_flip - 2.75*T',
    terms: Object.freeze({
      B: { meaning: 'TP1 reversal at breakeven',
           delta: +(s[STATES.CLOSED_BREAKEVEN].grossModelR - b[STATES.CLOSED_BREAKEVEN].grossModelR) },
      L_noflip: { meaning: 'TP2 reversal, no actionable flip; baseline stop still at breakeven',
                  delta: +(s[STATES.CLOSED_TP1_LOCKED].grossModelR - b[STATES.CLOSED_BREAKEVEN].grossModelR) },
      L_flip: { meaning: 'TP2 reversal with actionable flip; baseline stop moved to TP1',
                delta: +(s[STATES.CLOSED_TP1_LOCKED].grossModelR - b[STATES.CLOSED_TP1_LOCKED].grossModelR) },
      T: { meaning: 'TP3 reached',
           delta: +(s[STATES.CLOSED_TP3].grossModelR - b[STATES.CLOSED_TP3].grossModelR) },
      stop: { meaning: 'initial stop before TP1', delta: 0 },
    }),
    note: 'The initial-stop path contributes nothing: both policies assign -1.00R. The '
        + 'flip rate on TP2 reversals sets the sign and size of the difference and is '
        + 'measured nowhere yet.',
  });
}

module.exports = Object.freeze({
  POLICY_SCHEMA_VERSION,
  FIRST_STUDY_COHORT_EARLIEST_ELIGIBLE_ISO,
  APPROVED_TERMINAL_DELETERS,
  STATES,
  EXCEPTION_CLASSES,
  EXCEPTION_CLASS_DESCRIPTIONS,
  STOP_TRANSITION_EVIDENCE,
  TERMINAL_EVIDENCE_REQUIREMENT,
  deepFreeze,
  STOP_FAILURE_TREATMENT,
  POLICIES,
  FIRST_STUDY,
  validatePolicy,
  validateAll,
  pairedDifferenceSpec,
});
