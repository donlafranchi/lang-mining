import { hashPasscode, validatePasscode } from "./passwords";
import { nameKey, validateName } from "./user-names";
import type { UserRecord, UserRepo } from "./users";

export type Actor = { id: string; isAdmin: boolean };

export type AdminResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409; message: string };

const NOT_ALLOWED: AdminResult<never> = { ok: false, status: 403, message: "Only the owner can do that." };

/** Add a person. Only an admin can. */
export async function addUser(
  repo: UserRepo,
  actor: Actor,
  input: { name: string; passcode: string },
): Promise<AdminResult<UserRecord>> {
  if (!actor.isAdmin) return NOT_ALLOWED;
  const nameProblem = validateName(input.name);
  if (nameProblem) return { ok: false, status: 400, message: nameProblem };
  const passcodeProblem = validatePasscode(input.passcode);
  if (passcodeProblem) return { ok: false, status: 400, message: passcodeProblem };
  if (await repo.findByKey(nameKey(input.name))) return { ok: false, status: 409, message: "That name is already in use." };

  const user = await repo.create({
    name: input.name.trim(),
    nameKey: nameKey(input.name),
    passcodeHash: await hashPasscode(input.passcode),
    isAdmin: false,
  });
  return { ok: true, data: user };
}

/** Remove a person and, with them, their lessons and deck. You cannot remove yourself or the last owner. */
export async function removeUser(repo: UserRepo, actor: Actor, targetId: string): Promise<AdminResult> {
  if (!actor.isAdmin) return NOT_ALLOWED;
  if (targetId === actor.id) return { ok: false, status: 400, message: "You cannot remove yourself." };
  const target = await repo.getById(targetId);
  if (!target) return { ok: false, status: 404, message: "That person is already gone." };
  if (target.is_admin && (await repo.countAdmins()) <= 1) {
    return { ok: false, status: 400, message: "You cannot remove the last owner." };
  }
  await repo.remove(targetId);
  return { ok: true, data: undefined };
}

/** Give someone a new password. This also signs them out everywhere. */
export async function resetPasscode(
  repo: UserRepo,
  actor: Actor,
  targetId: string,
  passcode: string,
): Promise<AdminResult> {
  if (!actor.isAdmin) return NOT_ALLOWED;
  const problem = validatePasscode(passcode);
  if (problem) return { ok: false, status: 400, message: problem };
  if (!(await repo.getById(targetId))) return { ok: false, status: 404, message: "That person is already gone." };
  await repo.setPasscode(targetId, await hashPasscode(passcode));
  return { ok: true, data: undefined };
}
