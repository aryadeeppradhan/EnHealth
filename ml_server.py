"""Flask service that exposes prediction endpoints for EnHealth."""
from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
CORS(app)


def load_model(relative_path: str):
  """Load a pickled scikit-learn model that lives under the project root."""
  model_path = BASE_DIR / relative_path
  if not model_path.exists():
    raise FileNotFoundError(f"Missing model file: {model_path}")
  return joblib.load(model_path)


diabetes_model = load_model("diabetes/diabetes.pkl")
lung_model = load_model("lung cancer/lungs.pkl")
covid_model = load_model("covid-19/covid.pkl")
sleep_model = load_model("Sleep Disorder/sleep2.pkl")

DIABETES_FEATURES: List[str] = diabetes_model.feature_names_in_.tolist()
DIABETES_POS_INDEX = list(diabetes_model.classes_).index("1")

LUNG_FEATURES: List[str] = lung_model.feature_names_in_.tolist()
LUNG_POS_INDEX = list(lung_model.classes_).index(1)

COVID_FEATURES: List[str] = covid_model.feature_names_in_.tolist()
COVID_POS_INDEX = list(covid_model.classes_).index(1)

SLEEP_FEATURES: List[str] = sleep_model.feature_names_in_.tolist()
SLEEP_CLASS_LABELS = {0: "Insomnia", 1: "No Sleep Disorder", 2: "Sleep Apnea"}
SLEEP_CLASS_INDEX = {int(value): idx for idx, value in enumerate(sleep_model.classes_)}

YES_VALUES = {"yes", "true", "1", "y"}
NO_VALUES = {"no", "false", "0", "n"}


def parse_yes_no(value: str | int | None, field: str) -> int:
  if value is None:
    raise ValueError(f"{field} is required")
  normalized = str(value).strip().lower()
  if normalized in YES_VALUES:
    return 1
  if normalized in NO_VALUES:
    return 0
  raise ValueError(f"{field} must be yes/no")


def parse_gender(value: str | None) -> int:
  if value is None:
    raise ValueError("gender is required")
  normalized = value.strip().lower()
  if normalized == "male":
    return 1
  if normalized == "female":
    return 0
  raise ValueError("gender must be male or female")


def parse_float(value: str | int | float | None, field: str) -> float:
  if value is None:
    raise ValueError(f"{field} is required")
  try:
    return float(value)
  except (TypeError, ValueError) as exc:
    raise ValueError(f"{field} must be a valid number") from exc


def as_vector(feature_names: List[str], values: Dict[str, float]) -> pd.DataFrame:
  missing = [name for name in feature_names if name not in values]
  if missing:
    raise ValueError(f"Missing values for: {', '.join(missing)}")
  data = [[float(values[name]) for name in feature_names]]
  return pd.DataFrame(data, columns=feature_names)


def build_diabetes_vector(payload: Dict) -> pd.DataFrame:
  alcohol_map = {"never": 0, "occasionally": 1, "regularly": 2, "frequently": 3}
  junk_map = {"never": 0, "rarely": 1, "sometimes": 2, "often": 3, "daily": 4}
  stress_map = {"low": 0, "moderate": 1, "high": 2, "veryhigh": 3}
  bp_level_map = {"low": 0, "normal": 1, "high": 2, "veryhigh": 3}
  urination_map = {"normal": 0, "frequent": 1, "veryfrequent": 2}

  def map_value(value, mapping, field):
    if value is None:
      raise ValueError(f"{field} is required")
    normalized = str(value).strip().lower()
    if normalized not in mapping:
      raise ValueError(f"{field} has an unknown option: {value}")
    return mapping[normalized]

  values = {
      "Age": parse_float(payload.get("age"), "age"),
      "Family_Diabetes": parse_yes_no(payload.get("familyHistory"), "familyHistory"),
      "highBP": parse_yes_no(payload.get("bloodPressure"), "bloodPressure"),
      "BMI": parse_float(payload.get("bmi"), "bmi"),
      "Alcohol": map_value(payload.get("alcohol"), alcohol_map, "alcohol"),
      "Sleep": parse_float(payload.get("sleep"), "sleep"),
      "RegularMedicine": parse_yes_no(payload.get("medicine"), "medicine"),
      "JunkFood": map_value(payload.get("junkFood"), junk_map, "junkFood"),
      "Stress": map_value(payload.get("stress"), stress_map, "stress"),
      "BPLevel": map_value(payload.get("bloodPressureLevel"), bp_level_map, "bloodPressureLevel"),
      "Pregancies": parse_float(payload.get("pregnancies"), "pregnancies"),
      "Pdiabetes": parse_yes_no(payload.get("preDiabetes"), "preDiabetes"),
      "UriationFreq": map_value(payload.get("urination"), urination_map, "urination"),
  }
  return as_vector(DIABETES_FEATURES, values)


