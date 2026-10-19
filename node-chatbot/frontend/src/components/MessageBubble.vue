<script setup>
import { computed } from "vue";
import { renderMarkdown, formatTime } from "../utils/format.js";

const props = defineProps({ message: { type: Object, required: true } });
const isUser = computed(() => props.message.role === "user");
const html = computed(() => renderMarkdown(props.message.content));
</script>

<template>
  <div class="row" :class="isUser ? 'user' : 'bot'">
    <div v-if="!isUser" class="avatar">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z"/></svg>
    </div>
    <div class="col">
      <!-- user text is shown as plain text; bot text is escaped then formatted (see utils/format.js) -->
      <div v-if="isUser" class="bubble">{{ message.content }}</div>
      <div v-else class="bubble" :class="{ error: message.error }" v-html="html"></div>
      <time>{{ formatTime(message.time) }}</time>
    </div>
  </div>
</template>

<style scoped>
.row { display: flex; gap: 10px; align-items: flex-end; animation: pop .25s ease; }
.row.user { flex-direction: row-reverse; }
.avatar { width: 30px; height: 30px; flex: none; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); }
.col { display: flex; flex-direction: column; gap: 4px; max-width: min(82%, 520px); }
.user .col { align-items: flex-end; }
.bubble { padding: 11px 15px; line-height: 1.5; font-size: 15px; word-wrap: break-word; overflow-wrap: anywhere; white-space: pre-wrap; }
.bot .bubble { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 18px 18px 18px 6px; white-space: normal; }
.user .bubble { background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); color: #fff; border-radius: 18px 18px 6px 18px; box-shadow: 0 6px 16px -6px var(--brand-1); }
.bubble.error { border-color: #f87171; background: color-mix(in srgb, #ef4444 10%, var(--surface)); }
time { font-size: 11px; color: var(--muted); padding: 0 4px; }
.bubble :deep(p) { margin: 0 0 8px; }
.bubble :deep(p:last-child), .bubble :deep(ul:last-child), .bubble :deep(ol:last-child) { margin-bottom: 0; }
.bubble :deep(ul), .bubble :deep(ol) { margin: 0 0 8px; padding-left: 20px; }
.bubble :deep(code) { background: var(--chip); padding: 2px 6px; border-radius: 6px; font-size: .9em; }
.bubble :deep(a) { color: var(--brand-1); text-decoration: underline; }
@keyframes pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
