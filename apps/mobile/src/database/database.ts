import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { migrate } from "./migrations";
let opening: Promise<SQLiteDatabase> | undefined;
export function database() {
  opening ??= (async () => {
    const db = await openDatabaseAsync("memocycle.db");
    await db.execAsync(
      "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
    );
    await migrate(db);
    return db;
  })();
  return opening;
}
