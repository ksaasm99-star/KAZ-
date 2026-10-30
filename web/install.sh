#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
umask 077

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly RESET='\033[0m'

info() { printf '%b\n' "${BLUE}[KAZ]${RESET} $*"; }
success() { printf '%b\n' "${GREEN}[PASS]${RESET} $*"; }
warning() { printf '%b\n' "${YELLOW}[WARN]${RESET} $*"; }
error() { printf '%b\n' "${RED}[FAIL]${RESET} $*" >&2; }

on_error() {
  error "فشل التثبيت عند السطر ${BASH_LINENO[0]}. راجع الرسالة السابقة ثم أعد تشغيل ./install.sh."
}
trap on_error ERR

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    error 'Node.js غير مثبت. ثبّت Node.js >= 20 ثم أعد التشغيل.'
    exit 1
  fi

  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if (( major < 20 )); then
    error "إصدار Node.js الحالي هو $(node --version)، والمطلوب >= 20."
    exit 1
  fi
  success "Node.js $(node --version)"
}

ensure_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    info 'pnpm غير موجود؛ محاولة تفعيله عبر Corepack...'
    if command -v corepack >/dev/null 2>&1; then
      corepack enable >/dev/null 2>&1 || true
      corepack prepare pnpm@9.0.0 --activate >/dev/null 2>&1 || true
    fi
  fi

  if ! command -v pnpm >/dev/null 2>&1; then
    error 'تعذر توفير pnpm. ثبّت pnpm >= 9 ثم أعد التشغيل.'
    exit 1
  fi

  local major
  major="$(pnpm --version | cut -d. -f1)"
  if (( major < 9 )); then
    error "إصدار pnpm الحالي هو $(pnpm --version)، والمطلوب >= 9."
    exit 1
  fi
  success "pnpm $(pnpm --version)"
}

ensure_env() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
    chmod 600 .env
    info 'تم إنشاء .env محليًا من .env.example.'
  fi

  local current_token
  current_token="$(sed -n 's/^KAZ_OWNER_TOKEN=//p' .env | head -n 1)"
  if [[ -z "$current_token" || "$current_token" == 'change-me-to-a-random-string' || ${#current_token} -lt 32 ]]; then
    local token
    token="$(node -e 'console.log(require("node:crypto").randomBytes(36).toString("base64url"))')"
    python3 - "$token" <<'PY'
from pathlib import Path
import sys

path = Path('.env')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
replacement = f'KAZ_OWNER_TOKEN={sys.argv[1]}'
for index, line in enumerate(lines):
    if line.startswith('KAZ_OWNER_TOKEN='):
        lines[index] = replacement
        break
else:
    lines.insert(0, replacement)
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
PY
    chmod 600 .env
    success 'تم توليد KAZ_OWNER_TOKEN عشوائيًا وحفظه محليًا دون طباعته.'
  else
    success 'KAZ_OWNER_TOKEN موجود محليًا.'
  fi
}

check_ollama() {
  if ! command -v ollama >/dev/null 2>&1; then
    warning 'Ollama غير مثبت؛ سيعمل KAZ بالمزودات المتاحة، ويبقى المزود المحلي BLOCKED حتى تثبيته.'
    return 0
  fi

  if ollama list >/dev/null 2>&1; then
    success 'Ollama متاح.'
  else
    warning 'Ollama مثبت لكنه غير متاح حاليًا؛ شغّله لاحقًا عند الحاجة للمزود المحلي.'
  fi
}

main() {
  info 'بدء إعداد KAZ Web من الصفر.'
  require_node
  ensure_pnpm
  ensure_env
  check_ollama

  info 'تثبيت اعتماديات Web باستخدام pnpm install --frozen-lockfile.'
  pnpm install --frozen-lockfile
  success 'تم تثبيت الاعتماديات.'

  info 'تشغيل فحص TypeScript والاختبارات الكاملة.'
  pnpm test
  success 'اجتاز KAZ فحص TypeScript والاختبارات المتاحة؛ الاختبارات الخارجية الاختيارية تظهر BLOCKED عند غياب مفاتيحها.'
  info 'للتشغيل: pnpm dev'
}

main "$@"
