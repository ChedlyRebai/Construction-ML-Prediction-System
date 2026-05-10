import { useState, useEffect } from 'react';
import Header from './components/Header';
import PredictionForm from './components/PredictionForm';
import ResultCard from './components/ResultCard';
import StatsPanel from './components/StatsPanel';
import { checkHealth, predict } from './api/skinApi';

export default function App() {
  const [apiStatus, setApiStatus] = useState('loading');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);

  // Vérification de l'API au démarrage
  useEffect(() => {
    checkHealth()
      .then((res) => {
        setApiStatus(res.data.models_loaded ? 'ready' : 'no_model');
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  const handlePredict = async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await predict(formData);
      setResult(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (apiStatus === 'offline'
          ? "L'API est hors ligne. Lancez le backend avec : uvicorn main:app --reload"
          : 'Erreur lors de la prédiction.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <Header apiStatus={apiStatus} />

      <main className="relative max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold gradient-text mb-3">
            Classification de Lésions Cutanées
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Modèle XGBoost entraîné sur le dataset HAM10000 (10 015 observations, 7 classes).
            Détection d'anomalies via Isolation Forest.
          </p>
        </div>

        {/* API offline banner */}
        {apiStatus === 'offline' && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <strong>API hors ligne.</strong> Lancez le backend :
            <code className="ml-2 bg-red-900/30 px-2 py-0.5 rounded text-xs">
              cd backend && uvicorn main:app --reload
            </code>
          </div>
        )}

        {apiStatus === 'no_model' && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
            <strong>Modèle non entraîné.</strong> Lancez d'abord :
            <code className="ml-2 bg-yellow-900/30 px-2 py-0.5 rounded text-xs">
              cd backend && python train_model.py
            </code>
          </div>
        )}

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche — Stats */}
          <div className="lg:col-span-1">
            <StatsPanel />
          </div>

          {/* Colonne centrale + droite */}
          <div className="lg:col-span-2 space-y-6">
            <PredictionForm onSubmit={handlePredict} loading={loading} />

            {/* Erreur */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm animate-fade-in">
                {error}
              </div>
            )}

            {/* Résultat */}
            {result && <ResultCard result={result} />}

            {/* Placeholder si pas encore de résultat */}
            {!result && !error && !loading && (
              <div className="glass rounded-2xl p-10 text-center text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔬</span>
                </div>
                <p className="text-sm">
                  Remplissez le formulaire et cliquez sur <strong className="text-slate-400">Analyser</strong>
                </p>
                <p className="text-xs mt-1">
                  Le modèle prédit le type de lésion cutanée avec les probabilités associées
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-600">
        HAM10000 · XGBoost + Isolation Forest · Usage éducatif uniquement
      </footer>
    </div>
  );
}
