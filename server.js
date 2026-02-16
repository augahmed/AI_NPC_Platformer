const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || "grok-4";
const XAI_BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai";

const publicFiles = new Set(["/", "/index.html", "/style.css", "/game.js"]);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = "text/plain") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function buildSystemPrompt(npc, outcome, inventory) {
  const disposition = npc?.disposition || "friendly and neutral";
  const name = npc?.name || "NPC";
  const inventoryLines = Object.entries(inventory || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return [
    `You are ${name}, an NPC in a 2D platformer.`,
    `Disposition: ${disposition}.`,
    `Outcome hint: ${outcome}.`,
    `Player inventory: ${inventoryLines || "none"}.`,
    "Reply in 1-2 short sentences, in character, no emojis.",
  ].join(" ");
}

async function callGrok({ npc, playerText, outcome, inventory }) {
  if (!XAI_API_KEY) {
    throw new Error("Missing XAI_API_KEY");
  }

  const payload = {
    model: XAI_MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(npc, outcome, inventory),
      },
      {
        role: "user",
        content: playerText,
      },
    ],
    temperature: 0.7,
    max_tokens: 120,
  };

  const response = await fetch(`${XAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const reply =
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    data?.response ||
    "";

  return reply.trim();
}

function getMimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "text/javascript";
  return "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/npc-reply") {
    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const reply = await callGrok(payload);
      return sendJson(res, 200, { reply });
    } catch (err) {
      return sendJson(res, 500, { error: err.message || "Server error" });
    }
  }

  if (req.method !== "GET") {
    return sendText(res, 405, "Method Not Allowed");
  }

  if (!publicFiles.has(url.pathname)) {
    return sendText(res, 404, "Not Found");
  }

  const safePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(__dirname, safePath);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      return sendText(res, 500, "Server error");
    }
    res.writeHead(200, { "Content-Type": getMimeType(filePath) });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
