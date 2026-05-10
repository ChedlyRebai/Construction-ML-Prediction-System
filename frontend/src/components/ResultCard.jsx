import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Shield, GitCompare } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

const SEVERITY_CONFIG = {
  low:      { label: 'Bénin',    icon: CheckCircle,  border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300' },
  moderate: { label: 'Modéré',   icon: AlertTriangle, border: 'border-yellow-500/30',  badge: 'bg-yellow-500/20 text-yellow-300'  },
  high:     { label: 'Élevé',    icon: AlertTriangle, border: 'border-orange-500/30',  badge: 'bg-orange-500/20 text-orange-300'  },
  critical: { label: 'Critique', icon: XCircle,       border: 'border-red-500/30',     badge: 'bg-red-500/20 text-red-300'        },
};

// Jauge circulaire de confiance
function ConfidenceGauge({ value }) {
  const pct  = Math.round(value * 100);
  const fill = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-28 h-28 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
          startAngle={90} endAngle={-270} data={[{ value: pct, fill }]}>
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#1e293b' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{pct}%</span>
        <span className="text-xs text-slate-400">confiance</span>
      </div>
    </div>
  );
}

// Barre de probabilité par classe
function ProbabilityBar({ item }) {
  const pct = Math.round(item.probability * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-28 truncate">{item.name}</span>
      <div className="flex-1 bg-slate-700/50 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: item.color }} />
      </div>
      <span className="text-xs font-mono text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  );
}

// Carte de comparaison d'un modèle (cell 26 du notebook)
function ModelCompareCard({ m }) {
  const isActive = m.model_name === 'XGBoost' || m.model_name === 'Random Forest';
  const pct = Math.round(m.confidence * 100);
  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-200">{m.model_name}</span>
        <span className="text-xs font-mono" style={{ color: m.color }}>
          {pct}% confiance
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: m.color }}
        />
        <span className="text-sm font-medium text-white">{m.prediction_name}</span>
        <span className="text-xs text-slate-500 font-mono">[{m.prediction}]</span>
      </div>
      {/* Mini barre top-3 */}
      <div className="mt-2 space-y-1">
        {m.all_probabilities.slice(0, 3).map((p) => (
          <div key={p.code} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16 truncate">{p.code}</span>
            <div className="flex-1 bg-slate-700/40 rounded-full h-1 overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: `${Math.round(p.probability * 100)}%`, backgroundColor: p.color }} />
            </div>
            <span className="text-xs font-mono text-slate-400 w-8 text-right">
              {Math.round(p.probability * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultCard({ result }) {
  if (!result) return null;

  const sev    = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.low;
  const SevIcon = sev.icon;

  return (
    <div className={`glass rounded-2xl p-6 border ${sev.border} animate-slide-up`}>

      {/* Warning banner */}
      {result.warning && (
        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{result.warning}</span>
        </div>
      )}

      {/* Résultat principal */}
      <div className="flex items-start gap-4 mb-6">
        <ConfidenceGauge value={result.confidence} />
        <div className="flex-1 pt-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
              <SevIcon size={10} className="inline mr-1" />
              {sev.label}
            </span>
            {result.is_anomaly && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                ⚠ Profil atypique
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white leading-tight">{result.prediction_name}</h3>
          <p className="text-xs font-mono text-slate-500 mt-0.5 mb-2">[{result.prediction}]</p>
          <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>
        </div>
      </div>

      {/* Isolation Forest (cell 19 du notebook) */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 mb-5">
        <Shield size={16} className={result.is_anomaly ? 'text-purple-400' : 'text-emerald-400'} />
        <div>
          <p className="text-xs font-medium text-slate-300">Isolation Forest (détection d'anomalies)</p>
          <p className="text-xs text-slate-500">
            Score : {result.anomaly_score.toFixed(3)} ·{' '}
            {result.is_anomaly
              ? '⚠️ Profil atypique détecté (contamination=5%)'
              : '✅ Profil dans la distribution normale'}
          </p>
        </div>
      </div>

      {/* Distribution des probabilités */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-300">Distribution des probabilités — 7 classes</h4>
        </div>
        <div className="space-y-2.5">
          {result.all_probabilities.map((item) => (
            <ProbabilityBar key={item.code} item={item} />
          ))}
        </div>
      </div>

      {/* Comparaison des 3 modèles — cell 26 du notebook */}
      {result.all_models && result.all_models.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GitCompare size={14} className="text-slate-400" />
            <h4 className="text-sm font-semibold text-slate-300">
              Comparaison des 3 modèles (Random Forest / SVM / XGBoost)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {result.all_models.map((m) => (
              <ModelCompareCard key={m.model_name} m={m} />
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-5 text-xs text-slate-500 text-center leading-relaxed">
        ⚕️ Ce résultat est indicatif. Consultez toujours un dermatologue pour un diagnostic médical.
      </p>
    </div>
  );
}
