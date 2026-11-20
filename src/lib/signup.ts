import { safeEqual } from "./gate";
import { hashPasscode, validatePasscode } from "./passwords";
import { nameKey, validateName } from "./user-names";
import type { UserRecord, UserRepo } from "./users";

export type SignupFailureCode = "missing" | "closed" | "bad_code" | "bad_name" | "bad_password" | "taken" | "no_owner";

export type SignupResult =
  | { ok: true; user: UserRecord }
  | { ok: false; status: 400 | 403 | 409 | 503; code: SignupFailureCode; message: string };

const TEXT: Record<SignupFailureCode, string> = {
  missing: "Fill in your name, a password and the invite code.",
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
 * Create your own account. Needs the invite code the owner set (SIGNUP_CODE), so a stranger who finds the link cannot
 * make accounts and spend the owner's lesson budget. With no code set, sign-up is closed. Always a normal user, never an owner.
 */
export async function signUp(
  repo: UserRepo,
  input: { name: string; passcode: string; code: string },
  ctx: { signupCode: string | undefined },
): Promise<SignupResult> {
  if (!ctx.signupCode) return fail(503, "closed");
  if (input.name.trim() === "" || input.passcode === "" || input.code === "") return fail(400, "missing");
  if (!safeEqual(input.code.trim(), ctx.signupCode)) return fail(403, "bad_code");
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
