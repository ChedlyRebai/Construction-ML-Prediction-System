import { Link, Navigate, useParams } from 'react-router-dom';
import { models } from '../data';

function ModelDetailPage() {
  const { modelId } = useParams();
  const model = models.find((item) => item.id === modelId);

  if (!model) {
    return <Navigate to="/models" replace />;
  }

  return (
    <main className="page-shell">
      <section className="page-header panel">
        <div className="breadcrumb-row">
          <Link to="/models">Models</Link>
          <span>/</span>
          <span>{model.name}</span>
        </div>
        <p className="eyebrow">Model detail</p>
        <h1>{model.name}</h1>
        <p className="hero-copy">{model.description}</p>
      </section>

      <section className="section-block">
        <article className="detail-card panel">
          <div className="card-topline">
            <span>{model.type}</span>
            <span className="card-status">{model.status}</span>
          </div>
          <p>{model.details}</p>
          <div className="detail-actions">
            <Link className="secondary-action" to="/models">
              Back to models
            </Link>
            <Link className="primary-action" to="/datasets">
              View datasets
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default ModelDetailPage;
