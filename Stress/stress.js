const ML_API_BASE = window.__ENHEALTH_ML_API__ || 'http://localhost:5000/api';

const form = document.getElementById('stressForm');
const loading = document.getElementById('loading');
const resultModal = document.getElementById('resultModal');
const recommendationModal = document.getElementById('recommendationModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const stressBadge = document.getElementById('stressBadge');
const closeResultButton = document.querySelector('[data-action="close-result"]');
const reportButton = document.querySelector('[data-action="download-report"]');
const recommendationsButton = document.querySelector('[data-action="view-recommendations"]');
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
    icon: '😊',
    badgeText: 'Low Stress',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2)); border: 2px solid #4ade80; color: #4ade80;'
  },
  moderate: {
    icon: '😐',
    badgeText: 'Moderate Stress',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2)); border: 2px solid #fbbf24; color: #fbbf24;'
  },
  high: {
    icon: '😰',
    badgeText: 'High Stress',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2)); border: 2px solid #ef4444; color: #ef4444;'
  }
};

const RECOMMENDATIONS = {
  low: {
    tag: 'Maintain calm',
    title: 'Keep Your Recharge Habits Steady',
    subtitle: 'Short mindfulness breaks and hydration can help you stay balanced.',
    video: 'https://www.youtube-nocookie.com/embed/5ddI9KWHZ6U',
    article: {
      title: 'Cleveland Clinic — Everyday Stress Relief',
      summary:
        'Practical breathing, journaling, and sleep tips to prevent stress build-up.',
      url: 'https://health.clevelandclinic.org/stress-relief-tips/'
    }
  },
  moderate: {
    tag: 'Reset & recover',
    title: 'Dial Down Moderate Stress',
    subtitle: 'Structure your day with focused work windows and restorative breaks.',
    video: 'https://www.youtube-nocookie.com/embed/KkUBtINnP5c',
    article: {
      title: 'APA — Managing Everyday Stress',
      summary:
        'Guidance from the American Psychological Association on coping skills and boundary setting.',
      url: 'https://www.apa.org/topics/stress/tips'
    }
  },
  high: {
    tag: 'Take action',
    title: 'Respond to High Stress Fast',
    subtitle: 'Use guided relaxation and reach out to your support team.',
    video: 'https://www.youtube-nocookie.com/embed/qyramLcTM30',
    article: {
      title: 'NIH — Help for Managing Stress',
      summary:
        'National Institutes of Health overview of when to seek professional care and how to recover safely.',
      url: 'https://newsinhealth.nih.gov/2015/10/coping-stress'
    }
  }
};

let lastEntry = null;

const toggleLoading = (isActive) => {
  loading.classList.toggle('active', isActive);
  form.querySelector('.submit-btn').disabled = isActive;
};