def build_lung_vector(payload: Dict) -> pd.DataFrame:
  bool_fields = [
      ("SMOKING", "smoking"),
      ("FINGER_DISCOLORATION", "fingerDiscoloration"),
      ("MENTAL_STRESS", "mentalStress"),
      ("EXPOSURE_TO_POLLUTION", "pollution"),
      ("LONG_TERM_ILLNESS", "longTermIllness"),
      ("IMMUNE_WEAKNESS", "immuneWeakness"),
      ("BREATHING_ISSUE", "breathingIssue"),
      ("ALCOHOL_CONSUMPTION", "alcoholConsumption"),
      ("THROAT_DISCOMFORT", "throatDiscomfort"),
      ("CHEST_TIGHTNESS", "chestTightness"),
      ("FAMILY_HISTORY", "familyHistory"),
      ("SMOKING_FAMILY_HISTORY", "smokingFamilyHistory"),
      ("STRESS_IMMUNE", "stressImmune"),
  ]

  values = {
      "AGE": parse_float(payload.get("age"), "age"),
      "GENDER": parse_gender(payload.get("gender")),
  }
  for feature_name, field in bool_fields:
    values[feature_name] = parse_yes_no(payload.get(field), field)
  return as_vector(LUNG_FEATURES, values)


def build_covid_vector(payload: Dict) -> pd.DataFrame:
  field_mapping = [
      ("Breathing Problem", "breathingProblem"),
      ("Fever", "fever"),
      ("Dry Cough", "dryCough"),
      ("Sore throat", "soreThroat"),
      ("Hyper Tension", "hypertension"),
      ("Abroad travel", "abroadTravel"),
      ("Contact with COVID Patient", "covidContact"),
      ("Attended Large Gathering", "largeGathering"),
      ("Visited Public Exposed Places", "publicPlaces"),
      ("Family working in Public Exposed Places", "familyPublic"),
  ]
  values = {}
  for feature_name, field in field_mapping:
    values[feature_name] = parse_yes_no(payload.get(field), field)
  return as_vector(COVID_FEATURES, values)


def build_sleep_vector(payload: Dict) -> pd.DataFrame:
  bmi_map = {"normal": 0, "overweight": 1, "obese": 2}
  occupation_feature_map = {
      "doctor": "Occupation_Doctor",
      "engineer": "Occupation_Engineer",
      "lawyer": "Occupation_Lawyer",
      "manager": "Occupation_Manager",
      "nurse": "Occupation_Nurse",
      "sales_representative": "Occupation_Sales Representative",
      "salesperson": "Occupation_Salesperson",
      "scientist": "Occupation_Scientist",
      "software_engineer": "Occupation_Software Engineer",
      "teacher": "Occupation_Teacher",
  }

  occupation = payload.get("occupation")
  if occupation is None:
    raise ValueError("occupation is required")
  normalized_occupation = occupation.strip().lower()
  if normalized_occupation not in occupation_feature_map:
    raise ValueError(f"Unsupported occupation: {occupation}")

  def map_bmi(value):
    normalized = str(value).strip().lower()
    if normalized not in bmi_map:
      raise ValueError(f"Unknown BMI category: {value}")
    return bmi_map[normalized]

  values = {
      "Gender": parse_gender(payload.get("gender")),
      "Age": parse_float(payload.get("age"), "age"),
      "Sleep Duration": parse_float(payload.get("sleepDuration"), "sleepDuration"),
      "Quality of Sleep": parse_float(payload.get("sleepQuality"), "sleepQuality"),
      "Physical Activity Level": parse_float(payload.get("physicalActivity"), "physicalActivity"),
      "Stress Level": parse_float(payload.get("stressLevel"), "stressLevel"),
      "BMI Category": map_bmi(payload.get("bmiCategory")),
      "Heart Rate": parse_float(payload.get("heartRate"), "heartRate"),
      "Daily Steps": parse_float(payload.get("dailySteps"), "dailySteps"),
      "Systolic BP": parse_float(payload.get("systolicBP"), "systolicBP"),
      "Diastolic BP": parse_float(payload.get("diastolicBP"), "diastolicBP"),
  }

  for feature in SLEEP_FEATURES:
    if feature.startswith("Occupation_"):
      values[feature] = 0.0

  values[occupation_feature_map[normalized_occupation]] = 1.0
  return as_vector(SLEEP_FEATURES, values)


def prediction_response(condition: str, result: Dict):
  return jsonify({"condition": condition, "result": result})


