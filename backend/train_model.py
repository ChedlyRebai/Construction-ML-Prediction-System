"""
Script d'entraînement — copie exacte de la logique des notebooks HAM10000
Reproduit fidèlement :
  - comparaison_modeles_HAM10000.ipynb
  - xgboost_complet.ipynb
Exécuter une seule fois : python train_model.py
"""

import pandas as pd
import numpy as np
import joblib
import os
import time
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, classification_report,
    f1_score, roc_auc_score, confusion_matrix
)
from xgboost import XGBClassifier

# ── Chemins ────────────────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "HAM10000_metadata.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Noms des classes (identique notebook cell 6) ──────────────────────────
class_names = {
    'nv':    'Melanocytic nevi',
    'mel':   'Melanoma',
    'bkl':   'Benign keratosis',
    'bcc':   'Basal cell carcinoma',
    'akiec': 'Actinic keratoses',
    'vasc':  'Vascular lesions',
    'df':    'Dermatofibroma'
}

# ══════════════════════════════════════════════════════════════════════════
# 1. CHARGEMENT (cell 4)
# ══════════════════════════════════════════════════════════════════════════
print("📂 Chargement du dataset...")
df = pd.read_csv(DATA_PATH)
print(f"   Shape : {df.shape}")

# ══════════════════════════════════════════════════════════════════════════
# 2. PRÉTRAITEMENT COMMUN (cell 6)
# ══════════════════════════════════════════════════════════════════════════
print("\nValeurs manquantes avant correction:")
print(df.isnull().sum())

# Imputation âge par médiane
df['age'] = df['age'].fillna(df['age'].median())
print(f'\nAprès correction : {df.isnull().sum().sum()} valeur(s) manquante(s)')

# Encodage features — drop dx, lesion_id, image_id
X = df.drop(['dx', 'lesion_id', 'image_id'], axis=1)
X = pd.get_dummies(X)

# Encodage cible
le = LabelEncoder()
y  = le.fit_transform(df['dx'])

print(f'\nShape X : {X.shape}')
print('Classes :')
for i, cls in enumerate(le.classes_):
    print(f'  {i} → {cls} ({class_names[cls]})')

print('\nRépartition :')
print(df['dx'].value_counts(normalize=True).map(lambda x: f'{x:.1%}'))

# Sauvegarder les colonnes et encodeurs pour l'inférence
feature_columns = list(X.columns)
joblib.dump(feature_columns, os.path.join(MODEL_DIR, "feature_columns.pkl"))
joblib.dump(le,              os.path.join(MODEL_DIR, "label_encoder.pkl"))

# ══════════════════════════════════════════════════════════════════════════
# 3. SPLIT + NORMALISATION (cell 7)
# ══════════════════════════════════════════════════════════════════════════
# Split stratifié — identique pour tous les modèles
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Normalisation pour SVM (et XGBoost par cohérence)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))

print(f'\nTrain : {X_train.shape[0]} obs  |  Test : {X_test.shape[0]} obs')
print('✅ Split stratifié + normalisation prêts')

# ══════════════════════════════════════════════════════════════════════════
# 4. ENTRAÎNEMENT DES 3 MODÈLES (cell 9)
# ══════════════════════════════════════════════════════════════════════════

# ── 4.1 Random Forest ─────────────────────────────────────────────────────
print('\nEntraînement Random Forest...')
t0 = time.time()
rf_clf = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1
)
rf_clf.fit(X_train, y_train)          # ← RF utilise X_train NON normalisé
rf_time = time.time() - t0
joblib.dump(rf_clf, os.path.join(MODEL_DIR, "rf_model.pkl"))
print(f'  ✅ Terminé en {rf_time:.1f}s')

# ── 4.2 SVM ───────────────────────────────────────────────────────────────
print('Entraînement SVM (peut prendre 1-2 min)...')
t0 = time.time()
svm_clf = SVC(
    kernel='rbf',
    C=10,
    gamma='scale',
    decision_function_shape='ovr',
    probability=True,
    random_state=42
)
svm_clf.fit(X_train_scaled, y_train)  # ← SVM utilise X_train_scaled
svm_time = time.time() - t0
joblib.dump(svm_clf, os.path.join(MODEL_DIR, "svm_model.pkl"))
print(f'  ✅ Terminé en {svm_time:.1f}s')

# ── 4.3 XGBoost ───────────────────────────────────────────────────────────
print('Entraînement XGBoost...')
t0 = time.time()
xgb_clf = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric='mlogloss',
    random_state=42,
    n_jobs=-1
)
xgb_clf.fit(X_train_scaled, y_train)  # ← XGBoost utilise X_train_scaled
xgb_time = time.time() - t0
joblib.dump(xgb_clf, os.path.join(MODEL_DIR, "xgboost_model.pkl"))
print(f'  ✅ Terminé en {xgb_time:.1f}s')

