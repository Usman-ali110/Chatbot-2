// Usage: npm run check
// Tests your .env, your Gemini key, and your MongoDB connection, and tells you what to do next.
import "dotenv/config";
import { createEmbedding, askLLM } from "../lib/ai.js";
import { getCollection, closeDb } from "../lib/db.js";

const ok = (m) => console.log("  [OK]   " + m);
const bad = (m) => console.log("  [FAIL] " + m);
const info = (m) => console.log("         " + m);
let failed = false;
const fail = (m, hint) => { failed = true; bad(m); if (hint) info("-> " + hint); };

console.log("\n1) Checking .env");
const mongo = process.env.MONGO_URI || "";
const key = process.env.GEMINI_API_KEY || "";
if (!mongo || /USERNAME:PASSWORD|xxxxx|<password>/i.test(mongo)) fail("MONGO_URI is not filled in", "Paste your real Atlas connection string (with your password) into .env");
else ok("MONGO_URI is set");
if (!key || /paste-your/i.test(key)) fail("GEMINI_API_KEY is not filled in", "Create a free key at https://aistudio.google.com/apikey and paste it into .env");
else ok("GEMINI_API_KEY is set");
const prov = (process.env.EMBED_PROVIDER || process.env.AI_PROVIDER || "openai").toLowerCase();
const chat = (process.env.CHAT_PROVIDER || process.env.AI_PROVIDER || "openai").toLowerCase();
if (prov !== "gemini" || chat !== "gemini") fail(`Provider is embed=${prov}, chat=${chat}`, "Set AI_PROVIDER=gemini in .env (and remove EMBED_PROVIDER / CHAT_PROVIDER lines)");
else ok("Provider: Gemini");

if (!failed) {
  console.log("\n2) Testing Gemini (embeddings)");
  try { const v = await createEmbedding("test"); ok(`Embedding works (${v.length} dimensions)`); }
  catch (e) { fail(e.message, /quota|429|exhausted/i.test(e.message) ? "Free limit reached. Wait a minute and try again" : /API key/i.test(e.message) ? "Re-copy the key from AI Studio" : ""); }

  console.log("\n3) Testing Gemini (chat)");
  try { const a = await askLLM("Reply with the single word: OK", ""); ok(`Chat works (reply: "${a.trim().slice(0, 40)}")`); }
  catch (e) { fail(e.message, /not found|404/i.test(e.message) ? "Model name may have changed. Set GEMINI_CHAT_MODEL in .env to a current model (https://ai.google.dev/gemini-api/docs/models)" : /quota|429|exhausted/i.test(e.message) ? "Free limit reached. Wait a minute, or set GEMINI_CHAT_MODEL=gemini-3.5-flash" : ""); }

  console.log("\n4) Testing MongoDB Atlas");
  try {
    const col = await getCollection();
    await col.db.command({ ping: 1 });
    ok("Connected to MongoDB");
    const n = await col.countDocuments();
    if (n === 0) info("Collection is empty -> run:  npm run ingest");
    else ok(`${n} knowledge chunks stored`);
    try {
      const idx = (await col.listSearchIndexes().toArray()).find((i) => i.name === (process.env.VECTOR_INDEX || "vector_index"));
      if (!idx) info("Vector index not created yet -> run:  npm run ingest");
      else if (idx.queryable) ok("Vector index is ACTIVE and ready");
      else info(`Vector index status: ${idx.status}. Wait 1-2 minutes and run this check again`);
    } catch { info("Could not read index status (check Atlas > Search Indexes manually)"); }
  } catch (e) {
    fail("MongoDB: " + e.message.split("\n")[0],
      /bad auth|authentication/i.test(e.message) ? "Wrong DB username/password in MONGO_URI"
      : /ENOTFOUND|querySrv/i.test(e.message) ? "Check the connection string host and your internet"
      : "Add your IP in Atlas > Network Access, and check MONGO_URI");
  }
}

console.log(failed ? "\nSome checks failed. Fix the [FAIL] items above, then run: npm run check\n" : "\nAll good. Next: npm run ingest  (first time), then: npm start\n");
await closeDb();
process.exit(failed ? 1 : 0);
