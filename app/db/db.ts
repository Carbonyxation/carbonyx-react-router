import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "../env.server";
import ws from "ws";

const db = drizzle({
  connection: env.DB_CONNECTION_URL,
  ws: ws,
});

export { db };
