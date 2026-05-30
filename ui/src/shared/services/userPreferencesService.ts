const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getToken(): string | null {
  return localStorage.getItem('authToken');
}

export interface UserPreferences {
  theme: 'dark' | 'light';
}

export const userPreferencesService = {
  async get(): Promise<UserPreferences | null> {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/users/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Stale token — clear it so we don't retry on next load
        localStorage.removeItem('authToken');
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async save(theme: 'dark' | 'light'): Promise<void> {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });
    } catch {
      // silently fail — localStorage is the source of truth for the session
    }
  },
};
