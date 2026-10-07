import { neon } from "@neondatabase/serverless";

let query;

export function getBleadQuery() {
  if (query) return query;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  query = (text, values = []) => sql.query(text, values);
  return query;
}
