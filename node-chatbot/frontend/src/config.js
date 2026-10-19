// Change these to rebrand the chatbot. Colors are in src/style.css (--brand-1, --brand-2).
export const config = {
  title: "AI Assistant",
  subtitle: "Online · replies instantly",
  greeting: "Hi there 👋 I'm your virtual assistant. Ask me anything and I'll do my best to help.",
  suggestions: [
    "What are your opening hours?",
    "How can I contact you?",
    "What is your refund policy?",
    "How long does shipping take?"
  ],
  placeholder: "Type your question…",
  footerNote: "AI can make mistakes. Please verify important information.",
  // Empty = same server (or the Vite proxy in dev). Set VITE_API_URL if the backend is hosted elsewhere.
  apiUrl: import.meta.env.VITE_API_URL || ""
};
