#!/usr/bin/env python3
"""Sequential, resumable traversal of all 260 official WorkBuddy tasks."""
from __future__ import annotations

import argparse
import collections
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time
import tomllib
import traceback
import zipfile

import run as smoke


SUBSETS = {"code": 80, "web": 70, "office": 50, "sec": 60}
CHECKSUMS = {"code": smoke.DATA_SHA256,
             "web": "bf4e0258501a7007d547eeb5f3e9cfb7dd648feaaa4f3dbc23dbae87758e0b66",
             "office": "89d4480b483ca2e0555ba96cc7d73c16c78802b17cd822044d5f7f27ab0558bf",
             "sec": "f615f55b2ce68294eca6bef658d3a135978ca1e7f00b8e712292a2738f79c3f3"}


def frozen_oma_seed(cache):
    seed = cache / "workbuddy-security-oma-seed"
    version = json.loads((seed / "skills/_version.json").read_text())["version"]
    if version != "20.10.3":
        raise RuntimeError(f"Expected frozen OMA 20.10.3 snapshot; found {version}")
    return seed


def version_scaffold(task, cache):
    """Use published wheel metadata where the official editable install generates it."""
    text = (Path(task["path"]) / "environment/Dockerfile").read_text()
    if "SETUPTOOLS_SCM_PRETEND_VERSION_FOR_PYTEST=8.4.2" not in text:
        return None
    metadata = json.loads(smoke.fetch("https://pypi.org/pypi/pytest/8.4.2/json",
                                      cache / "workbuddy-pytest-8.4.2-metadata.json"))
    wheel = next(item for item in metadata["urls"] if item["filename"] == "pytest-8.4.2-py3-none-any.whl")
    archive = cache / wheel["filename"]
    data = smoke.fetch(wheel["url"], archive)
    if hashlib.sha256(data).hexdigest() != wheel["digests"]["sha256"]:
        raise RuntimeError("Published pytest wheel checksum mismatch")
    target = cache / "workbuddy-pytest-8.4.2-version.py"
    with zipfile.ZipFile(archive) as contents:
        target.write_bytes(contents.read("_pytest/_version.py"))
    return {"source": "official-pytest-8.4.2-wheel", "path": str(target),
            "destination": "src/_pytest/_version.py", "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(path)


def prepare(args):
    upstream, runtime, venv = smoke.prepare(args.cache)
    for subset, count in SUBSETS.items():
        dataset = f"wb-bench-{subset}-v1.0"
        archive = args.cache / f"workbuddy-{subset}.tar.gz"
        data = smoke.fetch(f"https://huggingface.co/datasets/tencent/workbuddy-bench/resolve/main/{dataset}.tar.gz", archive)
        if hashlib.sha256(data).hexdigest() != CHECKSUMS[subset]:
            raise RuntimeError(f"Dataset checksum mismatch: {subset}")
        if not (upstream / "datasets" / dataset).exists():
            smoke.unpack(data, upstream / "datasets")
        actual = list((upstream / "datasets" / dataset / "tasks").glob("*/task.toml"))
        if len(actual) != count:
            raise RuntimeError(f"Expected {count} {subset} tasks, found {len(actual)}")
    return upstream, runtime, venv


def inventory(upstream):
    tasks = []
    for subset in SUBSETS:
        root = upstream / "datasets" / f"wb-bench-{subset}-v1.0" / "tasks"
        for directory in sorted(root.iterdir()):
            config = tomllib.loads((directory / "task.toml").read_text())
            dockerfile = (directory / "environment/Dockerfile").read_text()
            tasks.append(dict(id=f"{subset}/{directory.name}", subset=subset,
                              task=directory.name, path=str(directory),
                              status="pending", score=None,
                              dockerfile_sha256=hashlib.sha256(dockerfile.encode()).hexdigest(),
                              workspace_archive=(directory / "environment/workspace.tar.gz").is_file(),
                              needs_task_image=(subset == "sec"),
                              timeout_sec=config.get("agent", {}).get("timeout_sec", 1800),
                              metadata=config.get("metadata", {})))
    return tasks


def d_exec(container, command, *, log=None, timeout=None, check=True, cwd="/workspace"):
    argv = ["docker", "exec", "-w", cwd, container, "bash", "-lc", command]
    if log:
        with Path(log).open("w") as output:
            return subprocess.run(argv, stdout=output, stderr=subprocess.STDOUT,
                                  timeout=timeout, check=check)
    return subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=check)


