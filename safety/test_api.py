import urllib.request, json

data = json.dumps({
    "age": 55,
    "sex": "male",
    "localization": "back",
    "model": "xgboost"
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/predict",
    data=data,
    headers={"Content-Type": "application/json"}
)
r   = urllib.request.urlopen(req)
res = json.loads(r.read())

print("=== RÉSULTAT PRINCIPAL ===")
print(f"Prédiction : {res['prediction']} ({res['prediction_name']})")
print(f"Confiance  : {res['confidence']*100:.1f}%")
print(f"Sévérité   : {res['severity']}")
print(f"Anomalie   : {res['is_anomaly']} (score: {res['anomaly_score']})")

print("\n=== COMPARAISON 3 MODÈLES (cell 26 notebook) ===")
for m in res["all_models"]:
    print(f"  {m['model_name']:15} -> {m['prediction']:6} ({m['confidence']*100:.1f}%)")

print("\n=== TOP 3 PROBABILITÉS ===")
for p in res["all_probabilities"][:3]:
    print(f"  {p['code']:6} {p['name']:25} {p['probability']*100:.1f}%")
