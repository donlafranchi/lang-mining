import { lockedText, type LoginFailureCode } from "./login";

const CODES: LoginFailureCode[] = ["missing", "bad_name", "wrong", "locked", "setup"];

export function isLoginFailureCode(value: unknown): value is LoginFailureCode {
  return typeof value === "string" && (CODES as string[]).includes(value);
}

/**
 * The words for a failed sign-in, chosen from a short code in the page address. Only fixed text is ever shown, so a
 * link cannot make the login page say something an attacker wrote.
 */
export function loginErrorText(code: unknown, minutes?: unknown): string | null {
  if (!isLoginFailureCode(code)) return null;
  switch (code) {
    case "missing":
      return "Type your name and password.";
    case "bad_name":
      return "That name is not allowed. Use letters, numbers and spaces.";
    case "wrong":
      return "Wrong name or password.";
    case "locked": {
      const n = Number(minutes);
      return lockedText(Number.isInteger(n) && n >= 1 && n <= 60 ? n : 15);
    }
    case "setup":
      return "Sign-in is not set up yet. Ask the owner.";
  }
}