DEPENDENCIES = r'''from pathlib import Path
import ast, configparser, json, re, shlex, tomllib
from packaging.requirements import Requirement, InvalidRequirement
requirements = []
setup_metadata = []
runtime_compatibility = []
local_extras = set()
local_no_deps = False
local_paths={str(Path('.').resolve()),str(Path('src').resolve())}
local_versions={}
lockfile=Path('poetry.lock')
lock_versions={item['name']:item['version'] for item in tomllib.loads(lockfile.read_text()).get('package',[])} if lockfile.is_file() else {}
def remember_local_extras(token):
 match=re.fullmatch(r'(?:\.|\./[^\[]*|/workspace[^\[]*)\[([^\]]+)\]',token)
 if match: local_extras.update(x.strip() for x in match.group(1).split(','))
def remember_local_project(token):
 value=token.split('[',1)[0]
 if value.startswith(('./','/workspace')) or value=='.':
  path=Path(value).resolve()
  if path.is_dir(): local_paths.add(str(path))
dockerfile = Path('/tmp/task-Dockerfile').read_text().replace('\\\n', ' ')
for line in dockerfile.splitlines():
 if not line.lstrip().startswith('RUN '): continue
 try:
  command=line.lstrip()[4:]
  outer=shlex.split(command)
  if len(outer)==3 and outer[0] in ['bash','sh'] and outer[1] in ['-c','-lc']: command=outer[2]
  lexer=shlex.shlex(command,posix=True,punctuation_chars=';&|')
  lexer.whitespace_split=True;lexer.commenters=''
  tokens=list(lexer)
 except ValueError: continue
 clauses=[[]]
 for token in tokens:
  if token in ['&&','||',';','|']: clauses.append([])
  else: clauses[-1].append(token)
 for clause in clauses:
  args=None
  for i,token in enumerate(clause):
   if token in ['pip','pip3'] and clause[i+1:i+2]==['install']: args=clause[i+2:];break
   if token.startswith('python') and clause[i+1:i+4]==['-m','pip','install']: args=clause[i+4:];break
  if args is None: continue
  if '--no-deps' in args and any(token in ['-e','--editable'] and i+1<len(args) and args[i+1].startswith(('.','/workspace')) for i,token in enumerate(args)):
   local_no_deps=True
  i=0
  while i<len(args):
   token=args[i];i+=1
   if token in ['-r','--requirement','-c','--constraint']:
    if i<len(args):
     path=Path(args[i]).resolve();i+=1
     if not path.is_file(): raise RuntimeError(f'Missing official dependency file: {path}')
     requirements.append(('-c ' if token in ['-c','--constraint'] else '-r ')+str(path))
    continue
   if token in ['-e','--editable']:
    if i<len(args): remember_local_extras(args[i]);remember_local_project(args[i])
    i+=1;continue
   remember_local_extras(token)
   remember_local_project(token)
   if token in ['--index-url','--extra-index-url','--find-links','--trusted-host']:
    i+=1;continue
   if token.startswith('-') or token.startswith(('./','/','git+','http:','https:','.[')) or token=='.': continue
   locked=re.fullmatch(r'([A-Za-z0-9_.-]+)==\$(?:\{[A-Za-z_][A-Za-z0-9_]*\}|[A-Za-z_][A-Za-z0-9_]*)',token)
   if locked:
    name=locked.group(1)
    if name not in lock_versions: raise RuntimeError(f'Cannot resolve official locked dependency: {token}')
    token=name+'=='+lock_versions[name]
    runtime_compatibility.append({'source':'official Dockerfile and poetry.lock','requirement':token})
   try: Requirement(token)
   except InvalidRequirement: continue
   requirements.append(token)
for base in map(Path,sorted(local_paths)):
 p=base/'pyproject.toml'
 if p.exists():
  try:
   data=tomllib.loads(p.read_text());project=data.get('project',{})
   if project.get('name') and project.get('version'): local_versions[re.sub(r'[-_.]+','-',project['name']).lower()]=project['version']
   requirements.extend(data.get('build-system',{}).get('requires',[]))
   if not local_no_deps: requirements.extend(project.get('dependencies',[]))
   for name, deps in project.get('optional-dependencies',{}).items():
    if name in local_extras and not local_no_deps: requirements.extend(deps)
   if project.get('name')=='fastapi':
    for dependency in project.get('optional-dependencies',{}).get('test',[]):
     if Requirement(dependency).name=='anyio':
      requirements.append(dependency)
      runtime_compatibility.append({'source':'project.optional-dependencies.test','requirement':dependency,'reason':'Use the declared test backend with the legacy Starlette API'})
  except Exception: pass
 p=base/'setup.cfg'
 if p.exists():
  try:
   cfg=configparser.ConfigParser(interpolation=None);cfg.read(p)
   requirements.extend(cfg.get('options','install_requires',fallback='').splitlines())
   for key in local_extras:
    requirements.extend(cfg.get('options.extras_require',key,fallback='').splitlines())
  except Exception: pass
 p=base/'setup.py'
 if p.is_file():
  for node in ast.walk(ast.parse(p.read_text())):
   if not isinstance(node,ast.Call) or not (isinstance(node.func,ast.Name) and node.func.id=='setup' or isinstance(node.func,ast.Attribute) and node.func.attr=='setup'): continue
   metadata={}
   for keyword in node.keywords:
    if keyword.arg not in ['install_requires','extras_require','entry_points']: continue
    try: metadata[keyword.arg]=ast.literal_eval(keyword.value)
    except (ValueError,TypeError): raise RuntimeError(f'Unsupported nonliteral setup.py metadata: {p}:{keyword.arg}')
   requirements.extend(metadata.get('install_requires',[]))
   for name,deps in metadata.get('extras_require',{}).items():
    if name in local_extras: requirements.extend(deps)
   setup_metadata.append(metadata)
requirements = sorted(set(x.strip() for x in requirements if x.strip() and not x.lstrip().startswith(('#','.','git+','http:','https:'))))
debian_packages=[]
for dependency in list(requirements):
 if dependency.startswith(('-r ','-c ')): continue
 parsed=Requirement(dependency)
 name=re.sub(r'[-_.]+','-',parsed.name).lower()
 if name in local_versions:
  if not parsed.specifier.contains(local_versions[name],prereleases=True): raise RuntimeError(f'Incompatible declared local project: {dependency}')
  requirements.remove(dependency);continue
 if parsed.name=='httpretty':
  requirements.remove(dependency);debian_packages.append('python3-httpretty')
  runtime_compatibility.append({'source':'official Dockerfile dependency via prebuilt Debian package','requirement':dependency,'package':'python3-httpretty'})
Path('/tmp/task-requirements.txt').write_text('\n'.join(requirements)+'\n')
Path('/tmp/task-debian-python.txt').write_text('\n'.join(debian_packages)+ ('\n' if debian_packages else ''))
Path('/tmp/task-setup-metadata.json').write_text(json.dumps(setup_metadata))
Path('/tmp/task-runtime-compatibility.json').write_text(json.dumps(runtime_compatibility))
Path('/tmp/task-local-projects.json').write_text(json.dumps(sorted(local_paths)))
print('Official editable extras:',sorted(local_extras))
'''


