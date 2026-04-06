#!/usr/bin/env bash
# Demo simulation for oh-my-agent v2 — VHS recording
set -e

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
CYAN="\033[36m"
MAGENTA="\033[35m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"
INVERSE="\033[7m"
BG_MAGENTA="\033[45m"
WHITE="\033[97m"
BLUE="\033[34m"

# ─── Scene 1: Install ─────────────────────────────────────

clear
echo ""
echo -e "  ${MAGENTA}${BOLD}🛸 oh-my-agent${RESET} ${DIM}v2.11.0${RESET}"
echo -e "  ${DIM}Multi-Agent Orchestrator for AI IDEs${RESET}"
echo ""
sleep 0.8

echo -e "  ${BOLD}Select a preset:${RESET}"
echo ""
echo -e "    ${INVERSE} ✨ All         ${RESET}  Everything (13 skills, 11 workflows)"
echo -e "    ${DIM} 🌐 Fullstack   ${RESET}  frontend, backend, db, pm, qa, debug, oma-commit"
echo -e "    ${DIM} 🎨 Frontend    ${RESET}  frontend, pm, qa, debug, oma-commit"
echo -e "    ${DIM} ⚙️  Backend     ${RESET}  backend, db, pm, qa, debug, oma-commit"
echo -e "    ${DIM} 📱 Mobile      ${RESET}  mobile, pm, qa, debug, oma-commit"
echo -e "    ${DIM} 🏗️  Infra       ${RESET}  tf-infra, db, qa, debug, oma-commit"
echo ""
sleep 1.2

echo -e "\r  ${GREEN}◆${RESET} Selected: ${BOLD}✨ All${RESET}"
echo ""
sleep 0.3

echo -e "  ${CYAN}◇${RESET} Installing skills..."
echo ""
skills=("oma-brainstorm" "oma-coordination" "oma-pm" "oma-frontend" "oma-backend" "oma-db" "oma-mobile" "oma-qa" "oma-debug" "oma-orchestrator" "oma-dev-workflow" "oma-tf-infra" "oma-commit")
for skill in "${skills[@]}"; do
  echo -e "    ${GREEN}✓${RESET} ${skill}"
  sleep 0.07
done
echo ""
sleep 0.15

echo -e "  ${CYAN}◇${RESET} Installing workflows..."
workflows=("orchestrate" "work" "ultrawork" "plan" "exec-plan" "oma-brainstorm" "review" "debug" "setup" "tools" "deepinit")
for wf in "${workflows[@]}"; do
  echo -e "    ${GREEN}✓${RESET} ${wf}"
  sleep 0.05
done
echo ""
sleep 0.15

echo -e "  ${CYAN}◇${RESET} Registering agents..."
agents=("pm" "frontend" "backend" "mobile" "qa" "debug" "db")
for ag in "${agents[@]}"; do
  echo -e "    ${GREEN}✓${RESET} ${ag}-agent"
  sleep 0.05
done
echo ""
sleep 0.2

echo -e "  ${GREEN}${BOLD}✓ Installation complete!${RESET} ${DIM}(13 skills, 11 workflows, 7 agents)${RESET}"
echo ""
sleep 1.5

# ─── Scene 2: Parallel Agent Spawn ────────────────────────

clear
echo ""
echo -e "  ${DIM}\$${RESET} ${BOLD}oma agent:spawn backend \"Implement JWT auth\" session-01 -v gemini &${RESET}"
sleep 0.3
echo -e "  ${DIM}\$${RESET} ${BOLD}oma agent:spawn frontend \"Create login UI\" session-01 -v claude &${RESET}"
sleep 0.3
echo -e "  ${DIM}\$${RESET} ${BOLD}oma agent:spawn qa \"Security review\" session-01 -v codex &${RESET}"
sleep 0.3
echo -e "  ${DIM}\$${RESET} ${BOLD}oma agent:spawn db \"Design auth schema\" session-01 -v qwen &${RESET}"
echo ""
sleep 0.8

echo -e "  ${MAGENTA}${BOLD}🛸 oh-my-agent orchestrator${RESET} ${DIM}session-20260319-143022${RESET}"
echo ""
sleep 0.3

echo -e "  ${CYAN}⟳${RESET} ${BOLD}backend${RESET}    → gemini   ${DIM}workspace: ./apps/api${RESET}"
sleep 0.2
echo -e "  ${CYAN}⟳${RESET} ${BOLD}frontend${RESET}   → claude   ${DIM}workspace: ./apps/web${RESET}"
sleep 0.2
echo -e "  ${CYAN}⟳${RESET} ${BOLD}qa${RESET}         → codex    ${DIM}workspace: ./${RESET}"
sleep 0.2
echo -e "  ${CYAN}⟳${RESET} ${BOLD}db${RESET}         → qwen     ${DIM}workspace: ./apps/db${RESET}"
sleep 0.3

echo ""
echo -e "  ${GREEN}✓${RESET} 4 agents spawned  ${DIM}(4 vendors: gemini, claude, codex, qwen)${RESET}"
echo ""
sleep 1.5

# ─── Scene 3: Dashboard ──────────────────────────────────

