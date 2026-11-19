/** Shown at once while a page loads, so opening the app never looks blank. */
export default function Loading() {
  return (
    <main className="shell loading-screen" role="status" aria-live="polite">
      <div className="loading-emoji" aria-hidden="true">
        🤦
      </div>
      <h1>Hand to Brain</h1>
      <p className="muted">Doh… loading.</p>
    </main>
  );
}