const requestPrediction = async (payload) => {
  const response = await fetch(`${ML_API_BASE}/stress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to analyze stress level.');
  }
  return body.result;
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = {
    humidity: formData.get('humidity'),
    temperature: formData.get('temperature'),
    stepCount: formData.get('stepCount'),
    sleepHours: formData.get('sleepHours'),
    waterIntake: formData.get('waterIntake'),
    screenTime: formData.get('screenTime'),
    moodLevel: formData.get('moodLevel')
  };

  toggleLoading(true);
  try {
    const result = await requestPrediction(payload);
    showResult(result, Object.fromEntries(formData.entries()));
  } catch (error) {
    alert(error.message || 'Stress analysis failed. Please try again.');
  } finally {
    toggleLoading(false);
  }
});

const showResult = (result, inputs) => {
  const riskLevel = result.riskLevel || 'moderate';
  const config = RISK_STYLES[riskLevel] || RISK_STYLES.moderate;
  modalIcon.textContent = config.icon;
  modalTitle.textContent = result.title || 'Stress Analysis Complete';
  modalMessage.textContent = result.message || '';
  stressBadge.textContent = config.badgeText;
  stressBadge.setAttribute('style', config.badgeStyle);

  const probability = Number.isFinite(result.probability)
    ? result.probability
    : null;
  const entry = {
    type: 'stress',
    timestamp: new Date().toISOString(),
    inputs,
    result: {
      riskLevel,
      probability,
      title: modalTitle.textContent,
      message: modalMessage.textContent,
      resources: {
        video: { url: RECOMMENDATIONS[riskLevel].video, title: RECOMMENDATIONS[riskLevel].title },
        article: RECOMMENDATIONS[riskLevel].article
      }
    }
  };
  if (window.EnHealthAuth?.isLoggedIn()) {
    EnHealthAuth.saveHistory(entry);
  }
  lastEntry = entry;
  resultModal.classList.add('active');
};

const closeModal = () => {
  resultModal.classList.remove('active');
};

const openRecommendations = () => {
  if (!lastEntry) return;
  const data = RECOMMENDATIONS[lastEntry.result.riskLevel] || RECOMMENDATIONS.moderate;
  recTag.textContent = data.tag;
  recTitle.textContent = data.title;
  recSubtitle.textContent = data.subtitle;
  recVideo.src = `${data.video}?rel=0&modestbranding=1`;
  recArticleTitle.textContent = data.article.title;
  recArticleSummary.textContent = data.article.summary;
  recArticleLink.href = data.article.url;
  recommendationModal.classList.add('active');
  resultModal.classList.remove('active');
};

const closeRecommendations = () => {
  recVideo.src = '';
  recommendationModal.classList.remove('active');
};

const downloadReport = () => {
  if (!lastEntry) return;
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert('Unable to load the PDF generator. Please try again once the page finishes loading.');
    return;
  }
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  doc.setFontSize(16);
  doc.text('EnHealth Stress Assessment Report', 10, 20);
  doc.setFontSize(11);
  doc.text(`Generated: ${timestamp}`, 10, 30);
  doc.text(`Stress Level: ${lastEntry.result.riskLevel.toUpperCase()}`, 10, 40);
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
  doc.text(`Video: ${lastEntry.result.resources.video.title}`, 10, y);
  y += 8;
  doc.text(lastEntry.result.resources.video.url, 10, y);
  y += 8;
  doc.text(`Article: ${lastEntry.result.resources.article.title}`, 10, y);
  y += 8;
  doc.text(lastEntry.result.resources.article.url, 10, y);
  doc.save('stress-assessment-report.pdf');
};

closeResultButton?.addEventListener('click', closeModal);
reportButton?.addEventListener('click', downloadReport);
recommendationsButton?.addEventListener('click', openRecommendations);
backButton?.addEventListener('click', () => {
  closeRecommendations();
  resultModal.classList.add('active');
});

resultModal.addEventListener('click', (event) => {
  if (event.target === resultModal) {
    closeModal();
  }
});

recommendationModal.addEventListener('click', (event) => {
  if (event.target === recommendationModal) {
    closeRecommendations();
    resultModal.classList.add('active');
  }
});

// Slider visuals
const moodLevel = document.getElementById('moodLevel');
const moodValue = document.getElementById('moodValue');

const updateMoodValueColor = (value, element) => {
  if (value >= 7) {
    element.style.background = 'rgba(74, 222, 128, 0.2)';
    element.style.color = '#4ade80';
    element.style.borderColor = 'rgba(74, 222, 128, 0.3)';
  } else if (value >= 4) {
    element.style.background = 'rgba(251, 191, 36, 0.2)';
    element.style.color = '#fbbf24';
    element.style.borderColor = 'rgba(251, 191, 36, 0.3)';
  } else {
    element.style.background = 'rgba(239, 68, 68, 0.2)';
    element.style.color = '#ef4444';
    element.style.borderColor = 'rgba(239, 68, 68, 0.3)';
  }
};

moodLevel.addEventListener('input', function () {
  moodValue.textContent = this.value;
  updateMoodValueColor(Number(this.value), moodValue);
});

window.addEventListener('DOMContentLoaded', () => {
  updateMoodValueColor(Number(moodLevel.value), moodValue);
});

const numericInputs = document.querySelectorAll('input[type="number"]');
numericInputs.forEach((input) => {
  input.addEventListener('blur', function () {
    if (this.value && this.checkValidity()) {
      this.style.borderColor = 'rgba(74, 222, 128, 0.6)';
    } else if (this.value && !this.checkValidity()) {
      this.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    }
  });

  input.addEventListener('focus', function () {
    this.style.borderColor = 'rgba(127, 216, 190, 0.2)';
  });
});
