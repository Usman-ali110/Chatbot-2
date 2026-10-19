<script setup>
import { ref, nextTick } from "vue";
import { config } from "../config.js";

defineProps({ disabled: Boolean });
const emit = defineEmits(["send"]);
const text = ref("");
const box = ref(null);

function resize() {
  const el = box.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function submit() {
  const value = text.value.trim();
  if (!value) return;
  emit("send", value);
  text.value = "";
  nextTick(resize);
}

function onKey(e) {
  // Enter sends, Shift+Enter makes a new line
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
  }
}

defineExpose({ focus: () => box.value?.focus() });
</script>

<template>
  <form class="input" @submit.prevent="submit">
    <textarea
      ref="box"
      v-model="text"
      rows="1"
      maxlength="1000"
      :placeholder="config.placeholder"
      aria-label="Message"
      @input="resize"
      @keydown="onKey"
    ></textarea>
    <button type="submit" :disabled="disabled || !text.trim()" aria-label="Send message">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
    </button>
  </form>
</template>

<style scoped>
.input { display: flex; align-items: flex-end; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 8px 8px 8px 16px; transition: border-color .2s, box-shadow .2s; }
.input:focus-within { border-color: var(--brand-1); box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-1) 18%, transparent); }
textarea { flex: 1; border: 0; outline: 0; resize: none; background: transparent; color: var(--text); font: inherit; font-size: 15px; line-height: 1.5; padding: 8px 0; max-height: 140px; }
textarea::placeholder { color: var(--muted); }
button { width: 42px; height: 42px; flex: none; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); transition: transform .15s, opacity .2s; }
button:hover:not(:disabled) { transform: scale(1.06); }
button:active:not(:disabled) { transform: scale(.96); }
button:disabled { opacity: .4; cursor: not-allowed; }
</style>
