import { env } from "~/env.server";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DB_CONNECTION_URL,
  },
});
