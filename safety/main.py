"""
API FastAPI — HAM10000 Skin Lesion Classifier
Logique d'inférence identique à la cell 26 du notebook comparaison_modeles_HAM10000.ipynb
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import joblib
import numpy as np
import pandas as pd
import os
from typing import Optional

# ── Chemins ────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

# ── Noms des classes (identique notebook) ─────────────────────────────────
CLASS_NAMES = {
    'nv':    'Melanocytic nevi',
    'mel':   'Melanoma',
    'bkl':   'Benign keratosis',
    'bcc':   'Basal cell carcinoma',
    'akiec': 'Actinic keratoses',
    'vasc':  'Vascular lesions',
    'df':    'Dermatofibroma'
}

CLASS_INFO = {
    'akiec': {'description': 'Lésion précancéreuse causée par une exposition prolongée au soleil.', 'severity': 'moderate', 'color': '#F59E0B'},
    'bcc':   {'description': 'Cancer de la peau le plus fréquent, à croissance lente.',             'severity': 'high',     'color': '#EF4444'},
    'bkl':   {'description': 'Lésion bénigne kératosique, non cancéreuse.',                         'severity': 'low',      'color': '#10B981'},
    'df':    {'description': 'Tumeur bénigne du tissu conjonctif cutané.',                          'severity': 'low',      'color': '#10B981'},
    'mel':   {'description': 'Cancer de la peau le plus dangereux. Consultation urgente recommandée.', 'severity': 'critical', 'color': '#7C3AED'},
    'nv':    {'description': 'Grain de beauté commun, généralement bénin.',                         'severity': 'low',      'color': '#10B981'},
    'vasc':  {'description': 'Lésions vasculaires cutanées (angiomes, etc.).',                      'severity': 'low',      'color': '#3B82F6'},
}

# Valeurs valides extraites du dataset HAM10000
VALID_SEX = ["male", "female", "unknown"]
VALID_LOCALIZATIONS = [
    "abdomen", "acral", "back", "chest", "ear", "face",
    "foot", "genital", "hand", "lower extremity", "neck",
    "scalp", "trunk", "unknown", "upper extremity",
]

# ── Chargement des artefacts ───────────────────────────────────────────────
def load_artifacts():
    required = [
        "xgboost_model.pkl", "rf_model.pkl", "svm_model.pkl",
        "scaler.pkl", "label_encoder.pkl",
        "feature_columns.pkl", "isolation_forest.pkl",
    ]
    missing = [f for f in required if not os.path.exists(os.path.join(MODEL_DIR, f))]
    if missing:
        raise FileNotFoundError(
            f"Artefacts manquants : {missing}. Lancez d'abord : python train_model.py"
        )
    return {
        "xgb":     joblib.load(os.path.join(MODEL_DIR, "xgboost_model.pkl")),
        "rf":      joblib.load(os.path.join(MODEL_DIR, "rf_model.pkl")),
        "svm":     joblib.load(os.path.join(MODEL_DIR, "svm_model.pkl")),
        "scaler":  joblib.load(os.path.join(MODEL_DIR, "scaler.pkl")),
        "le":      joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl")),
        "cols":    joblib.load(os.path.join(MODEL_DIR, "feature_columns.pkl")),
        "iso":     joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl")),
    }

try:
    artifacts = load_artifacts()
    MODELS_LOADED = True
    print("✅ Tous les modèles chargés.")
except FileNotFoundError as e:
    print(f"⚠️  {e}")
    artifacts = {}
    MODELS_LOADED = False

# ── App FastAPI ────────────────────────────────────────────────────────────
app = FastAPI(
    title="HAM10000 Skin Lesion API",
    description="Classification de lésions cutanées — Random Forest / SVM / XGBoost + Isolation Forest",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schémas Pydantic ───────────────────────────────────────────────────────
class PredictionRequest(BaseModel):
    age: float = Field(..., ge=0, le=100, description="Âge du patient (0–100)")
    sex: str   = Field(..., description="male | female | unknown")
    localization: str = Field(..., description="Localisation de la lésion")
    model: str = Field(default="xgboost", description="xgboost | random_forest | svm")

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v):
        v = v.lower().strip()
        if v not in VALID_SEX:
            raise ValueError(f"Sexe invalide. Valeurs acceptées : {VALID_SEX}")
        return v

    @field_validator("localization")
    @classmethod
    def validate_localization(cls, v):
        v = v.lower().strip()
        if v not in VALID_LOCALIZATIONS:
            raise ValueError(f"Localisation invalide. Valeurs acceptées : {VALID_LOCALIZATIONS}")
        return v

    @field_validator("model")
    @classmethod
    def validate_model(cls, v):
        v = v.lower().strip()
        if v not in ["xgboost", "random_forest", "svm"]:
            raise ValueError("Modèle invalide. Valeurs acceptées : xgboost | random_forest | svm")
        return v

class ClassProbability(BaseModel):
    code: str
    name: str
    probability: float
    severity: str
    color: str

class ModelResult(BaseModel):
    model_name: str
    prediction: str
    prediction_name: str
    confidence: float
    severity: str
    color: str
    description: str
    all_probabilities: list[ClassProbability]
    correct_marker: Optional[str] = None  # ✅ ou ❌ si vrai label connu

class PredictionResponse(BaseModel):
    # Résultat du modèle sélectionné
    prediction: str
    prediction_name: str
    confidence: float
    severity: str
    color: str
    description: str
    # Anomalie (Isolation Forest — cell 19)
    is_anomaly: bool
    anomaly_score: float
    # Toutes les probabilités
    all_probabilities: list[ClassProbability]
    # Comparaison des 3 modèles (cell 26)
    all_models: list[ModelResult]
    # Avertissement
    warning: Optional[str] = None

# ── Helpers ────────────────────────────────────────────────────────────────
def build_input(age: float, sex: str, localization: str) -> tuple:
    """
    Construit le vecteur de features exactement comme dans le notebook :
      X = df.drop(['dx', 'lesion_id', 'image_id'], axis=1)
      X = pd.get_dummies(X)
    Retourne (X_raw, X_scaled) — RF utilise raw, SVM/XGB utilisent scaled.
    """
    raw = pd.DataFrame([{"age": age, "sex": sex, "localization": localization}])
    raw = pd.get_dummies(raw)

    # Aligner avec les colonnes d'entraînement
    for col in artifacts["cols"]:
        if col not in raw.columns:
            raw[col] = 0
    raw = raw[artifacts["cols"]]

    scaled = artifacts["scaler"].transform(raw)
    return raw, scaled

def predict_one(model_key: str, X_raw, X_scaled) -> dict:
    """
    Prédit avec un modèle — logique cell 26 du notebook.
    RF utilise X_raw (non normalisé), SVM et XGB utilisent X_scaled.
    """
    le = artifacts["le"]
    if model_key == "rf":
        clf   = artifacts["rf"]
        X_use = X_raw
    elif model_key == "svm":
        clf   = artifacts["svm"]
        X_use = X_scaled
    else:  # xgboost
        clf   = artifacts["xgb"]
        X_use = X_scaled

    pred_enc   = clf.predict(X_use)[0]
    pred_proba = clf.predict_proba(X_use)[0]
    pred_label = le.inverse_transform([pred_enc])[0]
    confidence = float(pred_proba.max())

    all_probs = []
    for i, cls in enumerate(le.classes_):
        info = CLASS_INFO[cls]
        all_probs.append(ClassProbability(
            code=cls,
            name=CLASS_NAMES[cls],
            probability=round(float(pred_proba[i]), 4),
            severity=info["severity"],
            color=info["color"],
        ))
    all_probs.sort(key=lambda x: x.probability, reverse=True)

    return {
        "prediction":      pred_label,
        "prediction_name": CLASS_NAMES[pred_label],
        "confidence":      round(confidence, 4),
        "severity":        CLASS_INFO[pred_label]["severity"],
        "color":           CLASS_INFO[pred_label]["color"],
        "description":     CLASS_INFO[pred_label]["description"],
        "all_probabilities": all_probs,
    }

# ── Dataset path (pour les endpoints summary/sample) ──────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
DATASET_PATH = os.path.join(PROJECT_ROOT, "HAM10000_metadata.csv")

def load_dataset() -> pd.DataFrame:
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=404, detail="HAM10000_metadata.csv introuvable")
    return pd.read_csv(DATASET_PATH)

# ── Endpoints ──────────────────────────────────────════════════════════════
@app.get("/")
def root():
    return {
        "message": "HAM10000 Skin Lesion Classifier API",
        "status":  "ready" if MODELS_LOADED else "model_not_trained",
        "docs":    "/docs",
    }

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": MODELS_LOADED}

@app.get("/metadata")
def metadata():
    return {
        "valid_sex":           VALID_SEX,
        "valid_localizations": VALID_LOCALIZATIONS,
        "classes":             CLASS_INFO,
        "class_names":         CLASS_NAMES,
        "models":              ["xgboost", "random_forest", "svm"],
    }

@app.get("/dataset-summary")
def dataset_summary():
    df = load_dataset()
    class_distribution = {}
    if "dx" in df.columns:
        counts = df["dx"].value_counts(dropna=False)
        class_distribution = {str(k): int(v) for k, v in counts.items()}
    return {
        "file": "HAM10000_metadata.csv",
        "rows": int(df.shape[0]),
        "columns": df.columns.tolist(),
        "missing_values": {col: int(val) for col, val in df.isna().sum().to_dict().items()},
        "class_distribution": class_distribution,
    }

@app.get("/dataset-sample")
def dataset_sample(limit: int = 10):
    df = load_dataset()
    bounded_limit = min(max(limit, 1), 50)
    sample = df.head(bounded_limit).where(pd.notnull(df.head(bounded_limit)), None)
    return {
        "limit": bounded_limit,
        "rows": sample.to_dict(orient="records"),
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if not MODELS_LOADED:
        raise HTTPException(
            status_code=503,
            detail="Modèle non chargé. Lancez d'abord : python train_model.py",
        )

    # Construction du vecteur (identique notebook)
    X_raw, X_scaled = build_input(request.age, request.sex, request.localization)

    # Modèle sélectionné
    model_key_map = {"xgboost": "xgb", "random_forest": "rf", "svm": "svm"}
    selected_key  = model_key_map[request.model]
    main_result   = predict_one(selected_key, X_raw, X_scaled)

    # Isolation Forest — cell 19 (entraîné sur X non normalisé)
    iso_score  = float(artifacts["iso"].score_samples(X_raw)[0])
    is_anomaly = bool(artifacts["iso"].predict(X_raw)[0] == -1)

    # Comparaison des 3 modèles — cell 26
    model_labels = {
        "rf":  "Random Forest",
        "svm": "SVM (rbf)",
        "xgb": "XGBoost",
    }
    all_models = []
    for key, label in model_labels.items():
        res = predict_one(key, X_raw, X_scaled)
        all_models.append(ModelResult(
            model_name=label,
            **{k: v for k, v in res.items()},
        ))

    # Avertissement
    warning = None
    if is_anomaly:
        warning = "⚠️ Profil atypique détecté par Isolation Forest. Consultation médicale recommandée."
    elif main_result["prediction"] == "mel" and main_result["confidence"] > 0.4:
        warning = "🚨 Risque de mélanome détecté. Consultez un dermatologue immédiatement."

    return PredictionResponse(
        **main_result,
        is_anomaly=is_anomaly,
        anomaly_score=round(iso_score, 4),
        all_models=all_models,
        warning=warning,
    )
