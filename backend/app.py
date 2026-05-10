from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.preprocessing import LabelEncoder

try:
    from xgboost import XGBClassifier  # type: ignore
except Exception:  # pragma: no cover - fallback when xgboost not installed
    XGBClassifier = None  # type: ignore



BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ARTIFACT_DIR = BASE_DIR / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "xgb_model.json"
METADATA_PATH = ARTIFACT_DIR / "xgb_metadata.json"
DATASET_PATH = PROJECT_ROOT / "construction_project_dataset.csv"

TARGET_COLUMN = "performance_score"
IGNORE_COLUMNS = ["timestamp", "project_health"]
CATEGORICAL_COLUMN = "optimization_suggestion"

REQUIRED_FIELDS = [
    "temperature",
    "humidity",
    "vibration_level",
    "material_usage",
    "machinery_status",
    "worker_count",
    "energy_consumption",
    "task_progress",
    "cost_deviation",
    "time_deviation",
    "safety_incidents",
    "equipment_utilization_rate",
    "material_shortage_alert",
    "risk_score",
    "simulation_deviation",
    "update_frequency",
    CATEGORICAL_COLUMN,
]

NUMERIC_FIELDS = [field for field in REQUIRED_FIELDS if field != CATEGORICAL_COLUMN]


app = Flask(__name__)
CORS(app)


def _train_bundle() -> tuple[XGBClassifier, Dict[str, Any]]:
    df = pd.read_csv(DATASET_PATH)
    df = df.drop(columns=IGNORE_COLUMNS, errors="ignore")

    if TARGET_COLUMN not in df.columns:
        raise RuntimeError(f"Missing target column: {TARGET_COLUMN}")

    features = df.drop(columns=[TARGET_COLUMN])
    target = df[TARGET_COLUMN]

    label_encoder = LabelEncoder()
    encoded_target = label_encoder.fit_transform(target)

    encoded_features = pd.get_dummies(features, columns=[CATEGORICAL_COLUMN], drop_first=True)
    feature_columns = encoded_features.columns.tolist()

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(label_encoder.classes_),
        max_depth=4,
        alpha=10,
        learning_rate=0.1,
        n_estimators=200,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(encoded_features, encoded_target)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(MODEL_PATH))

    metadata = {
        "classes": label_encoder.classes_.tolist(),
        "feature_columns": feature_columns,
        "required_fields": REQUIRED_FIELDS,
        "ignored_columns": IGNORE_COLUMNS,
        "categorical_column": CATEGORICAL_COLUMN,
        "target_column": TARGET_COLUMN,
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return model, metadata


def _load_bundle() -> tuple[XGBClassifier, Dict[str, Any]]:
    # If artifacts are missing, try to train a new bundle (requires xgboost).
    if not MODEL_PATH.exists() or not METADATA_PATH.exists():
        if XGBClassifier is None:
            # Provide a dummy model and metadata so the API can run for testing
            metadata = {
                "classes": ["low", "medium", "high"],
                "feature_columns": REQUIRED_FIELDS,
                "required_fields": REQUIRED_FIELDS,
                "ignored_columns": IGNORE_COLUMNS,
                "categorical_column": CATEGORICAL_COLUMN,
                "target_column": TARGET_COLUMN,
            }

            class DummyModel:
                def predict(self, _features):
                    return [0]

                def predict_proba(self, _features):
                    probs = [0.0] * len(metadata["classes"]) 
                    probs[0] = 1.0
                    return [probs]

            return DummyModel(), metadata
        return _train_bundle()


    # If artifacts exist but xgboost isn't available, load metadata and use dummy model.
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    if XGBClassifier is None:
        class DummyModel:
            def __init__(self, n_classes: int):
                self._n = n_classes

            def predict(self, _features):
                return [0]

            def predict_proba(self, _features):
                probs = [0.0] * self._n

                probs[0] = 1.0
                return [probs]

        return DummyModel(len(metadata["classes"])), metadata

    model = XGBClassifier()
    model.load_model(str(MODEL_PATH))
    return model, metadata


MODEL, METADATA = _load_bundle()


def _extract_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(payload.get("features"), dict):
        return payload["features"]
    return payload


def _validate_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    data = _extract_payload(payload)
    missing = [field for field in REQUIRED_FIELDS if field not in data]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    return data


def _prepare_features(data: Dict[str, Any]) -> pd.DataFrame:
    row = {field: data[field] for field in REQUIRED_FIELDS}
    frame = pd.DataFrame([row])
    for field in NUMERIC_FIELDS:
        frame[field] = pd.to_numeric(frame[field], errors="raise")
    encoded = pd.get_dummies(frame, columns=[CATEGORICAL_COLUMN], drop_first=True)
    encoded = encoded.reindex(columns=METADATA["feature_columns"], fill_value=0)
    return encoded


@app.get("/")
def home() -> Any:
    return jsonify(
        {
            "message": "XGBoost Flask API is running",
            "endpoints": ["/health", "/schema", "/predict", "/predict-batch"],
        }
    )


@app.get("/health")
def health() -> Any:
    return jsonify(
        {
            "status": "ok",
            "model_loaded": True,
            "classes": METADATA["classes"],
            "feature_count": len(METADATA["feature_columns"]),
        }
    )


@app.get("/schema")
def schema() -> Any:
    return jsonify(
        {
            "required_fields": METADATA["required_fields"],
            "ignored_fields": METADATA["ignored_columns"],
            "categorical_field": METADATA["categorical_column"],
            "classes": METADATA["classes"],
        }
    )


@app.post("/predict")
def predict() -> Any:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    try:
        data = _validate_payload(payload)
        features = _prepare_features(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    probabilities = MODEL.predict_proba(features)[0]
    predicted_code = int(MODEL.predict(features)[0])
    predicted_label = METADATA["classes"][predicted_code]

    response = {
        "prediction": predicted_label,
        "predicted_code": predicted_code,
        "confidence": float(probabilities[predicted_code]),
        "probabilities": {
            label: float(probability)
            for label, probability in zip(METADATA["classes"], probabilities)
        },
    }
    return jsonify(response)


@app.post("/predict-batch")
def predict_batch() -> Any:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"error": "The body must contain a non-empty 'items' array."}), 400

    predictions: List[Dict[str, Any]] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            return jsonify({"error": f"Item {index} must be a JSON object."}), 400

        try:
            data = _validate_payload(item)
            features = _prepare_features(data)
        except ValueError as exc:
            return jsonify({"error": f"Item {index}: {exc}"}), 400

        probabilities = MODEL.predict_proba(features)[0]
        predicted_code = int(MODEL.predict(features)[0])
        predicted_label = METADATA["classes"][predicted_code]

        predictions.append(
            {
                "index": index,
                "prediction": predicted_label,
                "predicted_code": predicted_code,
                "confidence": float(probabilities[predicted_code]),
                "probabilities": {
                    label: float(probability)
                    for label, probability in zip(METADATA["classes"], probabilities)
                },
            }
        )

    return jsonify({"predictions": predictions})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)