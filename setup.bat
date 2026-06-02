@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ================================
echo   ⚖  actlysis  설치 ^& 실행
echo      by PLANiT Institute
echo ================================
echo.

:: ══════════════════════════════════════════════════════════════════════════════
:: STEP 1 — Node.js 확인
:: ══════════════════════════════════════════════════════════════════════════════
echo [1/5] Node.js 확인
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  ❌ Node.js 가 설치되어 있지 않습니다.
    echo.
    echo     1. https://nodejs.org 에서 LTS 버전을 내려받아 설치하세요.
    echo     2. 설치 후 이 파일을 다시 실행하세요.
    echo.
    start https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo  ✅ Node.js %NODE_VER% 확인됨
echo.

:: ══════════════════════════════════════════════════════════════════════════════
:: STEP 2 — 의존성 설치
:: ══════════════════════════════════════════════════════════════════════════════
echo [2/5] npm 의존성 설치
echo.

if exist "node_modules\" (
    echo  ✅ node_modules 이미 존재 — 건너뜀
) else (
    echo  📦 npm install 실행 중... (최초 1회, 1~2분 소요)
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  ❌ npm install 실패. 오류를 확인하고 다시 시도하세요.
        pause
        exit /b 1
    )
    echo.
    echo  ✅ 의존성 설치 완료
)
echo.

:: ══════════════════════════════════════════════════════════════════════════════
:: STEP 3 — law.go.kr API 키 설정
:: ══════════════════════════════════════════════════════════════════════════════
echo [3/5] 법제처 Open API 키 설정
echo.

set LAW_OC_KEY=
if exist ".env.local" (
    for /f "tokens=2 delims==" %%a in ('findstr /i "LAW_OC_KEY" .env.local 2^>nul') do set LAW_OC_KEY=%%a
)

if not "!LAW_OC_KEY!"=="" (
    set MASKED=!LAW_OC_KEY:~0,4!****
    echo  ✅ LAW_OC_KEY 설정됨 ^(!MASKED!^)
) else (
    echo  법제처 Open API 키가 필요합니다.
    echo.
    echo  발급 방법:
    echo    1. https://www.law.go.kr -^> 회원가입 및 로그인
    echo    2. 우측 상단 이름 -^> 마이페이지
    echo    3. 좌측 메뉴 -^> API인증값 관리
    echo    4. OC(Open API 인증키) 값 복사
    echo    5. 같은 화면에서 IP 등록 -^> 현재 PC 공인 IP 추가
    echo.
    start https://www.law.go.kr
    set /p LAW_OC_KEY_INPUT="  LAW_OC_KEY를 붙여넣고 Enter: "
    echo.

    if "!LAW_OC_KEY_INPUT!"=="" (
        echo  ⚠️  API 키를 입력하지 않았습니다.
        echo     나중에 .env.local 파일에 직접 입력하세요.
        set LAW_OC_KEY_INPUT=여기에_OC_키_입력
    )

    (
        echo LAW_OC_KEY=!LAW_OC_KEY_INPUT!
    ) > .env.local
    echo  ✅ .env.local 생성 완료
)
echo.

:: ══════════════════════════════════════════════════════════════════════════════
:: STEP 4 — AI 백엔드 선택
:: ══════════════════════════════════════════════════════════════════════════════
echo [4/5] AI 백엔드 설정
echo.
echo  actlysis는 두 가지 AI 백엔드를 지원합니다.
echo.
echo  [A] Ollama       - 로컬 AI, 무료, 인터넷 불필요 (권장)
echo  [B] Claude Code  - Anthropic 계정 필요, 최고 품질
echo  [C] 둘 다 설정
echo.
set /p AI_CHOICE="  선택 (A/B/C, 기본값 A): "
if "!AI_CHOICE!"=="" set AI_CHOICE=A
echo.

:: ── Ollama 설치 ───────────────────────────────────────────────────────────────
:setup_ollama
if /i not "!AI_CHOICE!"=="A" if /i not "!AI_CHOICE!"=="C" goto skip_ollama

echo  [Ollama 설정]
echo.

where ollama >nul 2>&1
if errorlevel 1 (
    echo  Ollama가 설치되어 있지 않습니다.
    set /p DO_OLLAMA="  지금 설치하시겠습니까? (Y/n): "
    if /i not "!DO_OLLAMA!"=="n" (
        echo.
        echo  👉 브라우저에서 https://ollama.com 이 열립니다.
        echo     설치 완료 후 이 창으로 돌아와 Enter를 누르세요.
        start https://ollama.com
        pause
    ) else (
        echo  ⚠️  Ollama 설치를 건너뜁니다.
        echo     나중에 https://ollama.com 에서 설치 후 모델을 내려받으세요.
        goto skip_ollama
    )
) else (
    for /f "tokens=*" %%v in ('ollama --version 2^>nul') do set OLLAMA_VER=%%v
    echo  ✅ Ollama 이미 설치됨 ^(!OLLAMA_VER!^)
)

