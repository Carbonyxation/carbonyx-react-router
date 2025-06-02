import { drizzle } from "drizzle-orm/libsql/web";
import { env } from "../env.server";
import nano from "nano";

const db = drizzle({
  connection: {
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
});

const dbc = nano("https://couch.chanakancloud.net");
const pluem_messages = dbc.use("pluem_messages");

(async () => {
  await dbc.auth(env.COUCH_USERNAME, env.COUCH_PASSWORD);
})();

export { db, dbc, pluem_messages };
