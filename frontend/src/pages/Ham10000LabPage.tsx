import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, Database, AlertCircle, RefreshCw, ExternalLink, Table2 } from 'lucide-react';
import PredictionForm from '../components/PredictionForm';
import ResultCard from '../components/ResultCard';
import StatsPanel from '../components/StatsPanel';

// ── Types ──────────────────────────────────────────────────────────────────
type DatasetSummary = {
  file: string;
  rows: number;
  columns: string[];
  missing_values: Record<string, number>;
  class_distribution: Record<string, number>;
};

type DatasetSample = {
  limit: number;
  rows: Array<Record<string, unknown>>;
};

type ClassProbability = {
  code: string;
  name: string;
  probability: number;
  severity: string;
  color: string;
};

type ModelResult = {
  model_name: string;
  prediction: string;
  prediction_name: string;
  confidence: number;
  severity: string;
  color: string;
  description: string;
  all_probabilities: ClassProbability[];
};

type PredictionResult = {
  prediction: string;
  prediction_name: string;
  confidence: number;
  severity: string;
  color: string;
  description: string;
  is_anomaly: boolean;
  anomaly_score: number;
  all_probabilities: ClassProbability[];
  all_models: ModelResult[];
  warning?: string;
};

// ── Constante URL ──────────────────────────────────────────────────────────
const SAFETY_API =
  (import.meta.env.VITE_HAM_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8000';

// ── Sous-composant : badge statut API ─────────────────────────────────────
function ApiStatusBadge({ status }: { status: 'loading' | 'ready' | 'error' }) {
  const cfg = {
    loading: { dot: 'bg-yellow-400 animate-pulse', label: 'Connexion…' },
    ready:   { dot: 'bg-emerald-400 animate-pulse', label: 'Safety API connectée' },
    error:   { dot: 'bg-red-400', label: 'API hors ligne' },
  }[status];
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className="text-slate-300">{cfg.label}</span>
    </div>
  );
}

