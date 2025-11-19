const ML_API_BASE = window.__ENHEALTH_ML_API__ || 'http://localhost:5000/api';

const form = document.getElementById('lungCancerForm');
const loading = document.getElementById('loading');
const modal = document.getElementById('resultModal');
const recommendationModal = document.getElementById('recommendationModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const riskPercentage = document.getElementById('riskPercentage');
const closeResultButton = document.querySelector('[data-action="close-result"]');
const downloadReportButton = document.querySelector('[data-action="download-report"]');
const viewRecommendationsButton = document.querySelector('[data-action="view-recommendations"]');
const backButton = document.querySelector('[data-action="back-to-result"]');
const recTag = document.getElementById('recTag');
const recTitle = document.getElementById('recTitle');
const recSubtitle = document.getElementById('recSubtitle');
const recVideo = document.getElementById('recVideo');
const recArticleTitle = document.getElementById('recArticleTitle');
const recArticleSummary = document.getElementById('recArticleSummary');
const recArticleLink = document.getElementById('recArticleLink');

const RISK_STYLES = {
  low: {
    icon: '✅',
    border: '#4ade80',
    background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2))'
  },
  moderate: {
    icon: '⚠️',
    border: '#fbbf24',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))'
  },
  high: {
    icon: '🚨',
    border: '#ef4444',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))'
  }
};

const RECOMMENDATIONS = {
  low: {
    tag: 'Stay proactive',
    title: 'Maintain Healthy Lungs With Early Screenings',
    subtitle: 'Keep up the protective routines that earned your low risk.',
    video: 'https://www.youtube.com/embed/xz6NK51x3RE',
    article: {
      title: 'American Lung Association — Protecting Your Lungs',
      summary:
        'Covers clean air habits, exercise routines, and vaccines that keep lung tissue resilient.',
      url: 'https://www.lung.org/lung-health-diseases/wellness/protecting-your-lungs'
    }
  },
  moderate: {
    tag: 'Reduce risk',
    title: 'Action Plan for Moderate Lung Cancer Risk',
    subtitle: 'Practical ways to lower exposure and catch warning signs early.',
    video: 'https://www.youtube.com/embed/xphK53sFXQs',
    article: {
      title: 'CDC Guidance on Lung Cancer Prevention',
      summary:
        'Highlights the impact of quitting smoking, radon mitigation, and staying current with LDCT screenings.',
      url: 'https://www.cdc.gov/cancer/lung/basic_info/prevention.htm'
    }
  },
  high: {
    tag: 'Seek support',
    title: 'Understanding High Risk & When to See a Specialist',
    subtitle: 'Know the next steps and the screening tools available to you.',
    video: 'https://www.youtube.com/embed/6-DpccX0O0Q',
    article: {
      title: 'Mayo Clinic: Lung Cancer Prevention & Early Detection',
      summary:
        'Detailed overview of symptom monitoring, clinical trials, and risk-reducing behaviors.',
      url: 'https://www.mayoclinic.org/healthy-lifestyle/cancer-prevention/in-depth/lung-cancer-prevention/art-20046428'
    }
  }
};

let lastPrediction = null;

const toggleLoading = (isActive) => {
  loading.classList.toggle('active', isActive);
  form.querySelector('.submit-btn').disabled = isActive;
};

const requestPrediction = async (payload) => {
  const response = await fetch(`${ML_API_BASE}/lung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to generate prediction.');
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
    alert(error.message || 'Prediction failed. Please try again.');
  } finally {
    toggleLoading(false);
  }
});

const applyRiskStyle = (riskLevel) => {
  const config = RISK_STYLES[riskLevel] || RISK_STYLES.low;
  modalIcon.textContent = config.icon;
  riskPercentage.style.borderColor = config.border;
  riskPercentage.style.color = config.border;
  riskPercentage.style.background = config.background;
};

const formatLabel = (key) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const showResult = (result, inputs) => {
  const riskLevel = result.riskLevel || 'low';
  applyRiskStyle(riskLevel);
  const recommendationData = RECOMMENDATIONS[riskLevel] || RECOMMENDATIONS.low;

  const percent = Number.isFinite(result.probability)
    ? Math.round(result.probability * 100)
    : 0;
  riskPercentage.textContent = `${percent}%`;
  modalTitle.textContent = result.title || 'Prediction Complete';
  modalMessage.textContent = result.message || '';
  lastPrediction = {
    riskLevel,
    percent,
    title: modalTitle.textContent,
    message: modalMessage.textContent,
    inputs,
    recommendationData
  };

  const entry = {
    type: 'lung',
    timestamp: new Date().toISOString(),
    inputs,
    result: {
      riskLevel,
      probability: result.probability ?? null,
      title: modalTitle.textContent,
      message: modalMessage.textContent,
      percentage: percent,
      resources: {
        video: recommendationData.video
          ? { url: recommendationData.video, title: recommendationData.title }
          : null,
        article: recommendationData.article || null
      }
    }
  };
  if (window.EnHealthAuth?.isLoggedIn()) {
    EnHealthAuth.saveHistory(entry);
  }
  modal.classList.add('active');
};

const closeModal = () => {
  modal.classList.remove('active');
};

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
  radio.addEventListener('change', function handleChange() {
    const label = this.nextElementSibling;
    label.style.animation = 'none';
    setTimeout(() => {
      label.style.animation = '';
    }, 10);
  });
});

const downloadReport = () => {
  if (!lastPrediction) return;
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('Unable to load PDF library. Please check your internet connection and try again.');
    return;
  }
  const doc = new jsPDF();
  const { riskLevel, percent, title, message, inputs } = lastPrediction;
  const timestamp = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text('EnHealth Lung Cancer Assessment', 10, 20);
  doc.setFontSize(11);
  doc.text(`Generated: ${timestamp}`, 10, 30);
  doc.text(`Risk Level: ${riskLevel.toUpperCase()}`, 10, 40);
  doc.text(`Predicted Probability: ${percent}%`, 10, 48);
  doc.text('Summary:', 10, 60);
  doc.text(doc.splitTextToSize(message || title, 190), 10, 68);
  doc.text('Input Snapshot:', 10, 90);

  const entries = Object.entries(inputs || {});
  let y = 98;
  entries.forEach(([key, value]) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${formatLabel(key)}: ${value}`, 10, y);
    y += 8;
  });

  doc.save('lung-risk-report.pdf');
};

const openRecommendations = () => {
  if (!lastPrediction) return;
  const data = RECOMMENDATIONS[lastPrediction.riskLevel] || RECOMMENDATIONS.low;
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

const closeRecommendationModal = () => {
  recVideo.src = '';
  recommendationModal.classList.remove('active');
};

closeResultButton?.addEventListener('click', closeModal);
downloadReportButton?.addEventListener('click', downloadReport);
viewRecommendationsButton?.addEventListener('click', openRecommendations);
backButton?.addEventListener('click', () => {
  closeRecommendationModal();
  modal.classList.add('active');
});

modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

recommendationModal.addEventListener('click', (event) => {
  if (event.target === recommendationModal) {
    closeRecommendationModal();
    modal.classList.add('active');
  }
});

const ageInput = document.getElementById('age');
ageInput.addEventListener('blur', function handleBlur() {
  if (this.value && this.checkValidity()) {
    this.style.borderColor = 'rgba(74, 222, 128, 0.6)';
  } else if (this.value && !this.checkValidity()) {
    this.style.borderColor = 'rgba(239, 68, 68, 0.6)';
  }
});

ageInput.addEventListener('focus', function handleFocus() {
  this.style.borderColor = 'rgba(127, 216, 190, 0.2)';
});
