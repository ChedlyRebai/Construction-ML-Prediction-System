import { FormEvent, useEffect, useMemo, useState } from 'react';

type MetadataResponse = {
	valid_sex: string[];
	valid_localizations: string[];
	models: string[];
};

type DatasetSummary = {
	file: string;
	rows: number;
	columns: string[];
	class_distribution: Record<string, number>;
};

type PredictionResponse = {
	prediction: string;
	prediction_name: string;
	confidence: number;
	anomaly_score: number;
	is_anomaly: boolean;
	all_models: Array<{
		model_name: string;
		prediction: string;
		prediction_name: string;
		confidence: number;
	}>;
};

type DatasetSample = {
	limit: number;
	rows: Array<Record<string, unknown>>;
};

function Ham10000LabPage() {
	const hamApiBaseUrl = useMemo(() => {
		return import.meta.env.VITE_HAM_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
	}, []);

	const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
	const [summary, setSummary] = useState<DatasetSummary | null>(null);
	const [sample, setSample] = useState<DatasetSample | null>(null);
	const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
	const [error, setError] = useState<string>('');
	const [loading, setLoading] = useState<boolean>(true);
	const [predicting, setPredicting] = useState<boolean>(false);

	const [form, setForm] = useState({
		age: '45',
		sex: 'male',
		localization: 'back',
		model: 'xgboost',
	});

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError('');

			try {
				const [metadataRes, summaryRes, sampleRes] = await Promise.all([
					fetch(`${hamApiBaseUrl}/metadata`),
					fetch(`${hamApiBaseUrl}/dataset-summary`),
					fetch(`${hamApiBaseUrl}/dataset-sample?limit=8`),
				]);

				if (!metadataRes.ok || !summaryRes.ok || !sampleRes.ok) {
					throw new Error('Impossible de charger les ressources HAM10000 depuis le backend');
				}

				const metadataJson = (await metadataRes.json()) as MetadataResponse;
				const summaryJson = (await summaryRes.json()) as DatasetSummary;
				const sampleJson = (await sampleRes.json()) as DatasetSample;

				setMetadata(metadataJson);
				setSummary(summaryJson);
				setSample(sampleJson);
				setForm((current) => ({
					...current,
					sex: metadataJson.valid_sex[0] || current.sex,
					localization: metadataJson.valid_localizations[0] || current.localization,
					model: metadataJson.models[0] || current.model,
				}));
			} catch (loadError) {
				setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement HAM10000');
			} finally {
				setLoading(false);
			}
		};

		void load();
	}, [hamApiBaseUrl]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPredicting(true);
		setError('');

		try {
			const response = await fetch(`${hamApiBaseUrl}/predict`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					age: Number(form.age),
					sex: form.sex,
					localization: form.localization,
					model: form.model,
				}),
			});

			const data = (await response.json()) as PredictionResponse & { detail?: string };
			if (!response.ok) {
				throw new Error(data.detail || 'Erreur de prédiction');
			}

			setPrediction(data);
		} catch (predictError) {
			setError(predictError instanceof Error ? predictError.message : 'Erreur de prédiction');
		} finally {
			setPredicting(false);
		}
	};

	const tableColumns = sample?.rows?.[0] ? Object.keys(sample.rows[0]) : [];

	return (
		<main className="page-shell">
			<section className="page-header panel">
				<p className="eyebrow">HAM10000 Lab</p>
				<h1>Dataset access and model testing</h1>
				<p className="hero-copy">
					Frontend connecté au backend FastAPI pour explorer HAM10000 et lancer des prédictions.
				</p>
			</section>

			{error && <section className="panel">{error}</section>}

			{loading ? (
				<section className="panel">Chargement des données HAM10000...</section>
			) : (
				<>
					<section className="section-block lab-grid">
						<article className="panel">
							<h2>Tester les modèles</h2>
							<form className="lab-form" onSubmit={handleSubmit}>
								<label>
									Age
									<input
										type="number"
										min="0"
										max="100"
										value={form.age}
										onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
										required
									/>
								</label>

								<label>
									Sex
									<select
										value={form.sex}
										onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value }))}
									>
										{metadata?.valid_sex.map((sex) => (
											<option key={sex} value={sex}>
												{sex}
											</option>
										))}
									</select>
								</label>

								<label>
									Localization
									<select
										value={form.localization}
										onChange={(event) => setForm((current) => ({ ...current, localization: event.target.value }))}
									>
										{metadata?.valid_localizations.map((localization) => (
											<option key={localization} value={localization}>
												{localization}
											</option>
										))}
									</select>
								</label>

								<label>
									Model
									<select
										value={form.model}
										onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
									>
										{metadata?.models.map((model) => (
											<option key={model} value={model}>
												{model}
											</option>
										))}
									</select>
								</label>

								<button className="primary-action" type="submit" disabled={predicting}>
									{predicting ? 'Prediction en cours...' : 'Lancer prediction'}
								</button>
							</form>
						</article>

						<article className="panel">
							<h2>Resultat principal</h2>
							{prediction ? (
								<div className="result-stack">
									<p>
										Classe: <strong>{prediction.prediction}</strong> ({prediction.prediction_name})
									</p>
									<p>Confiance: {(prediction.confidence * 100).toFixed(2)}%</p>
									<p>Anomalie: {prediction.is_anomaly ? 'Oui' : 'Non'}</p>
									<p>Score anomalie: {prediction.anomaly_score.toFixed(4)}</p>

									<h3>Comparaison des modeles</h3>
									<ul className="result-list">
										{prediction.all_models.map((item) => (
											<li key={item.model_name}>
												{item.model_name}: {item.prediction} ({(item.confidence * 100).toFixed(1)}%)
											</li>
										))}
									</ul>
								</div>
							) : (
								<p>Aucune prediction pour le moment.</p>
							)}
						</article>
					</section>

					<section className="panel">
						<h2>Dataset summary</h2>
						<p>
							Fichier: {summary?.file} | Lignes: {summary?.rows} | Colonnes: {summary?.columns.length}
						</p>
						<div className="class-tags">
							{summary && Object.entries(summary.class_distribution).map(([label, count]) => (
								<span key={label} className="info-card">
									{label}: {count}
								</span>
							))}
						</div>
					</section>

					<section className="panel">
						<h2>Dataset sample</h2>
						<div className="table-wrap">
							<table>
								<thead>
									<tr>
										{tableColumns.map((column) => (
											<th key={column}>{column}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{sample?.rows.map((row, index) => (
										<tr key={index}>
											{tableColumns.map((column) => (
												<td key={`${index}-${column}`}>{String(row[column] ?? '')}</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</>
			)}
		</main>
	);
}

export default Ham10000LabPage;
