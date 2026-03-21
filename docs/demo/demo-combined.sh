#!/usr/bin/env bash
# Combined demo simulation for oh-my-agent GIF
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

# ─── Scene 1: Install ─────────────────────────────────────

clear
echo ""
echo -e "  ${MAGENTA}${BOLD}🛸 oh-my-agent${RESET} ${DIM}v1.12.1${RESET}"
echo -e "  ${DIM}Multi-Agent Orchestrator for Antigravity${RESET}"
echo ""
sleep 0.8

echo -e "  ${BOLD}Select a preset:${RESET}"
echo ""
echo -e "    ${INVERSE} ✨ All         ${RESET}  Everything"
echo -e "    ${DIM} 🌐 Fullstack   ${RESET}  frontend, backend, pm, qa, debug, oma-commit"
echo -e "    ${DIM} 🎨 Frontend    ${RESET}  frontend, pm, qa, debug, oma-commit"
echo -e "    ${DIM} ⚙️  Backend     ${RESET}  backend, pm, qa, debug, oma-commit"
echo -e "    ${DIM} 📱 Mobile      ${RESET}  mobile, pm, qa, debug, oma-commit"
echo ""
sleep 1.2

echo -e "\r  ${GREEN}◆${RESET} Selected: ${BOLD}✨ All${RESET}"
echo ""
sleep 0.3

echo -e "  ${CYAN}◇${RESET} Installing skills..."
echo ""
skills=("oma-coordination" "oma-pm" "oma-frontend" "oma-backend" "oma-mobile" "oma-qa" "oma-debug" "oma-orchestrator" "oma-commit")
for skill in "${skills[@]}"; do
  echo -e "    ${GREEN}✓${RESET} ${skill}"
  sleep 0.12
done
echo ""
sleep 0.2

echo -e "  ${CYAN}◇${RESET} Installing workflows..."
workflows=("coordinate" "orchestrate" "plan" "review" "debug" "setup" "tools")
for wf in "${workflows[@]}"; do
  printf "  "
  echo -e "  ${GREEN}✓${RESET} ${wf}"
  sleep 0.08
done
echo ""
sleep 0.2

echo -e "  ${GREEN}${BOLD}✓ Installation complete!${RESET} ${DIM}(9 skills, 7 workflows)${RESET}"
echo ""
sleep 1.5

# ─── Scene 2: Spawn ───────────────────────────────────────

clear
echo ""
echo -e "  ${DIM}\$${RESET} ${BOLD}oh-my-ag agent:spawn backend \"Implement JWT auth\" session-01 &${RESET}"
echo -e "  ${DIM}\$${RESET} ${BOLD}oh-my-ag agent:spawn frontend \"Create login UI\" session-01 &${RESET}"
echo -e "  ${DIM}\$${RESET} ${BOLD}oh-my-ag agent:spawn qa \"Security review\" session-01 &${RESET}"
echo ""
sleep 1

echo -e "  ${MAGENTA}${BOLD}🛸 oh-my-agent orchestrator${RESET} ${DIM}session-20260208-143022${RESET}"
echo ""
sleep 0.3

echo -e "  ${CYAN}⟳${RESET} ${BOLD}backend${RESET}   → gemini   ${DIM}workspace: ./apps/api${RESET}"
sleep 0.25
echo -e "  ${CYAN}⟳${RESET} ${BOLD}frontend${RESET}  → claude   ${DIM}workspace: ./apps/web${RESET}"
sleep 0.25
echo -e "  ${CYAN}⟳${RESET} ${BOLD}qa${RESET}        → claude   ${DIM}workspace: ./${RESET}"
sleep 0.4

echo ""
echo -e "  ${GREEN}✓${RESET} 3 agents spawned  ${DIM}(2 vendors: gemini, claude)${RESET}"
echo ""
sleep 1.5

# ─── Scene 3: Dashboard ──────────────────────────────────

draw_dashboard() {
  local b_status="$1" b_turn="$2"
  local f_status="$3" f_turn="$4"
  local q_status="$5" q_turn="$6"
  local log1="$7"
  local log2="$8"

  clear
  echo ""
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}                                                              ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}   🛸 Serena Memory Dashboard                                 ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}   Session: session-20260208-143022  [RUNNING]                 ${RESET}"
  echo -e "  ${BG_MAGENTA}${WHITE}${BOLD}                                                              ${RESET}"
  echo ""
  echo -e "  ${BOLD}  Agent          Status            Turn    Task${RESET}"
  echo -e "  ${DIM}  ────────────   ──────────────    ────    ──────────────────────${RESET}"
  echo -e "  ${b_status}    ${b_turn}    JWT Auth API"
  echo -e "  ${f_status}    ${f_turn}    Login UI + Dashboard"
  echo -e "  ${q_status}    ${q_turn}    Security Review"
  echo ""
  echo -e "  ${DIM}──────────────────────────────────────────────────────────────${RESET}"
  echo -e "  ${BOLD}  Activity${RESET}"
  echo -e "  ${log1}"
  echo -e "  ${log2}"
  echo ""
  echo -e "  ${DIM}  Updated: 2026-02-08 14:32:05  |  Ctrl+C to exit${RESET}"
}

