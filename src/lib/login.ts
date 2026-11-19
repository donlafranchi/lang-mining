import { safeEqual } from "./gate";
import { afterFailure, isLocked, minutesLeft } from "./lockout";
import { hashPasscode, verifyPasscode } from "./passwords";
import { nameKey, validateName } from "./user-names";
import type { UserRecord, UserRepo } from "./users";

/** Why a sign-in failed, in a form a page can turn into its own words. */
export type LoginFailureCode = "missing" | "bad_name" | "wrong" | "locked" | "setup";

export type LoginResult =
  | { ok: true; user: UserRecord; created: boolean }
  | { ok: false; status: 400 | 401 | 429 | 503; code: LoginFailureCode; message: string; minutes?: number };

const WRONG = "Wrong name or password.";

// A real hash to check against when the name is unknown, so a wrong name takes as long as a wrong passcode.
let dummyHash: Promise<string> | null = null;
function dummy(): Promise<string> {
  dummyHash ??= hashPasscode("not-a-real-passcode");
  return dummyHash;
}

/**
 * Sign-in. With nobody registered yet, the owner passcode (APP_PASSCODE) plus a name creates the owner.
 * After that only a registered name and its own passcode work, and 5 wrong passcodes lock that account for a while.
 */
export async function attemptLogin(
  repo: UserRepo,
  input: { name: string; passcode: string },
  ctx: { bootstrapPasscode: string | undefined; now: Date },
): Promise<LoginResult> {
  if (input.name.trim() === "" || input.passcode === "") {
    return { ok: false, status: 400, code: "missing", message: "Type your name and password." };
  }

  if ((await repo.count()) === 0) return bootstrapOwner(repo, input, ctx);

  const user = await repo.findByKey(nameKey(input.name));
  if (!user) {
    await verifyPasscode(input.passcode, await dummy());
    return { ok: false, status: 401, code: "wrong", message: WRONG };
  }

  if (isLocked(user.locked_until, ctx.now)) {
    return lockedResult(user.locked_until!, ctx.now);
  }

  if (!(await verifyPasscode(input.passcode, user.passcode_hash))) {
    const state = afterFailure(user.failed_attempts, ctx.now);
    await repo.recordFailure(user.id, state);
    if (state.locked_until) return lockedResult(state.locked_until, ctx.now);
    return { ok: false, status: 401, code: "wrong", message: WRONG };
  }

  if (user.failed_attempts > 0 || user.locked_until) await repo.recordSuccess(user.id);
  return { ok: true, user, created: false };
}

function lockedResult(lockedUntil: string, now: Date): LoginResult {
  const minutes = minutesLeft(lockedUntil, now);
  return { ok: false, status: 429, code: "locked", message: lockedText(minutes), minutes };
}

export function lockedText(minutes: number): string {
  return `Too many wrong tries. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function bootstrapOwner(
  repo: UserRepo,
  input: { name: string; passcode: string },
  ctx: { bootstrapPasscode: string | undefined },
): Promise<LoginResult> {
  if (!ctx.bootstrapPasscode) return { ok: false, status: 503, code: "setup", message: "APP_PASSCODE is not set." };
  if (!safeEqual(input.passcode, ctx.bootstrapPasscode)) return { ok: false, status: 401, code: "wrong", message: "Wrong password." };

  const nameProblem = validateName(input.name);
  if (nameProblem) return { ok: false, status: 400, code: "bad_name", message: nameProblem };

  const user = await repo.create({
    name: input.name.trim(),
    nameKey: nameKey(input.name),
    passcodeHash: await hashPasscode(input.passcode),
    isAdmin: true,
  });
  // Lessons and deck cards made before accounts existed belong to the owner.
  await repo.adoptUnowned(user.id);
  return { ok: true, user, created: true };
}
