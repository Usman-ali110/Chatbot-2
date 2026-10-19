// Usage: npm run ingest
// Reads knowledge.txt, embeds each chunk, stores it in MongoDB, creates the vector index.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getCollection, closeDb } from "../lib/db.js";
import { createEmbeddings } from "../lib/ai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "knowledge.txt");
const INDEX = process.env.VECTOR_INDEX || "vector_index";

// Split on blank lines; break very long blocks into ~900 character pieces
function chunk(text) {
  const out = [];
  for (const block of text.split(/\r?\n\s*\r?\n/).map(b => b.trim()).filter(Boolean)) {
    if (block.length <= 1000) { out.push(block); continue; }
    let cur = "";
    for (const s of block.split(/(?<=[.!?])\s+/)) {
      if ((cur + " " + s).length > 900 && cur) { out.push(cur.trim()); cur = s; }
      else cur += " " + s;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

async function main() {
  if (!fs.existsSync(file)) throw new Error("knowledge.txt not found");
  const chunks = chunk(fs.readFileSync(file, "utf8"));
  if (!chunks.length) throw new Error("knowledge.txt is empty");
  console.log(`Found ${chunks.length} chunks. Creating embeddings...`);

  const docs = [];
  for (let i = 0; i < chunks.length; i += 50) {
    const batch = chunks.slice(i, i + 50);
    const vectors = await createEmbeddings(batch);
    batch.forEach((content, j) => docs.push({ content, embedding: vectors[j] }));
    console.log(`  embedded ${Math.min(i + 50, chunks.length)}/${chunks.length}`);
  }

  const col = await getCollection();
  await col.deleteMany({}); // re-running replaces old data, so there are no duplicates
  await col.insertMany(docs);
  console.log(`Inserted ${docs.length} documents.`);

  // Create the Atlas vector index (recreate it if the vector size changed, e.g. after switching provider)
  try {
    const dims = docs[0].embedding.length;
    let existing = (await col.listSearchIndexes().toArray()).find((i) => i.name === INDEX);
    const oldDims = existing?.latestDefinition?.fields?.find((f) => f.path === "embedding")?.numDimensions;

    if (existing && oldDims === dims) {
      console.log(`Vector index "${INDEX}" already exists (${dims} dimensions).`);
    } else {
      if (existing) {
        console.log(`Index has ${oldDims} dimensions but your provider uses ${dims}. Recreating it...`);
        await col.dropSearchIndex(INDEX);
        for (let i = 0; i < 24 && existing; i++) { // wait up to ~2 minutes for the drop to finish
          await new Promise((r) => setTimeout(r, 5000));
          existing = (await col.listSearchIndexes().toArray()).find((x) => x.name === INDEX);
        }
      }
      await col.createSearchIndex({
        name: INDEX,
        type: "vectorSearch",
        definition: { fields: [{ type: "vector", path: "embedding", numDimensions: dims, similarity: "cosine" }] }
      });
      console.log(`Vector index "${INDEX}" created (${dims} dimensions). Wait 1-2 minutes until it shows ACTIVE in Atlas before chatting.`);
    }
  } catch (e) {
    console.log("Could not create the index automatically:", e.message);
    console.log("Create it manually in Atlas (see README, Step 6).");
  }
}

main()
  .catch(e => { console.error("ERROR:", e.message); process.exitCode = 1; })
  .finally(closeDb);
