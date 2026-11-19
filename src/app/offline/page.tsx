// Shown by the service worker when a page cannot be loaded. Static and public on purpose: it holds nothing private.
// No client component: when this page is showing there may be no network for scripts either, so the button is a plain
// link to the page you were on, which makes the browser load it again.
export const metadata = { title: "Offline · lang-mining" };

export default function OfflinePage() {
  return (
    <main className="shell">
      <div className="brand">
        <h1>You are offline</h1>
      </div>
      <div className="card stack">
        <p>lang-mining needs a connection to open your lessons, deck and quiz, because they live in your account.</p>
        <p className="muted">Reconnect, then try again.</p>
        <a className="btn" href="">
          Try again
        </a>
      </div>
    </main>
  );
}
