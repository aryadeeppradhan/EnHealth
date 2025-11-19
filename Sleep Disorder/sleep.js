const ML_API_BASE = window.__ENHEALTH_ML_API__ || 'http://localhost:5000/api';

const form = document.getElementById('sleepForm');
const loading = document.getElementById('loading');
const resultModal = document.getElementById('resultModal');
const recommendationModal = document.getElementById('recommendationModal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const disorderBadge = document.getElementById('disorderBadge');
const closeResultButton = document.querySelector('[data-action="close-result"]');
const recommendationButton = document.querySelector('[data-action="view-recommendations"]');
const backButton = document.querySelector('[data-action="back-to-result"]');
const recTag = document.getElementById('recTag');
const recTitle = document.getElementById('recTitle');
const recSubtitle = document.getElementById('recSubtitle');
const recVideo = document.getElementById('recVideo');
const recArticleTitle = document.getElementById('recArticleTitle');
const recArticleSummary = document.getElementById('recArticleSummary');
const recArticleLink = document.getElementById('recArticleLink');

const DISORDER_STYLES = {
  'No Sleep Disorder': {
    icon: '✅',
    badgeText: 'No Disorder Detected',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2)); border: 2px solid #4ade80; color: #4ade80;'
  },
  Insomnia: {
    icon: '😔',
    badgeText: 'Insomnia',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2)); border: 2px solid #fbbf24; color: #fbbf24;'
  },
  'Sleep Apnea': {
    icon: '😴',
    badgeText: 'Sleep Apnea',
    badgeStyle:
      'background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2)); border: 2px solid #ef4444; color: #ef4444;'
  }
};

const RECOMMENDATIONS = {
  'No Sleep Disorder': {
    tag: 'Maintain balance',
    title: 'Stay Consistent With Healthy Sleep Habits',
    subtitle: 'Small routines keep your circadian rhythm stable.',
    video: 'https://www.youtube.com/embed/t0kACis_dJE',
    article: {
      title: 'Sleep Hygiene: Habits for Restful Nights',
      summary:
        'Follow these science-backed tips from the Sleep Foundation to preserve your high-quality rest every day.',
      url: 'https://www.sleepfoundation.org/sleep-hygiene'
    }
  },
  Insomnia: {
    tag: 'Calm restless nights',
    title: 'Wind Down With Cognitive & Behavioral Strategies',
    subtitle: 'Mind-body techniques can quiet racing thoughts before bed.',
    video: 'https://www.youtube.com/embed/fGCvKQY2g_w',
    article: {
      title: 'Clinically Proven Approaches for Insomnia Relief',
      summary:
        'Mayo Clinic experts break down lifestyle tweaks and when to seek CBT-I therapy for lasting relief.',
      url: 'https://www.mayoclinic.org/diseases-conditions/insomnia/in-depth/insomnia-treatment/art-20046677'
    }
  },
  'Sleep Apnea': {
    tag: 'Breathe easier',
    title: 'Understand Sleep Apnea & Supportive Treatments',
    subtitle: 'Learn how airway support and lifestyle adjustments can help.',
    video: 'https://www.youtube.com/embed/GdhMnWU--HU',
    article: {
      title: 'Sleep Apnea Guide: Symptoms, Risks & Treatments',
      summary:
        'The American Academy of Sleep Medicine explains diagnostic tests, CPAP therapy, and day-to-day management.',
      url: 'https://sleepeducation.org/sleep-apnea/'
    }
  },
  default: {
    tag: 'Healthy sleep',
    title: 'Build Better Sleep Routines',
    subtitle: 'Daily rhythms and mindful evenings support deeper rest.',
    video: 'https://www.youtube.com/embed/gDNDlPejKr4',
    article: {
      title: 'Evidence-Based Sleep Tips',
      summary:
        'Harvard Medical School outlines core practices to keep your energy and focus sharp.',
      url: 'https://www.health.harvard.edu/staying-healthy/healthy-sleep-tips'
    }
  }
};

const toggleLoading = (isActive) => {
  loading.classList.toggle('active', isActive);
  form.querySelector('.submit-btn').disabled = isActive;
};

