# Construction ML Prediction System

This project is a small full-stack demo for predicting construction project performance.

## How It Works

The app has two parts:

1. The backend is a Flask API in `backend/app.py`.
2. The frontend is a React + Vite app in `frontend/src/App.tsx`.

The frontend collects project metrics from a form and sends them to the backend at `POST /predict`. The backend loads the saved XGBoost model artifacts from `backend/artifacts/`, converts the input into model features, and returns a prediction with class probabilities.

## Data Flow

1. You open the frontend in the browser.
2. You fill in the construction project values.
3. The form sends JSON to the Flask API.
4. The API validates the fields, prepares the features, and runs the model.
5. The API returns:
	- predicted class
	- predicted code
	- confidence score
	- probability distribution across all classes
6. The frontend displays the result.

## Backend

The backend exposes these endpoints:

- `GET /` - basic status message
- `GET /health` - health check and model info
- `GET /schema` - required fields and class labels
- `POST /predict` - single prediction
- `POST /predict-batch` - batch predictions


The backend expects these input fields:

- `temperature`
- `humidity`
- `vibration_level`
- `material_usage`
- `machinery_status`
- `worker_count`
- `energy_consumption`
- `task_progress`
- `cost_deviation`
- `time_deviation`
- `safety_incidents`
- `equipment_utilization_rate`
- `material_shortage_alert`
- `risk_score`
- `simulation_deviation`
- `update_frequency`
- `optimization_suggestion`


## Frontend

The frontend is a form-based UI. It uses `VITE_API_BASE_URL` if you set it, otherwise it talks to `http://localhost:5000`.

## Local Run

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Free Internet Deployment

The repo already includes a `render.yaml` file for Render.

Backend deploy steps on Render:

1. Create a free Render account.
2. Push this repository to GitHub.
3. In Render, choose "New +" then "Blueprint".
4. Select the GitHub repo that contains this project.
5. Render will read `render.yaml` and create the services.
6. Use the URL of the `building-ml-api` service as your public backend URL.

Important notes:

- The backend now starts with `gunicorn` and binds to `$PORT`, which is required on Render.
- Free Render web services can sleep when idle, so the first request after inactivity may be slower.
- The frontend in this repo is separate. If you only want the backend online, deploy just the API service.

## Vercel Frontend Deployment

This repository also includes a `vercel.json` file for Vercel.

1. Create a Vercel project from this repository.
2. Keep the root directory at the repository root.
3. Vercel will install and build the frontend from `frontend/`.
4. The production output is published from `frontend/dist`.
5. Deploy the project and use the Vercel URL as the public frontend.

If you want to keep the frontend and backend separated, use Render for the API and Vercel for the React app.

## Notes

- The model files are stored in `backend/artifacts/`.
- If the backend cannot load the model artifacts, it will try to rebuild them from `construction_project_dataset.csv`.
- The frontend currently shows results from the Flask API and is designed for local development.
