/** Shown at once while a page loads, so opening the app never looks blank. Matches the launch picture iOS shows first. */
export default function Loading() {
  return (
    <main className="shell loading-screen" role="status" aria-live="polite">
      <h1>Hand to Brain</h1>
      <p className="muted">a language learning app</p>
      <div className="loading-emoji" aria-hidden="true">
        🤦
      </div>
      <p className="muted">Doh… loading.</p>
    </main>
  );
}