draw_dashboard() {
  local b_status="$1" b_turn="$2"
  local f_status="$3" f_turn="$4"
  local d_status="$5" d_turn="$6"
  local q_status="$7" q_turn="$8"
  local log1="$9"
  local log2="${10}"

  clear
  echo ""
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}                                                                ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}   🛸 oh-my-agent Dashboard                                     ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}   Session: session-20260319-143022  [RUNNING]                   ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}                                                                ${RESET}"
  echo ""
  echo -e "  ${BOLD}  Agent          Vendor    Status            Turn    Task${RESET}"
  echo -e "  ${DIM}  ────────────   ──────    ──────────────    ────    ──────────────────────${RESET}"
  echo -e "  ${b_status}    ${b_turn}    JWT Auth API"
  echo -e "  ${f_status}    ${f_turn}    Login UI + Dashboard"
  echo -e "  ${d_status}    ${d_turn}    Auth Schema Design"
  echo -e "  ${q_status}    ${q_turn}    Security Review"
  echo ""
  echo -e "  ${DIM}──────────────────────────────────────────────────────────────────${RESET}"
  echo -e "  ${BOLD}  Activity${RESET}"
  echo -e "  ${log1}"
  echo -e "  ${log2}"
  echo ""
  echo -e "  ${DIM}  Updated: 2026-03-19 14:32:05  |  q to exit${RESET}"
}

# Frame 1: All starting, qa blocked
draw_dashboard \
  "  ${CYAN}backend${RESET}        gemini    ${CYAN}● running${RESET}  " "       ${BOLD}3${RESET}" \
  "  ${CYAN}frontend${RESET}       claude    ${CYAN}● running${RESET}  " "       ${BOLD}2${RESET}" \
  "  ${CYAN}db${RESET}             qwen      ${CYAN}● running${RESET}  " "       ${BOLD}1${RESET}" \
  "  ${DIM}qa${RESET}             codex     ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${CYAN}[backend]${RESET}  Turn 3 — Setting up SQLAlchemy models" \
  "  ${CYAN}[frontend]${RESET} Turn 2 — Creating component structure"
sleep 1.3

# Frame 2: Progress
draw_dashboard \
  "  ${CYAN}backend${RESET}        gemini    ${CYAN}● running${RESET}  " "       ${BOLD}8${RESET}" \
  "  ${CYAN}frontend${RESET}       claude    ${CYAN}● running${RESET}  " "       ${BOLD}7${RESET}" \
  "  ${CYAN}db${RESET}             qwen      ${CYAN}● running${RESET}  " "       ${BOLD}5${RESET}" \
  "  ${DIM}qa${RESET}             codex     ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${CYAN}[backend]${RESET}  Turn 8 — Implementing JWT token rotation" \
  "  ${CYAN}[db]${RESET}       Turn 5 — Creating migration scripts"
sleep 1.3

# Frame 3: db completed
draw_dashboard \
  "  ${CYAN}backend${RESET}        gemini    ${CYAN}● running${RESET}  " "      ${BOLD}12${RESET}" \
  "  ${CYAN}frontend${RESET}       claude    ${CYAN}● running${RESET}  " "      ${BOLD}14${RESET}" \
  "  ${GREEN}db${RESET}             qwen      ${GREEN}✓ completed${RESET}" "       ${BOLD}9${RESET}" \
  "  ${CYAN}qa${RESET}             codex     ${CYAN}● running${RESET}  " "       ${BOLD}1${RESET}" \
  "  ${GREEN}[db]${RESET}       ✓ Completed — Schema + migrations ready" \
  "  ${CYAN}[qa]${RESET}       Turn 1 — Starting OWASP Top 10 audit"
sleep 1.3

# Frame 4: frontend completed
draw_dashboard \
  "  ${CYAN}backend${RESET}        gemini    ${CYAN}● running${RESET}  " "      ${BOLD}16${RESET}" \
  "  ${GREEN}frontend${RESET}       claude    ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${GREEN}db${RESET}             qwen      ${GREEN}✓ completed${RESET}" "       ${BOLD}9${RESET}" \
  "  ${CYAN}qa${RESET}             codex     ${CYAN}● running${RESET}  " "       ${BOLD}4${RESET}" \
  "  ${GREEN}[frontend]${RESET} ✓ Completed — All acceptance criteria met" \
  "  ${CYAN}[backend]${RESET}  Turn 16 — Writing integration tests"
sleep 1.3

# Frame 5: backend completed, qa progressing
draw_dashboard \
  "  ${GREEN}backend${RESET}        gemini    ${GREEN}✓ completed${RESET}" "      ${BOLD}20${RESET}" \
  "  ${GREEN}frontend${RESET}       claude    ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${GREEN}db${RESET}             qwen      ${GREEN}✓ completed${RESET}" "       ${BOLD}9${RESET}" \
  "  ${CYAN}qa${RESET}             codex     ${CYAN}● running${RESET}  " "       ${BOLD}6${RESET}" \
  "  ${GREEN}[backend]${RESET}  ✓ Completed — JWT + rate limiting + tests" \
  "  ${CYAN}[qa]${RESET}       Turn 6 — Checking XSS, CSRF, SQL injection"
sleep 1.3

# Frame 6: All done!
draw_dashboard \
  "  ${GREEN}backend${RESET}        gemini    ${GREEN}✓ completed${RESET}" "      ${BOLD}20${RESET}" \
  "  ${GREEN}frontend${RESET}       claude    ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${GREEN}db${RESET}             qwen      ${GREEN}✓ completed${RESET}" "       ${BOLD}9${RESET}" \
  "  ${GREEN}qa${RESET}             codex     ${GREEN}✓ completed${RESET}" "       ${BOLD}8${RESET}" \
  "  ${GREEN}[qa]${RESET}       ✓ Completed — 0 critical, 1 medium (documented)" \
  "  ${GREEN}${BOLD}  [system] All 4 agents completed successfully ✓${RESET}"
sleep 2.5
