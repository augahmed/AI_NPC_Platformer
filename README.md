# Simple HTML Platformer with NPCs

Open `index.html` in a browser to play (offline mode). For Grok-powered NPC replies, run the local server.

Controls:
- Move: Arrow keys or A/D
- Jump: Space
- Talk: E (when close to an NPC)
- Respond: type a message and press Enter

What to tweak:
- Levels, NPCs, portal, and rock obstacles are in `game.js`.
- Gravity, jump height, and speed are set in the `world` and `player` objects.

Grok API (local server):
1. Set `XAI_API_KEY` in your shell.
2. Optional: set `XAI_MODEL` (defaults to `grok-4`).
3. Run the server:
   - `node server.js`
4. Open `http://localhost:3000` in a browser.

Items:
- The bartender offers a key to unlock the portal in level 2.
- The miner offers a pickaxe to clear the rock in level 4.
