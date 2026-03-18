# AI NPC Platformer

A small browser platformer built with plain HTML, CSS, and JavaScript, with a lightweight Node server for optional AI-driven NPC dialogue.

The game mixes simple side-scrolling platforming with short character interactions. Progress is gated by two NPCs: one gives the player a key that unlocks a portal, and another hands over a pickaxe that clears a blocked path. If the AI endpoint is unavailable, the game still works with local fallback dialogue, so the core loop remains playable without any external services.

## What It Does

- Runs entirely from a single-page frontend rendered on an HTML canvas
- Uses basic physics for movement, jumping, gravity, friction, and collision
- Supports multi-room progression by moving left and right across connected levels
- Lets the player talk to NPCs with free-text responses
- Unlocks level obstacles based on conversation outcomes
- Optionally sends NPC dialogue requests to xAI's chat completions API through a local server
- Falls back to local scripted replies if the AI request fails or is not configured

## Gameplay Loop

The player moves through a sequence of compact platforming rooms. Some rooms are just traversal challenges, while others introduce an NPC who controls access to the next section.

Current progression looks like this:

1. Clear the opening platforming section.
2. Meet the bartender and ask for the key.
3. Use the unlocked portal to reach the next area.
4. Meet the miner and ask for the pickaxe.
5. Continue past the cleared rock barrier and reach the final goal.

The conversations are intentionally lightweight. The game checks the player's response for simple affirmative or negative intent, then updates inventory and world state based on that result.

## Controls

- Move: `Arrow Left` / `Arrow Right` or `A` / `D`
- Jump: `Space`
- Talk to nearby NPC: `E`
- Close dialogue: `Escape`
- Send a response: type in the input box and press `Enter`

## Running The Project

There are two ways to run it, depending on whether you want AI-backed dialogue or just the local version.

### 1. Frontend only

If you only want to play the game and do not care about live AI responses, you can open `index.html` directly in a browser. In that mode, NPC interactions still work through the built-in fallback reply system.

### 2. Local server with AI NPC replies

Run the Node server if you want the browser client to call the NPC reply API endpoint.

Requirements:

- Node.js 18 or newer
  - The server uses the built-in `fetch` API available in modern Node releases.
- An xAI API key

Set your environment variables:

```bash
export XAI_API_KEY=your_key_here
export XAI_MODEL=grok-4
```

Optional variables:

- `PORT`: server port, defaults to `3000`
- `XAI_BASE_URL`: defaults to `https://api.x.ai`
- `XAI_MODEL`: defaults to `grok-4`

Start the server:

```bash
node server.js
```

Then open:

```text
http://localhost:3000
```

## How NPC Replies Work

When the player submits dialogue, the client sends a request to `/api/npc-reply` with:

- The NPC's identity and disposition
- The player's text
- The current conversation outcome hint (`grant`, `deny`, or `neutral`)
- The current inventory state

The server builds a short system prompt and forwards the request to xAI's chat completions endpoint. Replies are constrained to short in-character responses.

If the request fails for any reason, the frontend falls back to a local response generator so the interaction still resolves cleanly.

## Project Structure

- `index.html`: page shell, HUD, canvas, and dialogue form
- `style.css`: visual styling for the frame, HUD, canvas, and dialogue panel
- `game.js`: game loop, physics, level definitions, NPC logic, inventory, and dialogue handling
- `server.js`: static file server plus the `/api/npc-reply` proxy endpoint

## Where To Edit Things

If you want to tune or expand the game, these are the main places to start:

- Level layout: edit the `levels` array in `game.js`
- Player movement: adjust the `player` object and `world` values in `game.js`
- NPC behavior and dialogue hooks: update the NPC definitions and `handlePlayerResponse()` in `game.js`
- Inventory-gated obstacles: check the portal and rock logic in `game.js`
- AI prompt behavior: update `buildSystemPrompt()` in `server.js`
- Static file handling or API routing: update `server.js`

## Notes

- There is no build step and no package manager setup in the current version.
- The server only exposes a small set of public files: `/`, `/index.html`, `/style.css`, and `/game.js`.
- The game is fully playable without an API key, but AI-generated dialogue requires the server and valid xAI credentials.