print('\n✅ Les 3 modèles sont entraînés.')

# ══════════════════════════════════════════════════════════════════════════
# 5. ISOLATION FOREST (cell 19)
# ══════════════════════════════════════════════════════════════════════════
print('\n🔍 Entraînement Isolation Forest...')
# Entraîné sur X complet (non normalisé) — comme dans le notebook
iso = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
iso.fit(X)
joblib.dump(iso, os.path.join(MODEL_DIR, "isolation_forest.pkl"))

anomaly_labels = iso.predict(X)
n_anom = (anomaly_labels == -1).sum()
print(f'   Anomalies détectées : {n_anom} / {len(df)} ({n_anom/len(df)*100:.1f}%)')

# ══════════════════════════════════════════════════════════════════════════
# 6. ÉVALUATION (cell 11 + 23)
# ══════════════════════════════════════════════════════════════════════════
def evaluate(model, X_t, y_t, name, train_time):
    y_pred   = model.predict(X_t)
    y_proba  = model.predict_proba(X_t)
    acc      = accuracy_score(y_t, y_pred)
    f1_macro = f1_score(y_t, y_pred, average='macro')
    f1_w     = f1_score(y_t, y_pred, average='weighted')
    auc      = roc_auc_score(y_t, y_proba, multi_class='ovr', average='macro')
    return {
        'name': name, 'train_time': train_time,
        'acc': acc, 'f1_macro': f1_macro, 'f1_weighted': f1_w, 'auc': auc,
        'y_pred': y_pred, 'y_proba': y_proba,
    }

results = [
    evaluate(rf_clf,  X_test,        y_test, 'Random Forest', rf_time),
    evaluate(svm_clf, X_test_scaled, y_test, 'SVM (rbf)',     svm_time),
    evaluate(xgb_clf, X_test_scaled, y_test, 'XGBoost',       xgb_time),
]

# Tableau récapitulatif (cell 11)
print('\n' + '=' * 70)
print('TABLEAU DE COMPARAISON — HAM10000')
print('=' * 70)
summary = pd.DataFrame([{
    'Modèle':      r['name'],
    'Accuracy':    f"{r['acc']:.4f}",
    'F1 macro':    f"{r['f1_macro']:.4f}",
    'F1 weighted': f"{r['f1_weighted']:.4f}",
    'AUC-ROC':     f"{r['auc']:.4f}",
    'Temps (s)':   f"{r['train_time']:.1f}",
} for r in results])
print(summary.set_index('Modèle').to_string())
print("\n⚠️  Rappel : avec nv=67%, le F1 macro est plus fiable que l'accuracy.")

# Rapport final (cell 23)
best_f1  = max(results, key=lambda r: r['f1_macro'])
best_acc = max(results, key=lambda r: r['acc'])
best_auc = max(results, key=lambda r: r['auc'])
fastest  = min(results, key=lambda r: r['train_time'])

print('\n' + '=' * 65)
print('RAPPORT FINAL — COMPARAISON DES MODÈLES')
print('=' * 65)
for r in results:
    print(f"\n📌 {r['name']}")
    print(f"   Accuracy    : {r['acc']:.4f}")
    print(f"   F1 macro    : {r['f1_macro']:.4f}")
    print(f"   F1 weighted : {r['f1_weighted']:.4f}")
    print(f"   AUC-ROC     : {r['auc']:.4f}")
    print(f"   Temps train : {r['train_time']:.1f}s")

print('\n' + '─' * 65)
print('🏆 GAGNANTS PAR MÉTRIQUE')
print(f"   Meilleure Accuracy  → {best_acc['name']}  ({best_acc['acc']:.4f})")
print(f"   Meilleur F1 macro   → {best_f1['name']}  ({best_f1['f1_macro']:.4f})  ← ⭐ recommandé")
print(f"   Meilleur AUC-ROC    → {best_auc['name']}  ({best_auc['auc']:.4f})")
print(f"   Plus rapide         → {fastest['name']}  ({fastest['train_time']:.1f}s)")
print('\n' + '─' * 65)
print('💡 RECOMMANDATION')
print(f"   Avec un déséquilibre nv=67%, le F1 macro est la métrique principale.")
print(f"   → Utiliser {best_f1['name']} pour les décisions médicales.")
print('=' * 65)

print(f"\n✅ Tous les modèles sauvegardés dans : {MODEL_DIR}")
print("   - rf_model.pkl")
print("   - svm_model.pkl")
print("   - xgboost_model.pkl")
print("   - isolation_forest.pkl")
print("   - scaler.pkl")
print("   - label_encoder.pkl")
print("   - feature_columns.pkl")
