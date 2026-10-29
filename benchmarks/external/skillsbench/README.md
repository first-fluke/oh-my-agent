# SkillsBench 실행 확인

## 전체 87개 과제 실행

`batch.py`는 v1.1의 87개 과제를 모두 등록하고, 고정한 OMA 스냅샷으로 순차 실행한다. 현재 상태는 [checkpoint](results/full-v1.1-20261021/checkpoint.json), 과제별 입력·환경·제약은 [inventory](results/full-v1.1-20261021/inventory.json)에 있다. 기존 smoke 결과는 보존한다.

전체 87개 실행을 마쳤다. 공식 채점 결과는 84개이며, reward 1은 41개·부분 점수는 5개·reward 0은 38개다. 채점된 84개의 평균 reward는 0.526329다. 남은 3개는 Druid의 원래 1,800초 제한 초과, Scala의 원래 600초 제한 초과, 공급자가 접근을 제한한 `setup-fuzzing-py`다. 이를 0점으로 합성하지 않았다. 환경 준비·채점기 초기화 오류는 남아 있지 않다. [최종 실행 receipt](results/full-v1.1-20261021/receipt.json)에 과제별 상태와 증거 해시를 기록했다.

현재 조건은 고정 OMA 설정·스킬과 호스트에 등록된 전역 플러그인을 사용한다. 과제별 `environment/skills`는 별도로 배포하지 않는다. `radar-vital-signs`처럼 원래 Dockerfile이 스킬을 복사하는 경우에는 컨테이너 안에 해당 파일이 남는다. 공식 curated-skills 조건과 점수를 비교할 때 이 차이를 고려해야 한다.

```bash
uv run --no-project --no-build --with 'pyyaml==6.0.3' python \
  benchmarks/external/skillsbench/batch.py run \
  --run-dir benchmarks/external/skillsbench/results/full-v1.1-20261021 \
  --runtime-replay --binary-only --published-prebuilt --retry-errors
```

모델은 한 번에 한 과제만 실행한다. 각 과제의 원래 agent·verifier timeout을 사용하고, 결과가 있는 과제는 재실행하지 않는다. `--retry-errors`는 환경·agent·verifier 오류만 재시도한다. `scored`의 reward 0은 실제 과제 실패이며 환경 오류와 구별한다. 진행 이벤트는 `progress.jsonl`, 최신 과제 결과는 `tasks/<task-id>/receipt.json`, 각 시도 로그는 별도 `attempt-*` 디렉터리에 남긴다.

공급자가 요청을 사이버 보안 위험 가능성으로 거부하면 `waiting_provider_access`로 기록하고 재시도하지 않는다. 이전 버전이 이를 `agent_error`로 기록했어도 재시도 전에 원본 terminal 로그로 재분류하며 모델을 호출하지 않는다. 접근 제한을 문구 변경이나 다른 공급자로 우회하지 않는다.

`--task TASK_ID --max-tasks 1`로 정확히 한 과제를 지정할 수 있다. `regrade --attempt-dir PATH`는 저장된 공식 채점 산출물만 다시 읽으며 모델 호출이나 checkpoint 변경을 하지 않는다. 재시도할 때도 원래 task·환경·verifier의 수정 여부와 고정 OMA 스냅샷을 검사한다.

사용자는 벤치마크에 필요한 빌드를 허용했다. 다만 로컬 `build-gate`가 `docker build`를 종료했고, 별도 GUI 허용 창 요청도 시간 초과됐다. 그래서 기본 replay 경로는 사전 빌드한 FROM 이미지에 원래 Dockerfile의 환경 변수·파일 복사·설치 명령을 실행 중 적용한다. 이 경로의 환경 준비는 바이너리 패키지만 허용한다. 바이너리 설치나 아래의 검증된 공개 이미지로 준비할 수 없는 소스 설치는 `waiting_build_gate`로 기록한다. 원래 verifier는 수정 없이 실행하며 내부 빌드가 있다는 이유만으로 제외하지 않는다. 실제 설치·메모리·모델·채점 오류는 점수로 바꾸지 않고 기록한다.

