import { Link } from 'react-router-dom';
import { datasets, models } from '../data';

function HomePage() {
  return (
    <main className="page-shell" id="home">
      <section className="hero panel">
        <div className="hero-content">
          <p className="eyebrow">Construction ML dashboard</p>
          <h1>Three models. Three datasets. One clear home.</h1>
          <p className="hero-copy">
            Browse the project through dedicated routes for your models and datasets, all from a
            single polished home page.
          </p>

          <div className="hero-actions">
            <Link className="primary-action" to="/models">
              View models
            </Link>
            <Link className="secondary-action" to="/datasets">
              View datasets
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <span className="hero-card-label">Project overview</span>
          <strong>{models.length}</strong>
          <span>models available</span>
          <strong>{datasets.length}</strong>
          <span>datasets organized</span>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Quick access</p>
          <h2>Start here</h2>
        </div>

        <div className="card-grid three-up">
          <Link className="info-card route-card" to="/models">
            <div className="card-topline">
              <span>Model pages</span>
              <span className="card-status">3 routes</span>
            </div>
            <h3>Models</h3>
            <p>Open the catalog for all three model pages and their details.</p>
          </Link>

          <Link className="info-card route-card" to="/datasets">
            <div className="card-topline">
              <span>Dataset pages</span>
              <span className="card-status">3 routes</span>
            </div>
            <h3>Datasets</h3>
            <p>Review the three dataset pages that organize the project data sources.</p>
          </Link>

          <Link className="info-card route-card" to="/about">
            <div className="card-topline">
              <span>Project info</span>
              <span className="card-status">Overview</span>
            </div>
            <h3>About</h3>
            <p>See the context for the landing page and how it fits the project.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
