# Simple dev workflow for the static site

.PHONY: serve stop open

PORT ?= 8000

serve:
	@echo "Starting local server on http://localhost:$(PORT) …"
	python3 -m http.server $(PORT)

stop:
	@echo "Stopping any running http.server processes…"
	- pkill -f "python3 -m http.server" || true

open:
	@python3 - <<'PY'
import webbrowser; import os
port = os.environ.get('PORT', '8000')
webbrowser.open(f'http://localhost:{port}/Website%20Updated.html')
PY
