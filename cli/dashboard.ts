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

const TW_HEAD = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwindcss.config={theme:{extend:{colors:{bg:'#0f0b1a',surface:'#1a1428','surface-2':'#241e33',bd:'#3d2e5c',purple:{DEFAULT:'#9b59b6',light:'#c39bd3',dark:'#6c3483'},dim:'#8a7da0',ok:'#2ecc71',err:'#e74c3c',warn:'#f1c40f',cyan:'#1abc9c'}}}}</script>`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  ${TW_HEAD}
  <title>Serena Memory Dashboard</title>
  <style>@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}.pulse-dot{animation:pulse-dot 2s ease-in-out infinite}</style>
</head>
<body class="bg-bg text-[#e8e0f0] font-mono min-h-screen p-6">
  <div class="flex items-center gap-4 mb-6 pb-4 border-b-2 border-bd">
    <div class="w-12 h-12 bg-gradient-to-br from-purple to-purple-dark rounded-xl flex items-center justify-center text-2xl font-bold text-white">S</div>
    <div><h1 class="text-xl text-purple-light">Serena Memory Dashboard</h1><div class="text-xs text-dim">Real-time agent orchestration monitor</div></div>
    <div class="ml-auto px-3 py-1 rounded-xl text-[11px] font-semibold border border-warn/30 bg-warn/15 text-warn" id="connBadge">Connecting...</div>
  </div>
  <div class="bg-surface border border-bd rounded-lg px-5 py-4 mb-5 flex items-center gap-5">
    <span>Session:</span><span class="text-sm font-semibold" id="sessionId">N/A</span>
    <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-dim/15 text-dim" id="sessionStatus">UNKNOWN</span>
    <span class="ml-auto text-[11px] text-dim" id="updatedAt">--</span>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class="bg-surface border border-bd rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-bd text-[13px] font-semibold text-purple-light bg-surface-2">Agent Status</div>
      <div class="p-4"><table class="w-full text-[13px]"><thead><tr class="text-dim text-[11px] uppercase tracking-wide border-b border-bd"><th class="text-left px-3 py-2 font-medium">Agent</th><th class="text-left px-3 py-2 font-medium">Status</th><th class="text-left px-3 py-2 font-medium">Turn</th><th class="text-left px-3 py-2 font-medium">Task</th></tr></thead><tbody id="agentBody"><tr><td colspan="4" class="text-dim text-xs italic py-3">No agents detected yet</td></tr></tbody></table></div>
    </div>
    <div class="bg-surface border border-bd rounded-lg overflow-hidden">
      <div class="px-4 py-3 border-b border-bd text-[13px] font-semibold text-purple-light bg-surface-2">Latest Activity</div>
      <div class="p-4"><ul class="text-xs" id="activityList"><li class="text-dim italic">No activity yet</li></ul></div>
    </div>
  </div>
  <div class="mt-5 pt-3 border-t border-bd flex justify-between text-[11px] text-dim"><span>Serena Memory Dashboard</span><span id="footerTime">--</span></div>
  <script>
    const $=s=>document.querySelector(s);
    function normalizeStatus(s){const l=(s||'').toLowerCase();if(['running','active','in_progress','in-progress'].includes(l))return'running';if(['completed','done','finished'].includes(l))return'completed';if(['failed','error'].includes(l))return'failed';if(['blocked','waiting'].includes(l))return'blocked';return'pending'}
    const statusCls={running:'bg-ok/15 text-ok border-ok/30',completed:'bg-cyan/15 text-cyan border-cyan/30',failed:'bg-err/15 text-err border-err/30',blocked:'bg-warn/15 text-warn border-warn/30',pending:'bg-dim/15 text-dim border-dim/30'};
    const dotCls={running:'bg-ok shadow-[0_0_6px] shadow-ok',completed:'bg-cyan',failed:'bg-err',blocked:'bg-warn',pending:'bg-dim'};
    function clearChildren(el){while(el.firstChild)el.removeChild(el.firstChild)}
    function createTextEl(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el}
    function renderAgents(agents){const tbody=$('#agentBody');clearChildren(tbody);if(!agents||!agents.length){const tr=document.createElement('tr'),td=createTextEl('td','No agents detected yet','text-dim text-xs italic py-3');td.setAttribute('colspan','4');tr.appendChild(td);tbody.appendChild(tr);return}agents.forEach(a=>{const ns=normalizeStatus(a.status),tr=document.createElement('tr');tr.className='border-b border-bd/40 last:border-b-0';const td1=createTextEl('td',a.agent,'px-3 py-2.5');tr.appendChild(td1);const std=document.createElement('td');std.className='px-3 py-2.5';const dot=document.createElement('span');dot.className='inline-block w-2 h-2 rounded-full mr-1.5 '+(dotCls[ns]||'bg-dim')+(ns==='running'?' pulse-dot':'');std.appendChild(dot);std.appendChild(createTextEl('span',ns));tr.appendChild(std);tr.appendChild(createTextEl('td',a.turn!=null?String(a.turn):'-','px-3 py-2.5'));tr.appendChild(createTextEl('td',a.task||'','px-3 py-2.5'));tbody.appendChild(tr)})}
    function renderActivity(activity){const list=$('#activityList');clearChildren(list);if(!activity||!activity.length){list.appendChild(createTextEl('li','No activity yet','text-dim italic'));return}activity.forEach(a=>{const li=document.createElement('li');li.className='py-2 border-b border-bd/30 last:border-b-0 flex gap-2';li.appendChild(createTextEl('span','['+a.agent+']','text-purple-light font-semibold whitespace-nowrap'));li.appendChild(createTextEl('span',a.message,'text-dim'));list.appendChild(li)})}
    function renderState(state){$('#sessionId').textContent=state.session?.id||'N/A';const st=(state.session?.status||'UNKNOWN').toUpperCase(),ns=normalizeStatus(st),sel=$('#sessionStatus');sel.textContent=st;sel.className='px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide border '+(statusCls[ns]||statusCls.pending);if(state.updatedAt){const ts=new Date(state.updatedAt).toLocaleString();$('#updatedAt').textContent='Updated: '+ts;$('#footerTime').textContent=ts}renderAgents(state.agents);renderActivity(state.activity)}
    let ws,rd=1000;function connect(){const b=$('#connBadge');b.textContent='Connecting...';b.className='ml-auto px-3 py-1 rounded-xl text-[11px] font-semibold border border-warn/30 bg-warn/15 text-warn';const p=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(p+'//'+location.host);ws.onopen=()=>{b.textContent='Connected';b.className='ml-auto px-3 py-1 rounded-xl text-[11px] font-semibold border border-ok/30 bg-ok/15 text-ok';rd=1000};ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.data)renderState(m.data)}catch{}};ws.onclose=()=>{b.textContent='Disconnected';b.className='ml-auto px-3 py-1 rounded-xl text-[11px] font-semibold border border-err/30 bg-err/15 text-err';setTimeout(()=>{rd=Math.min(rd*1.5,10000);connect()},rd)};ws.onerror=()=>ws.close()}
    fetch('/api/state').then(r=>r.json()).then(renderState).catch(()=>{});connect();
  </script>
</body>
</html>`;

