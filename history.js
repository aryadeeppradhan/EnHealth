document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('emptyHistory').content;

  const colors = {
    diabetes: '#f97316',
    covid: '#6366f1',
    lung: '#0ea5e9',
    sleep: '#a855f7',
    stress: '#22d3ee'
  };

  try {
    const entries = await EnHealthAuth.getHistory();
    if (!entries.length) {
      list.appendChild(empty.cloneNode(true));
      return;
    }

    entries.forEach((entry) => {
      const resources = entry.result?.resources || {};
      const hasVideo = Boolean(resources.video?.url);
      const hasArticle = Boolean(resources.article?.url);
      const resourcesHtml =
        hasVideo || hasArticle
          ? `
        <div class="history-resources">
          <p class="history-resources-title">Recommendations</p>
          <div class="history-resource-links">
            ${
              hasVideo
                ? `<a href="${resources.video.url}" target="_blank" rel="noopener">Watch video →</a>`
                : ''
            }
            ${
              hasArticle
                ? `<a href="${resources.article.url}" target="_blank" rel="noopener">${resources.article.title || 'Read article'} →</a>`
                : ''
            }
          </div>
        </div>`
          : '';
      const card = document.createElement('article');
      card.className = 'history-card';
      card.innerHTML = `
        <header>
          <span class="history-tag" style="--tag:${colors[entry.type] || '#4ade80'}">${entry.type}</span>
          <time>${new Date(entry.timestamp).toLocaleString()}</time>
        </header>
        <p class="history-title">${entry.result.title}</p>
        <p class="history-message">${entry.result.message}</p>
        ${resourcesHtml}
        <details>
          <summary>Inputs</summary>
          <ul>${Object.entries(entry.inputs).map(([k,v]) => `<li><strong>${k}</strong>: ${v}</li>`).join('')}</ul>
        </details>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    const errorCard = document.createElement('div');
    errorCard.className = 'history-empty';
    errorCard.innerHTML = `<p>${error.message || 'Unable to load history right now.'}</p>`;
    list.appendChild(errorCard);
  }
});
