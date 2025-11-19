(() => {
  const USERS_KEY = 'enHealth:users';
  const SESSION_KEY = 'enHealth:session';
  const scriptSrc = document.currentScript?.src || new URL('auth.js', window.location.href).href;
  const loginUrl = new URL('login.html', scriptSrc);

  const readUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const writeUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const assertLoggedIn = () => {
    const email = sessionStorage.getItem(SESSION_KEY);
    if (!email) throw new Error('Not authenticated');
    return email;
  };

  const api = {
    register(email, password) {
      const users = readUsers();
      if (users[email]) throw new Error('Account already exists');
      users[email] = { password, createdAt: new Date().toISOString(), history: [] };
      writeUsers(users);
      sessionStorage.setItem(SESSION_KEY, email);
    },

    login(email, password) {
      const users = readUsers();
      const user = users[email];
      if (!user) throw new Error('Account not found');
      if (user.password !== password) throw new Error('Wrong password');
      sessionStorage.setItem(SESSION_KEY, email);
    },

    logout() {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace(loginUrl.href);
    },

    isLoggedIn() {
      return Boolean(sessionStorage.getItem(SESSION_KEY));
    },

    getCurrentUser() {
      const email = sessionStorage.getItem(SESSION_KEY);
      if (!email) return null;
      const users = readUsers();
      const user = users[email];
      return user ? { email, ...user } : null;
    },

    requireAuth() {
      if (!api.isLoggedIn()) {
        const next = window.location.pathname + window.location.search + window.location.hash;
        const target = new URL(loginUrl.href);
        target.searchParams.set('next', next);
        window.location.replace(target);
      }
    },

    saveHistory(entry) {
      const email = assertLoggedIn();
      const users = readUsers();
      const user = users[email];
      user.history = [entry, ...(user.history || [])].slice(0, 50);
      writeUsers(users);
    },

    getHistory() {
      const email = assertLoggedIn();
      const user = readUsers()[email];
      return user?.history || [];
    }
  };

  window.EnHealthAuth = api;

  document.addEventListener('DOMContentLoaded', () => {
    const isPublic = document.body.hasAttribute('data-public');
    if (!isPublic) {
      try {
        api.requireAuth();
      } catch {
        return;
      }
    }

    const logoutButtons = document.querySelectorAll('[data-action=\"logout\"]');
    logoutButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        api.logout();
      });
    });
  });
})();
