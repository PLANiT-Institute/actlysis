#!/bin/bash
# actlysis 한 방 설치 및 실행 — Finder에서 더블클릭으로 실행

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 색상 ──────────────────────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RED="\033[31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}================================${RESET}"
echo -e "${BOLD}  ⚖  actlysis  설치 & 실행${RESET}"
echo -e "${BOLD}     by PLANiT Institute${RESET}"
echo -e "${BOLD}================================${RESET}"
echo ""

# ── 함수 ──────────────────────────────────────────────────────────────────────
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }
info() { echo -e "${BLUE}ℹ️  $*${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}"; }
step() { echo -e "\n${BOLD}── $* ──${RESET}"; }

pause() { read -r -p "   Enter 키를 눌러 계속..." _; echo ""; }

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Node.js 확인
# ══════════════════════════════════════════════════════════════════════════════
step "1/5  Node.js 확인"

if ! command -v node &>/dev/null; then
  fail "Node.js 18+ 가 설치되어 있지 않습니다."
  echo ""
  echo "   👉 https://nodejs.org 에서 LTS 버전을 내려받아 설치 후"
  echo "      이 파일을 다시 실행하세요."
  echo ""
  open "https://nodejs.org" 2>/dev/null || true
  pause
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "Node.js $(node -v) 가 설치되어 있습니다. 18 이상을 권장합니다."
else
  ok "Node.js $(node -v)"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — 의존성 설치
# ══════════════════════════════════════════════════════════════════════════════
step "2/5  npm 의존성 설치"

if [ -d "node_modules" ]; then
  ok "node_modules 이미 존재 — 건너뜀"
else
  echo "   📦 npm install 실행 중... (최초 1회, 1~2분 소요)"
  echo ""
  npm install
  echo ""
  ok "의존성 설치 완료"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — law.go.kr API 키 설정
# ══════════════════════════════════════════════════════════════════════════════
step "3/5  법제처 Open API 키 설정"

if [ -f ".env.local" ]; then
  set -a; source .env.local 2>/dev/null; set +a
fi

if [ -n "$LAW_OC_KEY" ]; then
  ok "LAW_OC_KEY 설정됨 (${LAW_OC_KEY:0:4}****)"
else
  echo ""
  echo "   법제처 Open API 키가 필요합니다."
  echo ""
  echo "   발급 방법:"
  echo "   1. https://www.law.go.kr → 회원가입 및 로그인"
  echo "   2. 우측 상단 이름 → 마이페이지"
  echo "   3. 좌측 메뉴 → API인증값 관리"
  echo "   4. OC(Open API 인증키) 값 복사"
  echo "   5. 같은 화면에서 IP 등록 → 현재 PC 공인 IP 추가"
  echo "      (공인 IP 확인: curl -s https://ifconfig.me)"
  echo ""
  open "https://www.law.go.kr" 2>/dev/null || true
  echo -n "   LAW_OC_KEY를 붙여넣고 Enter: "
  read -r LAW_OC_KEY_INPUT
  echo ""

  if [ -z "$LAW_OC_KEY_INPUT" ]; then
    warn "API 키를 입력하지 않았습니다. 나중에 .env.local 파일에 직접 입력하세요."
    LAW_OC_KEY_INPUT="여기에_OC_키_입력"
  fi

  cat > .env.local << EOF
# law.go.kr Open API 인증키
LAW_OC_KEY=${LAW_OC_KEY_INPUT}
EOF
  ok ".env.local 생성 완료"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — AI 백엔드 선택
# ══════════════════════════════════════════════════════════════════════════════
step "4/5  AI 백엔드 설정"

echo ""
echo "   actlysis는 두 가지 AI 백엔드를 지원합니다."
echo ""
echo "   [A] Ollama  — 로컬 AI, 무료, 인터넷 불필요 (권장)"
echo "   [B] Claude Code — Anthropic 계정 필요, 최고 품질"
echo "   [C] 둘 다 설정"
echo ""
echo -n "   선택 (A/B/C, 기본값 A): "
read -r AI_CHOICE
AI_CHOICE="${AI_CHOICE:-A}"
echo ""

