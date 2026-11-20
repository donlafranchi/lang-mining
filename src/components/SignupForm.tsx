// A plain HTML form on purpose, like the sign-in form: Safari on iPhone offers to save the new password only for a real
// form submission that lands on a new page. autocomplete="new-password" is what makes it offer a strong one.
import Link from "next/link";

export function SignupForm({
  error,
  needCode,
}: {
  error: string | null;
  needCode: boolean;
}) {
  return (
    <form className="stack" method="post" action="/api/signup">
      <p className="muted">
        Make your own account.
        {needCode ? " You need the invite code the owner gave you." : ""}
      </p>
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
          required
          autoFocus
        />
      </label>
      <label className="field" htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </label>
      {needCode && (
        <label className="field" htmlFor="code">
          Invite code
          <input
            id="code"
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" type="submit">
        Create account
      </button>
      <Link href="/login" className="muted">
        Already have an account? Sign in
      </Link>
    </form>
  );
}
