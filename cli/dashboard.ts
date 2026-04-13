import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { basename, join } from "node:path";
import { watch } from "chokidar";
import * as pc from "picocolors";
import { WebSocket, WebSocketServer } from "ws";
import { buildGraphData } from "./lib/summary/graph.js";
import { collectSummary } from "./lib/summary/index.js";

const PORT = process.env.DASHBOARD_PORT
  ? parseInt(process.env.DASHBOARD_PORT || "9847", 10)
  : 9847;

function resolveMemoriesDir(): string {
  if (process.env.MEMORIES_DIR) return process.env.MEMORIES_DIR;
  const cliArg = process.argv[3];
  if (cliArg) return join(cliArg, ".serena", "memories");
  return join(process.cwd(), ".serena", "memories");
}

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function findSessionFile(memoriesDir: string): string | null {
  try {
    const files = readdirSync(memoriesDir);
    if (files.includes("orchestrator-session.md")) {
      return join(memoriesDir, "orchestrator-session.md");
    }
    const sessionFiles = files
      .filter((f) => /^session-.*\.md$/.test(f))
      .map((f) => ({ name: f, mtime: statSync(join(memoriesDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (sessionFiles.length > 0 && sessionFiles[0]) {
      return join(memoriesDir, sessionFiles[0].name);
    }
  } catch {}
  return null;
}

function parseSessionInfo(memoriesDir: string) {
  const sessionFile = findSessionFile(memoriesDir);
  if (!sessionFile) return { id: "N/A", status: "UNKNOWN" };

  const content = readFileSafe(sessionFile);
  if (!content) return { id: "N/A", status: "UNKNOWN" };

  const id =
    (content.match(/session-id:\s*(.+)/i) || [])[1] ||
    (content.match(/# Session:\s*(.+)/i) || [])[1] ||
    content.match(/(session-\d{8}-\d{6})/)?.[1] ||
    basename(sessionFile, ".md") ||
    "N/A";

  let status = "UNKNOWN";
  if (/IN PROGRESS|RUNNING|## Active|\[IN PROGRESS\]/i.test(content)) {
    status = "RUNNING";
  } else if (/COMPLETED|DONE|## Completed|\[COMPLETED\]/i.test(content)) {
    status = "COMPLETED";
  } else if (/FAILED|ERROR|## Failed|\[FAILED\]/i.test(content)) {
    status = "FAILED";
  } else if (/Step \d+:.*\[/i.test(content)) {
    status = "RUNNING";
  }

  return { id: id.trim(), status };
}

function parseTaskBoard(memoriesDir: string) {
  const content = readFileSafe(join(memoriesDir, "task-board.md"));
  if (!content) return [];

  const agents: { agent: string; status: string; task: string }[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|") || /^\|\s*-+/.test(line)) continue;
    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    const agentName = cols[0];
    if (cols.length < 2 || !agentName || /^agent$/i.test(agentName)) continue;
    agents.push({
      agent: cols[0] || "",
      status: cols[1] || "pending",
      task: cols[2] || "",
    });
  }
  return agents;
}

function getAgentTurn(memoriesDir: string, agent: string): number | null {
  try {
    const files = readdirSync(memoriesDir)
      .filter((f) => f.startsWith(`progress-${agent}`) && f.endsWith(".md"))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    const content = files[0] ? readFileSafe(join(memoriesDir, files[0])) : "";
    const match = content.match(/turn[:\s]*(\d+)/i);
    return match?.[1] ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function getLatestActivity(memoriesDir: string) {
  try {
    const files = readdirSync(memoriesDir)
      .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
      .map((f) => ({ name: f, mtime: statSync(join(memoriesDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5);

    return files
      .map((f) => {
        const name =
          f.name
            .replace(/^(progress|result|session|debug|task)-?/, "")
            .replace(/[-_]agent/, "")
            .replace(/[-_]completion/, "")
            .replace(/\.md$/, "")
            .replace(/[-_]/g, " ")
            .trim() || f.name.replace(/\.md$/, "");

        const content = readFileSafe(join(memoriesDir, f.name));
        const lines = content
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("---") && l.length > 3);

        let message = "";
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];
          if (!line) continue;
          if (/^\*\*|^#+|^-|^\d+\.|Status|Result|Action|Step/i.test(line)) {
            message = line
              .replace(/^[#*\-\d.]+\s*/, "")
              .replace(/\*\*/g, "")
              .trim();
            if (message.length > 5) break;
          }
        }
        if (message.length > 80) message = `${message.substring(0, 77)}...`;
        return { agent: name, message, file: f.name };
      })
      .filter((a) => a.message);
  } catch {
    return [];
  }
}

function discoverAgentsFromFiles(memoriesDir: string) {
  const agents: {
    agent: string;
    status: string;
    task: string;
    turn: number | null;
  }[] = [];
  const seen = new Set<string>();

  try {
    const files = readdirSync(memoriesDir)
      .filter((f) => f.endsWith(".md") && f !== ".gitkeep")
      .map((f) => ({ name: f, mtime: statSync(join(memoriesDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const f of files) {
      const content = readFileSafe(join(memoriesDir, f.name));
      const agentMatch =
        content.match(/\*\*Agent\*\*:\s*(.+)/i) ||
        content.match(/Agent:\s*(.+)/i) ||
        content.match(/^#+\s*(.+?)\s*Agent/im);

      let agentName: string | null = null;
      if (agentMatch?.[1]) {
        agentName = agentMatch[1].trim();
      } else if (/_agent|agent_|-agent/i.test(f.name)) {
        agentName = f.name
          .replace(/\.md$/, "")
          .replace(/[-_]completion|[-_]progress|[-_]result/gi, "")
          .replace(/[-_]/g, " ")
          .trim();
      }

      if (agentName && !seen.has(agentName.toLowerCase())) {
        seen.add(agentName.toLowerCase());
        let status = "unknown";
        if (/\[COMPLETED\]|## Completed|## Results/i.test(content))
          status = "completed";
        else if (/\[IN PROGRESS\]|## Progress|IN PROGRESS/i.test(content))
          status = "running";
        else if (/\[FAILED\]|## Failed|ERROR/i.test(content)) status = "failed";

        const taskMatch =
          content.match(/## Task\s*\n+(.+)/i) ||
          content.match(/\*\*Task\*\*:\s*(.+)/i);
        const task = taskMatch?.[1] ? taskMatch[1].trim().substring(0, 60) : "";
        agents.push({
          agent: agentName,
          status,
          task,
          turn: getAgentTurn(memoriesDir, agentName),
        });
      }
    }
  } catch {}
  return agents;
}

function buildFullState(memoriesDir: string) {
  const session = parseSessionInfo(memoriesDir);
  const taskBoard = parseTaskBoard(memoriesDir);
  let agents = taskBoard.map((a) => ({
    ...a,
    turn: getAgentTurn(memoriesDir, a.agent),
  }));

  if (agents.length === 0) agents = discoverAgentsFromFiles(memoriesDir);
  if (agents.length === 0) {
    try {
      const progressFiles = readdirSync(memoriesDir).filter(
        (f) => f.startsWith("progress-") && f.endsWith(".md"),
      );
      for (const f of progressFiles) {
        const agent = f.replace(/^progress-/, "").replace(/\.md$/, "");
        agents.push({
          agent,
          status: "running",
          task: "",
          turn: getAgentTurn(memoriesDir, agent),
        });
      }
    } catch {}
  }

  return {
    session,
    agents,
    activity: getLatestActivity(memoriesDir),
    memoriesDir,
    updatedAt: new Date().toISOString(),
  };
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Serena Memory Dashboard</title>
  <style>
    :root { --bg:#0f0b1a;--surface:#1a1428;--surface-2:#241e33;--border:#3d2e5c;--purple:#9b59b6;--purple-light:#c39bd3;--purple-dark:#6c3483;--text:#e8e0f0;--text-dim:#8a7da0;--green:#2ecc71;--red:#e74c3c;--yellow:#f1c40f;--cyan:#1abc9c; }
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:var(--bg);color:var(--text);font-family:'SF Mono','Fira Code',monospace;min-height:100vh;padding:24px}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--border)}
    .logo{width:48px;height:48px;background:linear-gradient(135deg,var(--purple),var(--purple-dark));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:white}
    .header-text h1{font-size:20px;color:var(--purple-light)} .header-text .subtitle{font-size:12px;color:var(--text-dim)}
    .connection-badge{margin-left:auto;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600}
    .connection-badge.connected{background:rgba(46,204,113,0.15);color:var(--green);border:1px solid rgba(46,204,113,0.3)}
    .connection-badge.disconnected{background:rgba(231,76,60,0.15);color:var(--red);border:1px solid rgba(231,76,60,0.3)}
    .connection-badge.connecting{background:rgba(241,196,15,0.15);color:var(--yellow);border:1px solid rgba(241,196,15,0.3)}
    .session-bar{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:20px}
    .session-id{font-size:14px;font-weight:600}
    .session-status{padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
    .session-status.running{background:rgba(46,204,113,0.15);color:var(--green)}
    .session-status.completed{background:rgba(26,188,156,0.15);color:var(--cyan)}
    .session-status.failed{background:rgba(231,76,60,0.15);color:var(--red)}
    .session-status.unknown{background:rgba(138,125,160,0.15);color:var(--text-dim)}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px} @media(max-width:900px){.grid{grid-template-columns:1fr}}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden}
    .card-header{padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;color:var(--purple-light);background:var(--surface-2)}
    .card-body{padding:16px}
    .agent-table{width:100%;border-collapse:collapse;font-size:13px}
    .agent-table th{text-align:left;padding:8px 12px;color:var(--text-dim);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border)}
    .agent-table td{padding:10px 12px;border-bottom:1px solid rgba(61,46,92,0.4)} .agent-table tr:last-child td{border-bottom:none}
    .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
    .status-dot.running{background:var(--green);box-shadow:0 0 6px var(--green)} .status-dot.completed{background:var(--cyan)} .status-dot.failed{background:var(--red)} .status-dot.blocked{background:var(--yellow)} .status-dot.pending{background:var(--text-dim)}
    .activity-list{list-style:none;font-size:12px} .activity-list li{padding:8px 0;border-bottom:1px solid rgba(61,46,92,0.3);display:flex;gap:8px} .activity-list li:last-child{border-bottom:none}
    .activity-agent{color:var(--purple-light);font-weight:600;white-space:nowrap} .activity-msg{color:var(--text-dim)}
    .empty{color:var(--text-dim);font-size:12px;font-style:italic;padding:12px 0}
    .footer{margin-top:20px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .pulse{animation:pulse 2s ease-in-out infinite}
  </style>
</head>
<body>
  <div class="header"><div class="logo">S</div><div class="header-text"><h1>Serena Memory Dashboard</h1><div class="subtitle">Real-time agent orchestration monitor</div></div><div class="connection-badge connecting" id="connBadge">Connecting...</div></div>
  <div class="session-bar"><span>Session:</span><span class="session-id" id="sessionId">N/A</span><span class="session-status unknown" id="sessionStatus">UNKNOWN</span><span style="margin-left:auto;font-size:11px;color:var(--text-dim)" id="updatedAt">--</span></div>
  <div class="grid"><div class="card"><div class="card-header">Agent Status</div><div class="card-body"><table class="agent-table"><thead><tr><th>Agent</th><th>Status</th><th>Turn</th><th>Task</th></tr></thead><tbody id="agentBody"><tr><td colspan="4" class="empty">No agents detected yet</td></tr></tbody></table></div></div><div class="card"><div class="card-header">Latest Activity</div><div class="card-body"><ul class="activity-list" id="activityList"><li class="empty">No activity yet</li></ul></div></div></div>
  <div class="footer"><span>Serena Memory Dashboard</span><span id="footerTime">--</span></div>
  <script>
    const $=s=>document.querySelector(s);
    function normalizeStatus(s){const l=(s||'').toLowerCase();if(['running','active','in_progress','in-progress'].includes(l))return'running';if(['completed','done','finished'].includes(l))return'completed';if(['failed','error'].includes(l))return'failed';if(['blocked','waiting'].includes(l))return'blocked';return'pending'}
    function clearChildren(el){while(el.firstChild)el.removeChild(el.firstChild)}
    function createTextEl(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el}
    function renderAgents(agents){const tbody=$('#agentBody');clearChildren(tbody);if(!agents||!agents.length){const tr=document.createElement('tr'),td=createTextEl('td','No agents detected yet','empty');td.setAttribute('colspan','4');tr.appendChild(td);tbody.appendChild(tr);return}agents.forEach(a=>{const ns=normalizeStatus(a.status),tr=document.createElement('tr');tr.appendChild(createTextEl('td',a.agent));const std=document.createElement('td'),dot=document.createElement('span');dot.className='status-dot '+ns+(ns==='running'?' pulse':'');std.appendChild(dot);std.appendChild(createTextEl('span',ns,'status-text'));tr.appendChild(std);tr.appendChild(createTextEl('td',a.turn!=null?String(a.turn):'-'));tr.appendChild(createTextEl('td',a.task||''));tbody.appendChild(tr)})}
    function renderActivity(activity){const list=$('#activityList');clearChildren(list);if(!activity||!activity.length){list.appendChild(createTextEl('li','No activity yet','empty'));return}activity.forEach(a=>{const li=document.createElement('li');li.appendChild(createTextEl('span','['+a.agent+']','activity-agent'));li.appendChild(createTextEl('span',a.message,'activity-msg'));list.appendChild(li)})}
    function renderState(state){$('#sessionId').textContent=state.session?.id||'N/A';const st=(state.session?.status||'UNKNOWN').toUpperCase(),sel=$('#sessionStatus');sel.textContent=st;sel.className='session-status '+st.toLowerCase();if(state.updatedAt){const ts=new Date(state.updatedAt).toLocaleString();$('#updatedAt').textContent='Updated: '+ts;$('#footerTime').textContent=ts}renderAgents(state.agents);renderActivity(state.activity)}
    let ws,rd=1000;function connect(){const b=$('#connBadge');b.textContent='Connecting...';b.className='connection-badge connecting';const p=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(p+'//'+location.host);ws.onopen=()=>{b.textContent='Connected';b.className='connection-badge connected';rd=1000};ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.data)renderState(m.data)}catch{}};ws.onclose=()=>{b.textContent='Disconnected';b.className='connection-badge disconnected';setTimeout(()=>{rd=Math.min(rd*1.5,10000);connect()},rd)};ws.onerror=()=>ws.close()}
    fetch('/api/state').then(r=>r.json()).then(renderState).catch(()=>{});connect();
  </script>
</body>
</html>`;

const SUMMARY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>oh-my-agent — Summary Graph</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d1117;color:#e6edf3;font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
#controls{position:fixed;top:16px;left:16px;z-index:10;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:480px}
#controls select,#controls input,#controls button{
  background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:6px;padding:6px 10px;font-size:13px}
#controls button{cursor:pointer;background:#238636;border-color:#238636}
#controls button:hover{background:#2ea043}
#tooltip{position:fixed;display:none;background:#1c2128;border:1px solid #30363d;border-radius:8px;padding:12px;
  font-size:13px;pointer-events:none;z-index:20;max-width:280px;box-shadow:0 4px 12px rgba(0,0,0,.5)}
#tooltip .tool-badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;margin:2px}
#filters{position:fixed;top:52px;left:16px;z-index:10;display:flex;gap:6px}
.filter-btn{padding:4px 10px;border-radius:12px;font-size:11px;border:2px solid;cursor:pointer;
  transition:opacity .2s;font-weight:600;background:transparent}
.filter-btn.off{opacity:.3}
#stats{position:fixed;top:16px;right:16px;font-size:13px;opacity:.7;text-align:right}
#panel{position:fixed;top:0;right:-380px;width:380px;height:100vh;background:#161b22;border-left:1px solid #30363d;
  z-index:15;transition:right .3s;display:flex;flex-direction:column;box-shadow:-4px 0 12px rgba(0,0,0,.4)}
#panel.open{right:0}
#panel-header{padding:14px 16px;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center}
#panel-header h3{font-size:14px;margin:0}
#panel-close{background:none;border:none;color:#768390;font-size:18px;cursor:pointer}
#panel-body{flex:1;overflow-y:auto;padding:0}
.prompt-item{padding:10px 16px;border-bottom:1px solid #21262d;font-size:12px;line-height:1.5}
.prompt-item .meta{color:#768390;font-size:11px;margin-bottom:4px}
.prompt-item .meta .tool-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px}
#heatmap{position:fixed;bottom:0;left:0;right:0;height:60px;background:#0d1117;border-top:1px solid #21262d;
  z-index:10;display:flex;align-items:flex-end;padding:4px 16px;gap:1px}
#heatmap .bar{flex:1;background:#238636;border-radius:2px 2px 0 0;min-width:2px;position:relative}
#heatmap .bar:hover{opacity:.8}
#heatmap-label{position:fixed;bottom:62px;left:16px;font-size:11px;color:#768390;z-index:10}
svg{width:100vw;height:calc(100vh - 60px)}
</style>
</head>
<body>
<div id="controls">
  <select id="window">
    <option value="1d">Today</option>
    <option value="3d">3 Days</option>
    <option value="7d" selected>7 Days</option>
    <option value="2w">2 Weeks</option>
    <option value="30d">30 Days</option>
  </select>
  <input id="topK" type="number" min="0" max="50" value="" placeholder="Top K">
  <button id="refresh">Refresh</button>
</div>
<div id="filters"></div>
<div id="tooltip"></div>
<div id="stats"></div>
<div id="panel"><div id="panel-header"><h3 id="panel-title">Prompts</h3><button id="panel-close">&times;</button></div><div id="panel-body"></div></div>
<div id="heatmap-label">Activity by hour</div>
<div id="heatmap"></div>
<svg></svg>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script>
const TC={claude:'#f0a030',gemini:'#4a90d9',codex:'#3fb950',qwen:'#a371f7',cursor:'#768390'};
const TOOLS=['claude','gemini','codex','qwen','cursor'];
const activeTools=new Set(TOOLS);
let rawData=null;

// --- Filter buttons ---
const filtersEl=document.getElementById('filters');
TOOLS.forEach(t=>{
  const btn=document.createElement('button');
  btn.className='filter-btn';btn.textContent=t;
  btn.style.color=TC[t];btn.style.borderColor=TC[t];
  btn.onclick=()=>{
    if(activeTools.has(t)){activeTools.delete(t);btn.classList.add('off')}
    else{activeTools.add(t);btn.classList.remove('off')}
    if(rawData)renderAll(rawData);
  };
  filtersEl.appendChild(btn);
});

// --- SVG setup ---
const svg=d3.select('svg'),width=window.innerWidth,height=window.innerHeight-60;
svg.attr('viewBox',[0,0,width,height]);
const g=svg.append('g');
svg.call(d3.zoom().scaleExtent([.1,8]).on('zoom',e=>g.attr('transform',e.transform)));
let simulation;
const linkG=g.append('g'),nodeG=g.append('g'),labelG=g.append('g');

// --- Panel ---
document.getElementById('panel-close').onclick=()=>document.getElementById('panel').classList.remove('open');

function showPanel(project,entries){
  const panel=document.getElementById('panel');
  document.getElementById('panel-title').textContent=project;
  const body=document.getElementById('panel-body');
  const items=entries.filter(e=>activeTools.has(e.tool)&&(e.project||'(unknown)')===project)
    .sort((a,b)=>b.timestamp-a.timestamp);
  body.innerHTML=items.slice(0,100).map(e=>{
    const d=new Date(e.timestamp);
    const time=d.toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
    return '<div class="prompt-item"><div class="meta"><span class="tool-dot" style="background:'+TC[e.tool]+'"></span>'
      +e.tool+' &middot; '+time+'</div>'+escHtml(e.prompt.slice(0,300))+'</div>';
  }).join('');
  if(items.length>100)body.innerHTML+='<div class="prompt-item" style="color:#768390">+'+(items.length-100)+' more...</div>';
  panel.classList.add('open');
}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

// --- Heatmap ---
function renderHeatmap(entries){
  const hm=document.getElementById('heatmap');
  const hours=new Array(24).fill(0);
  entries.filter(e=>activeTools.has(e.tool)).forEach(e=>{hours[new Date(e.timestamp).getHours()]++});
  const max=Math.max(...hours,1);
  hm.innerHTML=hours.map((c,i)=>{
    const h=Math.max(2,Math.round(c/max*48));
    const label=String(i).padStart(2,'0')+':00';
    return '<div class="bar" style="height:'+h+'px;background:'+
      (c>max*.7?'#238636':c>max*.3?'#1a7f37':'#21262d')+
      '" title="'+label+': '+c+' prompts"></div>';
  }).join('');
}

// --- Graph ---
async function load(){
  const w=document.getElementById('window').value;
  const t=document.getElementById('topK').value;
  const params=new URLSearchParams({window:w});
  if(t)params.set('top',t);
  const res=await fetch('/api/summary?'+params);
  rawData=await res.json();
  renderAll(rawData);
}

function renderAll(data){
  const filtered={...data,entries:data.entries.filter(e=>activeTools.has(e.tool))};
  renderGraph(filtered);
  renderHeatmap(data.entries);
}

function renderGraph(data){
  const{graph,stats,entries}=data;
  if(!graph||!graph.nodes.length){
    document.getElementById('stats').textContent='No data';
    linkG.selectAll('*').remove();nodeG.selectAll('*').remove();labelG.selectAll('*').remove();return;
  }
  // Recount with active tools
  const projCount={};
  entries.forEach(e=>{const p=e.project||'(unknown)';projCount[p]=(projCount[p]||0)+1});
  const nodes=graph.nodes.map(n=>({...n,count:projCount[n.id]||0,
    tools:Object.fromEntries(Object.entries(n.tools).filter(([t])=>activeTools.has(t)))}))
    .filter(n=>n.count>0);
  const nodeIds=new Set(nodes.map(n=>n.id));
  const edges=graph.edges.filter(e=>nodeIds.has(e.source?.id||e.source)&&nodeIds.has(e.target?.id||e.target));

  document.getElementById('stats').innerHTML='Prompts: <b>'+entries.length+'</b> &middot; Projects: <b>'+nodes.length+'</b>';

  const maxCount=d3.max(nodes,d=>d.count)||1;
  const r=d3.scaleSqrt().domain([1,maxCount]).range([8,40]);

  if(simulation)simulation.stop();
  simulation=d3.forceSimulation(nodes)
    .force('link',d3.forceLink(edges).id(d=>d.id).distance(120).strength(d=>Math.min(d.weight/5,.8)))
    .force('charge',d3.forceManyBody().strength(-200))
    .force('center',d3.forceCenter(width/2,height/2))
    .force('collision',d3.forceCollide().radius(d=>r(d.count)+4));

  linkG.selectAll('*').remove();
  const link=linkG.selectAll('line').data(edges).join('line')
    .attr('stroke','#30363d').attr('stroke-width',d=>Math.min(d.weight,6)).attr('stroke-opacity',.6);

  const pie=d3.pie().sort(null).value(d=>d.value);
  nodeG.selectAll('*').remove();
  const node=nodeG.selectAll('g').data(nodes).join('g').style('cursor','pointer')
    .call(d3.drag().on('start',(e,d)=>{if(!e.active)simulation.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y})
    .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y})
    .on('end',(e,d)=>{if(!e.active)simulation.alphaTarget(0);d.fx=null;d.fy=null}));

  node.each(function(d){
    const radius=r(d.count);const arc=d3.arc().innerRadius(0).outerRadius(radius);
    const slices=Object.entries(d.tools).filter(([,v])=>v>0).map(([tool,value])=>({tool,value}));
    if(!slices.length)slices.push({tool:'cursor',value:1});
    d3.select(this).selectAll('path').data(pie(slices)).join('path')
      .attr('d',arc).attr('fill',s=>TC[s.data.tool]||'#768390').attr('stroke','#0d1117').attr('stroke-width',1.5);
    d3.select(this).append('circle').attr('r',radius).attr('fill','none').attr('stroke','#0d1117').attr('stroke-width',2);
  });

  node.on('mouseover',(e,d)=>{
    const tip=document.getElementById('tooltip');
    const tools=Object.entries(d.tools).sort(([,a],[,b])=>b-a).filter(([,v])=>v>0)
      .map(([t,c])=>'<span class="tool-badge" style="background:'+TC[t]+'">'+t+': '+c+' ('+Math.round(100*c/d.count)+'%)</span>').join(' ');
    const dm=Math.round(d.duration/60000);
    const dur=d.duration<=0?'<1min':dm>=60?Math.floor(dm/60)+'h '+dm%60+'m':dm+'min';
    tip.innerHTML='<b>'+d.label+'</b><br>Prompts: '+d.count+' &middot; '+dur+'<br>'+tools;
    tip.style.display='block';tip.style.left=(e.pageX+12)+'px';tip.style.top=(e.pageY-12)+'px';
  }).on('mousemove',e=>{
    const tip=document.getElementById('tooltip');tip.style.left=(e.pageX+12)+'px';tip.style.top=(e.pageY-12)+'px';
  }).on('mouseout',()=>{document.getElementById('tooltip').style.display='none'});

  // Click → prompt panel
  node.on('click',(e,d)=>{e.stopPropagation();showPanel(d.id,rawData.entries)});

  labelG.selectAll('*').remove();
  labelG.selectAll('text').data(nodes).join('text')
    .text(d=>d.label).attr('font-size',11).attr('fill','#e6edf3')
    .attr('text-anchor','middle').attr('dy',d=>r(d.count)+14).style('pointer-events','none');

  simulation.on('tick',()=>{
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>'translate('+d.x+','+d.y+')');
    labelG.selectAll('text').attr('x',(_,i)=>nodes[i].x).attr('y',(_,i)=>nodes[i].y);
  });
}

// Close panel on background click
svg.on('click',()=>document.getElementById('panel').classList.remove('open'));

document.getElementById('refresh').onclick=load;
document.getElementById('window').onchange=load;
load();
</script>
</body>
</html>`;

export function startDashboard() {
  const memoriesDir = resolveMemoriesDir();
  if (!existsSync(memoriesDir)) mkdirSync(memoriesDir, { recursive: true });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFullState(memoriesDir)));
    } else if (url.pathname === "/api/summary") {
      try {
        const window = url.searchParams.get("window") || "7d";
        const tool = url.searchParams.get("tool") || undefined;
        const top = url.searchParams.get("top")
          ? Number.parseInt(url.searchParams.get("top") as string, 10)
          : undefined;
        const output = await collectSummary({ window, tool, top });
        const graph = buildGraphData(output.entries, top);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...output, graph }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (url.pathname === "/summary") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(SUMMARY_HTML);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML);
    }
  });

  const wss = new WebSocketServer({ server });
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function broadcast(event?: string, file?: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const msg = JSON.stringify({
        type: "update",
        event,
        file,
        data: buildFullState(memoriesDir),
      });
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
      });
    }, 100);
  }

  const watcher = watch(memoriesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  watcher.on("all", (event, filePath) => broadcast(event, basename(filePath)));

  wss.on("connection", (ws) => {
    ws.send(
      JSON.stringify({ type: "full", data: buildFullState(memoriesDir) }),
    );
    ws.on("error", () => ws.terminate());
  });

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    watcher.close();
    wss.clients.forEach((c) => {
      c.terminate();
    });
    wss.close(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(1), 3000).unref();
  });
  process.on("SIGTERM", () => process.emit("SIGINT"));

  server.listen(PORT, () => {
    console.log(pc.magenta(`\n  🛸 Serena Memory Dashboard`));
    console.log(pc.white(`     http://localhost:${PORT}`));
    console.log(pc.dim(`     Watching: ${memoriesDir}\n`));
  });
}
