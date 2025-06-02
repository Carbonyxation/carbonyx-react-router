import type { Route } from "./+types/success";
import { getAuth } from "@clerk/react-router/ssr.server";

import { redirect } from "react-router";
import { STRIPE_CUSTOMER_ID_KV, syncStripeDataToKV } from "~/utils/kv";

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args);

  if (!auth.userId || !auth.sessionId || !auth.orgId) {
    throw redirect("/");
  }

  const stripeCustomerId = await STRIPE_CUSTOMER_ID_KV.get(auth.orgId);

  if (!stripeCustomerId) {
    return redirect("/");
  }

  await syncStripeDataToKV(stripeCustomerId);
  return redirect("/");
}

export default function SuccesCheckout() {
  return (
    <div>
      <span>Success!</span>
    </div>
  );
}
