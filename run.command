#!/bin/bash
# actlysis 실행 스크립트 — Finder에서 더블클릭으로 실행

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================"
echo "  actlysis 법령 분석 도구"
echo "================================"
echo ""

# .env.local 없으면 대화식으로 생성
if [ ! -f ".env.local" ]; then
  echo "⚙️  최초 설정: law.go.kr API 키가 필요합니다."
  echo "   (https://www.law.go.kr → 회원가입 → 마이페이지 → API인증값)"
  echo ""
  read -p "   LAW_OC_KEY: " LAW_OC_KEY_INPUT
  echo ""
  cat > .env.local << EOF
# law.go.kr API 인증키
LAW_OC_KEY=${LAW_OC_KEY_INPUT}
EOF
  echo "✅ 설정 완료!"
  echo ""
fi

# LAW_OC_KEY 확인
set -a; source .env.local 2>/dev/null; set +a
if [ -z "$LAW_OC_KEY" ]; then
  echo "⚠️  .env.local 에 LAW_OC_KEY가 비어있습니다."
  open -e .env.local 2>/dev/null || true
  read -p "수정 후 Enter 키를 눌러 계속..."
  set -a; source .env.local; set +a
fi

# Ollama 확인
if ! curl -s http://localhost:11434/api/tags &>/dev/null; then
  echo "🤖 Ollama를 시작합니다..."
  ollama serve &>/dev/null &
  sleep 2
fi

# node_modules 확인 및 설치
if [ ! -d "node_modules" ]; then
  echo "📦 의존성 설치 중 (최초 1회)..."
  npm install
  echo ""
fi

# 포트 3000 사용 중이면 기존 서버 종료 후 재시작
if lsof -i :3000 -t &>/dev/null; then
  echo "🔄 기존 서버를 재시작합니다..."
  kill $(lsof -i :3000 -t) 2>/dev/null
  sleep 1
fi

echo "🚀 서버를 시작합니다..."
echo "   URL: http://localhost:3000"
echo "   종료: 이 창을 닫거나 Ctrl+C"
echo ""

# 브라우저 오픈 (서버 준비 대기 후)
(sleep 3 && open http://localhost:3000) &

# 개발 서버 실행
npm run dev
