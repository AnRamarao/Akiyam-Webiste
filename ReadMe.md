## Aikyam — Menifee (Static Site)

This site is a single-page static app powered by HTML/CSS/vanilla JS. All lists (core team, board, vendors, events) are loaded from JSON at runtime. Serve over HTTP for fetch() to work.

### Quick start
- Start local server: python3 -m http.server 8000
- Open: http://localhost:8000/Website%20Updated.html
- Stop server: pkill -f "python3 -m http.server"

Or use the Makefile:
- make serve        # start on PORT=8000 (override via PORT=XXXX)
- make stop         # stop any running http.server
- make open         # open the page in your default browser

### Data files
All content lives under ./data and is fetched at runtime:
- data/coreTeam.json
- data/boardMembers.json
- data/vendors.json
- data/upcomingEvents.json
- data/completedEvents.json

If deploying under a subpath, ensure relative paths remain ./data/*.json from the HTML page location.

### Notes
- For local testing, avoid opening the HTML file directly in the browser (file://). Use the server above so fetch() can load JSON.
- Each section shows a lightweight loading hint and renders as soon as its data arrives (no full-page blocking spinner).

### Troubleshooting
- Port already in use: either change PORT or stop the existing server.
- JSON not loading: verify the path and that you’re serving over HTTP (not file://).
