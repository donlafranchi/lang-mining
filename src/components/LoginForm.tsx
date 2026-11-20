// A plain HTML form on purpose, with no script. Safari on iPhone offers to save and fill the name and password only for a
// real form submission that lands on a new page, and the standard field names and autocomplete hints help it recognise them.
import Link from "next/link";

export function LoginForm(props: { firstRun: boolean; error: string | null }) {
  return (
    <form className="stack" method="post" action="/api/login">
      {props.firstRun && (
        <p className="muted">
          First time here. Type the name you want and the password you have been using. That creates the owner account,
          and you can add other people from the Admin page.
        </p>
      )}
      <label className="field" htmlFor="username">
        Name
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          autoFocus
        />
      </label>
      <label className="field" htmlFor="password">
        Password
        <input id="password" name="password" type="password" autoComplete="current-password" enterKeyHint="go" required />
      </label>
      {props.error && (
        <p className="error" role="alert">
          {props.error}
        </p>
      )}
      <button className="btn" type="submit">
        Sign in
      </button>
      {!props.firstRun && (
        <Link href="/signup" className="muted">
          New here? Create an account
        </Link>
      )}
    </form>
  );
}
