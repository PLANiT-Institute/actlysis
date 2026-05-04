#!/bin/bash
# Claude Code CLI 설치 스크립트 — Finder에서 더블클릭으로 실행

echo "================================"
echo "  Claude Code CLI 설치"
echo "================================"
echo ""

# Node.js / npm 확인
if ! command -v node &>/dev/null; then
  echo "❌ Node.js가 설치되어 있지 않습니다."
  echo ""
  echo "   1. https://nodejs.org 에서 LTS 버전을 내려받아 설치하세요."
  echo "   2. 설치 후 이 파일을 다시 실행하세요."
  echo ""
  open https://nodejs.org
  read -p "Enter 키를 눌러 종료..."
  exit 1
fi

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo "✅ Node.js $NODE_VER / npm $NPM_VER 확인됨"
echo ""

# 이미 설치되어 있으면 버전 표시 후 업그레이드 여부 확인
if command -v claude &>/dev/null; then
  CURRENT=$(claude --version 2>/dev/null || echo "알 수 없음")
  echo "ℹ️  Claude Code CLI 이미 설치됨: $CURRENT"
  echo ""
  read -p "최신 버전으로 업그레이드하시겠습니까? (y/N) " UPGRADE
  if [[ ! "$UPGRADE" =~ ^[Yy]$ ]]; then
    echo "건너뜀."
    read -p "Enter 키를 눌러 종료..."
    exit 0
  fi
  echo ""
fi

# 설치
echo "📦 Claude Code CLI 설치 중..."
npm install -g @anthropic-ai/claude-code
echo ""

# 결과 확인
if command -v claude &>/dev/null; then
  VERSION=$(claude --version 2>/dev/null || echo "")
  echo "✅ 설치 완료! $VERSION"
  echo ""
  echo "다음 단계:"
  echo "  1. 터미널에서 'claude' 를 실행하세요."
  echo "  2. Anthropic 계정 또는 Google 계정으로 로그인하세요."
  echo "  3. 로그인 후 actlysis의 run.command 를 실행하세요."
  echo ""
  read -p "지금 로그인 화면을 여시겠습니까? (y/N) " DO_LOGIN
  if [[ "$DO_LOGIN" =~ ^[Yy]$ ]]; then
    open -a Terminal . 2>/dev/null
    osascript -e 'tell app "Terminal" to do script "claude"' 2>/dev/null || true
  fi
else
  echo "❌ 설치에 실패했습니다."
  echo "   터미널에서 직접 실행해 보세요: sudo npm install -g @anthropic-ai/claude-code"
fi

echo ""
read -p "Enter 키를 눌러 종료..."
