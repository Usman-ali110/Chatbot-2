import { ref, watch } from "vue";
import { config } from "../config.js";

const STORAGE_KEY = "chatbot-messages-v1";

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function useChat() {
  const messages = ref(load());
  const loading = ref(false);

  watch(messages, (m) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m.slice(-50))); } catch {}
  }, { deep: true });

  const add = (role, content, error = false) =>
    messages.value.push({ id: crypto.randomUUID(), role, content, error, time: new Date().toISOString() });

  async function send(text) {
    text = text.trim();
    if (!text || loading.value) return;

    // The bot remembers the conversation: send previous messages (errors excluded)
    const history = messages.value.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    add("user", text);
    loading.value = true;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${config.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal
      });
      const data = await res.json();
      add("assistant", data.reply || "No reply received.", !res.ok);
    } catch {
      add("assistant", "Connection problem. Please check your internet and try again.", true);
    } finally {
      clearTimeout(timer);
      loading.value = false;
    }
  }

  function clear() {
    messages.value = [];
  }

  return { messages, loading, send, clear };
}
