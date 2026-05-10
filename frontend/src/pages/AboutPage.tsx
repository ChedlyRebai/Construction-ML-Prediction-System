function AboutPage() {
  return (
    <main className="page-shell">
      <section className="page-header panel">
        <p className="eyebrow">About</p>
        <h1>Project overview</h1>
        <p className="hero-copy">
          This frontend now uses routes so the home screen, model catalog, and dataset catalog each have their own page.
        </p>
      </section>

      <section className="section-block">
        <article className="detail-card panel">
          <h2>What is included</h2>
          <p>
            The home page introduces the project. The models pages expose the three model routes,
            and the datasets pages expose the three dataset routes. The layout is ready for future
            expansion if you want to connect these pages to real data or backend endpoints.
          </p>
        </article>
      </section>
    </main>
  );
}

export default AboutPage;
