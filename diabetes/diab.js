const ML_API_BASE = window.__ENHEALTH_ML_API__ || 'http://localhost:5000/api';

const form = document.getElementById('diabetesForm');
const loading = document.getElementById('loading');
const modal = document.getElementById('resultModal');
const recommendationModal = document.getElementById('recommendationModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
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

const RISK_ICONS = {
  low: '✅',
  moderate: '⚠️',
  high: '🚨'
};

const toggleLoading = (isActive) => {
  loading.classList.toggle('active', isActive);
  form.querySelector('.submit-btn').disabled = isActive;
};

const requestPrediction = async (payload) => {
  const response = await fetch(`${ML_API_BASE}/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Prediction failed. Please try again.');
  }
  return data.result;
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
    alert(error.message || 'Unable to process your request right now.');
  } finally {
    toggleLoading(false);
  }
});

const RESOURCES = {
  low: {
    tag: 'Keep the balance',
    title: 'Maintain Healthy Glucose Habits',
    subtitle: 'A quick refresher on diet, exercise, and lab work to stay on track.',
    video: 'https://www.youtube.com/embed/AM5MgWN5C8c',
    article: {
      title: 'CDC — Prevent Type 2 Diabetes',
      summary: 'Lifestyle changes, weight management, and routine lab work that lower future risk.',
      url: 'https://www.cdc.gov/diabetes/prevention/about/index.html'
    }
  },
  moderate: {
    tag: 'Lower your risk',
    title: 'Action Plan for Prediabetes',
    subtitle: 'Learn how to adjust meals, activity, and medication routines for better control.',
    video: 'https://www.youtube.com/embed/l5qIcj-RylA',
    article: {
      title: 'ADA: Prediabetes & Prevention',
      summary: 'American Diabetes Association roadmap for nutrition, physical activity, and monitoring.',
      url: 'https://diabetes.org/diabetes/type-2/prediabetes'
    }
  },
  high: {
    tag: 'Seek care',
    title: 'Managing High Risk of Diabetes',
    subtitle: 'Understand when to consult endocrinology and how to monitor complications.',
    video: 'https://www.youtube.com/embed/ENDc8FkjO3I',
    article: {
      title: 'Mayo Clinic: Type 2 Diabetes Management',
      summary: 'Medication options, glucose targets, and team-based care for high-risk individuals.',
      url: 'https://www.mayoclinic.org/diseases-conditions/type-2-diabetes/diagnosis-treatment/drc-20351199'
    }
  }
};

let lastEntry = null;

const showResult = (result, inputs) => {
  const riskLevel = result.riskLevel || 'low';
  modalIcon.textContent = RISK_ICONS[riskLevel] || '✅';
  modalTitle.textContent = result.title || 'Prediction Complete';

  const probability = Number.isFinite(result.probability)
    ? ` Confidence: ${(result.probability * 100).toFixed(1)}%.`
    : '';
  modalMessage.textContent = `${result.message || ''}${probability}`;

  const resourceData = RESOURCES[riskLevel] || RESOURCES.low;
  const entry = {
    type: 'diabetes',
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

const openRecommendations = () => {
  if (!lastEntry) return;
  const data = RESOURCES[lastEntry.result.riskLevel] || RESOURCES.low;
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

const downloadReport = () => {
  if (!lastEntry) return;
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('Unable to load the PDF generator. Please check your connection and try again.');
    return;
  }
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text('EnHealth Diabetes Assessment Report', 10, 20);
  doc.setFontSize(11);
  doc.text(`Generated: ${timestamp}`, 10, 30);
  doc.text(`Risk Level: ${lastEntry.result.riskLevel.toUpperCase()}`, 10, 40);
  if (lastEntry.result.probability !== null && lastEntry.result.probability !== undefined) {
    doc.text(`Model Confidence: ${(lastEntry.result.probability * 100).toFixed(1)}%`, 10, 48);
  }
  doc.text('Summary:', 10, 60);
  doc.text(doc.splitTextToSize(lastEntry.result.message, 190), 10, 68);
  doc.text('Inputs Provided:', 10, 90);
  let y = 98;
  Object.entries(lastEntry.inputs).forEach(([key, value]) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${key}: ${value}`, 10, y);
    y += 8;
  });
  doc.text('Recommended Resources:', 10, y + 6);
  y += 14;
  if (lastEntry.result.resources?.video) {
    doc.text(`Video: ${lastEntry.result.resources.video.title}`, 10, y);
    y += 8;
    doc.text(lastEntry.result.resources.video.url, 10, y);
    y += 8;
  }
  if (lastEntry.result.resources?.article) {
    doc.text(`Article: ${lastEntry.result.resources.article.title}`, 10, y);
    y += 8;
    doc.text(lastEntry.result.resources.article.url, 10, y);
  }
  doc.save('diabetes-risk-report.pdf');
};

closeResultButton?.addEventListener('click', closeModal);
downloadReportButton?.addEventListener('click', downloadReport);
viewRecommendationsButton?.addEventListener('click', openRecommendations);
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

const inputs = document.querySelectorAll('input, select');
inputs.forEach((input) => {
  input.addEventListener('blur', function handleBlur() {
    if (this.value && this.checkValidity()) {
      this.style.borderColor = 'rgba(74, 222, 128, 0.6)';
    } else if (this.value && !this.checkValidity()) {
      this.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    }
  });

  input.addEventListener('focus', function handleFocus() {
    this.style.borderColor = 'rgba(127, 216, 190, 0.2)';
  });
});