// ── Sous-composant : résumé dataset ───────────────────────────────────────
function DatasetSummaryPanel({ summary }: { summary: DatasetSummary }) {
  const CLASS_COLORS: Record<string, string> = {
    nv: '#10b981', mel: '#7c3aed', bkl: '#3b82f6',
    bcc: '#ef4444', akiec: '#f59e0b', vasc: '#06b6d4', df: '#ec4899',
  };
  const total = Object.values(summary.class_distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Database size={16} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Dataset Summary</h2>
          <p className="text-xs text-slate-500">{summary.file}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-purple-400">{summary.rows.toLocaleString()}</p>
          <p className="text-xs text-slate-500">observations</p>
        </div>
      </div>

      {/* Distribution des classes */}
      <div className="space-y-2">
        {Object.entries(summary.class_distribution)
          .sort(([, a], [, b]) => b - a)
          .map(([cls, count]) => {
            const pct = ((count / total) * 100).toFixed(1);
            const color = CLASS_COLORS[cls] || '#64748b';
            return (
              <div key={cls} className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-400 w-10 font-mono">{cls}</span>
                <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-300 w-16 text-right">
                  {count.toLocaleString()} ({pct}%)
                </span>
              </div>
            );
          })}
      </div>

      {/* Colonnes */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 mb-2">{summary.columns.length} colonnes</p>
        <div className="flex flex-wrap gap-1.5">
          {summary.columns.map((col) => (
            <span
              key={col}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-mono"
            >
              {col}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sous-composant : table échantillon ────────────────────────────────────
function DatasetSampleTable({ sample }: { sample: DatasetSample }) {
  const columns = sample.rows[0] ? Object.keys(sample.rows[0]) : [];
  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Table2 size={16} className="text-cyan-400" />
        </div>
        <h2 className="text-base font-semibold text-white">Dataset Sample</h2>
        <span className="ml-auto text-xs text-slate-500">{sample.limit} premières lignes</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800/80">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2.5 text-left font-semibold text-slate-300 whitespace-nowrap border-b border-slate-700/50"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/20 ${
                  i % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'
                }`}
              >
                {columns.map((col) => (
                  <td key={`${i}-${col}`} className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono">
                    {String(row[col] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function Ham10000LabPage() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [summary, setSummary]     = useState<DatasetSummary | null>(null);
  const [sample, setSample]       = useState<DatasetSample | null>(null);
  const [result, setResult]       = useState<PredictionResult | null>(null);
  const [error, setError]         = useState<string>('');
  const [loading, setLoading]     = useState(true);
  const [predicting, setPredicting] = useState(false);

  // ── Chargement initial ──────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setError('');
    setApiStatus('loading');
    try {
      const [healthRes, summaryRes, sampleRes] = await Promise.all([
        fetch(`${SAFETY_API}/health`),
        fetch(`${SAFETY_API}/dataset-summary`),
        fetch(`${SAFETY_API}/dataset-sample?limit=8`),
      ]);

      if (!healthRes.ok) throw new Error('Safety API inaccessible');
      if (!summaryRes.ok) throw new Error('Impossible de charger le dataset summary');
      if (!sampleRes.ok)  throw new Error('Impossible de charger le dataset sample');

      setSummary(await summaryRes.json() as DatasetSummary);
      setSample(await sampleRes.json() as DatasetSample);
      setApiStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion à Safety API');
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  // ── Prédiction ──────────────────────────────────────────────────────────
  const handlePredict = async (formData: {
    age: number;
    sex: string;
    localization: string;
    model: string;
  }) => {
    setPredicting(true);
    setError('');
    try {
      const res = await fetch(`${SAFETY_API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json() as PredictionResult & { detail?: string };
      if (!res.ok) throw new Error(data.detail || 'Erreur de prédiction');
      setResult(data);
      // Scroll vers le résultat
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de prédiction');
    } finally {
      setPredicting(false);
    }
  };

  // ── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden border-b border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-slate-900 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                <Activity size={28} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
                  HAM10000 Lab
                </p>
                <h1 className="text-3xl font-bold text-white leading-tight">
                  DermAI Classifier
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Classification de lésions cutanées · Random Forest / SVM / XGBoost + Isolation Forest
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ApiStatusBadge status={apiStatus} />
              <a
                href={`${SAFETY_API}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-slate-300 hover:text-white transition-colors"
              >
                <ExternalLink size={12} />
                API Docs
              </a>
              <button
                onClick={() => void loadData()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Erreur globale ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 animate-fade-in">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Erreur de connexion</p>
              <p className="text-xs mt-0.5 text-red-400">{error}</p>
              <p className="text-xs mt-1 text-red-500">
                Vérifiez que Safety API tourne sur{' '}
                <code className="font-mono bg-red-900/30 px-1 rounded">{SAFETY_API}</code>
              </p>
            </div>
          </div>
        )}

        {/* ── Layout principal : form + stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire de prédiction */}
          <div className="lg:col-span-1">
            <PredictionForm onSubmit={handlePredict} loading={predicting} />
          </div>

          {/* Stats panel */}
          <div className="lg:col-span-2">
            <StatsPanel />
          </div>
        </div>

        {/* ── Résultat de prédiction ── */}
        {(result || predicting) && (
          <div id="result-section" className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-700/50" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3">
                Résultat de l'analyse
              </span>
              <div className="h-px flex-1 bg-slate-700/50" />
            </div>
            {predicting ? (
              <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Analyse en cours…</p>
              </div>
            ) : (
              result && <ResultCard result={result} />
            )}
          </div>
        )}

        {/* ── Dataset info ── */}
        {loading ? (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Chargement des données HAM10000…</p>
          </div>
        ) : (
          <>
            {/* Séparateur */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-700/50" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3">
                Exploration du dataset
              </span>
              <div className="h-px flex-1 bg-slate-700/50" />
            </div>

            {/* Summary + Sample */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {summary && <DatasetSummaryPanel summary={summary} />}
              {sample && sample.rows.length > 0 && <DatasetSampleTable sample={sample} />}
            </div>
          </>
        )}

        {/* ── Footer disclaimer ── */}
        <p className="text-center text-xs text-slate-600 pb-4">
          ⚕️ Outil de recherche uniquement. Ne remplace pas un avis médical professionnel.
          Consultez toujours un dermatologue pour un diagnostic.
        </p>
      </div>
    </div>
  );
}
