import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createEmbedding, askLLM } from "./lib/ai.js";
import { semanticSearch } from "./lib/search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "20kb" }));

// Optional: allow a frontend hosted on another domain (set ALLOWED_ORIGIN in .env, e.g. https://mysite.com)
if (process.env.ALLOWED_ORIGIN) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

// Simple rate limit: 20 requests per minute per IP
const hits = new Map();
setInterval(() => hits.clear(), 60_000).unref();
function rateLimit(req, res, next) {
  const n = (hits.get(req.ip) || 0) + 1;
  hits.set(req.ip, n);
  if (n > 20) return res.status(429).json({ reply: "Too many requests. Please wait a minute." });
  next();
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim().slice(0, 1000);
    if (!message) return res.status(400).json({ reply: "Please enter a message." });

    // Keep only the last 6 valid history messages for conversational context
    const history = (Array.isArray(req.body.history) ? req.body.history : [])
      .filter(m => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string")
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }));

    const embedding = await createEmbedding(message, "query");
    const results = await semanticSearch(embedding);
    const context = results.map(r => r.content).join("\n---\n");
    const reply = await askLLM(message, context, history);

    res.json({ reply });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ reply: "Sorry, something went wrong. Please try again." });
  }
});

// Serve the React build (frontend/dist) if it exists, otherwise the plain HTML page in /public
const dist = path.join(__dirname, "frontend", "dist");
app.use(express.static(fs.existsSync(dist) ? dist : path.join(__dirname, "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Chatbot running at http://localhost:${port}`));
