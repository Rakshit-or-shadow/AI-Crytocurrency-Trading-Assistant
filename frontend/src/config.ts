// Address of the FastAPI backend. Set VITE_API_URL (frontend/.env locally, Vercel project settings in production).
// A trailing slash is removed so `${API_URL}/price/Bitcoin` is always well formed.
export const API_URL: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

// True when a backend address has been configured.
export const API_CONFIGURED: boolean = API_URL !== "";

export const GITHUB_URL = "https://github.com/Rakshit-or-shadow/AI-Crytocurrency-Trading-Assistant";
