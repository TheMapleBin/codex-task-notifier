import { DatabaseSync } from "node:sqlite";

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function selectSafeThreadName(row) {
  const explicitName = nonEmpty(row?.name);
  if (explicitName) return explicitName;
  return nonEmpty(row?.title);
}

export function createThreadNameResolver(databasePath, { Database = DatabaseSync } = {}) {
  return async function resolveThreadName(threadId) {
    if (!threadId) return null;
    let database;
    try {
      database = new Database(databasePath, { readOnly: true });
      const row = database.prepare("select name, title, preview, first_user_message from threads where id = ?").get(threadId);
      return selectSafeThreadName(row);
    } catch {
      return null;
    } finally {
      database?.close();
    }
  };
}
