import { explainSettingsError, explainUsersError } from "./db-errors";
import type { HelpLevel } from "./help";
import type { Language } from "./languages";
import { UserFacingError } from "./sessions";
import { db } from "./supabase";

export type UserRecord = {
  id: string;
  name: string;
  name_key: string;
  passcode_hash: string;
  is_admin: boolean;
  /** Goes up when the passcode is reset, which signs the person out everywhere. */
  token_version: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  /** Chosen help level per language. Missing or null means the language's default (also before migration 0006). */
  help_es?: string | null;
  help_fa?: string | null;
};

/** Everything the sign-in and admin rules need from storage, so the rules can be tested without a database. */
export interface UserRepo {
  count(): Promise<number>;
  countAdmins(): Promise<number>;
  findByKey(nameKey: string): Promise<UserRecord | null>;
  getById(id: string): Promise<UserRecord | null>;
  list(): Promise<UserRecord[]>;
  create(input: { name: string; nameKey: string; passcodeHash: string; isAdmin: boolean }): Promise<UserRecord>;
  recordFailure(id: string, state: { failed_attempts: number; locked_until: string | null }): Promise<void>;
  recordSuccess(id: string): Promise<void>;
  /** Hand lessons and deck cards that belong to nobody (made before accounts existed) to this person. */
  adoptUnowned(userId: string): Promise<void>;
  setPasscode(id: string, passcodeHash: string): Promise<void>;
  setHelp(id: string, language: Language, help: HelpLevel): Promise<void>;
  /** Also deletes their lessons and deck (the tables cascade). */
  remove(id: string): Promise<void>;
}

/** A missing table is a setup step, not a bug: say which migration to run. */
function fail(action: string, message: string): never {
  const explained = explainUsersError(message);
  if (explained) throw new UserFacingError(explained, 503);
  throw new Error(`${action}: ${message}`);
}

export function supabaseUserRepo(): UserRepo {
  return {
    async count() {
      const { count, error } = await db().from("app_users").select("id", { count: "exact", head: true });
      if (error) fail("Could not count the people", error.message);
      return count ?? 0;
    },

    async countAdmins() {
      const { count, error } = await db().from("app_users").select("id", { count: "exact", head: true }).eq("is_admin", true);
      if (error) fail("Could not count the owners", error.message);
      return count ?? 0;
    },

    async findByKey(nameKey) {
      const { data, error } = await db().from("app_users").select("*").eq("name_key", nameKey).maybeSingle();
      if (error) fail("Could not look up the person", error.message);
      return (data as UserRecord | null) ?? null;
    },

    async getById(id) {
      const { data, error } = await db().from("app_users").select("*").eq("id", id).maybeSingle();
      if (error) fail("Could not look up the person", error.message);
      return (data as UserRecord | null) ?? null;
    },

    async list() {
      const { data, error } = await db().from("app_users").select("*").order("created_at", { ascending: true });
      if (error) fail("Could not list the people", error.message);
      return (data ?? []) as UserRecord[];
    },

    async create(input) {
      const { data, error } = await db()
        .from("app_users")
        .insert({ name: input.name.trim(), name_key: input.nameKey, passcode_hash: input.passcodeHash, is_admin: input.isAdmin })
        .select("*")
        .single();
      if (error) {
        // Two people added the same name at the same moment.
        if (/duplicate key|unique/i.test(error.message)) throw new UserFacingError("That name is already in use.", 409);
        fail("Could not add the person", error.message);
      }
      return data as UserRecord;
    },

    async recordFailure(id, state) {
      const { error } = await db().from("app_users").update(state).eq("id", id);
      if (error) fail("Could not record the wrong passcode", error.message);
    },

    async recordSuccess(id) {
      const { error } = await db().from("app_users").update({ failed_attempts: 0, locked_until: null }).eq("id", id);
      if (error) fail("Could not record the sign-in", error.message);
    },

    async adoptUnowned(userId) {
      for (const table of ["sessions", "deck_items"]) {
        const { error } = await db().from(table).update({ user_id: userId }).is("user_id", null);
        if (error) fail("Could not hand over the existing lessons", error.message);
      }
    },

    async setPasscode(id, passcodeHash) {
      const { data, error } = await db().from("app_users").select("token_version").eq("id", id).maybeSingle();
      if (error) fail("Could not reset the passcode", error.message);
      const version = Number((data as { token_version?: number } | null)?.token_version ?? 1);
      const { error: updateError } = await db()
        .from("app_users")
        .update({ passcode_hash: passcodeHash, token_version: version + 1, failed_attempts: 0, locked_until: null })
        .eq("id", id);
      if (updateError) fail("Could not reset the passcode", updateError.message);
    },

    async setHelp(id, language, help) {
      const { error } = await db()
        .from("app_users")
        .update({ [language === "fa" ? "help_fa" : "help_es"]: help })
        .eq("id", id);
      if (error) {
        const explained = explainSettingsError(error.message);
        if (explained) throw new UserFacingError(explained, 503);
        fail("Could not save the setting", error.message);
      }
    },

    async remove(id) {
      const { error } = await db().from("app_users").delete().eq("id", id);
      if (error) fail("Could not remove the person", error.message);
    },
  };
}