# ── Ollama ───────────────────────────────────────────────────────────────────
setup_ollama() {
  echo ""
  info "Ollama 설정"

  if command -v ollama &>/dev/null; then
    ok "Ollama 이미 설치됨 ($(ollama --version 2>/dev/null | head -1))"
  else
    echo "   Ollama가 설치되어 있지 않습니다."
    echo -n "   지금 설치하시겠습니까? (Y/n): "
    read -r DO_INSTALL_OLLAMA
    if [[ ! "$DO_INSTALL_OLLAMA" =~ ^[Nn]$ ]]; then
      echo "   👉 브라우저에서 https://ollama.com 이 열립니다."
      echo "      설치 후 아래 Enter를 누르세요."
      open "https://ollama.com" 2>/dev/null || true
      pause
    else
      warn "Ollama 설치를 건너뜁니다. 나중에 https://ollama.com 에서 설치하세요."
      return
    fi
  fi

  # Ollama 서버 시작
  if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
    echo "   🤖 Ollama 서버를 시작합니다..."
    ollama serve &>/dev/null &
    sleep 2
  fi

  # 모델 확인
  MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')
  if [ "$MODEL_COUNT" -eq 0 ]; then
    echo ""
    echo "   설치된 모델이 없습니다. 한국어 법령 분석 추천 모델:"
    echo ""
    echo "   [1] qwen2.5:7b  — 균형 (약 4.7 GB) ← 추천"
    echo "   [2] qwen2.5:3b  — 빠름 (약 2 GB)"
    echo "   [3] qwen2.5:14b — 고품질 (약 9 GB, RAM 16GB+)"
    echo "   [4] 건너뜀 (나중에 직접 설치)"
    echo ""
    echo -n "   모델 선택 (1-4, 기본값 1): "
    read -r MODEL_CHOICE
    MODEL_CHOICE="${MODEL_CHOICE:-1}"

    case "$MODEL_CHOICE" in
      1) PULL_MODEL="qwen2.5:7b" ;;
      2) PULL_MODEL="qwen2.5:3b" ;;
      3) PULL_MODEL="qwen2.5:14b" ;;
      *) PULL_MODEL="" ;;
    esac

    if [ -n "$PULL_MODEL" ]; then
      echo "   📥 $PULL_MODEL 다운로드 중... (시간이 걸릴 수 있습니다)"
      ollama pull "$PULL_MODEL"
      ok "$PULL_MODEL 다운로드 완료"
    else
      warn "모델 없이 계속합니다. 나중에 'ollama pull qwen2.5:7b' 실행 필요."
    fi
  else
    ok "Ollama 모델 ${MODEL_COUNT}개 설치됨"
  fi
}

# ── Claude Code ───────────────────────────────────────────────────────────────
setup_claude() {
  echo ""
  info "Claude Code CLI 설정"
  echo ""

  # 설치 확인
  if command -v claude &>/dev/null; then
    ok "Claude Code CLI 이미 설치됨 ($(claude --version 2>/dev/null | head -1))"
  else
    echo "   Claude Code CLI를 설치합니다..."
    npm install -g @anthropic-ai/claude-code
    if command -v claude &>/dev/null; then
      ok "Claude Code CLI 설치 완료"
    else
      fail "설치에 실패했습니다. 터미널에서 직접 실행해 보세요:"
      echo "      sudo npm install -g @anthropic-ai/claude-code"
      return
    fi
  fi

  # 로그인 확인
  echo ""
  echo "   ┌─────────────────────────────────────────────────────────┐"
  echo "   │  Claude Code 로그인이 필요합니다                        │"
  echo "   │                                                         │"
  echo "   │  1. 아래 '로그인 터미널 열기'에서 Y를 누르세요          │"
  echo "   │  2. 새 터미널에서 'claude' 명령이 실행됩니다            │"
  echo "   │  3. Anthropic 또는 Google 계정으로 로그인하세요         │"
  echo "   │  4. 로그인 완료 후 이 창으로 돌아와 Enter를 누르세요    │"
  echo "   └─────────────────────────────────────────────────────────┘"
  echo ""
  echo -n "   로그인 터미널 열기 (Y/n): "
  read -r DO_LOGIN
  if [[ ! "$DO_LOGIN" =~ ^[Nn]$ ]]; then
    osascript -e 'tell application "Terminal"
      activate
      do script "echo \"Claude Code 로그인\"; echo \"로그인 완료 후 이 창을 닫으세요.\"; claude"
    end tell' 2>/dev/null || open -a Terminal . 2>/dev/null || true
    echo ""
    pause
  else
    warn "로그인을 건너뜁니다. 앱 실행 후 터미널에서 'claude' 명령으로 로그인하세요."
  fi
}

case "${AI_CHOICE^^}" in
  A) setup_ollama ;;
  B) setup_claude ;;
  C) setup_ollama; setup_claude ;;
  *) setup_ollama ;;
esac

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — 실행
# ══════════════════════════════════════════════════════════════════════════════
step "5/5  서버 시작"

# 포트 3000 사용 중이면 종료
if lsof -i :3000 -t &>/dev/null; then
  echo "   기존 서버를 종료하고 재시작합니다..."
  kill "$(lsof -i :3000 -t)" 2>/dev/null
  sleep 1
fi

echo ""
ok "모든 설정 완료!"
echo ""
echo -e "   ${BOLD}http://localhost:3000${RESET} 에서 actlysis가 실행됩니다."
echo "   종료하려면 이 창을 닫거나 Ctrl+C를 누르세요."
echo ""

# 브라우저는 서버 준비 후 열기
(sleep 4 && open http://localhost:3000) &

npm run dev
