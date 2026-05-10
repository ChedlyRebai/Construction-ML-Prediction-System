/**
 * skinApi.js — client pour Safety API (HAM10000 FastAPI)
 * URL priorité : VITE_HAM_API_URL > VITE_API_URL > localhost:8000
 */

const rawBase =
  import.meta.env.VITE_HAM_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000';

const BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const checkHealth      = ()     => request('GET',  '/health');
export const getMetadata      = ()     => request('GET',  '/metadata');
export const getDatasetSummary = ()    => request('GET',  '/dataset-summary');
export const getDatasetSample  = (n=8) => request('GET',  `/dataset-sample?limit=${n}`);
export const predict           = (d)   => request('POST', '/predict', d);

export default { checkHealth, getMetadata, getDatasetSummary, getDatasetSample, predict };
