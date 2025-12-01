# Running the Game Locally

Due to browser security (CORS), you need to run a local server instead of opening the HTML file directly.

## Option 1: Python Server (Recommended)

```bash
cd chaos-design-agency-game
python3 server.py
```

Then open: http://localhost:8000

## Option 2: Python Simple Server

```bash
cd chaos-design-agency-game
python3 -m http.server 8000
```

Then open: http://localhost:8000

## Option 3: Node.js (if you have it)

```bash
cd chaos-design-agency-game
npx http-server -p 8000
```

Then open: http://localhost:8000

## Option 4: VS Code Live Server

If you're using VS Code, install the "Live Server" extension and right-click on `index.html` → "Open with Live Server"


