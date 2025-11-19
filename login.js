document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');
  const toggle = document.getElementById('toggleMode');
  let mode = 'login'; // or 'signup'

  toggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'signup' : 'login';
    toggle.textContent = mode === 'login' ? 'Create account instead' : 'Already have an account?';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const email = data.get('email').trim().toLowerCase();
    const password = data.get('password');

    try {
      if (mode === 'signup') {
        EnHealthAuth.register(email, password);
      } else {
        EnHealthAuth.login(email, password);
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || 'health.html';
      window.location.replace(next);
    } catch (err) {
      status.textContent = err.message;
    }
  });

  if (EnHealthAuth.isLoggedIn()) {
    window.location.replace('health.html');
  }
});
