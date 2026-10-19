// Talks to the AI providers you choose in .env.
//
//   AI_PROVIDER=openai | gemini | ollama | groq | compatible     (used for both jobs)
// Optional: use different providers for the two jobs
//   EMBED_PROVIDER=...   (turns text into vectors, used by ingest + search)
//   CHAT_PROVIDER=...    (writes the final answer)
//
// IMPORTANT: EMBED_PROVIDER must be the same for `npm run ingest` and `npm start`.
// CHAT_PROVIDER can be changed at any time without re-ingesting.

const embedProvider = () => (process.env.EMBED_PROVIDER || process.env.AI_PROVIDER || "openai").toLowerCase();
const chatProvider = () => (process.env.CHAT_PROVIDER || process.env.AI_PROVIDER || "openai").toLowerCase();

async function http(label, url, body, headers = {}) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body)
    });
  } catch (e) {
    throw new Error(`${label}: cannot connect to ${new URL(url).host} (${e.cause?.code || e.cause?.errors?.[0]?.code || e.message})`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : data?.error?.message;
    throw new Error(`${label} error: ${msg || res.status}`);
  }
  return data;
}

const need = (name) => {
  if (!process.env[name]) throw new Error(`${name} is missing in .env`);
  return process.env[name];
};

// Settings for every provider that speaks the "OpenAI format"
function openaiStyle(p) {
  const e = process.env;
  if (p === "groq")
    return {
      label: "Groq",
      base: e.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      key: () => need("GROQ_API_KEY"),
      chatModel: e.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
      embedModel: null // Groq has no embeddings
    };
  if (p === "compatible")
    return {
      label: "Compatible API",
      base: need("COMPAT_BASE_URL"),
      key: () => need("COMPAT_API_KEY"),
      chatModel: need("COMPAT_CHAT_MODEL"),
      embedModel: e.COMPAT_EMBED_MODEL || null
    };
  return {
    label: "OpenAI",
    base: "https://api.openai.com/v1",
    key: () => need("OPENAI_API_KEY"),
    chatModel: e.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    embedModel: e.OPENAI_EMBED_MODEL || "text-embedding-3-small"
  };
}

// ---------- EMBEDDINGS ----------
// type: "document" (when ingesting) or "query" (when a user asks a question)
export async function createEmbeddings(texts, type = "document") {
  const p = embedProvider();

  if (p === "gemini") {
    const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    const model = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
    const dims = Number(process.env.GEMINI_EMBED_DIMS || 768);
    const data = await http(
      "Gemini",
      `${base}/v1beta/models/${model}:batchEmbedContents`,
      {
        requests: texts.map((t) => ({
          model: `models/${model}`,
          content: { parts: [{ text: t }] },
          taskType: type === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          outputDimensionality: dims
        }))
      },
      { "x-goog-api-key": need("GEMINI_API_KEY") }
    );
    return data.embeddings.map((x) => x.values);
  }

  if (p === "ollama") {
    const base = process.env.OLLAMA_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
    const prefix = model.includes("nomic") ? (type === "query" ? "search_query: " : "search_document: ") : "";
    const data = await http("Ollama", `${base}/api/embed`, { model, input: texts.map((t) => prefix + t) });
    return data.embeddings;
  }

  const o = openaiStyle(p);
  if (!o.embedModel)
    throw new Error(
      `${o.label} cannot create embeddings. Set EMBED_PROVIDER=gemini (free) or ollama (free) in .env, and keep CHAT_PROVIDER=${p}.`
    );
  const data = await http(o.label, `${o.base}/embeddings`, { model: o.embedModel, input: texts }, { Authorization: `Bearer ${o.key()}` });
  return data.data.map((d) => d.embedding);
}

export async function createEmbedding(text, type = "query") {
  return (await createEmbeddings([text], type))[0];
}

// ---------- CHAT ----------
function systemPrompt(context) {
  const name = process.env.BOT_NAME || "Assistant";
  return `You are ${name}, a helpful AI assistant.
Answer ONLY using the context below. If the answer is not in the context, say you don't have that information and suggest contacting the team directly. Never invent facts. Keep answers short and clear.

<context>
${context || "(no relevant information found)"}
</context>`;
}

export async function askLLM(userMessage, context, history = []) {
  const p = chatProvider();
  const system = systemPrompt(context);

  if (p === "gemini") {
    const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    const model = process.env.GEMINI_CHAT_MODEL || "gemini-3.1-flash-lite";
    const data = await http(
      "Gemini",
      `${base}/v1beta/models/${model}:generateContent`,
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [...history, { role: "user", content: userMessage }].map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        })),
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      },
      { "x-goog-api-key": need("GEMINI_API_KEY") }
    );
    const text = (data.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("");
    if (!text) throw new Error("Gemini returned an empty answer");
    return text;
  }

  if (p === "ollama") {
    const base = process.env.OLLAMA_URL || "http://localhost:11434";
    const data = await http("Ollama", `${base}/api/chat`, {
      model: process.env.OLLAMA_CHAT_MODEL || "llama3.2",
      stream: false,
      options: { temperature: 0.2 },
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: userMessage }]
    });
    return data.message.content;
  }

  const o = openaiStyle(p); // openai, groq, compatible
  const data = await http(
    o.label,
    `${o.base}/chat/completions`,
    {
      model: o.chatModel,
      temperature: 0.2,
      max_tokens: 500,
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: userMessage }]
    },
    { Authorization: `Bearer ${o.key()}` }
  );
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${o.label} returned an empty answer`);
  return text;
}
