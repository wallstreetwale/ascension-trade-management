'use strict';
/* tradeManagementPolicies.selftest.js — no framework, no dependencies.
     node config/tradeManagementPolicies.selftest.js      exit 0 = pass

   Proves the module is inert (imports nothing that can reach anything), that the two named
   policies are internally consistent, and that the validator refuses the specific mistakes
   this project has already made once. */

const path = require('path');
const fs = require('fs');
const P = require('./tradeManagementPolicies');

let pass = 0; const fails = [];
const check = (n, c, d) => c
  ? (pass++, process.stdout.write(`  PASS  ${n}\n`))
  : (fails.push(n), process.stdout.write(`  FAIL  ${n}${d ? ` — ${d}` : ''}\n`));
const section = t => process.stdout.write(`\n${t}\n${'-'.repeat(t.length)}\n`);

const clone = o => JSON.parse(JSON.stringify(o));
const STAGED = P.POLICIES[P.FIRST_STUDY.intervention];
const BASE = P.POLICIES[P.FIRST_STUDY.comparator];
const has = (r, code) => r.errors.some(e => e.code === code);

/* ═══════════════════════════════════════════════════════════════════ */
section('1. The module is inert');

{
  const src = fs.readFileSync(path.join(__dirname, 'tradeManagementPolicies.js'), 'utf8');
  const forbidden = ['child_process', 'net', 'http', 'https', 'dns', 'tls', 'redis', 'ioredis',
                     'pg', 'fs', 'axios', 'node-fetch', 'undici'];
  const found = forbidden.filter(m =>
    new RegExp(`require\\s*\\(\\s*['"\`](node:)?${m}['"\`]`).test(src));
  check('imports nothing capable of reaching anything', found.length === 0, found.join(', '));
  check('no reference to entryLatch', !/entryLatch/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('no lifecycle mutation calls',
    !/applyTp1Mutation\s*\(|applyTp2Mutation\s*\(|applyStopMove\s*\(|clearFullLifecycle\s*\(/
      .test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
  check('exports are frozen', Object.isFrozen(P));
  check('policies are frozen', Object.isFrozen(P.POLICIES) && Object.isFrozen(STAGED));
}

/* ═══════════════════════════════════════════════════════════════════ */
section('2. Both named policies validate');

{
  const all = P.validateAll();
  check('validateAll passes', all.valid,
    JSON.stringify(all.reports.filter(r => !r.valid).map(r => r.errors)));
  check('exactly two policies are declared', Object.keys(P.POLICIES).length === 2);
  check('first study names intervention and comparator',
    P.POLICIES[P.FIRST_STUDY.intervention] && P.POLICIES[P.FIRST_STUDY.comparator]);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('3. Payoff tables match the established facts');

{
  const s = STAGED.standardTerminals, b = BASE.standardTerminals;
  check('staged: initial stop -1.00R', s[P.STATES.CLOSED_INITIAL_STOP].grossModelR === -1.00);
  check('staged: breakeven +0.25R',    s[P.STATES.CLOSED_BREAKEVEN].grossModelR === +0.25);
  check('staged: TP1-locked +2.00R',   s[P.STATES.CLOSED_TP1_LOCKED].grossModelR === +2.00);
  check('staged: TP3 +3.25R',          s[P.STATES.CLOSED_TP3].grossModelR === +3.25);

  check('baseline: initial stop -1.00R', b[P.STATES.CLOSED_INITIAL_STOP].grossModelR === -1.00);
  check('baseline: breakeven 0.00R',     b[P.STATES.CLOSED_BREAKEVEN].grossModelR === 0.00);
  check('baseline: TP1-locked +1.00R',   b[P.STATES.CLOSED_TP1_LOCKED].grossModelR === +1.00);
  check('baseline: TP3 +6.00R',          b[P.STATES.CLOSED_TP3].grossModelR === +6.00);

  // the staged payoffs are derivable from the allocations, not asserted independently
  const a = STAGED.allocationsOfOriginal, t = STAGED.plannedTargetsR;
  check('staged +0.25R derives from 0.25(1R) + 0.75(0R)',
    Math.abs((a.tp1 * t.tp1 + (1 - a.tp1) * 0) - s[P.STATES.CLOSED_BREAKEVEN].grossModelR) < 1e-9);
  check('staged +2.00R derives from 0.25(1R) + 0.50(3R) + 0.25(1R)',
    Math.abs((a.tp1 * t.tp1 + a.tp2 * t.tp2 + a.tp3 * t.tp1) - s[P.STATES.CLOSED_TP1_LOCKED].grossModelR) < 1e-9);
  check('staged +3.25R derives from 0.25(1R) + 0.50(3R) + 0.25(6R)',
    Math.abs((a.tp1 * t.tp1 + a.tp2 * t.tp2 + a.tp3 * t.tp3) - s[P.STATES.CLOSED_TP3].grossModelR) < 1e-9);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('4. The baseline records flip-conditional TP2 behaviour');

{
  check('baseline does NOTHING at the TP2 milestone', BASE.stopTransitions.atTp2.to === null);
  check('the baseline lock is a LATER transition', BASE.stopTransitions.postTp2Transitions.length === 1);
  check('it names the real condition, not a simplification',
    BASE.stopTransitions.postTp2Transitions[0].condition === 'bias_flip_actionable && post_tp2_runner');
  check('it names the rule that fires it', BASE.stopTransitions.postTp2Transitions[0].trigger === 'a5_p1');
  check('staged TP2 stop move is unconditional', STAGED.stopTransitions.atTp2.conditional === false);
  check('staged locks at the TP2 milestone', STAGED.stopTransitions.atTp2.to === 'tp1');
  check('staged has no later transitions', STAGED.stopTransitions.postTp2Transitions.length === 0);
  check('baseline TP1-locked requires condition evidence',
    BASE.standardTerminals[P.STATES.CLOSED_TP1_LOCKED].requiredConditionEvidence
      === 'bias_flip_actionable && post_tp2_runner');
  check('staged TP1-locked requires no condition evidence',
    STAGED.standardTerminals[P.STATES.CLOSED_TP1_LOCKED].requiredConditionEvidence === undefined);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('5. The joint intervention is declared, not implied');

{
  check('first study is marked a joint intervention', P.FIRST_STUDY.isJointIntervention === true);
  check('both components are named', P.FIRST_STUDY.jointComponents.length === 2);
  check('sensitivity arms are marked descriptive only',
    Array.isArray(P.FIRST_STUDY.sensitivityArmsDescriptiveOnly)
    && P.FIRST_STUDY.sensitivityArmsDescriptiveOnly.length === 3);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('6. The paired-difference spec matches the payoff tables');

{
  const d = P.pairedDifferenceSpec();
  check('B delta = +0.25R',        Math.abs(d.terms.B.delta - 0.25) < 1e-9);
  check('L_noflip delta = +2.00R', Math.abs(d.terms.L_noflip.delta - 2.00) < 1e-9);
  check('L_flip delta = +1.00R',   Math.abs(d.terms.L_flip.delta - 1.00) < 1e-9);
  check('T delta = -2.75R',        Math.abs(d.terms.T.delta + 2.75) < 1e-9);
  check('initial stop contributes nothing', d.terms.stop.delta === 0);
  // the old (wrong) formula assumed every TP2 reversal returned +1.00R in the baseline
  check('L_noflip differs from L_flip — the correction is encoded',
    d.terms.L_noflip.delta !== d.terms.L_flip.delta);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('7. Validator refuses the mistakes already made once');

{
  const bad = clone(STAGED); bad.allocationsOfOriginal.tp2 = 0.375;  // 50% of the REMAINING 75%
  check('refuses allocations that do not sum to 1.00 of ORIGINAL',
    has(P.validatePolicy(bad), 'E_ALLOCATIONS_SUM'));
}
{
  const bad = clone(STAGED); bad.initialRiskPct = 0.01;
  check('refuses a percentage risk basis in shadow mode',
    has(P.validatePolicy(bad), 'E_RISK_PCT_NOT_NULL'));
}
{
  const bad = clone(STAGED); bad.mode = 'LIVE';
  check('refuses any mode other than SHADOW_ONLY', has(P.validatePolicy(bad), 'E_MODE_NOT_SHADOW'));
}
{
  const bad = clone(STAGED); bad.plannedTargetsR = { tp1: 3, tp2: 1, tp3: 6 };
  check('refuses non-increasing targets', has(P.validatePolicy(bad), 'E_TARGET_ORDER'));
}
{
  const bad = clone(STAGED);
  bad.standardTerminals.CLOSED_TP1_STOP_NOT_MOVED = { grossModelR: -0.50 };
  check('refuses a stop-failure path added to the payoff table',
    has(P.validatePolicy(bad), 'E_TERMINAL_UNEXPECTED'));
}
{
  const bad = clone(BASE);
  bad.stopTransitions.postTp2Transitions[0].condition = undefined;
  check('refuses a conditional transition with no named condition',
    has(P.validatePolicy(bad), 'E_CONDITION_UNNAMED'));
}
{
  const bad = clone(STAGED); bad.policySchemaVersion = 2;
  check('refuses an unsupported schema version, never defaults',
    has(P.validatePolicy(bad), 'E_SCHEMA_VERSION'));
}
{
  const bad = clone(STAGED); bad.brokerReconciliationStatus = 'reconciled';
  check('refuses a broker-reconciled claim', has(P.validatePolicy(bad), 'E_BROKER_STATUS'));
}

{
  const bad = clone(BASE);
  bad.stopTransitions.atTp2 = { to: 'tp1', conditional: true, condition: 'bias_flip_actionable' };
  check('refuses a baseline that falsely claims a TP2 MILESTONE lock',
    has(P.validatePolicy(bad), 'E_MILESTONE_TRANSITION_CONDITIONAL'),
    'this was the first draft\'s actual error');
}
{
  const bad = clone(STAGED);
  bad.stopTransitions.postTp2Transitions = [{ to: 'tp1', conditional: true,
    condition: 'x', trigger: 'y' }];
  check('refuses locking to TP1 twice — at the milestone and again later',
    has(P.validatePolicy(bad), 'E_DUPLICATE_TP1_LOCK'));
}
{
  const bad = clone(BASE); delete bad.stopTransitions.postTp2Transitions;
  check('refuses an unstated post-TP2 transition list',
    has(P.validatePolicy(bad), 'E_POST_TP2_MISSING'));
}
{
  const bad = clone(BASE); bad.stopTransitions.postTp2Transitions[0].trigger = undefined;
  check('refuses a later transition with no named trigger',
    has(P.validatePolicy(bad), 'E_TRIGGER_UNNAMED'));
}

/* ═══════════════════════════════════════════════════════════════════ */
section('7b. Terminal evidence must be exact, not generic');

{
  const bad = clone(STAGED);
  bad.standardTerminals[P.STATES.CLOSED_TP1_LOCKED].requiredStopTransitionEvidence =
    'other_profit_trail_established';
  check('refuses a Rule A trail standing in for the TP2 lock',
    has(P.validatePolicy(bad), 'E_EVIDENCE_MISMATCH'));
}
{
  const bad = clone(STAGED);
  bad.standardTerminals[P.STATES.CLOSED_BREAKEVEN].requiredStopTransitionEvidence = 'established';
  check('refuses an evidence value outside the taxonomy',
    has(P.validatePolicy(bad), 'E_EVIDENCE_UNKNOWN_VALUE'));
}
{
  const bad = clone(STAGED);
  delete bad.standardTerminals[P.STATES.CLOSED_BREAKEVEN].requiredStopTransitionEvidence;
  check('refuses a terminal that leaves its evidence requirement unstated',
    has(P.validatePolicy(bad), 'E_EVIDENCE_UNSTATED'));
}
{
  const bad = clone(STAGED);
  bad.standardTerminals[P.STATES.CLOSED_POLICY_EXCEPTION] = { grossModelR: +1.00,
    requiredStopTransitionEvidence: null };
  check('refuses an exception path carrying a positive payoff',
    has(P.validatePolicy(bad), 'E_TERMINAL_UNEXPECTED'));
}

/* ═══════════════════════════════════════════════════════════════════ */
section('7c. The frozen baseline cannot be rewritten into a cleaner policy');

{
  const bad = clone(BASE);
  bad.stopTransitions.atTp2 = { to: 'tp1', conditional: false, trigger: 'tp2_milestone' };
  bad.stopTransitions.postTp2Transitions = [];
  check('refuses a baseline claiming an unconditional TP2 milestone lock',
    has(P.validatePolicy(bad), 'E_BASELINE_TP2_MILESTONE_SEMANTICS'),
    'structurally valid, historically false');
}
{
  const bad = clone(BASE); bad.stopTransitions.postTp2Transitions = [];
  check('refuses a baseline with the A5 P1 rule removed',
    has(P.validatePolicy(bad), 'E_BASELINE_A5_P1_RULE_COUNT'));
}
{
  const bad = clone(BASE);
  bad.stopTransitions.postTp2Transitions[0].condition = 'bias_flip_actionable';
  check('refuses a baseline that drops post_tp2_runner from the condition',
    has(P.validatePolicy(bad), 'E_BASELINE_A5_P1_SEMANTICS'),
    'the real condition is both clauses');
}
{
  const bad = clone(BASE);
  bad.stopTransitions.postTp2Transitions[0].conditional = false;
  check('refuses a baseline that makes the A5 P1 rule unconditional',
    has(P.validatePolicy(bad), 'E_BASELINE_A5_P1_SEMANTICS'));
}
{
  const bad = clone(BASE);
  delete bad.standardTerminals[P.STATES.CLOSED_TP1_LOCKED].requiredConditionEvidence;
  check('refuses a baseline TP1-lock that drops its condition evidence',
    has(P.validatePolicy(bad), 'E_BASELINE_TP1_LOCK_EVIDENCE'));
}
{
  // the pin is scoped: the same shape is legitimate for the intervention
  check('the staged policy is NOT subject to the baseline pin',
    P.validatePolicy(STAGED).valid === true);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('8. Malformed input fails closed');

{
  for (const [n, v] of [['undefined', undefined], ['null', null], ['string', 'policy'],
                        ['number', 7], ['array', []], ['empty object', {}]]) {
    let r, threw = false;
    try { r = P.validatePolicy(v); } catch { threw = true; }
    check(`does not throw on ${n}`, !threw);
    if (r) check(`refuses ${n}`, r.valid === false);
  }
}
{
  const before = JSON.stringify(STAGED);
  P.validatePolicy(STAGED);
  check('validation does not mutate its input', JSON.stringify(STAGED) === before);
}

/* ═══════════════════════════════════════════════════════════════════ */
section('9. Governance facts are carried, not remembered');

{
  check('three approved terminal deleters, not one',
    P.APPROVED_TERMINAL_DELETERS.length === 3
    && P.APPROVED_TERMINAL_DELETERS.includes('loadLatchFromDisk')
    && P.APPROVED_TERMINAL_DELETERS.includes('assertTerminalCleared'));
  check('cohort boundary is the R2-1 fix date',
    P.FIRST_STUDY_COHORT_EARLIEST_ELIGIBLE_ISO.startsWith('2026-09-07'));
  check('stop-transition evidence has ten distinct values, not a generic three',
    Object.keys(P.STOP_TRANSITION_EVIDENCE).length === 10);
  check('exception values are stable machine strings, not prose',
    Object.values(P.EXCEPTION_CLASSES).every(v => /^[a-z_]+$/.test(v)));
  check('every exception class has a separate description',
    Object.values(P.EXCEPTION_CLASSES).every(v => typeof P.EXCEPTION_CLASS_DESCRIPTIONS[v] === 'string'));
  check('nested policy tables are deeply frozen',
    Object.isFrozen(STAGED.allocationsOfOriginal) && Object.isFrozen(STAGED.standardTerminals)
    && Object.isFrozen(BASE.stopTransitions.postTp2Transitions));
  check('cohort boundary is scoped to the first study, not to the policy',
    typeof P.FIRST_STUDY_COHORT_EARLIEST_ELIGIBLE_ISO === 'string');
  check('transition conditions are named constants, not repeated literals',
    P.TRANSITION_CONDITIONS.BIAS_FLIP_ACTIONABLE_POST_TP2_RUNNER
      === 'bias_flip_actionable && post_tp2_runner');
  check('the baseline carries its source provenance',
    BASE.frozenFromSource.indexJsSha256
      === '9a4863e1472ca0dca67f42c9f595e12eb4c0c7f3b54fb2de99e79262cd8e5571'
    && BASE.frozenFromSource.sites.length === 4);
  check('stop failure is not a payoff path',
    P.STOP_FAILURE_TREATMENT.addToStandardPayoffTable === false
    && P.STOP_FAILURE_TREATMENT.policyOutcome === P.STATES.POLICY_STATE_AMBIGUOUS);
  check('all eight exception classes are declared',
    Object.keys(P.EXCEPTION_CLASSES).length === 8);
  check('netModelR is unavailable with a stated reason, not zero',
    STAGED.netModelRUnavailableReason === 'OUT_OF_SCOPE_PHASE_C_R_ONLY');
}

/* ═══════════════════════════════════════════════════════════════════ */
process.stdout.write(`\n${'='.repeat(60)}\n${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  process.stdout.write(`\n${fails.map(f => `  - ${f}`).join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  '\nThe configuration is internally consistent and inert. It describes two policies and\n'
  + 'refuses malformed ones. It computes no result, reads no trade, and changes no behaviour.\n');
process.exit(0);
