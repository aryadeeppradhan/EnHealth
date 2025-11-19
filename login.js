document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');
  const toggle = document.getElementById('toggleMode');
  let mode = 'login'; // or 'signup'

  toggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'signup' : 'login';
    toggle.textContent = mode === 'login' ? 'Create account instead' : 'Already have an account?';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = data.get('email').trim().toLowerCase();
    const password = data.get('password');

    status.textContent = '';

    try {
      if (mode === 'signup') {
        await EnHealthAuth.register(email, password);
      } else {
        await EnHealthAuth.login(email, password);
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || 'health.html';
      window.location.replace(next);
    } catch (err) {
      status.textContent = err.message || 'Unable to process request';
    }
  });

  if (EnHealthAuth.isLoggedIn()) {
    EnHealthAuth.getCurrentUser()
      .then(() => window.location.replace('health.html'))
      .catch(() => {
        // Ignore invalid sessions; user can log in again.
      });
  }
});
