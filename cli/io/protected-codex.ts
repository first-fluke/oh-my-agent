/**
 * Bounded stdio app-server client. The source is constant; prompt and configuration
 * travel through stdin, never executable source or shell arguments.
 *
 * Profile verified against Codex 0.154.0's generated protocol and OpenAI's
 * codex-rs/tui/src/temporary_structured_request.rs. environments: [] disables
 * environment access; effective MCP servers and the remaining tools are disabled
 * separately. Read-only sandboxing alone is not an input isolation guarantee.
 */
export const CODEX_TEXT_BRIDGE = String.raw`
const { spawn, execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createInterface } = require('node:readline');
let child;
let timer;
let finished = false;
const pending = new Map();
let sequence = 0;
let bytes = 0;
const notifications = [];
let notify;
function stop() {
  if (!child || !child.pid) return;
  try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
}
function finish(error, answer) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  stop();
  if (error) {
    process.stderr.write('Protected Codex dispatch failed: ' + error + '\n');
    process.exitCode = 1;
  } else process.stdout.write(answer);
  for (const entry of pending.values()) entry.reject(new Error('transport closed'));
  pending.clear();
}
function send(value) { child.stdin.write(JSON.stringify(value) + '\n'); }
function request(method, params) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    send({ id, method, params });
  });
}
function nextNotification() {
  if (notifications.length) return Promise.resolve(notifications.shift());
  return new Promise(resolve => { notify = resolve; });
}
process.on('SIGTERM', () => finish('cancelled'));
process.on('SIGINT', () => finish('cancelled'));
(async () => {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (!['darwin', 'linux'].includes(process.platform)) throw new Error('unsupported process cleanup platform');
  const version = execFileSync(input.command, ['--version'], {
    encoding: 'utf8', timeout: 5000, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
  if (!/^codex-cli 0\.154\.\d+$/.test(version)) throw new Error('requires verified Codex 0.154.x app-server protocol');
  const disabled = [
    'apps', 'code_mode', 'code_mode_only', 'code_mode_host', 'context_management',
    'current_time_reminder', 'deferred_executor', 'enable_fanout', 'goals', 'hooks',
    'image_generation', 'memories', 'multi_agent', 'multi_agent_v2', 'plugins',
    'remote_plugin', 'request_permissions_tool', 'shell_snapshot', 'shell_tool',
    'standalone_web_search', 'token_budget', 'tool_suggest', 'unified_exec', 'view_image',
    'browser_use', 'browser_use_external', 'computer_use', 'artifact', 'sleep_tool',
    'skill_search', 'skill_mcp_dependency_install', 'workspace_dependencies'
  ];
  const config = Object.fromEntries(disabled.map(key => ['features.' + key, false]));
  Object.assign(config, {
    'features.skip_host_skill_discovery': true,
    'orchestrator.skills.enabled': false,
    'skills.include_instructions': false,
    'token_budget.use_history_notes_extension': false,
    'tools.experimental_request_user_input.enabled': false,
    'tools.update_plan.enabled': false,
    'web_search': 'disabled',
    'project_doc_max_bytes': 0,
    'developer_instructions': '',
    'sqlite_home': join(process.env.CODEX_HOME || process.cwd(), '.oma-codex-state'),
    'log_dir': join(process.env.CODEX_HOME || process.cwd(), '.oma-codex-logs')
  });
  // app-server has no --ignore-user-config flag. Apply tool/context controls at
  // startup, then read effective config and disable each MCP server before a thread.
  const args = ['app-server', '--listen', 'stdio://'];
  for (const [key, value] of Object.entries(config)) args.push('-c', key + '=' + JSON.stringify(value));
  child = spawn(input.command, args, { stdio: ['pipe', 'pipe', 'ignore'], detached: true });
  child.on('error', () => finish('provider could not start'));
  child.on('exit', () => { if (!finished) finish('provider exited before completion'); });
  timer = setTimeout(() => finish('timeout'), input.timeoutMs);
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    if (finished) return;
    bytes += Buffer.byteLength(line);
    if (bytes > 16 * 1024 * 1024) return finish('response exceeds limit');
    let message;
    try { message = JSON.parse(line); } catch { return finish('invalid protocol response'); }
    if (message.method && message.id !== undefined) {
      send({ id: message.id, error: { code: -32601, message: 'Protected text transport rejects server requests' } });
      return finish('server requested a tool, approval, or external input');
    }
    if (message.id !== undefined) {
      const entry = pending.get(message.id);
      if (!entry) return finish('unexpected response id');
      pending.delete(message.id);
      if (message.error) entry.reject(new Error('provider rejected protected protocol request'));
      else entry.resolve(message.result);
    } else if (message.method) {
      if (notify) { const resolve = notify; notify = undefined; resolve(message); }
      else notifications.push(message);
    } else finish('invalid protocol message');
  });
  await request('initialize', {
    clientInfo: { name: 'oma_protected_text', version: '1' },
    capabilities: { experimentalApi: true }
  });
  send({ method: 'initialized' });
  const effective = await request('config/read', { includeLayers: false, cwd: process.cwd() });
  if (!effective || !effective.config || typeof effective.config !== 'object') throw new Error('effective config unavailable');
  const inherited = effective.config;
  // Confirm effective controls before thread creation; managed requirements or
  // an incompatible config parser must not silently re-enable discovery/tools.
  for (const [key, expected] of Object.entries(config)) {
    if (!key.startsWith('features.') && ![
      'orchestrator.skills.enabled', 'skills.include_instructions', 'web_search',
      'project_doc_max_bytes', 'developer_instructions'
    ].includes(key)) continue;
    const actual = Object.hasOwn(inherited, key) ? inherited[key]
      : key.split('.').reduce((value, part) => value?.[part], inherited);
    if (actual !== expected) throw new Error('provider did not preserve protected configuration');
  }
  if (inherited.cli_auth_credentials_store != null && inherited.cli_auth_credentials_store !== 'file') {
    throw new Error('protected config home requires native file credential storage');
  }
  const servers = inherited.mcp_servers ?? {};
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) throw new Error('invalid effective MCP config');
  config.mcp_servers = Object.fromEntries(Object.keys(servers).map(name => [name, { enabled: false }]));
  const model = input.model || inherited.model || undefined;
  const modelProvider = inherited.model_provider || undefined;
  const effort = input.effort || inherited.model_reasoning_effort || undefined;
  const permissions = typeof inherited.default_permissions === 'string' && !inherited.default_permissions.startsWith(':')
    ? inherited.default_permissions : undefined;
  const started = await request('thread/start', {
    model, modelProvider, allowProviderModelFallback: false,
    cwd: process.cwd(), approvalPolicy: 'never', permissions, sandbox: permissions ? undefined : 'read-only',
    runtimeWorkspaceRoots: [], ephemeral: true, environments: [], dynamicTools: [],
    selectedCapabilityRoots: [],
    baseInstructions: 'Answer using only the text supplied in this conversation. Return the requested text.',
    developerInstructions: '', config
  });
  const permissionsPreserved = permissions
    ? started?.activePermissionProfile?.id === permissions
    : started?.sandbox?.type === 'readOnly' && started.sandbox.networkAccess !== true;
  if (!started || started.approvalPolicy !== 'never' || !permissionsPreserved ||
      !Array.isArray(started.instructionSources) ||
      started.instructionSources.length || !Array.isArray(started.runtimeWorkspaceRoots) ||
      started.runtimeWorkspaceRoots.length || !started.thread?.id ||
      (model && started.model !== model) || (modelProvider && started.modelProvider !== modelProvider)) {
    throw new Error('provider did not preserve protected thread settings');
  }
  const threadId = started.thread.id;
  const turn = await request('turn/start', {
    threadId, environments: [], runtimeWorkspaceRoots: [], effort,
    input: [{ type: 'text', text: input.prompt, text_elements: [] }]
  });
  if (!turn?.turn?.id) throw new Error('missing turn identity');
  let answer;
  for (;;) {
    const event = await nextNotification();
    if (finished) return;
    const params = event.params ?? {};
    if (event.method === 'error') throw new Error('provider reported a turn error');
    if (event.method === 'item/started' || event.method === 'item/completed') {
      if (params.threadId !== threadId || params.turnId !== turn.turn.id) continue;
      if (!['userMessage', 'agentMessage', 'reasoning'].includes(params.item?.type)) {
        throw new Error('provider emitted a non-text item');
      }
      if (event.method === 'item/completed' && params.item.type === 'agentMessage' && params.item.phase !== 'commentary') {
        if (typeof params.item.text !== 'string') throw new Error('invalid assistant message');
        answer = params.item.text;
      }
    }
    if (event.method === 'turn/completed' && params.threadId === threadId && params.turn?.id === turn.turn.id) {
      if (params.turn.status !== 'completed' || params.turn.error || typeof answer !== 'string' || !answer.trim()) {
        throw new Error('turn did not complete with an answer');
      }
      finish(undefined, answer);
      return;
    }
  }
})().catch(error => finish(error instanceof Error && !('status' in error) ? error.message : 'provider process failure'));
`;
