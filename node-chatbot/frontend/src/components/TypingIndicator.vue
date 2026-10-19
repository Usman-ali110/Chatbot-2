<template>
  <div class="row bot">
    <div class="avatar"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z"/></svg></div>
    <div class="bubble typing" aria-label="Assistant is typing"><span></span><span></span><span></span></div>
  </div>
</template>

<style scoped>
.row { display: flex; gap: 10px; align-items: flex-end; animation: pop .25s ease; }
.avatar { width: 30px; height: 30px; flex: none; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, var(--brand-1), var(--brand-2)); }
.bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 18px 18px 18px 6px; padding: 14px 16px; display: flex; gap: 5px; }
.typing span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: bounce 1.2s infinite ease-in-out; }
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-5px); opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
</style>
