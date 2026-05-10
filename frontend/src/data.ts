export type ModelInfo = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  details: string;
};

export type DatasetInfo = {
  id: string;
  name: string;
  rows: string;
  description: string;
  details: string;
};

export const models: ModelInfo[] = [
  {
    id: 'construction-performance-model',
    name: 'Construction Performance Model',
    type: 'XGBoost classifier',
    status: 'Production-ready',
    description: 'Predicts overall project performance from site conditions and operational signals.',
    details:
      'This is the main prediction model exposed by the backend. It focuses on tabular project signals and returns a performance class with confidence scores.',
  },
  {
    id: 'reduced-construction-model',
    name: 'Reduced Construction Model',
    type: 'Compact PyTorch network',
    status: 'Lightweight',
    description: 'A smaller alternative for faster experimentation and constrained environments.',
    details:
      'This version is useful when you want a leaner model footprint or a quick demo path without the heavier feature set.',
  },
  {
    id: 'metadata-aware-model',
    name: 'Metadata-Aware Model',
    type: 'Artifact-driven pipeline',
    status: 'Configured',
    description: 'Uses saved metadata to keep feature handling and class mapping consistent.',
    details:
      'This page represents the artifact-aware workflow that keeps feature ordering, labels, and preprocessing aligned with the saved metadata bundle.',
  },
];

export const datasets: DatasetInfo[] = [
  {
    id: 'construction-project-dataset',
    name: 'Construction Project Dataset',
    rows: 'Primary dataset',
    description: 'Core tabular dataset for project-level prediction and feature engineering.',
    details:
      'This is the main dataset in the repository and the source used to train the production model artifacts.',
  },
  {
    id: 'training-dataset',
    name: 'Training Dataset',
    rows: 'Model training',
    description: 'Used to build the main model and learn performance score patterns.',
    details:
      'This page groups the data used during model fitting and iteration, especially for experiments and retraining.',
  },
  {
    id: 'evaluation-dataset',
    name: 'Evaluation Dataset',
    rows: 'Validation and review',
    description: 'Reserved for checking prediction quality and comparing model variants.',
    details:
      'This page stands in for holdout or evaluation data that can be used to compare models and measure quality.',
  },
];

export const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Predict', href: '/predict' },
  { label: 'HAM10000 Lab', href: '/ham10000' },
  { label: 'Models', href: '/models' },
  { label: 'Datasets', href: '/datasets' },
  { label: 'About', href: '/about' },
];