PROJECT_ENTRYPOINTS = r'''from pathlib import Path
import configparser,json,re,sysconfig,tomllib
scripts={}
project_metadata=[]
source_paths=[]
roots=Path('/tmp/task-local-projects.json')
for base in map(Path,json.loads(roots.read_text()) if roots.is_file() else ['.','src']):
 config=base/'pyproject.toml'
 if not config.is_file(): continue
 project=tomllib.loads(config.read_text()).get('project',{})
 scripts.update(project.get('scripts',{}))
 name,version=project.get('name'),project.get('version')
 if name and version:
  distribution=Path(sysconfig.get_paths()['purelib'])/(re.sub(r'[-_.]+','_',name)+'-'+version+'.dist-info')
  distribution.mkdir(exist_ok=True)
  lines=['Metadata-Version: 2.4','Name: '+name,'Version: '+version]
  if project.get('requires-python'): lines.append('Requires-Python: '+project['requires-python'])
  lines.extend('Requires-Dist: '+value for value in project.get('dependencies',[]))
  (distribution/'METADATA').write_text('\n'.join(lines)+'\n\n')
  groups=dict(project.get('entry-points',{}))
  if project.get('scripts'): groups['console_scripts']=project['scripts']
  entry_lines=[]
  for group,entries in groups.items():
   entry_lines.append('['+group+']')
   entry_lines.extend(key+' = '+value for key,value in entries.items())
  if entry_lines:(distribution/'entry_points.txt').write_text('\n'.join(entry_lines)+'\n')
  for path in [base,base/'src']:
   if path.is_dir(): source_paths.append(str(path.resolve()))
  project_metadata.append({'source':'static project metadata in pyproject.toml','name':name,'version':version,'path':str(distribution),'entry_point_groups':list(groups)})
metadata=Path('/tmp/task-setup-metadata.json')
for setup in json.loads(metadata.read_text()) if metadata.is_file() else []:
 points=setup.get('entry_points',{})
 if isinstance(points,str):
  parser=configparser.ConfigParser(interpolation=None);parser.optionxform=str;parser.read_string(points)
  scripts.update(dict(parser.items('console_scripts')) if parser.has_section('console_scripts') else {})
 else:
  for line in points.get('console_scripts',[]):
   name,separator,target=line.partition('=')
   if separator:scripts[name.strip()]=target.strip()
for name,target in scripts.items():
  if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*',name): raise ValueError(name)
  module,separator,attribute=target.partition(':')
  if not separator: raise ValueError(target)
  launcher=Path('/usr/local/bin')/name
  launcher.write_text('#!/usr/local/bin/python\nimport importlib,sys\n'
   +f'entry=importlib.import_module({module!r})\n'
   +f'for part in {attribute!r}.split("."): entry=getattr(entry,part)\n'
   +'sys.exit(entry())\n')
  launcher.chmod(0o755)
  print('Installed declared source console entry point:',name,target)
Path('/tmp/task-project-metadata.json').write_text(json.dumps(project_metadata))
if source_paths:(Path(sysconfig.get_paths()['purelib'])/'oma-task-source-projects.pth').write_text('\n'.join(sorted(set(source_paths)))+'\n')
'''