const requestPrediction = async (payload) => {
  const response = await fetch(`${ML_API_BASE}/sleep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'Unable to analyze your sleep data.');
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
    alert(error.message || 'Sleep analysis failed. Please try again.');
  } finally {
    toggleLoading(false);
  }
});

let lastResultLabel = null;

const showResult = (result, inputs) => {
  const label = result.label || 'No Sleep Disorder';
  const confidence = Number.isFinite(result.probability)
    ? (result.probability * 100).toFixed(1)
    : null;
  const config = DISORDER_STYLES[label] || DISORDER_STYLES['No Sleep Disorder'];
  const recommendationData = RECOMMENDATIONS[label] || RECOMMENDATIONS.default;
  lastResultLabel = label;

  modalIcon.textContent = config.icon;
  modalTitle.textContent = result.title || 'Sleep Analysis Complete';
  const message =
    (result.message || '') + (confidence ? ` Confidence: ${confidence}%` : '');
  modalMessage.textContent = message;
  disorderBadge.textContent = config.badgeText;
  disorderBadge.setAttribute('style', config.badgeStyle);

  const entry = {
    type: 'sleep',
    timestamp: new Date().toISOString(),
    inputs,
    result: {
      riskLevel: result.riskLevel || label.toLowerCase(),
      probability: result.probability ?? null,
      title: modalTitle.textContent,
      message,
      label,
      resources: {
        video: recommendationData.video
          ? {
              url: recommendationData.video,
              title: recommendationData.title
            }
          : null,
        article: recommendationData.article || null
      }
    }
  };
  if (window.EnHealthAuth?.isLoggedIn()) {
    EnHealthAuth.saveHistory(entry);
  }
  resultModal.classList.add('active');
};

const closeResultModal = () => {
  resultModal.classList.remove('active');
};

const openRecommendations = () => {
  if (!lastResultLabel) return;
  const data = RECOMMENDATIONS[lastResultLabel] || RECOMMENDATIONS.default;
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

closeResultButton?.addEventListener('click', closeResultModal);
recommendationButton?.addEventListener('click', openRecommendations);
backButton?.addEventListener('click', () => {
  closeRecommendations();
  resultModal.classList.add('active');
});

resultModal.addEventListener('click', (event) => {
  if (event.target === resultModal) {
    closeResultModal();
  }
});

recommendationModal.addEventListener('click', (event) => {
  if (event.target === recommendationModal) {
    closeRecommendations();
    resultModal.classList.add('active');
  }
});

const inputs = document.querySelectorAll('input[type="number"], select');
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

document.querySelectorAll('input[type="radio"]').forEach((radio) => {
  radio.addEventListener('change', function handleChange() {
    const label = this.nextElementSibling;
    label.style.animation = 'none';
    setTimeout(() => {
      label.style.animation = '';
    }, 10);
  });
});

const sleepQuality = document.getElementById('sleepQuality');
const stressLevel = document.getElementById('stressLevel');
const physicalActivity = document.getElementById('physicalActivity');

sleepQuality.addEventListener('input', function handleSleepQuality() {
  if (this.value < 1 || this.value > 10) {
    this.setCustomValidity('Sleep quality must be between 1 and 10');
  } else {
    this.setCustomValidity('');
  }
});

stressLevel.addEventListener('input', function handleStressLevel() {
  if (this.value < 1 || this.value > 8) {
    this.setCustomValidity('Stress level must be between 1 and 8');
  } else {
    this.setCustomValidity('');
  }
});

physicalActivity.addEventListener('input', function handlePhysicalActivity() {
  if (this.value < 10 || this.value > 100) {
    this.setCustomValidity('Physical activity level must be between 10 and 100');
  } else {
    this.setCustomValidity('');
  }
});

const systolicBP = document.getElementById('systolicBP');
const diastolicBP = document.getElementById('diastolicBP');

const validateBloodPressure = () => {
  const systolic = parseInt(systolicBP.value, 10);
  const diastolic = parseInt(diastolicBP.value, 10);

  if (systolic && diastolic && systolic <= diastolic) {
    systolicBP.setCustomValidity('Systolic BP should be higher than Diastolic BP');
    diastolicBP.setCustomValidity('Diastolic BP should be lower than Systolic BP');
  } else {
    systolicBP.setCustomValidity('');
    diastolicBP.setCustomValidity('');
  }
};

systolicBP.addEventListener('input', validateBloodPressure);
diastolicBP.addEventListener('input', validateBloodPressure);
