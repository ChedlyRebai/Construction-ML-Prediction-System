import { Database, Layers, Zap, BarChart2 } from 'lucide-react';

const stats = [
  {
    icon: Database,
    label: 'Observations',
    value: '10 015',
    sub: 'HAM10000 dataset',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Layers,
    label: 'Classes',
    value: '7',
    sub: 'types de lésions',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Zap,
    label: 'Accuracy',
    value: '72.4%',
    sub: 'XGBoost test set',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BarChart2,
    label: 'AUC-ROC',
    value: '0.909',
    sub: 'macro OvR',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
];

const classes = [
  { code: 'nv',    name: 'Melanocytic nevi',      pct: 66.9, color: '#10b981' },
  { code: 'mel',   name: 'Melanoma',               pct: 11.1, color: '#7c3aed' },
  { code: 'bkl',   name: 'Benign keratosis',       pct: 11.0, color: '#3b82f6' },
  { code: 'bcc',   name: 'Basal cell carcinoma',   pct:  5.1, color: '#ef4444' },
  { code: 'akiec', name: 'Actinic keratoses',      pct:  3.3, color: '#f59e0b' },
  { code: 'vasc',  name: 'Vascular lesions',       pct:  1.4, color: '#06b6d4' },
  { code: 'df',    name: 'Dermatofibroma',         pct:  1.1, color: '#ec4899' },
];

export default function StatsPanel() {
  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <Icon size={16} className={s.color} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-medium text-slate-300">{s.label}</p>
              <p className="text-xs text-slate-500">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Distribution des classes */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Distribution du dataset
        </h3>
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.code} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-xs text-slate-400 flex-1 truncate">{c.name}</span>
              <div className="w-16 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 w-10 text-right">
                {c.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparaison modèles */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Comparaison des modèles
        </h3>
        <div className="space-y-3">
          {[
            { name: 'XGBoost', acc: 72.4, auc: 90.9, time: '1.7s', active: true },
            { name: 'SVM (rbf)', acc: 71.5, auc: 85.3, time: '18.6s', active: false },
            { name: 'Random Forest', acc: 61.9, auc: 90.2, time: '1.2s', active: false },
          ].map((m) => (
            <div
              key={m.name}
              className={`p-3 rounded-lg border transition-all ${
                m.active
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-slate-700/50 bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${m.active ? 'text-blue-300' : 'text-slate-300'}`}>
                  {m.name}
                  {m.active && (
                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                      actif
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500">{m.time}</span>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Acc: <strong className="text-slate-200">{m.acc}%</strong></span>
                <span>AUC: <strong className="text-slate-200">{m.auc}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
