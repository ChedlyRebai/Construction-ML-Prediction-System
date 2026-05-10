import { Link } from 'react-router-dom';
import { datasets } from '../data';

function DatasetsPage() {
  return (
    <main className="page-shell">
      <section className="page-header panel">
        <div>
          <p className="eyebrow">Datasets</p>
          <h1>Dataset catalog</h1>
          <p className="hero-copy">
            The project has three dataset routes, each organized around a different stage of the workflow.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="card-grid three-up">
          {datasets.map((dataset) => (
            <Link className="info-card route-card" key={dataset.id} to={`/datasets/${dataset.id}`}>
              <div className="card-topline">
                <span>{dataset.rows}</span>
                <span className="card-status">Dataset</span>
              </div>
              <h3>{dataset.name}</h3>
              <p>{dataset.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DatasetsPage;
