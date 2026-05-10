import { Activity } from 'lucide-react';

export default function Header({ apiStatus }) {
  return (
    <header className="glass sticky top-0 z-50 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">
              DermAI Classifier
            </h1>
            <p className="text-xs text-slate-400">HAM10000 · XGBoost</p>
          </div>
        </div>

        {/* Status API */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus === 'ready'
                ? 'bg-emerald-400 animate-pulse'
                : apiStatus === 'loading'
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-red-400'
            }`}
          />
          <span className="text-slate-300 text-xs">
            {apiStatus === 'ready'
              ? 'API connectée'
              : apiStatus === 'loading'
              ? 'Connexion...'
              : 'API hors ligne'}
          </span>
        </div>
      </div>
    </header>
  );
}