PyPI에 소스 배포본만 있는 `bibtexparser==1.4.2`와 `scapy==2.5.0`은 같은 버전의 piwheels 사전 빌드 wheel을 SHA-256으로 고정해 설치한다. 각각 Python 파일 [7개](https://www.piwheels.org/project/bibtexparser/)와 [332개](https://www.piwheels.org/project/scapy/)가 공식 PyPI 소스와 동일함을 확인했다. 이 보완은 버전·원래 설치 명령·바이너리 전용 정책을 유지한다.

이 실행은 OMA 호스트 agent가 과제 컨테이너를 조작하는 방식이며 공식 BenchFlow 전체 경로와 다르다. OS 수준의 비공개 데이터 격리나 리더보드 재현성을 주장하지 않는다. GUI 허용 이후 `--runtime-replay --binary-only`를 빼면 원래 Dockerfile 이미지 빌드 경로를 사용할 수 있다. `--max-tasks N`은 한 번의 실행 개수, `--agent-timeout N`은 명시적인 timeout 변경이다.

`--published-prebuilt`를 함께 지정하면 `lean4-proof`, `multilingual-video-dubbing`, `exoplanet-detection-period`, `fix-druid-loophole-cve`, `gravitational-wave-detection`, `lake-warming-attribution`, `python-scala-translation`, `quantum-numerical-simulation`, `simpo-code-reproduction`은 공식 [공개 이미지 목록](https://github.com/benchflow-ai/skillsbench-leaderboard/blob/820ee3df9e7227b04f0c60ffe1415aad8a14eebc/prebuilt_images/skillsbench-v1.1.json)의 `linux/amd64` 이미지를 digest로 고정해 가져온다. 이 9개는 공개 배포의 source `2493d9fa`와 현재 pin의 environment·task·verifier Git 객체가 모두 같다. Dockerfile 명령을 재실행하거나 이미지를 빌드하지 않는다. 이미지·플랫폼·원본 객체·목록과 배포 bundle의 SHA-256은 receipt에 기록한다. 실행 전에 존재하지 않았던 해당 이미지 참조만 작업 종료 후 정리한다.

`debug-trl-grpo`, `earthquake-phase-association`, `seismic-phase-picking`도 고정된 공개 이미지를 사용한다. 세 이미지의 Dockerfile은 모델 캐시 다운로드 재시도·전송 경로만 다르며, task·verifier·나머지 environment 파일은 원본과 같다. [tokenizer·PhaseNet 증거](results/published-cache-proof-20261021/receipt.json)와 [지진파 캐시 증거](results/published-seismic-cache-proof-20261021/receipt.json)의 파일을 원래 공급처 파일과 비교했다. 컨테이너의 실제 이미지 digest·플랫폼·캐시 레이어 diffID 및 파일 크기·SHA-256을 검사한 뒤 solver를 시작한다. 지진파 캐시는 큰 레이어의 8MiB 범위에서 추출했으므로 레이어 전체 해시 검증은 실제 Docker pull이 수행한다. 원본 호출에는 모델 revision/version 고정이 없었으므로 확인된 캐시 버전과 Dockerfile 차이를 별도로 기록한다. OMA·전역 플러그인·원본 curated skills 제공 조건은 변경하지 않는다.

`simpo-code-reproduction`의 원래 verifier는 CPU PyTorch 인덱스와 PyPI를 함께 지정한다. 채점 단계에만 `UV_INDEX_STRATEGY=unsafe-best-match`를 적용해 uv의 첫 인덱스 우선 탐색으로 인한 의존성 초기화 실패를 보완한다. 원래 채점 명령과 파일은 유지하며 추가 변수를 receipt에 기록한다. 초기 `attempt-20261021T195505Z`는 테스트가 실행되지 않았고 출력 바이너리가 남지 않았다. 원본 receipt·로그 SHA-256과 미채점 상태가 일치할 때만 중앙 실행기가 같은 프롬프트·모델·제한 시간으로 한 번 새 시도를 허용한다. 기존 시도와 실제 점수는 보존한다.

Replay 환경 준비의 각 `RUN`은 원래 과제의 `environment.build_timeout_sec`를 사용한다. 채점 시에는 원래 verifier 파일을 `/verifier`와 호환 경로 `/tests`에 배치하고 `verifier.env`를 적용한다. 이 파일과 변수는 solver 종료 후에만 제공한다. 채점기 파일 자체는 수정하지 않는다.

`recover_grade.py`는 초기 채점 환경 오류가 난 두 BugSwarm 과제의 저장된 패치·설명 파일을 SHA-256으로 확인하고, 원래 base image digest와 과제 환경에 복원해 공식 채점기만 실행한다. 모델은 호출하지 않는다. 별도 출력 디렉터리와 원본 시도 경로를 기록하며, 이전 venv·캐시·빌드 산출물은 복원하지 않는다. `--promote`는 실제 점수가 나온 경우에만 과제별 receipt를 갱신한다. 전체 checkpoint는 중앙 실행기가 작업 경계에서 합친다.

## 기존 단일 과제 smoke

SkillsBench v1.1의 `dialogue-parser` 한 과제를 실제 실행하고 공식 채점기로 채점했다.

| 조건 | pytest | 공식 reward | 결과 |
|---|---:|---:|---|
| 공식 oracle + 과제 제공 스킬 | 35/35 | 1.0 | 통과 |
| OMA 설정·스킬 + 호스트 Codex | 34/35 | 0.833 | 부분 통과 |

공식 채점기는 parametrized case 35개를 CTRF의 함수 6개로 묶어 점수를 계산한다. OMA 결과는 함수 5/6개 통과다. 실패한 case는 `test_graph_logic[reachability]`이며, 생성한 그래프의 `End` 노드가 채점기의 도달 가능성 검사에서 제외된다. 출력이나 채점기를 수정해 점수를 바꾸지 않았다.

- SkillsBench: `v1.1`, commit `b63b7b2850226b6aa4fb5929a8c1ac7bc4d9a6af`
- BenchFlow: `0.6.3` — `0.6.9`는 이 릴리스의 `environment:` 스키마를 거부한다.
- OMA: 설치된 CLI `20.10.2`, Codex CLI `0.163.0`, 설정 모델 `gpt-6.1-sol`, reasoning `high`
- 인증: 기존 호스트 ChatGPT 로그인. 컨테이너에 인증 정보를 복사하지 않았다.
- OMA 로딩 증거: agent trace에서 `AGENTS.md`, 실행 정책, `oma-backend`·`oma-qa` 스킬, QA 체크리스트와 CUE 설정을 읽었다. hooks 활성화와 Serena 사용은 확인하지 못했다.

이 결과는 **공식 task와 verifier를 사용한 host-agent smoke**다. 공식 BenchFlow 전체 실행이나 리더보드 점수가 아니다. 호스트에서는 `/app/` 경로를 별도 작업 디렉터리로 치환하고 OMA 스킬만 제공했다. 과제에 포함된 스킬은 oracle에만 제공했다.

이 단일 과제 smoke에서는 Dockerfile의 이미지 빌드를 실행하지 않았다. 동일한 `python:3.12.8-slim` 사전 빌드 이미지에 Dockerfile의 Graphviz 패키지 설치와 입력 복사를 실행 중 적용했다. 공식 oracle로 이 환경에서 채점이 동작함을 확인했다. 해당 smoke 컨테이너는 종료했다.

## 재실행

Python 3.11 이상, Docker, git, uv, 설치된 OMA·Codex CLI와 Codex 로그인이 필요하다. 현재 runner는 `dialogue-parser` 전용이다.

```bash
git clone --branch v1.1 --depth 1 https://github.com/benchflow-ai/skillsbench.git \
  "$HOME/.cache/oma-benchmarks/skillsbench-v1.1"
uv tool install --no-build 'benchflow==0.6.3'
python3 benchmarks/external/skillsbench/run.py oracle
python3 benchmarks/external/skillsbench/run.py oma
```

OMA 실행은 새 작업 디렉터리에서 `oma -y install`과 `oma link codex`를 실행한 뒤 기본 모델로 `codex exec`를 호출한다. `--workspace`로 기존 설치 디렉터리를 지정할 수도 있다. 이전 과제 출력이 있는 디렉터리는 거부한다. 공식 oracle/verifier는 호스트 agent의 작업 디렉터리에 복사하지 않으며, verifier는 agent 종료 후 채점 컨테이너로 복사한다.

호스트의 별도 작업 디렉터리는 OS 격리가 아니다. Agent가 작업 디렉터리 밖의 캐시를 읽는 것까지 차단하지 않았으므로 비공개 평가 데이터 격리를 검증한 실행은 아니다.

실행 결과는 `results/<timestamp>-<condition>/`에 저장한다. 원본 trace·prompt·설치 로그는 git에서 제외한다. 추적 가능한 결과는 아래 receipt와 공식 CTRF·reward다.

- [Oracle receipt](results/20261021T094245Z-oracle/receipt.json)
- [OMA receipt](results/20261021T094253Z-oma/receipt.json)
- [OMA 공식 CTRF](results/20261021T094253Z-oma/verifier/ctrf.json)
- [OMA 공식 reward](results/20261021T094253Z-oma/verifier/reward.txt)
