import { DatabaseSync } from "node:sqlite";
// Real SQLite, with the subset of expo-sqlite used by the repository. No in-memory domain substitute.
export class SqliteAdapter {
  readonly native: DatabaseSync;
  constructor(path = ":memory:") {
    this.native = new DatabaseSync(path);
  }
  async execAsync(sql: string) {
    this.native.exec(sql);
  }
  async runAsync(sql: string, ...args: (string | number | null)[]) {
    return this.native.prepare(sql).run(...args);
  }
  async getFirstAsync<T>(
    sql: string,
    ...args: (string | number | null)[]
  ): Promise<T | null> {
    return (this.native.prepare(sql).get(...args) ?? null) as T | null;
  }
  async getAllAsync<T>(
    sql: string,
    ...args: (string | number | null)[]
  ): Promise<T[]> {
    return this.native.prepare(sql).all(...args) as T[];
  }
  async withExclusiveTransactionAsync(
    fn: (tx: SqliteAdapter) => Promise<void>,
  ) {
    this.native.exec("BEGIN IMMEDIATE");
    try {
      await fn(this);
      this.native.exec("COMMIT");
    } catch (e) {
      this.native.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.native.close();
  }
}
