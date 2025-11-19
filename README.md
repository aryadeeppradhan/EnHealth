# EnHealth – Local Development

This project now has two runtime pieces:

1. The existing Node/Express server (`server.js`) that serves the UI, user auth, and history APIs.
2. A new Flask app (`ml_server.py`) that loads the `.pkl` machine-learning models and handles each prediction request.

Run both services locally to get fully functional predictions plus history persistence.

## Requirements

- Node.js 18+ (for the Express server)
- Python 3.10+ with `pip`
- SQLite is bundled with Node, so no extra database setup is required

## Install dependencies

```bash
npm install
python3 -m pip install -r requirements.txt  # use a virtualenv if desired
```

> If your OS marks the Python site-packages as externally managed, add `--break-system-packages` or install the requirements inside a virtual environment.

## Prepare the ML environment

Use the helper script (works on Windows/macOS/Linux) to create a local `.venv` and install everything from `requirements.txt` without touching your system Python install:

```bash
npm run setup:ml
```

Once it finishes you can optionally activate the virtual environment manually (`.\\.venv\\Scripts\\activate` on Windows or `source .venv/bin/activate` elsewhere), but the Node server will detect and use it automatically.

## Run the servers

`npm start` now spawns both processes for you:

```bash
npm start
```

- Express keeps running on `http://localhost:4000`.
- The bundled Flask API boots in the same terminal and listens on `http://localhost:5000`.

> Set `SKIP_ML_SERVER=1` before running `npm start` if you want to start `ml_server.py` manually (e.g., inside a virtualenv).

All prediction forms call the Flask endpoints, then save their responses through the existing `/api/history` route.

### Deploying the Flask API elsewhere

Each prediction script reads `window.__ENHEALTH_ML_API__` as an override before falling back to `http://localhost:5000/api`. When serving the static HTML from another origin, inject that global (e.g. in the `<head>` tag) to point the UI at a remote inference service.

## Prediction endpoints

| Endpoint | Payload highlights | Notes |
| --- | --- | --- |
| `POST /api/diabetes` | `age`, `familyHistory`, `bloodPressure`, `bmi`, `alcohol`, `sleep`, `medicine`, `junkFood`, `stress`, `bloodPressureLevel`, `pregnancies`, `preDiabetes`, `urination` | Maps directly to the Diabetes form fields. Returns `result` with `riskLevel`, `probability`, `title`, and `message`. |
| `POST /api/lung` | `age`, `gender`, `smoking`, `fingerDiscoloration`, `mentalStress`, `pollution`, `longTermIllness`, `immuneWeakness`, `breathingIssue`, `alcoholConsumption`, `throatDiscomfort`, `chestTightness`, `familyHistory`, `smokingFamilyHistory`, `stressImmune` | Boolean inputs are sent as `"yes"`/`"no"`. Response includes `probability` (chance of a positive class) and descriptive messaging. |
| `POST /api/covid` | `breathingProblem`, `fever`, `dryCough`, `soreThroat`, `hypertension`, `abroadTravel`, `covidContact`, `largeGathering`, `publicPlaces`, `familyPublic` | All inputs are categorical `"yes"`/`"no"`. The endpoint provides low/moderate/high guidance. |
| `POST /api/sleep` | `gender`, `age`, `occupation`, `sleepDuration`, `sleepQuality`, `physicalActivity`, `stressLevel`, `bmiCategory`, `dailySteps`, `heartRate`, `systolicBP`, `diastolicBP` | Occupation values must match the select options in the UI. The response label is one of `No Sleep Disorder`, `Insomnia`, or `Sleep Apnea` plus a confidence score. |

Each response has the form:

```json
{
  "condition": "diabetes",
  "result": {
    "label": "positive",
    "riskLevel": "moderate",
    "probability": 0.48,
    "title": "Moderate Diabetes Risk",
    "message": "…"
  }
}
```

The UI reuses the `result` payload for on-screen messaging and for entries saved in the `/api/history` table.

## Model files

The four `.pkl` files live alongside their respective form folders. `ml_server.py` loads them once when the Flask app starts. If you retrain a model, overwrite the appropriate `.pkl`, restart the Flask process, and the UI will pick up the new behavior automatically.
