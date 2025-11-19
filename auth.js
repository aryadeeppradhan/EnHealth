(() => {
  const TOKEN_KEY = 'enHealth:token';
  const API_BASE = '/api';
  const loginUrl = new URL('/login.html', window.location.origin);

  let cachedUser = null;
  let inflightUserPromise = null;

  const getToken = () => sessionStorage.getItem(TOKEN_KEY);
  const setToken = (token) => {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  };

  const redirectToLogin = () => {
    const next = window.location.pathname + window.location.search + window.location.hash;
    const target = new URL(loginUrl.href);
    target.searchParams.set('next', next);
    window.location.replace(target);
  };

  const apiRequest = async (endpoint, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });
    } catch (networkError) {
      throw new Error('Network error. Please try again.');
    }

    let data = null;
    if (response.status !== 204) {
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
    }

    if (response.status === 401) {
      setToken(null);
      cachedUser = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Request failed');
    }

    return data;
  };

  const fetchCurrentUser = () => {
    if (!getToken()) {
      return Promise.reject(new Error('No active session'));
    }

    if (cachedUser) {
      return Promise.resolve(cachedUser);
    }

    if (!inflightUserPromise) {
      inflightUserPromise = apiRequest('/auth/me')
        .then((data) => {
          cachedUser = data;
          return data;
        })
        .finally(() => {
          inflightUserPromise = null;
        });
    }

    return inflightUserPromise;
  };

  const api = {
    async register(email, password) {
      const payload = { email, password };
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setToken(data.token);
      cachedUser = data.user;
      return data.user;
    },

    async login(email, password) {
      const payload = { email, password };
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setToken(data.token);
      cachedUser = data.user;
      return data.user;
    },

    async logout() {
      try {
        if (getToken()) {
          await apiRequest('/auth/logout', { method: 'POST' });
        }
      } catch (err) {
        console.error('Logout failed', err);
      } finally {
        cachedUser = null;
        setToken(null);
        window.location.replace(loginUrl.href);
      }
    },

    isLoggedIn() {
      return Boolean(getToken());
    },

    async getCurrentUser() {
      return fetchCurrentUser();
    },

    requireAuth() {
      if (!api.isLoggedIn()) {
        redirectToLogin();
        return;
      }

      fetchCurrentUser().catch(() => redirectToLogin());
    },

    async saveHistory(entry) {
      if (!api.isLoggedIn()) return;
      const payload = {
        type: entry.type,
        inputs: entry.inputs,
        result: entry.result
      };
      try {
        await apiRequest('/history', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Failed to save history', err);
      }
    },

    async getHistory() {
      const data = await apiRequest('/history');
      return data?.history || [];
    }
  };

  window.EnHealthAuth = api;

  document.addEventListener('DOMContentLoaded', () => {
    const isPublic = document.body.hasAttribute('data-public');
    if (!isPublic) {
      api.requireAuth();
    }

    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        api.logout();
      });
    });
  });
})();
