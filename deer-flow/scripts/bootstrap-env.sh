#!/usr/bin/env bash
set -euo pipefail
# Bootstrap Deer-Flow Python 3.12+ development environment

# Determine Python interpreter (prefer pyenv-local 3.12.x, then python3.12, then python3)
PY_REQ="$(<.python-version 2>/dev/null || echo '3.12')"
if [[ -x "$HOME/.pyenv/versions/$PY_REQ/bin/python3" ]]; then
  PYTHON="$HOME/.pyenv/versions/$PY_REQ/bin/python3"
elif command -v python3.12 >/dev/null 2>&1; then
  PYTHON=python3.12
elif command -v python3 >/dev/null 2>&1; then
  PYTHON=python3
else
  echo "❌ No suitable python3 interpreter found. Install Python 3.12+."
  exit 1
fi

# Verify Python version
VER=$($PYTHON --version 2>&1 | awk '{print $2}')
MAJOR=${VER%%.*}
MINOR=${VER#*.}; MINOR=${MINOR%%.*}
if (( MAJOR < 3 || (MAJOR == 3 && MINOR < 12) )); then
  echo "❌ $PYTHON is $VER, but Python >= 3.12 is required."
  echo "   Install Python 3.12+ (e.g. via Homebrew or pyenv)."
  exit 1
fi
echo "Using Python interpreter: $PYTHON (version $VER)"

# 2. Create or reuse a virtual environment using the selected Python interpreter
VENV_DIR=".venv"
if [[ ! -d "$VENV_DIR" ]]; then
  $PYTHON -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# 3. Upgrade pip and install editable dev dependencies
pip install --upgrade pip
pip install -e ".[dev]"

# 4. Quick import validation
python - << 'EOF'
try:
    import langgraph.types
    print("✅ langgraph.types import succeeded, environment is ready.")
except Exception as e:
    print(f"❌ Validation failed: {e}")
    exit(1)
EOF