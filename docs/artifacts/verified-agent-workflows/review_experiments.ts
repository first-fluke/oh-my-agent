/** Real OMA source APIs; a fixed verifier replaces model dispatch. No builds. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, lstatSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { beginAgentRun, verifyRequiredChecks, verifyAgentRun, finishAgentRun,
  workspaceFingerprint } from '../../../cli/state/agent-results.ts';
import { planSessionResume, resumeSession } from '../../../cli/state/agent-resume.ts';
import { TaskContractSchema } from '../../../cli/state/task-contract.ts';

const out = resolve(process.argv[2]);
let session = 'icse-demo';
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const save = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const records: unknown[] = [];
function raw(label: string, task: any, root: string) {
  const results = task.required_checks.map((check: any) => {
    const r = spawnSync(check.command[0], check.command.slice(1), {
      cwd: resolve(root, check.cwd), encoding: 'utf8', timeout: 120000,
    });
    if (r.error || ![0, 1].includes(r.status!)) throw r.error ?? new Error('Unexpected test exit');
    records.push({ label, task: task.id, argv: check.command, cwd: resolve(root, check.cwd),
      exit: r.status, stdout: r.stdout, stderr: r.stderr });
    return r.status;
  });
  return { status: results.every((c: number) => c === 0) ? 'completed' : 'failed', checks: results.length };
}
function begin(root: string, id: string) {
  return beginAgentRun({ root, workspace: root, taskId: id, sessionId: session,
    agentId: 'qa-reviewer', vendor: 'native' });
}
function claim(id: string, extra: Record<string, unknown> = {}) {
  return { status: 'completed', changedFiles: [], unresolved: [],
    artifacts: [`.agents/results/${id}-report.md`], ...extra };
}
// Independent baseline serialization. The task key includes its declarations,
// file contents/modes and recursively the keys of all declared dependencies.
function fileTree(root: string, name: string): unknown {
  const file = join(root, name);
  try {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('Baseline fixture must not contain symlinks');
    if (stat.isDirectory()) return [name, stat.mode,
      readdirSync(file).sort().map(entry => fileTree(root, `${name}/${entry}`))];
    return [name, stat.mode, sha(readFileSync(file))];
  } catch (e: any) {
    if (e.code === 'ENOENT') return [name, 'missing'];
    throw e;
  }
}
function cacheKeys(root: string, tasks: any[], outputs: boolean) {
  const keys: Record<string, string> = {};
  function key(id: string): string {
    if (keys[id]) return keys[id];
    const t = tasks.find(t => t.id === id);
    const value = [t.id, t.required_checks, [...t.inputs].sort().map((p: string) => fileTree(root, p)),
      t.dependencies.map((d: string) => [d, key(d)]),
      outputs ? fileTree(root, `.agents/results/${id}-report.md`) : null];
    return keys[id] = sha(JSON.stringify(value));
  }
  tasks.forEach(t => key(t.id));
  return keys;
}
const comparison: unknown[] = [];
for (const name of ['unchanged', 'unrelated-file', 'broken-source', 'changed-report']) {
  const root = join(out, name);
  session = `review-${name}`;
  const tasks = JSON.parse(readFileSync(join(root, '.agents/results/plan-icse-demo.json'), 'utf8')).tasks;
  save(join(root, `.agents/results/plan-${session}.json`), { max_attempts: 6, tasks });
  const seeds: unknown[] = [];
  for (const t of tasks) {
    const r = begin(root, t.id);
    verifyRequiredChecks(root, r.runId);
    writeFileSync(join(root, `.agents/results/${t.id}-report.md`), `Verified ${t.id}\n`);
    const done = finishAgentRun(root, r.runId, 0, claim(t.id));
    if (done.status !== 'completed') throw new Error('Initial OMA verification failed');
    seeds.push(done);
    if (raw(`${name}/baseline-seed`, t, root).status !== 'completed') throw new Error('Baseline seed failed');
  }
  const inputCache = cacheKeys(root, tasks, false);
  const outputCache = cacheKeys(root, tasks, true);
  // Persist and reload keys so reuse is based on captured baseline state.
  save(join(root, '.agents/results/input-cache.json'), inputCache);
  save(join(root, '.agents/results/output-cache.json'), outputCache);
  if (name === 'unrelated-file') writeFileSync(join(root, 'unrelated.txt'), 'Unrelated\n');
  if (name === 'broken-source') writeFileSync(join(root, 'src/limit.mjs'), 'export function allow(count, limit) { return count <= limit; }\n');
  if (name === 'changed-report') writeFileSync(join(root, '.agents/results/limit-report.md'), 'Changed after verification.\n');
  const sharedBefore = cacheKeys(root, tasks, true);
  const policies: Record<string, unknown> = {};
  for (const policy of ['rerun-all', 'input-cache', 'output-cache']) {
    const statuses: Record<string, string> = {};
    let count = 0;
    const outputs = policy === 'output-cache';
    const current = cacheKeys(root, tasks, outputs);
    const saved = policy === 'rerun-all' ? {} : JSON.parse(readFileSync(
      join(root, `.agents/results/${policy}.json`), 'utf8'));
    // All policies stop a dependent after upstream failure. Independent tasks continue.
    for (const t of tasks) {
      if (t.dependencies.some((d: string) => !['completed', 'reused'].includes(statuses[d]))) {
        statuses[t.id] = 'blocked';
      } else if (saved[t.id] === current[t.id]) {
        statuses[t.id] = 'reused';
      } else {
        const r = raw(`${name}/${policy}`, t, root);
        statuses[t.id] = r.status; count += r.checks;
      }
    }
    policies[policy] = { statuses, check_commands: count, current_keys: current, cached_keys: saved };
  }
  const planned = planSessionResume(root, session, 6);
  const attempts: unknown[] = [];
  let count = 0;
  const active = await resumeSession({ root, sessionId: session, maxAttempts: 6,
    dispatch: async (task) => {
      const run = begin(root, task.taskId);
      const receipts = verifyRequiredChecks(root, run.runId); count += receipts.length;
      const done = finishAgentRun(root, run.runId, 0, claim(task.taskId));
      attempts.push(done);
      return done.status === 'completed' ? 0 : 1;
    } });
  if (JSON.stringify(sharedBefore) !== JSON.stringify(cacheKeys(root, tasks, true)))
    throw new Error('Recovery probes changed fixture files');
  comparison.push({ case: name, policies,
    oma_plan: Object.fromEntries(planned.tasks.map(t => [t.taskId, t.status])),
    oma_active: { statuses: Object.fromEntries(active.tasks.map(t => [t.taskId, t.status])), check_commands: count },
    planned, active, attempts, seeds, fixture_keys: sharedBefore });
}

// Small boundary probes execute the actual validators, without a model runner.
const protocol: unknown[] = [];
const ok = ['node', '-e', 'process.exit(0)'];
function fixture(name: string, changes: Record<string, unknown> = {}) {
  const root = join(out, 'protocol', name);
  session = `probe-${name}`;
  mkdirSync(join(root, '.agents/results'), { recursive: true });
  writeFileSync(join(root, 'input.txt'), 'initial\n');
  writeFileSync(join(root, '.agents/results/t-report.md'), 'report\n');
  const task = { id: 't', agent: 'qa-reviewer', task: 'Verify input',
    inputs: ['input.txt'], dependencies: [], retry_policy: 'safe',
    acceptance_criteria: [{ id: 'AC1', description: 'The check passes' }],
    required_checks: [{ id: 'c1', criteria: ['AC1'], command: ok, cwd: '.' }], ...changes };
  save(join(root, `.agents/results/plan-${session}.json`), { max_attempts: 6, tasks: [task] });
  return { root, task, run: begin(root, 't') };
}
function finishProbe(name: string, root: string, runId: string, expected: string,
                     extra: Record<string, unknown> = {}) {
  const result = finishAgentRun(root, runId, 0, claim('t', extra));
  protocol.push({ name, expected, actual: result.status, passed: result.status === expected, result });
  if (result.status !== expected) throw new Error(`${name}: ${result.status} != ${expected}`);
}
for (const name of ['missing-all', 'stale', 'unresolved', 'ad-hoc-failure', 'ad-hoc-recovered', 'contract-change']) {
  const { root, run, task } = fixture(name);
  if (name !== 'missing-all') verifyRequiredChecks(root, run.runId);
  if (name === 'stale') writeFileSync(join(root, 'input.txt'), 'edited\n');
  if (name.startsWith('ad-hoc-')) {
    const command = ['node', '-e', "process.exit(require('fs').existsSync('allow-adhoc') ? 0 : 1)"];
    verifyAgentRun(root, run.runId, command);
    if (name === 'ad-hoc-recovered') {
      writeFileSync(join(root, 'allow-adhoc'), 'yes');
      verifyAgentRun(root, run.runId, command);
    }
  }
  if (name === 'contract-change') {
    task.retry_policy = 'manual';
    save(join(root, `.agents/results/plan-${session}.json`), { max_attempts: 6, tasks: [task] });
  }
  const expected = name === 'missing-all' || name === 'unresolved' ? 'partial' :
    name === 'ad-hoc-recovered' ? 'completed' : 'failed';
  finishProbe(name, root, run.runId, expected, name === 'unresolved' ? { unresolved: ['Remaining work'] } : {});
  if (name === 'contract-change') {
    let error = '';
    try { planSessionResume(root, session, 6); } catch (e) { error = String(e); }
    if (!error.includes('immutable')) throw new Error('Changed plan was not rejected');
    protocol.push({ name: 'contract-change-resume', error, passed: true });
  }
}
{
  const { root, run } = fixture('missing-one', { required_checks: [
    { id: 'c1', criteria: ['AC1'], command: ok, cwd: '.' },
    { id: 'c2', criteria: ['AC1'], command: ['node', '-e', 'process.exit(0);'], cwd: '.' }] });
  verifyAgentRun(root, run.runId, ok);
  finishProbe('missing-one-after-one-receipt', root, run.runId, 'failed');
}
{
  const { root, run } = fixture('mutating-check', { required_checks: [{ id: 'c1', criteria: ['AC1'],
    command: ['node', '-e', "require('fs').writeFileSync('input.txt','mutated')"], cwd: '.' }] });
  verifyRequiredChecks(root, run.runId);
  finishProbe('mutating-check', root, run.runId, 'failed');
}
for (const present of [false, true]) {
  const { root, run } = fixture(`decision-${present}`, { required_decisions: [{ subject: 'choice', description: 'Explain choice' }] });
  verifyRequiredChecks(root, run.runId);
  finishProbe(`decision-${present}`, root, run.runId, present ? 'completed' : 'partial',
    present ? { decisions: [{ subject: 'choice', decision: 'Keep input', rationale: 'Test fixture' }] } : {});
}
{
  const root = join(out, 'directory-scope'); mkdirSync(root); mkdirSync(join(root, 'dir'));
  const empty = workspaceFingerprint(root, ['dir']);
  writeFileSync(join(root, 'dir/new.txt'), 'new'); const added = workspaceFingerprint(root, ['dir']);
  unlinkSync(join(root, 'dir/new.txt')); const removed = workspaceFingerprint(root, ['dir']);
  if (empty === added || empty !== removed) throw new Error('Directory hashing probe failed');
  const t = fixture('glob').task;
  const globRejected = !TaskContractSchema.safeParse({ ...t, inputs: ['dir/*.txt'] }).success;
  if (!globRejected) throw new Error('Globs accepted unexpectedly');
  protocol.push({ name: 'directory-add-remove-and-glob', empty, added, removed, globRejected, passed: true });
}
save(join(out, 'baseline-commands.json'), records);
save(join(out, 'summary.json'), { comparison, protocol, runtime: { bun: Bun.version, node: process.versions.node },
  kind: 'Source-level scheduler with fixed verification callback; no model calls or autonomous repair',
  baseline_commands_sha256: sha(readFileSync(join(out, 'baseline-commands.json'))) });
