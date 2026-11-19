import type { UserRecord, UserRepo } from "../lib/users";

/** An in-memory UserRepo for tests, with a record of what was called. */
export function fakeUserRepo(initial: UserRecord[] = []) {
  const users = new Map<string, UserRecord>(initial.map((u) => [u.id, { ...u }]));
  const calls: string[] = [];
  let next = initial.length;

  const repo: UserRepo = {
    async count() {
      return users.size;
    },
    async findByKey(nameKey) {
      return [...users.values()].find((u) => u.name_key === nameKey) ?? null;
    },
    async getById(id) {
      return users.get(id) ?? null;
    },
    async list() {
      return [...users.values()];
    },
    async countAdmins() {
      return [...users.values()].filter((u) => u.is_admin).length;
    },
    async create(input) {
      calls.push(`create:${input.nameKey}`);
      next += 1;
      const user: UserRecord = {
        id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
        name: input.name,
        name_key: input.nameKey,
        passcode_hash: input.passcodeHash,
        is_admin: input.isAdmin,
        token_version: 1,
        failed_attempts: 0,
        locked_until: null,
        created_at: new Date().toISOString(),
      };
      users.set(user.id, user);
      return { ...user };
    },
    async recordFailure(id, state) {
      calls.push(`failure:${id}`);
      const u = users.get(id)!;
      u.failed_attempts = state.failed_attempts;
      u.locked_until = state.locked_until;
    },
    async recordSuccess(id) {
      calls.push(`success:${id}`);
      const u = users.get(id)!;
      u.failed_attempts = 0;
      u.locked_until = null;
    },
    async adoptUnowned(userId) {
      calls.push(`adopt:${userId}`);
    },
    async setPasscode(id, passcodeHash) {
      calls.push(`setPasscode:${id}`);
      const u = users.get(id)!;
      u.passcode_hash = passcodeHash;
      u.token_version += 1;
      u.failed_attempts = 0;
      u.locked_until = null;
    },
    async setHelp(id, language, help) {
      calls.push(`setHelp:${id}:${language}:${help}`);
      const u = users.get(id)!;
      if (language === "fa") u.help_fa = help;
      else u.help_es = help;
    },
    async remove(id) {
      calls.push(`remove:${id}`);
      users.delete(id);
    },
  };
  return { repo, users, calls };
}

export function userRecord(over: Partial<UserRecord> & { id: string; name: string }): UserRecord {
  return {
    name_key: over.name.toLowerCase(),
    passcode_hash: "scrypt$unused",
    is_admin: false,
    token_version: 1,
    failed_attempts: 0,
    locked_until: null,
    created_at: "2026-11-01T00:00:00.000Z",
    ...over,
  };
}
