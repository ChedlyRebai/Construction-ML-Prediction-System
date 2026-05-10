import { useState } from 'react';
import { User, MapPin, Search, RotateCcw, Cpu } from 'lucide-react';

const LOCALIZATIONS = [
  'abdomen', 'acral', 'back', 'chest', 'ear', 'face',
  'foot', 'genital', 'hand', 'lower extremity', 'neck',
  'scalp', 'trunk', 'unknown', 'upper extremity',
];

const LOCALIZATION_LABELS = {
  abdomen: 'Abdomen', acral: 'Acral (extrémités)', back: 'Dos',
  chest: 'Poitrine', ear: 'Oreille', face: 'Visage',
  foot: 'Pied', genital: 'Génital', hand: 'Main',
  'lower extremity': 'Membre inférieur', neck: 'Cou',
  scalp: 'Cuir chevelu', trunk: 'Tronc',
  unknown: 'Inconnu', 'upper extremity': 'Membre supérieur',
};

// Modèles exactement comme dans le notebook
const MODELS = [
  {
    value: 'xgboost',
    label: 'XGBoost',
    acc: '71.7%', f1: '0.375', auc: '0.908',
    badge: 'Meilleure accuracy',
    color: 'blue',
  },
  {
    value: 'random_forest',
    label: 'Random Forest',
    acc: '61.9%', f1: '0.383', auc: '0.902',
    badge: '⭐ Meilleur F1 macro',
    color: 'emerald',
  },
  {
    value: 'svm',
    label: 'SVM (rbf)',
    acc: '71.5%', f1: '0.295', auc: '0.853',
    badge: '',
    color: 'orange',
  },
];

export default function PredictionForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    age: '',
    sex: '',
    localization: '',
    model: 'xgboost',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.age || form.age < 0 || form.age > 100) e.age = 'Âge requis (0–100)';
    if (!form.sex)          e.sex = 'Sexe requis';
    if (!form.localization) e.localization = 'Localisation requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, age: parseFloat(form.age) });
  };

  const handleReset = () => {
    setForm({ age: '', sex: '', localization: '', model: 'xgboost' });
    setErrors({});
  };

  const inputClass = (field) =>
    `w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-white placeholder-slate-500
     focus:outline-none focus:ring-2 transition-all duration-200
     ${errors[field]
       ? 'border-red-500 focus:ring-red-500/30'
       : 'border-slate-600 focus:ring-blue-500/30 focus:border-blue-500'}`;

  return (
    <div className="glass rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <User size={16} className="text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Informations patient</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Âge */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Âge du patient</label>
          <input
            type="number" min="0" max="100" placeholder="Ex: 45"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className={inputClass('age')}
          />
          {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
        </div>

        {/* Sexe */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Sexe</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'male',    label: 'Homme' },
              { value: 'female',  label: 'Femme' },
              { value: 'unknown', label: 'Inconnu' },
            ].map((opt) => (
              <button
                key={opt.value} type="button"
                onClick={() => setForm({ ...form, sex: opt.value })}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border
                  ${form.sex === opt.value
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 border-slate-600 text-slate-300 hover:border-slate-500'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {errors.sex && <p className="text-red-400 text-xs mt-1">{errors.sex}</p>}
        </div>

        {/* Localisation */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <MapPin size={14} className="inline mr-1" />
            Localisation de la lésion
          </label>
          <select
            value={form.localization}
            onChange={(e) => setForm({ ...form, localization: e.target.value })}
            className={`${inputClass('localization')} cursor-pointer`}
          >
            <option value="" disabled className="bg-slate-800">Sélectionner une localisation...</option>
            {LOCALIZATIONS.map((loc) => (
              <option key={loc} value={loc} className="bg-slate-800">
                {LOCALIZATION_LABELS[loc]}
              </option>
            ))}
          </select>
          {errors.localization && <p className="text-red-400 text-xs mt-1">{errors.localization}</p>}
        </div>

        {/* Sélection du modèle — identique aux 3 modèles du notebook */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Cpu size={14} className="inline mr-1" />
            Modèle de classification
          </label>
          <div className="space-y-2">
            {MODELS.map((m) => (
              <button
                key={m.value} type="button"
                onClick={() => setForm({ ...form, model: m.value })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border
                  text-left transition-all duration-200
                  ${form.model === m.value
                    ? 'bg-slate-700/60 border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center
                    ${form.model === m.value ? 'border-blue-400' : 'border-slate-500'}`}>
                    {form.model === m.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                    {m.badge && (
                      <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 space-x-3">
                  <span>Acc <strong className="text-slate-200">{m.acc}</strong></span>
                  <span>F1 <strong className="text-slate-200">{m.f1}</strong></span>
                  <span>AUC <strong className="text-slate-200">{m.auc}</strong></span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6
                       bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
                       text-white font-semibold rounded-xl transition-all duration-200
                       shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyse...
              </>
            ) : (
              <>
                <Search size={16} />
                Analyser
              </>
            )}
          </button>
          <button
            type="button" onClick={handleReset}
            className="py-3 px-4 glass rounded-xl text-slate-400 hover:text-white
                       transition-all duration-200 hover:bg-slate-700/50"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