def compatibility_setup(dockerfile: str) -> str:
    """Keep official Python compatibility/file scaffolds without package builds."""
    commands = []
    for line in dockerfile.replace("\\\n", " ").splitlines():
        line = line.lstrip()
        if line.startswith("RUN mkdir -p /opt/bench-agent-pack"):
            commands.append(line[4:])
            continue
        if not line.startswith("RUN "):
            continue
        lexer = shlex.shlex(line[4:], posix=True, punctuation_chars=";&|")
        lexer.whitespace_split = True
        tokens = list(lexer)
        clauses = [[]]
        for token in tokens:
            if token in {"&&", ";", "||", "|"}:
                clauses.append([])
            else:
                clauses[-1].append(token)
        for clause in clauses:
            if clause[:2] in [["python", "-c"], ["python3", "-c"]]:
                commands.append(shlex.join(clause))
    return "#!/bin/bash\nset -euo pipefail\n" + "\n".join(commands) + "\n"


def copy_public_environment(container, directory):
    """Honor public Docker COPY inputs; task tests remain unavailable to the solver."""
    text = (directory / "Dockerfile").read_text().replace("\\\n", " ")
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("COPY ") or "--from=" in line:
            continue
        arguments = shlex.split(line[5:])
        if len(arguments) != 2:
            raise RuntimeError(f"Unsupported public task COPY: {line}")
        source, target = arguments
        if source == "workspace.tar.gz":
            continue
        public = directory / source
        if public.is_dir():
            d_exec(container, f"mkdir -p {shlex.quote(target)}")
            smoke.copy_into(container, str(public) + "/.", target.rstrip("/") + "/")
        elif public.is_file():
            d_exec(container, f"mkdir -p {shlex.quote(str(Path(target).parent))}")
            smoke.copy_into(container, public, target)
        else:
            raise RuntimeError(f"Public task environment input missing: {public}")


MCP_FIXTURE_SETUP = r'''from pathlib import Path
import json
source=Path('/root/.claude.json')
if source.exists():
 config=json.loads(source.read_text()); servers=config.get('mcpServers',{})
 if servers:
  with Path('/workspace/.codex/config.toml').open('a') as out:
   for name,server in servers.items():
    if not server.get('command'): continue
    out.write('\n[mcp_servers.'+json.dumps(name)+']\n')
    out.write('command = '+json.dumps(server['command'])+'\n')
    out.write('args = '+json.dumps(server.get('args',[]))+'\n')
    if server.get('env'):
     out.write('[mcp_servers.'+json.dumps(name)+'.env]\n')
     for key,value in server['env'].items():out.write(json.dumps(key)+' = '+json.dumps(str(value))+'\n')
 skill=Path('/opt/bench-agent-pack/agent_pack/skills/recruiting_search')
 target=Path('/workspace/.codex/skills/recruiting_search')
 if skill.is_dir():
  target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists() and not target.is_symlink():target.symlink_to(skill)
'''


BOOTSTRAP = r'''set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
mkdir -p /workspace /logs/agent /logs/verifier /root/.codex
apt-get update -qq
apt-get install -y -qq --no-install-recommends git curl bash ca-certificates xz-utils procps
ln -sf /opt/prebuilt/node/bin/node /usr/local/bin/node
ln -sf /opt/prebuilt/node/bin/npm /usr/local/bin/npm
ln -sf /opt/prebuilt/node/bin/npx /usr/local/bin/npx
ln -sf /opt/prebuilt/bun /usr/local/bin/bun
ln -sf /opt/prebuilt/cue /usr/local/bin/cue
ln -sf /opt/prebuilt/codex/vendor/aarch64-unknown-linux-musl/bin/codex /usr/local/bin/codex
ln -sf /opt/prebuilt/codex/vendor/aarch64-unknown-linux-musl/codex-path/rg /usr/local/bin/rg
ln -sf /opt/prebuilt/oma/bin/cli.js /usr/local/bin/oma
python -m venv /opt/oma-tooling
/opt/oma-tooling/bin/python -m pip install --only-binary=:all: 'serena-agent==1.0.0'
printf '#!/bin/bash\nexec env -u PYTHONPATH /opt/oma-tooling/bin/serena "$@"\n' > /usr/local/bin/serena
chmod +x /usr/local/bin/serena
python -m pip install --only-binary=:all: pytest
cd /workspace
if [ -f /tmp/workspace.tar.gz ]; then tar xzf /tmp/workspace.tar.gz -C /workspace; rm /tmp/workspace.tar.gz; fi
bash /tmp/task-compat-setup.sh
if [ -f /tmp/task-pytest-version.py ]; then cp /tmp/task-pytest-version.py src/_pytest/_version.py; fi
python /tmp/derive-dependencies.py
if [ -s /tmp/task-debian-python.txt ]; then
  xargs -r apt-get install -y -qq --no-install-recommends < /tmp/task-debian-python.txt
  python - <<'PY'
from pathlib import Path
import json,subprocess,sysconfig
destination=Path(sysconfig.get_paths()['purelib'])
for source in Path('/usr/lib/python3/dist-packages').glob('httpretty*'):
    target=destination/source.name
    if not target.exists(): target.symlink_to(source)
path=Path('/tmp/task-runtime-compatibility.json')
conditions=json.loads(path.read_text())
for condition in conditions:
    if condition.get('package')=='python3-httpretty':
        condition['installed_version']=subprocess.check_output(['dpkg-query','-W','-f','${Version}','python3-httpretty'],text=True).strip()
path.write_text(json.dumps(conditions))
PY
fi
if [ -s /tmp/task-requirements.txt ]; then python -m pip install --only-binary=:all: -r /tmp/task-requirements.txt; fi
python /tmp/install-task-entrypoints.py
bash /tmp/task-postinstall-fixtures.sh
git config --global user.email dev@project
git config --global user.name Developer
git init -q -b main
git add -A
git -c core.hooksPath=/dev/null commit -q --allow-empty -m 'initial task workspace'
oma link codex
python /tmp/project-fixture-mcp.py
printf '[projects."/workspace"]\ntrust_level = "trusted"\n' > /root/.codex/config.toml
git add -A
git -c core.hooksPath=/dev/null commit -q --allow-empty -m 'Install OMA harness overlay'
codex login status
'''