:: Ollama 서버 시작
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo  🤖 Ollama 서버를 백그라운드로 시작합니다...
    start /b ollama serve >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: 모델 확인
for /f "skip=1" %%a in ('ollama list 2^>nul') do set /a MODEL_COUNT+=1
if not defined MODEL_COUNT set MODEL_COUNT=0

if !MODEL_COUNT! EQU 0 (
    echo.
    echo  설치된 모델이 없습니다. 한국어 법령 분석 추천 모델:
    echo.
    echo  [1] qwen2.5:7b  - 균형 (약 4.7 GB) ← 추천
    echo  [2] qwen2.5:3b  - 빠름 (약 2 GB)
    echo  [3] qwen2.5:14b - 고품질 (약 9 GB, RAM 16GB+)
    echo  [4] 건너뜀
    echo.
    set /p MODEL_CHOICE="  모델 선택 (1-4, 기본값 1): "
    if "!MODEL_CHOICE!"=="" set MODEL_CHOICE=1

    if "!MODEL_CHOICE!"=="1" (
        echo  📥 qwen2.5:7b 다운로드 중...
        ollama pull qwen2.5:7b
        echo  ✅ qwen2.5:7b 다운로드 완료
    ) else if "!MODEL_CHOICE!"=="2" (
        echo  📥 qwen2.5:3b 다운로드 중...
        ollama pull qwen2.5:3b
        echo  ✅ qwen2.5:3b 다운로드 완료
    ) else if "!MODEL_CHOICE!"=="3" (
        echo  📥 qwen2.5:14b 다운로드 중...
        ollama pull qwen2.5:14b
        echo  ✅ qwen2.5:14b 다운로드 완료
    ) else (
        echo  ⚠️  모델 없이 계속합니다.
        echo     나중에 명령 프롬프트에서 'ollama pull qwen2.5:7b' 실행 필요.
    )
) else (
    echo  ✅ Ollama 모델 !MODEL_COUNT!개 설치됨
)
echo.

:skip_ollama

:: ── Claude Code 설치 ──────────────────────────────────────────────────────────
if /i not "!AI_CHOICE!"=="B" if /i not "!AI_CHOICE!"=="C" goto skip_claude

echo  [Claude Code CLI 설정]
echo.

where claude >nul 2>&1
if errorlevel 1 (
    echo  Claude Code CLI를 설치합니다...
    npm install -g @anthropic-ai/claude-code
    where claude >nul 2>&1
    if errorlevel 1 (
        echo  ❌ 설치 실패. 관리자 권한으로 실행하거나 아래를 직접 실행하세요:
        echo     npm install -g @anthropic-ai/claude-code
        goto skip_claude
    )
    echo  ✅ Claude Code CLI 설치 완료
) else (
    for /f "tokens=*" %%v in ('claude --version 2^>nul') do set CLAUDE_VER=%%v
    echo  ✅ Claude Code CLI 이미 설치됨 ^(!CLAUDE_VER!^)
)

echo.
echo  +----------------------------------------------------------+
echo  ^|  Claude Code 로그인이 필요합니다                        ^|
echo  ^|                                                          ^|
echo  ^|  1. Y를 누르면 새 창에서 로그인 화면이 열립니다         ^|
echo  ^|  2. Anthropic 또는 Google 계정으로 로그인하세요         ^|
echo  ^|  3. 로그인 완료 후 이 창으로 돌아와 Enter를 누르세요    ^|
echo  +----------------------------------------------------------+
echo.
set /p DO_LOGIN="  로그인 창 열기 (Y/n): "
if /i not "!DO_LOGIN!"=="n" (
    start cmd /k "echo Claude Code 로그인 && echo 로그인 완료 후 이 창을 닫으세요. && claude"
    echo.
    pause
) else (
    echo  ⚠️  나중에 명령 프롬프트에서 'claude' 명령으로 로그인하세요.
)
echo.

:skip_claude

:: ══════════════════════════════════════════════════════════════════════════════
:: STEP 5 — 서버 시작
:: ══════════════════════════════════════════════════════════════════════════════
echo [5/5] 서버 시작
echo.

:: 포트 3000 사용 중이면 종료
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    taskkill /PID %%p /F >nul 2>&1
)

echo  ✅ 모든 설정 완료!
echo.
echo  http://localhost:3000 에서 actlysis가 실행됩니다.
echo  종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.
echo.

:: 4초 후 브라우저 오픈
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

npm run dev

endlocal
