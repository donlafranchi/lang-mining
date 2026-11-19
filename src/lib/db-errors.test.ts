import { describe, expect, it } from "vitest";
import { explainDeckError, explainSaveError, explainUsersError } from "./db-errors";

describe("explainSaveError", () => {
  it("points a missing language column at migration 0002", () => {
    const text = explainSaveError("Could not find the 'language' column of 'sessions' in the schema cache");
    expect(text).toMatch(/0002_language\.sql/);
  });

  it("points the delete_after not-null rule at migration 0003", () => {
    const text = explainSaveError('null value in column "delete_after" of relation "source_texts" violates not-null constraint');
    expect(text).toMatch(/0003_keep_source\.sql/);
  });

  it("returns null for any other error so the generic message is used", () => {
    expect(explainSaveError("connection refused")).toBeNull();
    expect(explainSaveError("")).toBeNull();
    expect(explainSaveError("duplicate key value violates unique constraint")).toBeNull();
  });

  it("does not match unrelated mentions of language", () => {
    expect(explainSaveError("invalid input syntax for type language")).toBeNull();
  });
});

describe("explainDeckError", () => {
  it("points a missing deck table at migration 0004", () => {
    expect(explainDeckError("Could not find the table 'public.deck_items' in the schema cache")).toMatch(/0004_deck\.sql/);
    expect(explainDeckError('relation "deck_items" does not exist')).toMatch(/0004_deck\.sql/);
  });

  it("returns null for any other error", () => {
    expect(explainDeckError("connection refused")).toBeNull();
    expect(explainDeckError("")).toBeNull();
    expect(explainDeckError("duplicate key value violates unique constraint")).toBeNull();
  });

  it("does not match a missing table that is not the deck", () => {
    expect(explainDeckError('relation "other_table" does not exist')).toBeNull();
  });
});

describe("explainUsersError", () => {
  it("points a missing accounts table or user column at migration 0005", () => {
    expect(explainUsersError("Could not find the table 'public.app_users' in the schema cache")).toMatch(/0005_users\.sql/);
    expect(explainUsersError('relation "app_users" does not exist')).toMatch(/0005_users\.sql/);
    expect(explainUsersError("Could not find the 'user_id' column of 'sessions' in the schema cache")).toMatch(/0005_users\.sql/);
    expect(explainUsersError('column "user_id" does not exist')).toMatch(/0005_users\.sql/);
  });

  it("returns null for other errors", () => {
    expect(explainUsersError("connection refused")).toBeNull();
    expect(explainUsersError("")).toBeNull();
    expect(explainUsersError('relation "other_table" does not exist')).toBeNull();
    expect(explainUsersError("duplicate key value violates unique constraint")).toBeNull();
  });
});