def result_status(output, subset):
    path = output / "verifier/score.json"
    reward_path = output / "verifier/reward.json"
    score = json.loads(path.read_text()) if path.exists() else {}
    reward = json.loads(reward_path.read_text()) if reward_path.exists() else {}
    if not score and not reward and (output / "verifier/reward.txt").exists():
        try:
            reward = {"reward": float((output / "verifier/reward.txt").read_text().strip()),
                      "source": "native-reward.txt"}
        except ValueError:
            pass
    if not score and not reward:
        return "verifier_error", None, {"error": "Official verifier produced no score/reward"}
    test_status = str(score.get("test_status", "")).lower()
    if test_status in {"build_error", "judge_error"}:
        return "environment_error" if test_status == "build_error" else "judge_error", None, score
    errors = score.get("diagnostics", {}).get("status_counts", {})
    if errors.get("build_error", 0) > 0:
        return "environment_error", None, score
    if errors.get("judge_error", 0) > 0:
        return "judge_error", None, score
    value = score.get("overall", score.get("reward", score.get("test_pass_rate")))
    if value is None:
        value = reward.get("overall", reward.get("reward", reward.get("test_pass_rate")))
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        return "verifier_error", None, score or reward
    return "scored", float(value), score or reward


def agent_metadata(container, workspace="/workspace", codex_home="/root/.codex"):
    program = r'''from pathlib import Path
import hashlib,json,sys
workspace=Path(sys.argv[1]); codex_home=Path(sys.argv[2])
result={}
for line in Path('/logs/agent/trajectory.jsonl').read_text().splitlines():
 try: event=json.loads(line)
 except ValueError: continue
 if event.get('type')=='turn.completed': result['usage']=event.get('usage')
 if event.get('type')=='turn.failed': result['failure']=event.get('error')
for path in (codex_home/'sessions').rglob('*.jsonl'):
 for line in path.read_text().splitlines():
  try: event=json.loads(line)
  except ValueError: continue
  if event.get('type')=='turn_context':
   result['actual_model']=event.get('payload',{}).get('model')
   result['actual_effort']=event.get('payload',{}).get('effort')
   break
result['skills']=json.loads((workspace/'.agents/skills/_version.json').read_text())
for name,path in [('agents_md_sha256',workspace/'AGENTS.md'),('debug_skill_sha256',workspace/'.agents/skills/oma-debug/SKILL.md')]:
 result[name]=hashlib.sha256(Path(path).read_bytes()).hexdigest()
print(json.dumps(result))
'''
    captured = subprocess.run(["docker", "exec", container, "python3", "-c", program, workspace, codex_home], capture_output=True, text=True)
    return json.loads(captured.stdout) if captured.returncode == 0 else {"metadata_error": captured.stderr[-400:]}


