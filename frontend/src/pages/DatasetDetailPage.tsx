import { Link, Navigate, useParams } from 'react-router-dom';
import { datasets } from '../data';

function DatasetDetailPage() {
  const { datasetId } = useParams();
  const dataset = datasets.find((item) => item.id === datasetId);

  if (!dataset) {
    return <Navigate to="/datasets" replace />;
  }

  return (
    <main className="page-shell">
      <section className="page-header panel">
        <div className="breadcrumb-row">
          <Link to="/datasets">Datasets</Link>
          <span>/</span>
          <span>{dataset.name}</span>
        </div>
        <p className="eyebrow">Dataset detail</p>
        <h1>{dataset.name}</h1>
        <p className="hero-copy">{dataset.description}</p>
      </section>

      <section className="section-block">
        <article className="detail-card panel">
          <div className="card-topline">
            <span>{dataset.rows}</span>
            <span className="card-status">Source</span>
          </div>
          <p>{dataset.details}</p>
          <div className="detail-actions">
            <Link className="secondary-action" to="/datasets">
              Back to datasets
            </Link>
            <Link className="primary-action" to="/models">
              View models
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default DatasetDetailPage;
