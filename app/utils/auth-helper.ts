import { getAuth as getAuthClerk } from "@clerk/react-router/ssr.server";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export async function getAuth(args: LoaderFunctionArgs) {
  const auth = await getAuthClerk(args);

  if (!auth.sessionId || !auth.orgId) {
    throw redirect("/signin");
  }

  return auth;
}