def run_task(task, args, upstream, runtime, venv):
    path = Path(task["path"])
    output = args.output / task["subset"] / task["task"]
    if (output / "status.json").exists():
        previous = output.with_name(output.name + ".attempts") / str(time.time_ns())
        previous.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(output), previous)
    output.mkdir(parents=True, exist_ok=True)
    stale = {"status", "score", "output", "reason", "container", "verifier", "agent_runtime", "started_at", "finished_at",
             "base_image_id", "platform", "judge_condition", "judge_model", "judge_effort", "regrade_of",
             "model_invoked", "environment_scaffolds", "saved_agent_patch_sha256", "tooling_python_isolated", "runtime_compatibility", "npm_global_prefix", "source_distribution_metadata", "dependency_download_timeout_sec"}
    result = {key: value for key, value in task.items() if key not in stale}
    result.update(status="preparing", score=None, output=str(output), started_at=time.time())
    result.update(requested_model="gpt-6.1-sol", requested_effort="high", oma_definitions_version="20.10.3")
    write_json(output / "status.json", result)
    if task["subset"] == "sec":
        return dict(result, status="waiting_provider_access", score=None,
                    reason="Retained in inventory; execution requires appropriate provider access")
    if task["subset"] == "web" and not args.judge_config:
        # Keep in inventory, but don't spend a task rollout while its required judge is unavailable.
        result.update(status="blocked_judge", reason="Web fixed LLM/VLM judge route not configured")
        return result
    image = smoke.general_base_image()
    result.update(base_image_id=image, platform=smoke.GENERAL_PLATFORM, npm_global_prefix="/usr/local", dependency_download_timeout_sec=120)
    auth = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "auth.json"
    if not auth.is_file():
        return dict(result, status="blocked_auth", reason="Codex auth.json missing")
    container = f"oma-wb-{task['subset']}-{os.getpid()}-{int(time.time())}"
    result["container"] = container
    smoke.execute(["docker", "run", "-d", "--platform", smoke.GENERAL_PLATFORM, "--name", container, "--cpus", "2", "--memory", "6g",
                   "--mount", f"type=bind,source={runtime},target=/opt/prebuilt,readonly",
                   "--mount", f"type=bind,source={auth},target=/root/.codex/auth.json,readonly",
                   "-e", "CODEX_HOME=/root/.codex", "-e", "CI=true", "-e", "OMA_SKIP_VERSION_CHECK=1", "-e", "NPM_CONFIG_PREFIX=/usr/local",
                   "-e", "PIP_DEFAULT_TIMEOUT=120", "-e", "PIP_RETRIES=5",
                   "-e", "PYTHONPATH=/workspace:/workspace/src", image, "sleep", "infinity"])
    try:
        smoke.execute(["docker", "exec", container, "mkdir", "-p", "/workspace"])
        seed = frozen_oma_seed(args.cache)
        smoke.execute(["docker", "cp", str(seed), f"{container}:/workspace/.agents"])
        if task["workspace_archive"]:
            smoke.copy_into(container, path / "environment/workspace.tar.gz", "/tmp/workspace.tar.gz")
        smoke.copy_into(container, path / "environment/Dockerfile", "/tmp/task-Dockerfile")
        scaffold = version_scaffold(task, args.cache)
        if scaffold:
            smoke.copy_into(container, scaffold["path"], "/tmp/task-pytest-version.py")
            result["environment_scaffolds"] = [scaffold]
        copy_public_environment(container, path / "environment")
        dependency_script = output / "derive-dependencies.py"
        dependency_script.write_text(DEPENDENCIES)
        smoke.copy_into(container, dependency_script, "/tmp/derive-dependencies.py")
        entrypoints_script = output / "install-task-entrypoints.py"
        entrypoints_script.write_text(PROJECT_ENTRYPOINTS)
        smoke.copy_into(container, entrypoints_script, "/tmp/install-task-entrypoints.py")
        compat_script = output / "task-compat-setup.sh"
        compat_script.write_text(compatibility_setup((path / "environment/Dockerfile").read_text()))
        smoke.copy_into(container, compat_script, "/tmp/task-compat-setup.sh")
        fixture_setup = output / "task-postinstall-fixtures.sh"
        fixture_command = "python igor.py zip_mods" if "python igor.py zip_mods" in (path / "environment/Dockerfile").read_text() else ""
        fixture_setup.write_text("#!/bin/bash\nset -euo pipefail\n" + fixture_command + "\n")
        smoke.copy_into(container, fixture_setup, "/tmp/task-postinstall-fixtures.sh")
        if fixture_command:
            result.setdefault("environment_scaffolds", []).append({"source": "official-Dockerfile-postinstall-fixtures",
                                                                  "command": fixture_command})
        fixture_script = output / "project-fixture-mcp.py"
        fixture_script.write_text(MCP_FIXTURE_SETUP)
        smoke.copy_into(container, fixture_script, "/tmp/project-fixture-mcp.py")
        d_exec(container, BOOTSTRAP, log=output / "setup.log", timeout=600)
        result["tooling_python_isolated"] = True
        compatibility = d_exec(container, "cat /tmp/task-runtime-compatibility.json")
        result["runtime_compatibility"] = json.loads(compatibility.stdout)
        metadata = d_exec(container, "cat /tmp/task-project-metadata.json")
        result["source_distribution_metadata"] = json.loads(metadata.stdout)
        if task["subset"] in {"office", "web"}:
            d_exec(container, "python -m pip install --only-binary=:all: openpyxl pandas pypdf python-docx python-pptx lxml beautifulsoup4 Pillow",
                   log=output / "office-dependencies.log", timeout=300)
        if task["subset"] == "web":
            d_exec(container, "python -m pip install --only-binary=:all: playwright && python -m playwright install --with-deps chromium",
                   log=output / "browser-install.log", timeout=600)
        if args.mode == "check-env":
            result.update(status="environment_ready", score=None, model_invoked=False)
            return result
        prompt = ("Use the installed OMA skills appropriate to this task and follow workspace instructions. "
                  "Do not start workflows or spawn additional model processes. Benchmark-local builds and tests are authorized. "
                  "Do not change or bypass machine build gates. "
                  "Dependencies are preinstalled; source is importable via PYTHONPATH=/workspace:/workspace/src. "
                  "Only operate on this benchmark's provided fixture files/services. Do not access real accounts or other network targets.\n\n"
                  + (path / "instruction.md").read_text())
        (output / "prompt.txt").write_text(prompt)
        smoke.copy_into(container, output / "prompt.txt", "/tmp/prompt.txt")
        if args.saved_agent_patch:
            result.update(status="restoring_agent_output", regrade_of=str(args.attempt), model_invoked=False,
                          saved_agent_patch_sha256=hashlib.sha256(args.saved_agent_patch.read_bytes()).hexdigest())
            write_json(output / "status.json", result)
            smoke.copy_into(container, args.saved_agent_patch, "/tmp/saved-agent.patch")
            d_exec(container, "git apply --binary /tmp/saved-agent.patch", log=output / "restore-agent-output.log")
            result["agent_runtime"] = args.original_agent_runtime
        else:
            result["status"] = "waiting_model"
            write_json(output / "status.json", result)
            args.model_lock.parent.mkdir(parents=True, exist_ok=True)
            with args.model_lock.open("a+") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                result["status"] = "running_agent"
                write_json(output / "status.json", result)
                command = '''codex exec -m gpt-6.1-sol -c 'model_reasoning_effort="high"' --dangerously-bypass-approvals-and-sandbox --json --output-last-message /logs/agent/final.md - < /tmp/prompt.txt > /logs/agent/trajectory.jsonl 2> /logs/agent/stderr.log
rc=$?
printf '%s\n' "$rc" > /logs/agent/exit_code
exit "$rc"
'''
                agent = d_exec(container, command, log=output / "agent-launch.log",
                               timeout=min(args.timeout_sec, float(task["timeout_sec"])), check=False)
            result["agent_runtime"] = agent_metadata(container)
            if agent.returncode:
                failure = d_exec(container, "tail -c 3000 /logs/agent/stderr.log", check=False).stdout
                failure += json.dumps(result["agent_runtime"].get("failure", {}))
                quota = re.search(r"usage limit|quota|rate.limit|limit reached", failure, re.I)
                auth_error = re.search(r"unauthorized|authentication|not logged|401", failure, re.I)
                result.update(status="waiting_model_quota" if quota else "blocked_auth" if auth_error else "agent_error", reason=f"Agent exit {agent.returncode}")
                return result
        result["status"] = "running_verifier"
        write_json(output / "status.json", result)
        env = dict(os.environ, PYTHONPATH=str(upstream / "src"))
        argv = [str(venv / "bin/python"), str(Path(__file__).with_name("grade.py")),
                "--task", str(path), "--container", container, "--output", str(output)]
        if args.judge_config and task["subset"] in {"web", "office"}:
            argv += ["--judge-config", str(args.judge_config)]
        grade = subprocess.run(argv, env=env, capture_output=True, text=True, timeout=3600)
        (output / "verifier-launch.log").write_text(grade.stdout + grade.stderr)
        if grade.returncode:
            result.update(status="verifier_error", reason=f"Official verifier exit {grade.returncode}")
            return result
        status, score, detail = result_status(output, task["subset"])
        judge_condition = {"code": "official-deterministic-optional-whitebox-disabled",
                           "office": "native-rules-plus-llm-rubrics" if args.judge_config else "native-rules-only",
                           "web": "native-fixed-llm-vlm-agent-judges", "sec": "native-programmatic"}[task["subset"]]
        result.update(status=status, score=score, verifier=detail,
                      judge_condition=judge_condition,
                      judge_timeout_sec=600, office_judge_concurrency=1,
                      canonical_harbor_run=False, hooks_verified=False)
        if args.judge_config and task["subset"] in {"web", "office"}:
            route = json.loads(args.judge_config.read_text())
            result.update(judge_model=route["model"], judge_effort=route.get("effort", "low"))
        return result
    except subprocess.TimeoutExpired as exc:
        result.update(status="timeout", reason=f"{result['status']}: {exc}")
        return result
    except Exception as exc:
        (output / "exception.log").write_text(traceback.format_exc())
        result.update(status="environment_error", reason=f"{type(exc).__name__}: {exc}")
        return result
    finally:
        subprocess.run(["docker", "cp", f"{container}:/logs/agent", str(output)], capture_output=True)
        subprocess.run(["docker", "cp", f"{container}:/logs/verifier", str(output / "container-verifier")], capture_output=True)
        if not args.keep_containers:
            subprocess.run(["docker", "rm", "-f", container], capture_output=True)
        result["finished_at"] = time.time()
        write_json(output / "status.json", result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["prepare", "inventory", "run", "status", "regrade", "check-env"], nargs="?", default="run")
    parser.add_argument("--cache", type=Path, default=Path.home() / ".cache/oma-benchmarks")
    parser.add_argument("--output", type=Path, default=Path.home() / ".cache/oma-benchmarks/workbuddy-full")
    parser.add_argument("--subsets", nargs="+", choices=list(SUBSETS), default=list(SUBSETS))
    parser.add_argument("--task", help="Exact task name (validation only; all tasks remain in inventory)")
    parser.add_argument("--attempt", type=Path, help="Completed benign Code attempt containing the saved agent patch for regrade")
    parser.add_argument("--max-tasks", type=int)
    parser.add_argument("--timeout-sec", type=int, default=1800)
    parser.add_argument("--model-lock", type=Path, default=Path.home() / ".cache/oma-benchmarks/model.lock")
    parser.add_argument("--judge-config", "--judge-connection", dest="judge_config", type=Path)
    parser.add_argument("--allow-build", action="store_true", help="Only use after explicit user authorization for benchmark builds")
    parser.add_argument("--build-gate-open", action="store_true", help="Only use while the user's local build-gate GUI approval is active")
    parser.add_argument("--retry-errors", action="store_true")
    parser.add_argument("--keep-containers", action="store_true")
    args = parser.parse_args()
    args.saved_agent_patch = None
    args.original_agent_runtime = None
    args.cache = args.cache.resolve(); args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.mode == "check-env" and not args.task:
        parser.error("check-env requires one exact --task and never invokes a model")
    if args.mode == "regrade":
        if not args.task or not args.attempt:
            parser.error("regrade requires --task and --attempt")
        original = json.loads((args.attempt / "status.json").read_text())
        if original.get("subset") != "code" or original.get("status") in {"preparing", "waiting_model", "running_agent", "running_verifier"}:
            parser.error("regrade requires a completed benign Code attempt")
        if original.get("task") != args.task:
            parser.error("regrade task must match the saved attempt")
        exit_code = args.attempt / "agent/exit_code"
        if not exit_code.is_file() or exit_code.read_text().strip() != "0":
            parser.error("regrade requires a saved successful agent exit")
        patch = next((args.attempt / name for name in ["verifier/agent.patch", "container-verifier/agent.patch"]
                      if (args.attempt / name).is_file()), None)
        if patch is None:
            parser.error("No saved agent.patch in the selected attempt")
        saved = args.output / "regrade-inputs" / f"{time.time_ns()}.patch"
        saved.parent.mkdir(parents=True, exist_ok=True);saved.write_bytes(patch.read_bytes())
        args.saved_agent_patch = saved
        args.original_agent_runtime = original.get("agent_runtime")
        args.retry_errors = True
    manifest_path = args.output / "manifest.json"
    if args.mode == "status" and manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        for task in manifest["tasks"]:
            status_path = args.output / task["subset"] / task["task"] / "status.json"
            if status_path.exists():
                task.update(json.loads(status_path.read_text()))
    else:
        upstream, runtime, venv = prepare(args)
        existing = {item["id"]: item for item in json.loads(manifest_path.read_text())["tasks"]} if manifest_path.exists() else {}
        tasks = [existing.get(item["id"], item) for item in inventory(upstream)]
        manifest = dict(benchmark="WorkBuddy Bench v1.0", expected_tasks=260,
                        upstream_revision=smoke.REVISION, dataset_sha256=CHECKSUMS,
                        subsets=SUBSETS, tasks=tasks)
        write_json(manifest_path, manifest)
    if args.mode in {"status", "inventory", "prepare"}:
        print(json.dumps(collections.Counter(item["status"] for item in manifest["tasks"]), indent=2))
        return
    processed = 0
    for task in manifest["tasks"]:
        if (args.output / "STOP_AFTER_TASK").exists():
            print("Stopped at task boundary: STOP_AFTER_TASK exists", flush=True)
            break
        if task["subset"] not in args.subsets or (args.task and task["task"] != args.task):
            continue
        task_status_path = args.output / task["subset"] / task["task"] / "status.json"
        if task_status_path.exists():
            task.update(json.loads(task_status_path.read_text()))
        if args.mode != "regrade" and (task["status"] == "scored" or (task["status"] not in {"pending", "preparing", "waiting_model", "running_agent", "running_verifier"} and not args.retry_errors)):
            continue
        print(f"RUN {task['id']}", flush=True)
        try:
            result = run_task(task, args, upstream, runtime, venv)
        except Exception as exc:
            result = dict(task, status="environment_error", score=None, reason=str(exc))
        task.clear()
        task.update(result)
        task.setdefault("finished_at", time.time())
        write_json(task_status_path, task)
        manifest["updated_at"] = time.time()
        manifest["counts"] = dict(collections.Counter(item["status"] for item in manifest["tasks"]))
        write_json(manifest_path, manifest)
        print(f"RESULT {task['id']} {task['status']} score={task.get('score')}", flush=True)
        if task["status"] in {"waiting_model_quota", "blocked_auth"}:
            print("Batch stopped: model authentication or quota requires recovery", flush=True)
            break
        processed += 1
        if args.max_tasks and processed >= args.max_tasks:
            break


if __name__ == "__main__":
    main()
