import { FormEvent, useEffect, useMemo, useState } from 'react';
import '../styles.css';

type PredictionResponse = {
  prediction: string;
  predicted_code: number;
  confidence: number;
  probabilities: Record<string, number>;
};


type FormState = {
  temperature: string;
  humidity: string;
  vibration_level: string;
  material_usage: string;
  machinery_status: string;
  worker_count: string;
  energy_consumption: string;
  task_progress: string;
  cost_deviation: string;
  time_deviation: string;
  safety_incidents: string;
  equipment_utilization_rate: string;
  material_shortage_alert: string;
  risk_score: string;
  simulation_deviation: string;
  update_frequency: string;
  optimization_suggestion: string;
};


const DEFAULT_API_BASE_URL = 'http://localhost:5000';


const initialFormState: FormState = {
  temperature: '25',
  humidity: '60',
  vibration_level: '10',
  material_usage: '100',
  machinery_status: '1',
  worker_count: '5',
  energy_consumption: '200',
  task_progress: '0.1',
  cost_deviation: '100',
  time_deviation: '2',
  safety_incidents: '0',
  equipment_utilization_rate: '70',
  material_shortage_alert: '0',
  risk_score: '10',
  simulation_deviation: '0.5',
  update_frequency: '5',
  optimization_suggestion: 'Optimize Material Usage',
};

const optimizationOptions = [
  'Optimize Material Usage',
  'Increase Worker Count',
  'Adjust Machinery Schedule',
  'Improve Safety Measures',
  'Reduce Energy Consumption',
];

const fieldGroups = [
  [
    ['temperature', 'Temperature (°C)'],
    ['humidity', 'Humidity (%)'],
    ['vibration_level', 'Vibration Level'],
    ['material_usage', 'Material Usage'],
  ],
  [
    ['machinery_status', 'Machinery Status'],
    ['worker_count', 'Worker Count'],
    ['energy_consumption', 'Energy Consumption'],
    ['task_progress', 'Task Progress'],
  ],
  [
    ['cost_deviation', 'Cost Deviation'],
    ['time_deviation', 'Time Deviation'],
    ['safety_incidents', 'Safety Incidents'],
    ['equipment_utilization_rate', 'Equipment Utilization Rate'],
  ],
  [
    ['material_shortage_alert', 'Material Shortage Alert'],
    ['risk_score', 'Risk Score'],
    ['simulation_deviation', 'Simulation Deviation'],
    ['update_frequency', 'Update Frequency'],
  ],
] as const;

function App() {
  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
  }, []);

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const handleChange = (name: keyof FormState, value: string) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setResult(null);

    const payload = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, key === 'optimization_suggestion' ? value : Number(value)]),
    );


    try {
      const response = await fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as PredictionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Prediction request failed');
      }

      setResult(data);
      setStatus('success');
    } catch (fetchError) {
      setStatus('error');
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Construction ML Prediction</p>
        <h1>XGBoost performance predictor</h1>
        <p className="hero-copy">
          Enter the project metrics and get a live prediction from the Flask API.
        </p>
      </section>

      <section className="panel">
        <form className="prediction-form" onSubmit={handleSubmit}>
          <div className="grid-section">
            {fieldGroups.map((group, index) => (
              <div className="field-row" key={index}>
                {group.map(([name, label]) => (
                  <label className="field" key={name}>
                    <span>{label}</span>
                    <input
                      type="number"
                      step="any"
                      value={formData[name]}
                      onChange={(event) => handleChange(name, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            ))}

            <label className="field field-full">
              <span>Optimization Suggestion</span>
              <select
                value={formData.optimization_suggestion}
                onChange={(event) => handleChange('optimization_suggestion', event.target.value)}
              >
                {optimizationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="submit-button" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Predicting...' : 'Predict Performance'}
          </button>
        </form>

        {status === 'error' && <div className="error-box">{error}</div>}

        {result && (
          <section className="result-card">
            <h2>Prediction Result</h2>
            <div className="result-grid">
              <div>
                <span className="result-label">Class</span>
                <strong>{result.prediction}</strong>
              </div>
              <div>
                <span className="result-label">Confidence</span>
                <strong>{(result.confidence * 100).toFixed(2)}%</strong>
              </div>
              <div>
                <span className="result-label">Predicted Code</span>
                <strong>{result.predicted_code}</strong>
              </div>
            </div>

            <div className="probabilities">
              <h3>Probabilities</h3>
              <ul>
                {Object.entries(result.probabilities).map(([label, probability]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <span>{(probability * 100).toFixed(2)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </section>

      <footer className="footer-note">API: {apiBaseUrl}</footer>
    </main>
  );
}

export default App;
