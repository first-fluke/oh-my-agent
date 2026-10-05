// Session trajectory viewer: a turn-aware ledger with a timing overview and a
// record inspector. Self-contained (no CDN) so it renders under the dashboard
// CSP and offline. The page is a raw template: keep it free of backticks and
// dollar-brace sequences.
export const TRAJECTORY_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>OMA Session Trajectory</title>
<style>
:root{--bg:#0f0b1a;--surface:#1a1428;--surface-2:#241e33;--bd:#3d2e5c;--fg:#e8e0f0;--dim:#a094b8;--accent:#c39bd3;
--k-oma:#f0a030;--k-user:#5aa2e6;--k-assistant:#c39bd3;--k-tool:#2ecc71;--k-subtool:#1abc9c;--k-context:#8a7da0;--k-compacted:#f1c40f;--err:#ff6b5a}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column}
button,select,input{font:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
header{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--bd);background:var(--surface)}
header h1{font-size:16px;margin:0;color:var(--accent);font-weight:600}
select,input[type=search]{background:var(--bg);border:1px solid var(--bd);border-radius:6px;padding:6px 8px;min-height:32px}
select{max-width:min(420px,100%)}
input[type=search]{width:200px}
.btn{background:var(--surface-2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;min-height:32px}
.btn[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}
.badge{display:inline-block;padding:1px 8px;border-radius:10px;border:1px solid var(--bd);font-size:12px;white-space:nowrap}
.badge.active{color:var(--k-tool);border-color:var(--k-tool)}
.badge.failed{color:var(--err);border-color:var(--err)}
.spacer{flex:1}
#strip{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 16px;border-bottom:1px solid var(--bd);font-size:12px;color:var(--dim)}
#strip b{color:var(--fg);font-weight:600}
#strip .warn{color:var(--k-compacted)}
#filters{display:flex;flex-wrap:wrap;gap:6px;padding:8px 16px}
.chip{background:transparent;border:1px solid var(--bd);border-radius:12px;padding:2px 10px;font-size:12px;min-height:26px}
.chip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
.chip[aria-pressed=false]{opacity:.4}
#overview{padding:0 16px 8px;border-bottom:1px solid var(--bd)}
#overview svg{display:block;width:100%;user-select:none;cursor:crosshair}
#overview .lane{fill:var(--dim);font-size:10px}
#overview .turn{stroke:var(--bd);stroke-width:1}
#overview .turnlabel{fill:var(--dim);font-size:9px}
#overview .span{cursor:pointer}
#overview .span.sel{stroke:#fff;stroke-width:1.5}
#overview .brush{fill:var(--accent);opacity:.18}
#hint{font-size:11px;color:var(--dim);padding-top:2px}
main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,38%)}
#ledger{overflow:auto;border-right:1px solid var(--bd)}
#inspector{overflow:auto;padding:12px 16px}
.turnhead{position:sticky;top:0;z-index:1;display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:var(--surface-2);border:0;border-bottom:1px solid var(--bd);padding:6px 12px;font-size:12px}
.turnhead .t{color:var(--accent);font-weight:600;white-space:nowrap}
.turnhead .s{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dim)}
.turnhead .m{white-space:nowrap;color:var(--dim)}
.row{display:grid;grid-template-columns:52px 70px 124px minmax(0,1fr) 64px 112px;gap:8px;align-items:center;padding:3px 12px;border-bottom:1px solid rgba(61,46,92,.35);font-size:13px;cursor:pointer}
.row:hover{background:var(--surface)}
.row.sel{background:var(--surface-2);box-shadow:inset 3px 0 0 var(--accent)}
.row.nested .sum{padding-left:16px}
.row .idx,.row .time,.row .dur,.row .tok{color:var(--dim);font-size:12px;white-space:nowrap}
.row .dur,.row .tok{text-align:right}
.kind{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sum{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sum .v{color:var(--dim);font-size:11px;margin-right:6px}
.sum .a{color:var(--k-subtool);font-size:11px;margin-right:6px}
.sum .e{color:var(--err);font-size:11px;font-weight:600;margin-right:6px}
.empty{padding:24px 16px;color:var(--dim)}
.more{display:block;width:100%;background:var(--surface);border:0;border-bottom:1px solid var(--bd);padding:8px 12px;font-size:12px;color:var(--accent);text-align:left}
#inspector h2{font-size:14px;margin:0 0 8px;overflow-wrap:anywhere}
.meta{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:2px 12px;font-size:12px;margin-bottom:10px}
.meta dt{color:var(--dim)}.meta dd{margin:0;overflow-wrap:anywhere}
details{border:1px solid var(--bd);border-radius:6px;margin-bottom:8px;background:var(--surface)}
summary{padding:6px 10px;font-size:12px;font-weight:600;color:var(--accent);cursor:pointer}
pre{margin:0;padding:10px;border-top:1px solid var(--bd);font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;max-height:60vh;overflow:auto}
@media (max-width:860px){
 html,body{height:auto}
 body{font-size:16px;display:block}
 main{display:block}
 #ledger{border-right:0;border-bottom:1px solid var(--bd);max-height:70vh}
 .row{grid-template-columns:44px 104px minmax(0,1fr) 60px;font-size:14px}
 .row .time,.row .tok{display:none}
 input[type=search]{width:100%}
}
</style>
</head>
<body>
<header>
  <h1>Session Trajectory</h1>
  <select id="session" aria-label="Session"></select>
  <span class="badge" id="status">--</span>
  <span class="spacer"></span>
  <input type="search" id="search" placeholder="Search records" aria-label="Search records">
  <button class="btn" id="mode" aria-pressed="false" title="Lay the overview out by recorded time instead of equal-width records">Recorded time</button>
  <button class="btn" id="fold">Collapse turns</button>
  <button class="btn" id="live" aria-pressed="true" title="Reload an active session every 10 seconds">Live</button>
  <button class="btn" id="refresh">Refresh</button>
</header>
<div id="strip" aria-live="polite"></div>
<div id="filters" role="group" aria-label="Record kinds"></div>
<div id="overview"><svg id="svg" height="96" role="img" aria-label="Timing overview"></svg><div id="hint">Click a span to inspect it. Drag to focus the ledger on a range; double-click to clear.</div></div>
<main>
  <div id="ledger" tabindex="0" aria-label="Trajectory ledger"></div>
  <aside id="inspector" aria-label="Record inspector"><div class="empty">Select a record to inspect its input, output, timing and tokens.</div></aside>
</main>
<script>
(function(){
'use strict';
var TOKEN=window.__OMA_DASHBOARD_TOKEN__||'';
var HEADERS={'X-OMA-Dashboard-Token':TOKEN};
var KINDS=['oma','user','assistant','tool','subtool','context','compacted'];
var LABEL={oma:'OMA',user:'User',assistant:'Assistant',tool:'Tool',subtool:'Subtool',context:'Context',compacted:'Compacted'};
var LANE={oma:0,user:1,context:1,compacted:1,assistant:2,tool:3,subtool:3};
var LANES=['OMA','Input','Assistant','Tool'];
var SVGNS='http://www.w3.org/2000/svg';
var ROW_PAGE=400;
var S={traj:null,sid:null,selected:null,timed:false,query:'',hidden:{},focus:null,collapsed:{},shown:{},live:true,spans:[]};
function $(id){return document.getElementById(id)}
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=text;return n}
function svgEl(tag,attrs){var n=document.createElementNS(SVGNS,tag);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild)}
function color(kind){return 'var(--k-'+kind+')'}
function fmtDur(ms){if(ms===null||ms===undefined)return '—';if(ms<1000)return Math.round(ms)+'ms';if(ms<59950)return (ms/1000).toFixed(1)+'s';var s=Math.round(ms/1000),m=Math.floor(s/60);if(m<60)return m+'m '+(s-m*60)+'s';var h=Math.floor(m/60);return h+'h '+(m-h*60)+'m'}
function fmtTok(n){if(!n)return '0';if(n<1000)return String(n);if(n<1e6)return (n/1e3).toFixed(n<1e4?1:0)+'k';return (n/1e6).toFixed(1)+'M'}
function fmtClock(ms){if(ms===null||ms===undefined)return '';var d=new Date(ms);function p(v){return v<10?'0'+v:String(v)}return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())}
function api(path){return fetch(path,{headers:HEADERS}).then(function(r){return r.json().then(function(body){if(!r.ok)throw new Error(body&&body.error?body.error:'request failed ('+r.status+')');return body})})}

function matches(r){
  if(S.hidden[r.kind])return false;
  if(S.focus&&!S.focus[r.index])return false;
  if(!S.query)return true;
  var hay=[r.text,r.toolName,r.agent,r.vendor,r.input,r.output,r.thinking,r.event?JSON.stringify(r.event.payload||{}):''].join('\n').toLowerCase();
  return hay.indexOf(S.query)!==-1;
}
function visible(){return S.traj?S.traj.records.filter(matches):[]}

function renderStrip(){
  var strip=$('strip');clear(strip);var t=S.traj;if(!t)return;
  var st=$('status');st.textContent=(t.meta.workflow||'session')+' · '+t.meta.status+(t.archived?' · archived':'');st.className='badge '+t.meta.status;
  function item(label,value,cls){var s=el('span',cls);s.appendChild(el('b',null,value));s.appendChild(document.createTextNode(' '+label));strip.appendChild(s)}
  item('records',String(t.totals.records));
  item(t.totals.turns===1?'turn':'turns',String(t.totals.turns));
  item('tool calls'+(t.totals.toolErrors?' ('+t.totals.toolErrors+' failed)':''),String(t.totals.toolCalls));
  if(t.totals.startedAt!==null&&t.totals.endedAt!==null)item('wall time',fmtDur(t.totals.endedAt-t.totals.startedAt));
  var k=t.totals.tokens;
  item('in',fmtTok(k.input));item('cache read',fmtTok(k.cacheRead));item('cache write',fmtTok(k.cacheWrite));item('out',fmtTok(k.output));
  t.vendorSessions.forEach(function(v){
    var note=v.status==='loaded'?v.records+' records'+(v.timing==='none'?' · no timestamps, whole transcript shown':v.timing==='partial'?' · only prompts timestamped':''):v.status==='missing'?'transcript not found':'transcript not supported';
    var s=el('span',v.status==='loaded'&&v.timing!=='none'?'':'warn',v.vendor+' '+v.vendorSid.slice(0,8)+' · '+note);
    s.title=v.sourcePath||v.vendorSid;strip.appendChild(s);
  });
  if(S.focus){var b=el('button','chip','Clear focus ('+Object.keys(S.focus).length+')');b.onclick=function(){S.focus=null;renderAll()};strip.appendChild(b)}
}

function renderFilters(){
  var box=$('filters');clear(box);if(!S.traj)return;
  var counts={};S.traj.records.forEach(function(r){counts[r.kind]=(counts[r.kind]||0)+1});
  KINDS.forEach(function(kind){
    if(!counts[kind])return;
    var b=el('button','chip');var dot=el('i');dot.style.background=color(kind);b.appendChild(dot);
    b.appendChild(document.createTextNode(LABEL[kind]+' '+counts[kind]));
    b.setAttribute('aria-pressed',S.hidden[kind]?'false':'true');
    b.onclick=function(){S.hidden[kind]=!S.hidden[kind];renderAll()};
    box.appendChild(b);
  });
}

// Project records onto the overview: equal-width sequence, or recorded time
// with idle gaps between operations removed.
function project(records){
  var spans=[];
  if(!S.timed){
    records.forEach(function(r,i){spans.push({r:r,start:i,end:i+1})});
    return {spans:spans,start:0,end:Math.max(1,records.length)};
  }
  var timed=records.filter(function(r){return r.startedAt!==null}).map(function(r){return {r:r,s:r.startedAt,e:r.startedAt+(r.durationMs||0)}});
  timed.sort(function(a,b){return a.s-b.s||a.e-b.e});
  var removed=0,covered=null;
  timed.forEach(function(x){
    if(covered!==null&&x.s>covered)removed+=x.s-covered;
    spans.push({r:x.r,start:x.s-removed,end:x.e-removed});
    covered=covered===null?x.e:Math.max(covered,x.e);
  });
  if(!spans.length)return {spans:spans,start:0,end:1};
  var lo=Infinity,hi=-Infinity;spans.forEach(function(x){lo=Math.min(lo,x.start);hi=Math.max(hi,x.end)});
  return {spans:spans,start:lo,end:hi>lo?hi:lo+1};
}

function renderOverview(){
  var svg=$('svg');clear(svg);S.spans=[];if(!S.traj)return;
  var records=S.traj.records.filter(function(r){return !S.hidden[r.kind]});
  var model=project(records);
  var W=svg.clientWidth||svg.parentNode.clientWidth||800,G=64,PAD=8,TOP=14,LH=16,GAP=4;
  var scale=(W-G-PAD)/(model.end-model.start);
  function x(v){return G+(v-model.start)*scale}
  LANES.forEach(function(name,i){var t=svgEl('text',{x:0,y:TOP+i*(LH+GAP)+12,'class':'lane'});t.textContent=name;svg.appendChild(t)});
  var seenTurn={},lastLabel=-Infinity;
  model.spans.forEach(function(sp){
    var r=sp.r;
    if(r.turn!==null&&!seenTurn[r.turn]){
      seenTurn[r.turn]=true;var tx=x(sp.start);
      svg.appendChild(svgEl('line',{x1:tx,x2:tx,y1:TOP-2,y2:TOP+4*(LH+GAP)-GAP,'class':'turn'}));
      if(tx-lastLabel>=22){var tl=svgEl('text',{x:tx+2,y:9,'class':'turnlabel'});tl.textContent='T'+r.turn;svg.appendChild(tl);lastLabel=tx}
    }
  });
  model.spans.forEach(function(sp){
    var r=sp.r,lane=LANE[r.kind],y=TOP+lane*(LH+GAP),x0=x(sp.start),w=Math.max(2,(sp.end-sp.start)*scale-(S.timed?0:1));
    var node;
    if(r.kind==='oma'){var cx=x0+(S.timed?0:w/2),cy=y+LH/2;node=svgEl('rect',{x:cx-4,y:cy-4,width:8,height:8,transform:'rotate(45 '+cx+' '+cy+')'})}
    else node=svgEl('rect',{x:x0,y:y,width:w,height:LH,rx:2});
    node.setAttribute('fill',r.isError?'var(--err)':color(r.kind));
    node.setAttribute('class','span'+(S.selected===r.id?' sel':''));
    node.setAttribute('data-index',r.index);
    if(S.focus&&!S.focus[r.index])node.setAttribute('opacity','.25');
    var title=svgEl('title',{});title.textContent='#'+r.index+' '+LABEL[r.kind]+' · '+fmtDur(r.durationMs)+'\n'+r.text;node.appendChild(title);
    svg.appendChild(node);
    // Recorded time: shade the wait for the first token apart from decoding.
    if(S.timed&&r.ttftMs&&r.durationMs){var wait=svgEl('rect',{x:x0,y:y,width:Math.min(w,w*r.ttftMs/r.durationMs),height:LH,rx:2,fill:'var(--bg)',opacity:'.5','pointer-events':'none'});svg.appendChild(wait)}
    S.spans.push({index:r.index,x0:x0,x1:x0+w});
  });
}

var drag=null;
function svgX(ev){var rect=$('svg').getBoundingClientRect();return ev.clientX-rect.left}
$('svg').addEventListener('mousedown',function(ev){if(ev.button!==0)return;drag={x0:svgX(ev),rect:null,target:ev.target};ev.preventDefault()});
window.addEventListener('mousemove',function(ev){
  if(!drag)return;var x1=svgX(ev);if(Math.abs(x1-drag.x0)<4)return;
  if(!drag.rect){drag.rect=svgEl('rect',{y:0,height:96,'class':'brush'});$('svg').appendChild(drag.rect)}
  drag.rect.setAttribute('x',Math.min(drag.x0,x1));drag.rect.setAttribute('width',Math.abs(x1-drag.x0));
});
window.addEventListener('mouseup',function(ev){
  if(!drag)return;var d=drag;drag=null;var x1=svgX(ev);
  if(Math.abs(x1-d.x0)<4){
    var index=d.target&&d.target.getAttribute?d.target.getAttribute('data-index'):null;
    if(index!==null)selectIndex(Number(index),true);
    return;
  }
  var lo=Math.min(d.x0,x1),hi=Math.max(d.x0,x1),focus={},any=false;
  S.spans.forEach(function(sp){if(sp.x0<=hi&&sp.x1>=lo){focus[sp.index]=true;any=true}});
  S.focus=any?focus:null;renderAll();
});
$('svg').addEventListener('dblclick',function(){if(S.focus){S.focus=null;renderAll()}});

function turnMeta(records){
  var start=null,end=null,inTok=0,outTok=0;
  records.forEach(function(r){
    if(r.startedAt!==null){if(start===null)start=r.startedAt;end=Math.max(end===null?0:end,r.startedAt+(r.durationMs||0))}
    if(r.tokens){inTok+=r.tokens.input+r.tokens.cacheRead+r.tokens.cacheWrite;outTok+=r.tokens.output}
  });
  var parts=[records.length+' records'];
  if(start!==null&&end!==null)parts.push(fmtDur(end-start));
  if(inTok||outTok)parts.push(fmtTok(inTok)+' in / '+fmtTok(outTok)+' out');
  return parts.join(' · ');
}

function renderLedger(){
  var box=$('ledger');clear(box);
  if(!S.traj){box.appendChild(el('div','empty','No session selected.'));return}
  var rows=visible();
  if(!rows.length){box.appendChild(el('div','empty',S.traj.records.length?'No records match the current filters.':'This session has no recorded events.'));return}
  var groups=[],byKey={};
  rows.forEach(function(r){var key=r.turn===null?'pre':String(r.turn);if(!byKey[key]){byKey[key]={key:key,turn:r.turn,records:[]};groups.push(byKey[key])}byKey[key].records.push(r)});
  groups.forEach(function(g){
    var head=el('button','turnhead');
    var opener=null;g.records.some(function(r){if(r.kind==='user'){opener=r;return true}return false});
    head.appendChild(el('span','t',(S.collapsed[g.key]?'▸ ':'▾ ')+(g.turn===null?'Before first turn':'Turn '+g.turn)));
    head.appendChild(el('span','s',opener?opener.text:''));
    head.appendChild(el('span','m',turnMeta(g.records)));
    head.setAttribute('aria-expanded',S.collapsed[g.key]?'false':'true');
    head.onclick=function(){S.collapsed[g.key]=!S.collapsed[g.key];renderLedger()};
    box.appendChild(head);
    if(S.collapsed[g.key])return;
    var shown=S.shown[g.key]||ROW_PAGE;
    g.records.slice(0,shown).forEach(function(r){
      var row=el('div','row'+(S.selected===r.id?' sel':'')+(r.agent?' nested':''));
      row.setAttribute('data-id',r.id);row.setAttribute('role','button');row.tabIndex=-1;
      row.appendChild(el('span','idx mono','#'+r.index));
      row.appendChild(el('span','time mono',fmtClock(r.startedAt)));
      var kind=el('span','kind',r.kind==='oma'&&r.event?r.event.kind:LABEL[r.kind]);kind.style.color=color(r.kind);kind.title=kind.textContent;row.appendChild(kind);
      var sum=el('span','sum');
      if(r.isError)sum.appendChild(el('span','e','ERROR'));
      if(r.agent)sum.appendChild(el('span','a',r.agent));
      if(r.vendor&&r.kind!=='oma')sum.appendChild(el('span','v',r.vendor));
      sum.appendChild(document.createTextNode(r.text));sum.title=r.text;row.appendChild(sum);
      row.appendChild(el('span','dur mono',r.durationMs===null?'':fmtDur(r.durationMs)));
      row.appendChild(el('span','tok mono',r.tokens?fmtTok(r.tokens.input+r.tokens.cacheRead+r.tokens.cacheWrite)+' / '+fmtTok(r.tokens.output):''));
      row.onclick=function(){select(r.id,false)};
      box.appendChild(row);
    });
    // Long turns render a page at a time to keep the page responsive.
    if(g.records.length>shown){
      var more=el('button','more','Show '+Math.min(ROW_PAGE,g.records.length-shown)+' more of '+(g.records.length-shown)+' rows');
      more.onclick=function(){S.shown[g.key]=shown+ROW_PAGE;renderLedger()};
      box.appendChild(more);
    }
  });
}

function section(title,text,open){
  var d=el('details');if(open)d.open=true;d.appendChild(el('summary',null,title));d.appendChild(el('pre','mono',text));return d;
}
function renderInspector(){
  var box=$('inspector');clear(box);
  var r=null;if(S.traj&&S.selected)S.traj.records.some(function(x){if(x.id===S.selected){r=x;return true}return false});
  if(!r){box.appendChild(el('div','empty','Select a record to inspect its input, output, timing and tokens.'));return}
  box.appendChild(el('h2',null,'#'+r.index+' '+(r.kind==='oma'&&r.event?r.event.kind:LABEL[r.kind])+(r.toolName?' · '+r.toolName:'')));
  var dl=el('dl','meta');
  function add(k,v){if(v===undefined||v===null||v==='')return;dl.appendChild(el('dt',null,k));dl.appendChild(el('dd','mono',String(v)))}
  add('Turn',r.turn);
  add('Started',r.startedAt===null?null:new Date(r.startedAt).toLocaleString());
  add('Duration',r.durationMs===null?null:fmtDur(r.durationMs));
  add('Time to first token',r.ttftMs===undefined||r.ttftMs===null?null:fmtDur(r.ttftMs));
  add('Vendor',r.vendor);add('Vendor session',r.vendorSid);add('Agent',r.agent);add('Model',r.model);
  add('Call id',r.callId);add('Parent call',r.parentCallId);
  if(r.isError)add('Result','error');
  if(r.tokens){add('Input tokens',r.tokens.input);add('Cache read',r.tokens.cacheRead);add('Cache write',r.tokens.cacheWrite);add('Output tokens',r.tokens.output);add('Thinking tokens',r.tokens.think)}
  if(r.event)add('Event id',r.event.eventId);
  box.appendChild(dl);
  if(r.event&&r.event.payload)box.appendChild(section('Event payload',JSON.stringify(r.event.payload,null,2),true));
  if(r.thinking)box.appendChild(section('Thinking',r.thinking,false));
  if(r.input)box.appendChild(section('Input',r.input,true));
  if(r.output)box.appendChild(section('Output',r.output,true));
}

function select(id,scroll){
  S.selected=id;renderOverview();renderLedger();renderInspector();
  if(scroll){var rows=$('ledger').querySelectorAll('.row');for(var i=0;i<rows.length;i++){if(rows[i].getAttribute('data-id')===id){rows[i].scrollIntoView({block:'center'});break}}}
}
function selectIndex(index,scroll){
  var r=null;S.traj.records.some(function(x){if(x.index===index){r=x;return true}return false});
  if(!r)return;
  var key=r.turn===null?'pre':String(r.turn);if(S.collapsed[key])S.collapsed[key]=false;
  var position=0;visible().some(function(x){if((x.turn===null?'pre':String(x.turn))!==key)return false;position++;return x.id===r.id});
  if(position>(S.shown[key]||ROW_PAGE))S.shown[key]=position+ROW_PAGE;
  select(r.id,scroll);
}
function renderAll(){renderStrip();renderFilters();renderOverview();renderLedger();renderInspector()}

$('ledger').addEventListener('keydown',function(ev){
  if(ev.key!=='ArrowDown'&&ev.key!=='ArrowUp')return;
  var seen={};var rows=visible().filter(function(r){var k=r.turn===null?'pre':String(r.turn);if(S.collapsed[k])return false;seen[k]=(seen[k]||0)+1;return seen[k]<=(S.shown[k]||ROW_PAGE)});if(!rows.length)return;
  var at=-1;rows.some(function(r,i){if(r.id===S.selected){at=i;return true}return false});
  var next=rows[Math.max(0,Math.min(rows.length-1,at+(ev.key==='ArrowDown'?1:-1)))];
  ev.preventDefault();select(next.id,true);
});

function load(keep){
  if(!S.sid)return Promise.resolve();
  return api('/api/trajectory?sid='+encodeURIComponent(S.sid)).then(function(t){
    S.traj=t;
    if(!keep){S.selected=null;S.focus=null;S.collapsed={};S.shown={};
      // Long sessions open at the tail, like a live log.
      if(t.records.length>1500){for(var n=1;n<t.totals.turns;n++)S.collapsed[String(n)]=true}}
    renderAll();
  }).catch(function(err){S.traj=null;renderAll();var box=$('ledger');clear(box);box.appendChild(el('div','empty','Could not load this session: '+err.message))});
}
function loadSessions(){
  return api('/api/trajectory/sessions').then(function(data){
    var sel=$('session');clear(sel);
    data.sessions.forEach(function(s){var o=el('option',null,s.sid+'  '+(s.workflow||'')+'  '+s.status);o.value=s.sid;sel.appendChild(o)});
    var wanted=new URLSearchParams(location.search).get('sid')||data.active||(data.sessions[0]&&data.sessions[0].sid)||null;
    if(wanted&&!data.sessions.some(function(s){return s.sid===wanted})){var o=el('option',null,wanted);o.value=wanted;sel.appendChild(o)}
    S.sid=wanted;if(wanted)sel.value=wanted;
  });
}
$('session').onchange=function(){S.sid=this.value;history.replaceState(null,'','?sid='+encodeURIComponent(S.sid));load(false)};
$('search').oninput=function(){S.query=this.value.trim().toLowerCase();renderLedger()};
$('mode').onclick=function(){S.timed=!S.timed;this.setAttribute('aria-pressed',S.timed?'true':'false');renderOverview()};
$('fold').onclick=function(){
  if(!S.traj)return;var keys=['pre'];for(var n=1;n<=S.traj.totals.turns;n++)keys.push(String(n));
  var all=keys.every(function(k){return S.collapsed[k]});keys.forEach(function(k){S.collapsed[k]=!all});
  this.textContent=all?'Collapse turns':'Expand turns';renderLedger();
};
$('live').onclick=function(){S.live=!S.live;this.setAttribute('aria-pressed',S.live?'true':'false')};
$('refresh').onclick=function(){load(true)};
window.addEventListener('resize',renderOverview);
setInterval(function(){if(S.live&&!document.hidden&&S.traj&&S.traj.meta.status==='active')load(true)},10000);
loadSessions().then(function(){return load(false)}).catch(function(err){var box=$('ledger');clear(box);box.appendChild(el('div','empty','Could not load sessions: '+err.message))});
})();
</script>
</body>
</html>`;
