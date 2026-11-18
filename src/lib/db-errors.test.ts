import { describe, expect, it } from "vitest";
import { explainSaveError } from "./db-errors";

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
