import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Clerk's session token to every request.
// Clerk refreshes the token automatically; getToken() always returns a fresh one.
api.interceptors.request.use(async (config) => {
  try {
    const session = (window as any).Clerk?.session;
    let token: string | null = null;
    if (session) {
      // Prefer the custom 'cloudvault' template (adds email/fullName claims),
      // but fall back to the default session token if that template doesn't exist.
      try {
        token = await session.getToken({ template: 'cloudvault' });
      } catch {
        token = null;
      }
      if (!token) {
        token = await session.getToken();
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // No active session — request proceeds without auth header
  }
  return config;
});

export default api;