const SUMMARY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
${TW_HEAD}
<title>oh-my-agent — Summary Graph</title>
<style>
.filter-btn{transition:opacity .2s}.filter-btn.off{opacity:.3}
#panel{right:-380px;transition:right .3s}.panel-open{right:0!important}
.hm-bar{border-radius:2px 2px 0 0;min-width:2px}
.hm-bar:hover{opacity:.8}
.tool-badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;margin:2px}
</style>
</head>
<body class="bg-[#0d1117] text-gray-200 font-sans overflow-hidden">
<div class="fixed top-4 left-4 z-10 flex gap-2 items-center flex-wrap max-w-md" id="controls">
  <select id="window" class="bg-[#161b22] text-gray-200 border border-gray-700 rounded-md px-2.5 py-1.5 text-[13px]">
    <option value="1d">Today</option><option value="3d">3 Days</option>
    <option value="7d" selected>7 Days</option><option value="2w">2 Weeks</option><option value="30d">30 Days</option>
  </select>
  <input id="topK" type="number" min="0" max="50" value="" placeholder="Top K" class="bg-[#161b22] text-gray-200 border border-gray-700 rounded-md px-2.5 py-1.5 text-[13px] w-20">
  <button id="refresh" class="bg-green-700 hover:bg-green-600 text-white border-none rounded-md px-3 py-1.5 text-[13px] cursor-pointer">Refresh</button>
</div>
<div class="fixed top-[52px] left-4 z-10 flex gap-1.5" id="filters"></div>
<div class="fixed hidden bg-[#1c2128] border border-gray-700 rounded-lg p-3 text-[13px] pointer-events-none z-20 max-w-[280px] shadow-lg" id="tooltip"></div>
<div class="fixed top-4 right-4 text-[13px] opacity-70 text-right" id="stats"></div>
<div id="panel" class="fixed top-0 w-[380px] h-screen bg-[#161b22] border-l border-gray-700 z-[15] flex flex-col shadow-[-4px_0_12px_rgba(0,0,0,.4)]">
  <div class="px-4 py-3.5 border-b border-gray-700 flex justify-between items-center">
    <h3 class="text-sm font-semibold" id="panel-title">Prompts</h3>
    <button id="panel-close" class="bg-transparent border-none text-gray-500 text-lg cursor-pointer">&times;</button>
  </div>
  <div class="flex-1 overflow-y-auto" id="panel-body"></div>
