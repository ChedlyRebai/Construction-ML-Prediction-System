import { Link } from 'react-router-dom';
import { models } from '../data';

function ModelsPage() {
  return (
    <main className="page-shell">
      <section className="page-header panel">
        <div>
          <p className="eyebrow">Models</p>
          <h1>Model catalog</h1>
          <p className="hero-copy">
            All three model routes in one place, each with a short summary and a dedicated detail page.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="card-grid three-up">
          {models.map((model) => (
            <Link className="info-card route-card" key={model.id} to={`/models/${model.id}`}>
              <div className="card-topline">
                <span>{model.type}</span>
                <span className="card-status">{model.status}</span>
              </div>
              <h3>{model.name}</h3>
              <p>{model.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ModelsPage;
