#!/bin/bash
# Invoked from Aspire via `/bin/bash <this-script> ...` so we don't depend on
# kernel shebang handling or DCP's PATH at exec time.

LOG=/home/brxstng/aspire-ui.log
# Prove the script started at all — touching a sentinel that DCP cannot
# possibly redirect.
touch "/home/brxstng/aspire-ui-touched-$$"
echo "==== $(date -Iseconds) start-ui.sh PID=$$ ====" >>"$LOG"

set -u

{
  echo "PWD=$(pwd)"
  echo "ARGS=$*"
  echo "INHERITED_PATH=${PATH-<unset>}"
  echo "HOME=${HOME-<unset>}"

  export NVM_DIR="${NVM_DIR:-${HOME:-/}/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    echo "nvm sourced; default node: $(nvm which default 2>/dev/null || echo none)"
  else
    echo "nvm not found at $NVM_DIR"
  fi

  export PATH="${HOME:-/}/.local/share/pnpm:${PATH:-/usr/bin:/bin}"
  echo "EFFECTIVE_PATH=$PATH"
  echo "node -> $(command -v node || echo NOT FOUND)"
  echo "pnpm -> $(command -v pnpm || echo NOT FOUND)"
} 2>&1 | tee -a "$LOG"

exec pnpm "$@" 2>&1 | tee -a "$LOG"
