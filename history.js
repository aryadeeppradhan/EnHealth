document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('emptyHistory').content;

  const entries = EnHealthAuth.getHistory();
  if (!entries.length) {
    list.appendChild(empty.cloneNode(true));
    return;
  }

  const colors = {
    diabetes: '#f97316',
    covid: '#6366f1',
    lung: '#0ea5e9',
    sleep: '#a855f7'
  };

  entries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'history-card';
    card.innerHTML = `
      <header>
        <span class="history-tag" style="--tag:${colors[entry.type] || '#4ade80'}">${entry.type}</span>
        <time>${new Date(entry.timestamp).toLocaleString()}</time>
      </header>
      <p class="history-title">${entry.result.title}</p>
      <p class="history-message">${entry.result.message}</p>
      <details>
        <summary>Inputs</summary>
        <ul>${Object.entries(entry.inputs).map(([k,v]) => `<li><strong>${k}</strong>: ${v}</li>`).join('')}</ul>
      </details>
    `;
    list.appendChild(card);
  });
});
