const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lesson ids are uuids. Checking first means junk in a URL is a 404, not a database error. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
