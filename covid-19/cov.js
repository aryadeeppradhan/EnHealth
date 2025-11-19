const ML_API_BASE = window.__ENHEALTH_ML_API__ || 'http://localhost:5000/api';

const form = document.getElementById('covidForm');
const loading = document.getElementById('loading');
const modal = document.getElementById('resultModal');
const recommendationModal = document.getElementById('recommendationModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const riskBadge = document.getElementById('riskBadge');
const closeResultButton = document.querySelector('[data-action="close-result"]');
const reportButton = document.querySelector('[data-action="download-report"]');
const viewRecommendationsButton = document.querySelector('[data-action="view-recommendations"]');
const backButton = document.querySelector('[data-action="back-to-result"]');
const recTag = document.getElementById('recTag');
const recTitle = document.getElementById('recTitle');
const recSubtitle = document.getElementById('recSubtitle');
const recVideo = document.getElementById('recVideo');
const recArticleTitle = document.getElementById('recArticleTitle');
const recArticleSummary = document.getElementById('recArticleSummary');
const recArticleLink = document.getElementById('recArticleLink');

const RISK_CLASS = {
  low: 'risk-low',
  moderate: 'risk-moderate',
  high: 'risk-high'
};

const RISK_ICONS = {
  low: '✅',
  moderate: '⚠️',
  high: '🚨'
};

const RESOURCES = {
  low: {
    tag: 'Stay ready',
    title: 'Keep healthy habits to stay protected',
    subtitle: 'Continue basic precautions and regular testing when symptomatic.',
    video: 'https://www.youtube.com/embed/UlyshDdC4HM',
    article: {
      title: 'CDC COVID-19 Prevention Basics',
      summary: 'Covers vaccination, masking when needed, and how to monitor symptoms responsibly.',
      url: 'https://www.cdc.gov/coronavirus/2019-ncov/prevent-getting-sick/prevention.html'
    }
  },
  moderate: {
    tag: 'Avoid exposure',
    title: 'Precautions for Moderate COVID-19 Risk',
    subtitle: 'Limit contacts, use high-quality masks, and plan a testing schedule.',
    video: 'https://www.youtube.com/embed/iFVCJH0jlfw',
    article: {
      title: 'WHO: Preventing COVID-19 Infection',
      summary: 'World Health Organization guidance on reducing exposures and what to do when symptoms appear.',
      url: 'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public'
    }
  },
  high: {
    tag: 'Act quickly',
    title: 'What to Do When You Face High Risk',
    subtitle: 'Isolate promptly, seek medical advice, and alert close contacts.',
    video: 'https://www.youtube.com/embed/A3nO00awFmE',
    article: {
      title: 'NIH: COVID-19 Treatment Guidelines',
      summary: 'Explains antiviral options, when to seek urgent care, and how to protect others at home.',
      url: 'https://www.covid19treatmentguidelines.nih.gov/'
    }
  }
};

const toggleLoading = (isActive) => {
  loading.classList.toggle('active', isActive);
  form.querySelector('.submit-btn').disabled = isActive;
};

const requestPrediction = async (payload) => {
  const response = await fetch(`${ML_API_BASE}/covid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to score COVID-19 risk.');
  }
  return body.result;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  toggleLoading(true);
  try {
    const result = await requestPrediction(payload);
    showResult(result, payload);
  } catch (error) {
    alert(error.message || 'Unable to complete the assessment right now.');
  } finally {
    toggleLoading(false);
  }
});

const showResult = (result, inputs) => {
  const riskLevel = result.riskLevel || 'low';
  modalIcon.textContent = RISK_ICONS[riskLevel] || '✅';
  modalTitle.textContent = result.title || 'COVID-19 Risk';
  modalMessage.textContent = result.message || '';
  riskBadge.textContent = `${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)} Risk`;
  riskBadge.className = `risk-badge ${RISK_CLASS[riskLevel] || RISK_CLASS.low}`;

  const resourceData = RESOURCES[riskLevel] || RESOURCES.low;
  const entry = {
    type: 'covid',
    timestamp: new Date().toISOString(),
    inputs,
    result: {
      riskLevel,
      probability: result.probability ?? null,
      title: modalTitle.textContent,
      message: modalMessage.textContent,
      resources: {
        video: resourceData.video ? { url: resourceData.video, title: resourceData.title } : null,
        article: resourceData.article || null
      }
    }
  };
  if (window.EnHealthAuth?.isLoggedIn()) {
    EnHealthAuth.saveHistory(entry);
  }
  lastEntry = entry;
  modal.classList.add('active');
};

const closeModal = () => {
  modal.classList.remove('active');
};

const openRecommendations = (riskLevel) => {
  const data = RESOURCES[riskLevel] || RESOURCES.low;
  recTag.textContent = data.tag;
  recTitle.textContent = data.title;
  recSubtitle.textContent = data.subtitle;
  recVideo.src = `${data.video}?rel=0&modestbranding=1`;
  recArticleTitle.textContent = data.article.title;
  recArticleSummary.textContent = data.article.summary;
  recArticleLink.href = data.article.url;
  recommendationModal.classList.add('active');
  modal.classList.remove('active');
};

const closeRecommendations = () => {
  recVideo.src = '';
  recommendationModal.classList.remove('active');
};

const downloadReport = (entry) => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('Unable to load the PDF generator. Please check your connection and try again.');
    return;
  }
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text('EnHealth COVID-19 Assessment Report', 10, 20);
  doc.setFontSize(11);
  doc.text(`Generated: ${timestamp}`, 10, 30);
  doc.text(`Risk Level: ${entry.result.riskLevel.toUpperCase()}`, 10, 40);
  if (entry.result.probability !== null && entry.result.probability !== undefined) {
    doc.text(`Model Confidence: ${(entry.result.probability * 100).toFixed(1)}%`, 10, 48);
  }
  doc.text('Summary:', 10, 60);
  doc.text(doc.splitTextToSize(entry.result.message, 190), 10, 68);
  doc.text('Inputs Provided:', 10, 90);
  let y = 98;
  Object.entries(entry.inputs).forEach(([key, value]) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${key}: ${value}`, 10, y);
    y += 8;
  });
  doc.text('Recommended Resources:', 10, y + 6);
  y += 14;
  if (entry.result.resources?.video) {
    doc.text(`Video: ${entry.result.resources.video.title}`, 10, y);
    y += 8;
    doc.text(entry.result.resources.video.url, 10, y);
    y += 8;
  }
  if (entry.result.resources?.article) {
    doc.text(`Article: ${entry.result.resources.article.title}`, 10, y);
    y += 8;
    doc.text(entry.result.resources.article.url, 10, y);
  }
  doc.save('covid-risk-report.pdf');
};

let lastEntry = null;

closeResultButton?.addEventListener('click', closeModal);
reportButton?.addEventListener('click', () => {
  if (lastEntry) downloadReport(lastEntry);
});
viewRecommendationsButton?.addEventListener('click', () => {
  if (lastEntry) openRecommendations(lastEntry.result.riskLevel);
});
backButton?.addEventListener('click', () => {
  closeRecommendations();
  modal.classList.add('active');
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

recommendationModal.addEventListener('click', (event) => {
  if (event.target === recommendationModal) {
    closeRecommendations();
    modal.classList.add('active');
  }
});

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
  radio.addEventListener('change', function handleChange() {
    const label = this.nextElementSibling;
    label.style.animation = 'none';
    setTimeout(() => {
      label.style.animation = '';
    }, 10);
  });
});