</div>
<div class="fixed bottom-[62px] left-4 text-[11px] text-gray-500 z-10">Activity by hour</div>
<div class="fixed bottom-0 inset-x-0 h-[60px] bg-[#0d1117] border-t border-[#21262d] z-10 flex items-end px-4 gap-px" id="heatmap"></div>
<svg class="w-screen h-[calc(100vh-60px)]"></svg>
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
document.getElementById('panel-close').onclick=()=>document.getElementById('panel').classList.remove('panel-open');

function showPanel(project,entries){
  const panel=document.getElementById('panel');
  document.getElementById('panel-title').textContent=project;
  const body=document.getElementById('panel-body');
  const items=entries.filter(e=>activeTools.has(e.tool)&&(e.project||'(unknown)')===project)
    .sort((a,b)=>b.timestamp-a.timestamp);
  body.innerHTML=items.slice(0,100).map(e=>{
    const d=new Date(e.timestamp);
    const time=d.toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
    return '<div class="px-4 py-2.5 border-b border-[#21262d] text-xs leading-relaxed"><div class="text-gray-500 text-[11px] mb-1"><span class="inline-block w-2 h-2 rounded-full mr-1" style="background:'+TC[e.tool]+'"></span>'
      +e.tool+' &middot; '+time+'</div>'+escHtml(e.prompt.slice(0,300))+'</div>';
  }).join('');
  if(items.length>100)body.innerHTML+='<div class="px-4 py-2.5 text-gray-500 text-xs">+'+(items.length-100)+' more...</div>';
  panel.classList.add('panel-open');
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
    return '<div class="flex-1 hm-bar" style="height:'+h+'px;background:'+
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

function buildClientGraph(entries){
  const projMap={};
  entries.forEach(e=>{
    const p=e.project||'(unknown)';
    if(!projMap[p])projMap[p]={count:0,first:Infinity,last:0,tools:{}};
    const pm=projMap[p];pm.count++;pm.first=Math.min(pm.first,e.timestamp);pm.last=Math.max(pm.last,e.timestamp);
    pm.tools[e.tool]=(pm.tools[e.tool]||0)+1;
  });
  const nodes=Object.entries(projMap).map(([id,d])=>{
    const primary=Object.entries(d.tools).sort(([,a],[,b])=>b-a)[0][0];
    return{id,label:id,count:d.count,duration:d.last-d.first,tools:d.tools,primaryTool:primary};
  }).sort((a,b)=>b.count-a.count);
  const nodeIds=new Set(nodes.map(n=>n.id));
  const edgeMap={};
  const sorted=[...entries].sort((a,b)=>a.timestamp-b.timestamp);
  for(let i=0;i<sorted.length;i++){const a=sorted[i];const pA=a.project||'(unknown)';if(!nodeIds.has(pA))continue;
    for(let j=i+1;j<sorted.length;j++){const b=sorted[j];if(b.timestamp-a.timestamp>1800000)break;
      const pB=b.project||'(unknown)';if(pB===pA||!nodeIds.has(pB))continue;
      const k=[pA,pB].sort().join('|||');edgeMap[k]=(edgeMap[k]||0)+1}}
  const edges=Object.entries(edgeMap).map(([k,w])=>{const[s,t]=k.split('|||');return{source:s,target:t,weight:w}});
  return{nodes,edges};
}

function renderAll(data){
  const filtered=data.entries.filter(e=>activeTools.has(e.tool));
  renderGraph(filtered);
  renderHeatmap(data.entries);
}

function renderGraph(entries){
  const{nodes,edges}=buildClientGraph(entries);
  if(!nodes.length){
    document.getElementById('stats').textContent='No data';
    linkG.selectAll('*').remove();nodeG.selectAll('*').remove();labelG.selectAll('*').remove();return;
  }

  const totalPrompts=nodes.reduce((s,n)=>s+n.count,0);
  document.getElementById('stats').innerHTML='Prompts: <b>'+totalPrompts+'</b> &middot; Projects: <b>'+nodes.length+'</b>';

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
    tip.classList.remove('hidden');tip.style.left=(e.pageX+12)+'px';tip.style.top=(e.pageY-12)+'px';
  }).on('mousemove',e=>{
    const tip=document.getElementById('tooltip');tip.style.left=(e.pageX+12)+'px';tip.style.top=(e.pageY-12)+'px';
  }).on('mouseout',()=>{document.getElementById('tooltip').classList.add('hidden')});

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
svg.on('click',()=>document.getElementById('panel').classList.remove('panel-open'));

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
