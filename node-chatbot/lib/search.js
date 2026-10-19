import { getCollection } from "./db.js";

// Finds the most relevant knowledge chunks for a question embedding
export async function semanticSearch(embedding, limit = 5) {
  const col = await getCollection();
  const minScore = Number(process.env.MIN_SCORE || 0.3);
  const results = await col
    .aggregate([
      {
        $vectorSearch: {
          index: process.env.VECTOR_INDEX || "vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: 100,
          limit
        }
      },
      { $project: { _id: 0, content: 1, score: { $meta: "vectorSearchScore" } } }
    ])
    .toArray();
  return results.filter(r => r.score >= minScore);
}
