import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "../env.server";
import nano from "nano";
import ws from "ws";

const db = drizzle({
  connection: env.DB_CONNECTION_URL,
  ws: ws,
});

const dbc = nano("https://couch.chanakancloud.net");
const pluem_messages = dbc.use("pluem_messages");

(async () => {
  await dbc.auth(env.COUCH_USERNAME, env.COUCH_PASSWORD);
})();

export { db, dbc, pluem_messages };
