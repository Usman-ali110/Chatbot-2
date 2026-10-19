# Node.js AI Chatbot (MongoDB Atlas Vector Search + OpenAI)

Same design as the PHP version, rewritten in Node.js:

| PHP file        | Node equivalent             |
|-----------------|-----------------------------|
| config.php      | .env                        |
| embeddings.php  | lib/ai.js                   |
| search.php      | lib/search.js, lib/db.js    |
| llm.php         | lib/ai.js (askLLM)      |
| chat.php        | server.js (POST /api/chat)  |
| index.html      | public/index.html           |
| (missing)       | scripts/ingest.js           |

---

## QUICK START (Gemini only)
1. Install Node.js LTS (https://nodejs.org), then in this folder run: `npm install`
2. Open the `.env` file and fill in two values:
   - `MONGO_URI` (Atlas connection string, see Step 2 below)
   - `GEMINI_API_KEY` (free key from https://aistudio.google.com/apikey)
3. `npm run check`   (tests your keys and database, tells you exactly what to fix)
4. `npm run ingest`  (loads knowledge.txt; wait 1-2 minutes for the Atlas index to be ACTIVE)
5. `npm start`       (open http://localhost:3000)

---

## STEP 1: Install Node.js
1. Go to https://nodejs.org and download the **LTS** version (18 or newer).
2. Install it (accept defaults).
3. Open a new terminal (Command Prompt / PowerShell on Windows, Terminal on Mac/Linux) and check:
   ```
   node -v
   npm -v
   ```
   Both should print version numbers.

## STEP 2: Create a free MongoDB Atlas database
1. Sign up at https://cloud.mongodb.com
2. Click **Create** > choose the free **M0** cluster > pick a nearby region > Create.
3. **Database Access** (left menu) > Add New Database User > choose username + password > save them.
   Avoid special characters in the password (or URL-encode them).
4. **Network Access** > Add IP Address > "Add Current IP Address" (or 0.0.0.0/0 for testing only).
5. **Database** > Connect > **Drivers** > copy the connection string. It looks like:
   `mongodb+srv://USERNAME:<password>@cluster0.xxxxx.mongodb.net/...`
   Replace `<password>` with your real password.

## STEP 3: Get an OpenAI API key
1. Go to https://platform.openai.com/api-keys > Create new secret key.
2. Copy it (you only see it once). Make sure the account has billing/credit enabled.

## STEP 4: Set up the project
In the terminal, go into this folder:
```
cd node-chatbot
npm install
```
Create your settings file:
- Mac/Linux: `cp .env.example .env`
- Windows: `copy .env.example .env`

Open `.env` in a text editor and fill in:
```
MONGO_URI=your connection string from Step 2
OPENAI_API_KEY=your key from Step 3
```
Never share `.env` or upload it to GitHub (.gitignore already blocks it).

## STEP 5: Add your knowledge
Edit `knowledge.txt`. Write facts about your organization.
**Separate each topic with a blank line**, each block becomes one searchable chunk.

Then load it into the database:
```
npm run ingest
```
You should see "Inserted N documents" and "Vector index created".

## STEP 6: Wait for the vector index (important)
1. In Atlas go to **Database > Browse Collections > chatbot > knowledge > Search Indexes** tab
   (or the **Atlas Search** page in the left menu).
2. Wait until `vector_index` status is **ACTIVE** (1-2 minutes).

If the script could not create it automatically, create it manually:
Search Indexes > Create Search Index > **Atlas Vector Search** > JSON Editor >
database `chatbot`, collection `knowledge`, index name `vector_index`, paste:
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" }
  ]
}
```

## STEP 7: Run the chatbot
```
npm start
```
Open http://localhost:3000 and ask: "What are your opening hours?"

For development with auto-restart on file changes: `npm run dev`

## Updating the knowledge later
Edit `knowledge.txt` and run `npm run ingest` again (old data is replaced). No restart needed.

---

## Troubleshooting
| Problem | Fix |
|---|---|
| `MONGO_URI is missing` | `.env` not created or in the wrong folder. It must sit next to package.json |
| `bad auth` / authentication failed | Wrong DB username or password in MONGO_URI |
| Connection timeout / `ECONNREFUSED` / server selection error | Your IP is not in Atlas Network Access |
| `OpenAI error: Incorrect API key` | Wrong key in .env |
| `OpenAI error: ...quota` | Add billing/credit in your OpenAI account |
| Bot says "I don't have that information" for everything | Index not ACTIVE yet, ingest not run, or lower MIN_SCORE in .env to 0.2 |
| Page shows but replies fail | Look at the terminal where `npm start` runs. The real error is printed there |
| `Cannot find package` | Run `npm install` inside the project folder |

## Put it online (deployment)
Use any Node host (Render, Railway, Fly.io, a VPS):
1. Push the code to GitHub (without .env).
2. Create a new Web Service, build command `npm install`, start command `npm start`.
3. Add MONGO_URI and OPENAI_API_KEY as **environment variables** in the host's dashboard.
4. In Atlas Network Access, allow the host's IP (or 0.0.0.0/0).

## Security notes
- API keys live only in `.env` / host environment variables, never in front-end code.
- The chat page uses `textContent`, so user text can't inject HTML/scripts.
- Built-in rate limit: 20 messages/minute per IP. Adjust in server.js.

---

## FREE API KEYS: how to attach them (recommended setup)
OpenAI has no free API key. These services do, and they work with this project:

| Job | Free service | Get the key | Line in `.env` |
|---|---|---|---|
| Understand your documents (embeddings) | Google Gemini | https://aistudio.google.com/apikey | `GEMINI_API_KEY=...` |
| Write the answers (chat) | Groq | https://console.groq.com/keys | `GROQ_API_KEY=...` |

**Steps**
1. Create both keys (sign in with Google/GitHub, click "Create API key", copy it).
2. Open your `.env` file and set exactly these lines (replace the keys):
   ```
   EMBED_PROVIDER=gemini
   CHAT_PROVIDER=groq
   GEMINI_API_KEY=paste-gemini-key-here
   GROQ_API_KEY=paste-groq-key-here
   ```
   Delete or ignore any old `AI_PROVIDER` / `OPENAI_API_KEY` lines.
3. Run `npm run ingest`, wait until the index is ACTIVE in Atlas, then `npm start`.

**Rules**
- `EMBED_PROVIDER` must stay the same for ingest and for running the bot. If you change it, run `npm run ingest` again.
- `CHAT_PROVIDER` can be changed any time, no re-ingest needed.
- Groq cannot create embeddings, so it must be paired with Gemini or Ollama for `EMBED_PROVIDER`.
- Keys go ONLY in `.env`. Never paste them into code, screenshots, or GitHub.

**Any other free key (OpenRouter, Mistral, Cerebras, ...)**
Most services use the same request format as OpenAI. Attach one with:
```
CHAT_PROVIDER=compatible
COMPAT_BASE_URL=https://openrouter.ai/api/v1
COMPAT_API_KEY=your-key
COMPAT_CHAT_MODEL=model-name-from-that-service
```
Take the base URL and model name from that service's docs. Free models and limits change often.

---

## NO OPENAI CREDIT? Use a free provider instead
The project supports three providers. Pick one in `.env` with `AI_PROVIDER`.
**Use the same provider for `npm run ingest` and `npm start`.** If you change provider later, just run `npm run ingest` again (the index is rebuilt automatically because each provider uses a different vector size).

### Option A: Google Gemini (free, no credit card)
1. Go to https://aistudio.google.com/apikey and create an API key.
2. In `.env` set:
   ```
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-key
   ```
3. Run `npm run ingest`, wait for the index to be ACTIVE, then `npm start`.

Free-tier limits are small and change often (per model, per minute and per day).
If you see `429` / `RESOURCE_EXHAUSTED`, wait a minute, or set another model in `.env`, e.g. `GEMINI_CHAT_MODEL=gemini-3.5-flash`.
If you see "model not found", model names changed: pick a current one at https://ai.google.dev/gemini-api/docs/models

### Option B: Ollama (100% free, runs on your PC, works offline)
1. Install Ollama from https://ollama.com/download (Windows installer).
2. Open a terminal and download the two models (one time, a few GB):
   ```
   ollama pull nomic-embed-text
   ollama pull llama3.2
   ```
3. In `.env` set `AI_PROVIDER=ollama` (no key needed). Make sure Ollama is running (it starts with Windows).
4. Run `npm run ingest`, then `npm start`.

Answers are slower and a little less polished than cloud models, and need roughly 8 GB RAM.

### Option C: OpenAI (paid)
Add credit at https://platform.openai.com/settings/organization/billing and set `AI_PROVIDER=openai`.
The minimum top-up is about $5, which lasts a very long time for a small chatbot.

### Extra troubleshooting for providers
| Problem | Fix |
|---|---|
| `OpenAI error: You have no credits remaining` | Add credit, or switch to Gemini/Ollama |
| `GEMINI_API_KEY is missing` | Add it to `.env` and make sure `AI_PROVIDER=gemini` (or `EMBED_PROVIDER=gemini`) |
| `GROQ_API_KEY is missing` | Add it to `.env` (key starts with `gsk_`) |
| `Groq error: ... model ... decommissioned / not found` | Set `GROQ_CHAT_MODEL` to a current free model from console.groq.com/docs/models |
| `Groq cannot create embeddings` | Set `EMBED_PROVIDER=gemini` (or ollama) |
| `Gemini error: ... API key not valid` | Re-copy the key from AI Studio |
| `Ollama: cannot connect to localhost:11434` | Start Ollama, and check you ran both `ollama pull` commands |
| Answers are wrong or empty after switching provider | Run `npm run ingest` again so the data matches the new provider |

---

## FRONTEND (Vue 3 + Vite, folder `frontend/`)
Modern chat UI: light/dark mode, suggestion chips, typing animation, Enter to send (Shift+Enter = new line), conversation remembered after reload, "new chat" button, mobile friendly.

**Development** (two terminals)
1. Terminal 1, in the project folder: `npm start`
2. Terminal 2: `cd frontend`, `npm install`, `npm run dev`, then open http://localhost:5173

**Production**
`cd frontend`, `npm install`, `npm run build`. The Node server then serves `frontend/dist` automatically at http://localhost:3000. (If `frontend/dist` is missing, it falls back to `public/index.html`.)

**Customize**
| What | Where |
|---|---|
| Title, subtitle, greeting, suggested questions, placeholder | `frontend/src/config.js` |
| Brand colors, light/dark palette | top of `frontend/src/style.css` (`--brand-1`, `--brand-2`) |
| Layout and header | `frontend/src/App.vue` |
| Message bubbles | `frontend/src/components/MessageBubble.vue` |
| Backend call (history, timeout) | `frontend/src/composables/useChat.js` |

**API contract** (so you can use any frontend)
```
POST /api/chat
Request : { "message": "What are your hours?", "history": [ { "role": "user"|"assistant", "content": "..." } ] }
Response: { "reply": "We are open 9am to 6pm..." }
```

**Frontend hosted on a different domain** (e.g. Vercel + backend on Render)
1. Backend `.env`: `ALLOWED_ORIGIN=https://your-frontend-domain.com`
2. Frontend `frontend/.env`: `VITE_API_URL=https://your-backend-domain.com`