@app.post("/api/diabetes")
def diabetes_prediction():
  payload = request.get_json(silent=True) or {}
  try:
    vector = build_diabetes_vector(payload)
  except ValueError as exc:
    return jsonify({"error": str(exc)}), 400

  probabilities = diabetes_model.predict_proba(vector)[0]
  score = float(probabilities[DIABETES_POS_INDEX])
  risk_level = "low"
  title = "Low Diabetes Risk"
  message = "Based on your answers, you have a low predicted risk of diabetes."
  if score >= 0.66:
    risk_level = "high"
    title = "High Diabetes Risk"
    message = (
        "Your responses show a high predicted likelihood of diabetes. "
        "Please speak with a healthcare professional for lab work and a care plan."
    )
  elif score >= 0.33:
    risk_level = "moderate"
    title = "Moderate Diabetes Risk"
    message = (
        "You fall inside the moderate risk band. A balanced diet, quality sleep, and "
        "regular checkups are recommended to avoid complications."
    )

  result = {
      "label": "positive" if score >= 0.5 else "negative",
      "riskLevel": risk_level,
      "probability": score,
      "title": title,
      "message": message,
  }
  return prediction_response("diabetes", result)


@app.post("/api/lung")
def lung_prediction():
  payload = request.get_json(silent=True) or {}
  try:
    vector = build_lung_vector(payload)
  except ValueError as exc:
    return jsonify({"error": str(exc)}), 400

  probabilities = lung_model.predict_proba(vector)[0]
  score = float(probabilities[LUNG_POS_INDEX])
  risk_level = "low"
  title = "Low Lung Cancer Risk"
  message = (
      "Your current profile indicates a low likelihood of lung cancer. "
      "Continue your healthy habits and schedule routine screenings."
  )
  if score >= 0.75:
    risk_level = "high"
    title = "High Lung Cancer Risk"
    message = (
        "The model flagged a high lung cancer risk. Immediate consultation with "
        "a pulmonologist is recommended for diagnostic imaging."
    )
  elif score >= 0.4:
    risk_level = "moderate"
    title = "Moderate Lung Cancer Risk"
    message = (
        "You fall into the moderate-risk band. Monitor symptoms closely and "
        "consider a CT screening if you have additional concerns."
    )

  result = {
      "label": "positive" if score >= 0.5 else "negative",
      "riskLevel": risk_level,
      "probability": score,
      "title": title,
      "message": message,
  }
  return prediction_response("lung", result)


@app.post("/api/covid")
def covid_prediction():
  payload = request.get_json(silent=True) or {}
  try:
    vector = build_covid_vector(payload)
  except ValueError as exc:
    return jsonify({"error": str(exc)}), 400

  probabilities = covid_model.predict_proba(vector)[0]
  score = float(probabilities[COVID_POS_INDEX])
  risk_level = "low"
  title = "Low COVID-19 Risk"
  message = "Your answers indicate a low risk. Please continue practicing standard safety guidelines."
  if score >= 0.7:
    risk_level = "high"
    title = "High COVID-19 Risk"
    message = (
        "There is a high predicted probability that you were exposed to COVID-19. "
        "Self-isolate, get tested immediately, and monitor for worsening symptoms."
    )
  elif score >= 0.4:
    risk_level = "moderate"
    title = "Moderate COVID-19 Risk"
    message = (
        "The assessment shows a moderate risk. Limit contact, wear a mask indoors, "
        "and test if symptoms worsen."
    )

  result = {
      "label": "positive" if score >= 0.5 else "negative",
      "riskLevel": risk_level,
      "probability": score,
      "title": title,
      "message": message,
  }
  return prediction_response("covid", result)


@app.post("/api/sleep")
def sleep_prediction():
  payload = request.get_json(silent=True) or {}
  try:
    vector = build_sleep_vector(payload)
  except ValueError as exc:
    return jsonify({"error": str(exc)}), 400

  probabilities = sleep_model.predict_proba(vector)[0]
  prediction = int(sleep_model.predict(vector)[0])
  class_index = SLEEP_CLASS_INDEX.get(prediction)
  confidence = float(probabilities[class_index]) if class_index is not None else 0.0
  label = SLEEP_CLASS_LABELS.get(prediction, "Unknown")

  if label == "Insomnia":
    title = "Signs of Insomnia"
    message = (
        "Your sleep hygiene pattern resembles insomnia. Improving sleep routines "
        "and consulting a sleep therapist may help."
    )
  elif label == "Sleep Apnea":
    title = "Possible Sleep Apnea"
    message = (
        "The assessment points to symptoms that align with sleep apnea. "
        "Consult a physician for a detailed sleep study."
    )
  else:
    title = "Healthy Sleep Pattern"
    message = (
        "No significant issues were detected. Keep following balanced routines "
        "to maintain restorative sleep."
    )

  result = {
      "label": label,
      "riskLevel": label.lower().replace(" ", "_"),
      "probability": confidence,
      "title": title,
      "message": message,
  }
  return prediction_response("sleep", result)


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000)