# Dashboard Frame 1: Both running
draw_dashboard \
  "  ${CYAN}backend${RESET}        ${CYAN}● running${RESET}  " "       ${BOLD}3${RESET}" \
  "  ${CYAN}frontend${RESET}       ${CYAN}● running${RESET}  " "       ${BOLD}2${RESET}" \
  "  ${DIM}qa${RESET}             ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${CYAN}[backend]${RESET}  Turn 3 — Setting up SQLAlchemy models" \
  "  ${CYAN}[frontend]${RESET} Turn 2 — Creating component structure"
sleep 1.2

# Dashboard Frame 2: Progress
draw_dashboard \
  "  ${CYAN}backend${RESET}        ${CYAN}● running${RESET}  " "       ${BOLD}7${RESET}" \
  "  ${CYAN}frontend${RESET}       ${CYAN}● running${RESET}  " "       ${BOLD}6${RESET}" \
  "  ${DIM}qa${RESET}             ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${CYAN}[backend]${RESET}  Turn 7 — Implementing JWT token rotation" \
  "  ${CYAN}[frontend]${RESET} Turn 6 — Adding form validation with Zod"
sleep 1.2

# Dashboard Frame 3: More progress
draw_dashboard \
  "  ${CYAN}backend${RESET}        ${CYAN}● running${RESET}  " "      ${BOLD}12${RESET}" \
  "  ${CYAN}frontend${RESET}       ${CYAN}● running${RESET}  " "      ${BOLD}14${RESET}" \
  "  ${DIM}qa${RESET}             ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${CYAN}[backend]${RESET}  Turn 12 — Added rate limiting + tests" \
  "  ${CYAN}[frontend]${RESET} Turn 14 — Integrating API client"
sleep 1.2

# Dashboard Frame 4: Frontend done
draw_dashboard \
  "  ${CYAN}backend${RESET}        ${CYAN}● running${RESET}  " "      ${BOLD}15${RESET}" \
  "  ${GREEN}frontend${RESET}       ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${DIM}qa${RESET}             ${DIM}○ blocked${RESET}  " "       ${DIM}-${RESET}" \
  "  ${GREEN}[frontend]${RESET} ✓ Completed — All criteria met" \
  "  ${CYAN}[backend]${RESET}  Turn 15 — Writing integration tests"
sleep 1.2

# Dashboard Frame 5: Backend done, QA starts
draw_dashboard \
  "  ${GREEN}backend${RESET}        ${GREEN}✓ completed${RESET}" "      ${BOLD}20${RESET}" \
  "  ${GREEN}frontend${RESET}       ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${CYAN}qa${RESET}             ${CYAN}● running${RESET}  " "       ${BOLD}1${RESET}" \
  "  ${GREEN}[backend]${RESET}  ✓ Completed — All criteria met" \
  "  ${CYAN}[qa]${RESET}       Turn 1 — Starting OWASP Top 10 audit"
sleep 1.2

# Dashboard Frame 6: QA progressing
draw_dashboard \
  "  ${GREEN}backend${RESET}        ${GREEN}✓ completed${RESET}" "      ${BOLD}20${RESET}" \
  "  ${GREEN}frontend${RESET}       ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${CYAN}qa${RESET}             ${CYAN}● running${RESET}  " "       ${BOLD}5${RESET}" \
  "  ${CYAN}[qa]${RESET}       Turn 5 — Checking XSS, CSRF, SQL injection" \
  "  ${CYAN}[qa]${RESET}       Found: 0 critical, 1 medium issue"
sleep 1.2

# Dashboard Frame 7: All done!
draw_dashboard \
  "  ${GREEN}backend${RESET}        ${GREEN}✓ completed${RESET}" "      ${BOLD}20${RESET}" \
  "  ${GREEN}frontend${RESET}       ${GREEN}✓ completed${RESET}" "      ${BOLD}18${RESET}" \
  "  ${GREEN}qa${RESET}             ${GREEN}✓ completed${RESET}" "       ${BOLD}8${RESET}" \
  "  ${GREEN}[qa]${RESET}       ✓ Completed — 0 critical, 1 medium (documented)" \
  "  ${GREEN}${BOLD}[system] All agents completed successfully ✓${RESET}"
sleep 2.5
