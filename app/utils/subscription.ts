import type { LoaderFunctionArgs } from "react-router";
import { getAuth } from "~/utils/auth-helper";
import { getStripeSubByOrgId } from "./kv";
import { env } from "~/env.server";

export async function getSubTier(args: LoaderFunctionArgs) {
  const auth = await getAuth(args);
  if (!auth.orgId) return null;
  const sub = await getStripeSubByOrgId(auth.orgId);

  if (sub?.status === "active") return "Standard"; // Enterprise plan comes later
  return "Demo";
}

export async function getSubInformation(args: LoaderFunctionArgs) {
  const auth = await getAuth(args);
  if (!auth.orgId) return null;
  const sub = await getStripeSubByOrgId(auth.orgId);

  if (!sub || sub?.status !== "active") {
    return { plan: "Demo" };
  }

  let subinfo = {
    plan: sub.status === "active" ? "Standard" : "Demo", // Enterprise plan to be added
    pricing:
      sub.priceId === env.ANNUALLY_STANDARD_PRICE_ID ? "40,000" : "4,000",
    pricing_monthly:
      sub.priceId === env.ANNUALLY_STANDARD_PRICE_ID ? "3,333.33" : "4,000",
    billing_recurrent:
      sub.priceId === env.ANNUALLY_STANDARD_PRICE_ID ? "annually" : "monthly",
  };

  return subinfo;
}
