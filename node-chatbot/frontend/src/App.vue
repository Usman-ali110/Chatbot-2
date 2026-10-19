<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { config } from "./config.js";
import { useChat } from "./composables/useChat.js";
import MessageBubble from "./components/MessageBubble.vue";
import TypingIndicator from "./components/TypingIndicator.vue";
import ChatInput from "./components/ChatInput.vue";

const { messages, loading, send, clear } = useChat();
const scroller = ref(null);
const input = ref(null);

// ---- light / dark theme (remembered, follows the device by default) ----
const theme = ref(localStorage.getItem("chatbot-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
watch(theme, (t) => {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("chatbot-theme", t);
}, { immediate: true });
const toggleTheme = () => (theme.value = theme.value === "dark" ? "light" : "dark");

// ---- keep the newest message in view ----
const scrollDown = () => nextTick(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: "smooth" }));
watch([() => messages.value.length, loading], scrollDown);
onMounted(() => { scrollDown(); input.value?.focus(); });
</script>

<template>
  <main class="shell">
    <section class="card">
      <header>
        <div class="who">
          <div class="logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z"/></svg>
            <i class="dot"></i>
          </div>
          <div>
            <h1>{{ config.title }}</h1>
            <p>{{ config.subtitle }}</p>
          </div>
        </div>
        <div class="actions">
          <button class="icon" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" aria-label="Toggle theme" @click="toggleTheme">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>
          </button>
          <button class="icon" title="New chat" aria-label="Start a new chat" :disabled="!messages.length" @click="clear">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
          </button>
        </div>
      </header>

      <div ref="scroller" class="messages">
        <!-- welcome message + suggestion chips -->
        <div class="welcome">
          <MessageBubble :message="{ role: 'assistant', content: config.greeting, time: new Date().toISOString() }" />
          <div v-if="!messages.length" class="chips">
            <button v-for="s in config.suggestions" :key="s" @click="send(s)">{{ s }}</button>
          </div>
        </div>

        <MessageBubble v-for="m in messages" :key="m.id" :message="m" />
        <TypingIndicator v-if="loading" />
      </div>

      <footer>
        <ChatInput ref="input" :disabled="loading" @send="send" />
        <small>{{ config.footerNote }}</small>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.shell { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
.card { width: 100%; max-width: 720px; height: min(820px, calc(100dvh - 48px)); display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--border); border-radius: 28px; box-shadow: var(--shadow); overflow: hidden; backdrop-filter: blur(18px); }
header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); background: linear-gradient(135deg, color-mix(in srgb, var(--brand-1) 12%, transparent), color-mix(in srgb, var(--brand-2) 12%, transparent)); }
.who { display: flex; align-items: center; gap: 12px; }
.logo { position: relative; width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); box-shadow: 0 8px 20px -8px var(--brand-1); }
.dot { position: absolute; right: -2px; bottom: -2px; width: 12px; height: 12px; border-radius: 50%; background: #22c55e; border: 2px solid var(--card); }
h1 { margin: 0; font-size: 16px; font-weight: 650; color: var(--text); }
header p { margin: 2px 0 0; font-size: 12.5px; color: var(--muted); }
.actions { display: flex; gap: 6px; }
.icon { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 12px; cursor: pointer; transition: background .2s, transform .15s; }
.icon:hover:not(:disabled) { background: var(--chip); transform: translateY(-1px); }
.icon:disabled { opacity: .4; cursor: not-allowed; }
.messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; scroll-behavior: smooth; }
.welcome { display: flex; flex-direction: column; gap: 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding-left: 40px; }
.chips button { font: inherit; font-size: 13.5px; padding: 9px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); cursor: pointer; transition: all .2s; }
.chips button:hover { border-color: var(--brand-1); color: var(--brand-1); transform: translateY(-2px); box-shadow: 0 8px 18px -10px var(--brand-1); }
footer { padding: 12px 20px 16px; display: flex; flex-direction: column; gap: 8px; }
small { text-align: center; font-size: 11.5px; color: var(--muted); }

@media (max-width: 640px) {
  .shell { padding: 0; }
  .card { height: 100dvh; max-width: none; border-radius: 0; border: 0; }
  .messages { padding: 14px; }
  footer { padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); }
  .chips { padding-left: 0; }
}
</style>
