import { safeEqual } from "./gate";
import { hashPasscode, validatePasscode } from "./passwords";
import { nameKey, validateName } from "./user-names";
import type { UserRecord, UserRepo } from "./users";

export type SignupFailureCode = "missing" | "closed" | "bad_code" | "bad_name" | "bad_password" | "taken" | "no_owner";

export type SignupResult =
  | { ok: true; user: UserRecord }
  | { ok: false; status: 400 | 403 | 409 | 503; code: SignupFailureCode; message: string };

const TEXT: Record<SignupFailureCode, string> = {
  missing: "Fill in your name and a password (and the invite code, if you were given one).",
  closed: "Sign-up is closed right now. Ask the owner for an account.",
  bad_code: "That invite code is not right.",
  bad_name: "That name is not allowed. Use 40 characters or fewer, with no control characters.",
  bad_password: "Use a password of at least 6 characters.",
  taken: "That name is already in use. Pick another.",
  no_owner: "The owner has not signed in yet. Try again later.",
};

export function signupErrorText(code: unknown): string | null {
  return typeof code === "string" && code in TEXT ? TEXT[code as SignupFailureCode] : null;
}

const fail = (status: 400 | 403 | 409 | 503, code: SignupFailureCode): SignupResult => ({ ok: false, status, code, message: TEXT[code] });

/**
 * Create your own account. Open to anyone with the link by default (Don's call). If the owner sets SIGNUP_CODE,
 * the invite code is required too, which stops strangers making accounts and spending the lesson budget. Always a normal user, never an owner.
 */
export async function signUp(
  repo: UserRepo,
  input: { name: string; passcode: string; code: string },
  ctx: { signupCode: string | undefined },
): Promise<SignupResult> {
  const needCode = !!ctx.signupCode;
  if (input.name.trim() === "" || input.passcode === "" || (needCode && input.code === "")) return fail(400, "missing");
  if (needCode && !safeEqual(input.code.trim(), ctx.signupCode!)) return fail(403, "bad_code");
  if (validateName(input.name)) return fail(400, "bad_name");
  if (validatePasscode(input.passcode)) return fail(400, "bad_password");
  // The first account is the owner and is made by signing in with APP_PASSCODE, never here.
  if ((await repo.count()) === 0) return fail(503, "no_owner");
  if (await repo.findByKey(nameKey(input.name))) return fail(409, "taken");

  const user = await repo.create({
    name: input.name.trim(),
    nameKey: nameKey(input.name),
    passcodeHash: await hashPasscode(input.passcode),
    isAdmin: false,
  });
  return { ok: true, user };
}
