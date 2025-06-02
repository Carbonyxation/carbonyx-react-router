import { css } from "carbonyxation/css";
import { flex, hstack, vstack } from "carbonyxation/patterns";
import { button } from "~/components/button";
import InputEntry from "~/components/input-entry";
import type { Route } from "./+types/org-billing";

import { getAuth } from "@clerk/react-router/ssr.server";
import { createClerkClient } from "@clerk/backend";
import { env } from "~/env.server";

import { redirect } from "react-router";
import { useEffect, useState } from "react";
import { STRIPE_CUSTOMER_ID_KV } from "~/utils/kv";

import { toast } from "sonner";
import { stripe } from "~/stripe";
import { getSubInformation } from "~/utils/subscription";

export async function loader(args: Route.LoaderArgs) {
  const auth = await getAuth(args);

  if (!auth.orgId) return redirect("/");

  const org = await createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  }).organizations.getOrganization({
    organizationId: auth.orgId,
  });

  const billingEmail = org.privateMetadata.billingEmail as string;
  const subscription = await getSubInformation(args);

  if (!subscription) return redirect("/");

  return { billingEmail, subscription };
}

export async function action(args: Route.ActionArgs) {
  const auth = await getAuth(args);

  const formData = await args.request.formData();
  const billingEmail = formData.get("billing_email");

  if (!auth.orgId) return redirect("/signin");

  const stripeCustomerId = await STRIPE_CUSTOMER_ID_KV.get(auth.orgId);

  // update internal database to store organization billing email to be use for first subscription (before being a customer)
  await createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  }).organizations.updateOrganizationMetadata(auth.orgId, {
    privateMetadata: {
      billingEmail: billingEmail?.toString(),
    },
  });

  if (!stripeCustomerId)
    return { success: true, updated_stripe_customer: false };

  // update current customer information if already is a customer
  stripe.customers.update(stripeCustomerId, {
    email: billingEmail?.toString(),
  });

  return { success: true, updated_stripe_customer: true };
}

export default function OrganizationSetting({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const [billingEmail, setBillingEmail] = useState(loaderData.billingEmail);

  useEffect(() => {
    if (actionData) {
      let description = "";
      if (actionData?.success) {
        description = "Billing Information Updated 🎉";
      } else {
        description =
          "Billing Information Update Failed. Please try again later.";
      }
      if (description.length > 0) {
        toast(description);
      }
    }
  }, [actionData]);

  return (
    <div
      className={flex({
        w: "full",
        p: 4,
        flexDirection: "column",
        gap: 4,
        h: "full",
      })}
    >
      <div
        className={hstack({
          justifyContent: "space-between",
        })}
      >
        <span
          className={css({
            fontSize: "3xl",
            fontWeight: "bold",
          })}
        >
          Organization Billing
        </span>
      </div>
      <div
        className={css({
          p: 4,
          border: "1px solid black",
          rounded: "lg",
          bgColor: "green.50",
          color: "black",
        })}
      >
        <span
          className={flex({
            fontSize: "2xl",
            fontWeight: "bold",
            flexDir: "column",
          })}
        >
          Current Plan
        </span>
        <span>
          Your organization is currently on the {loaderData.subscription?.plan}{" "}
          plan.
        </span>
        <div
          className={hstack({
            justifyContent: "space-between",
          })}
        >
          <div
            className={flex({
              flexDir: "column",
              mt: 4,
            })}
          >
            <div className={hstack()}>
              <span
                className={css({
                  fontSize: "xl",
                  fontWeight: "semibold",
                })}
              >
                {loaderData.subscription?.plan} Plan
              </span>
              {loaderData.subscription.plan !== "Demo" && (
                <span
                  className={css({
                    px: 3,
                    py: 1.4,
                    rounded: "xl",
                    bg: "accent.300",
                    fontWeight: "medium",
                    color: "white",
                    fontSize: "xs",
                  })}
                >
                  Active
                </span>
              )}
            </div>
            <span
              className={hstack({
                color: "neutral.600",
              })}
            >
              {loaderData.subscription.plan !== "Demo" ? (
                <>
                  &#3647;{loaderData.subscription.pricing_monthly} / month,
                  billed {loaderData.subscription.billing_recurrent}
                </>
              ) : (
                <>Data will be deleted after a month</>
              )}
            </span>
          </div>
          <button
            className={button({
              color: "primary",
            })}
          >
            {loaderData.subscription.plan === "Demo"
              ? "Subscribe Now"
              : "Change Plan"}
          </button>
        </div>
      </div>
      <form
        method="POST"
        className={flex({
          flexDir: "column",
          width: "full",
        })}
      >
        <InputEntry
          id="billing_email"
          name="billing_email"
          value={billingEmail}
          onChange={(_, value) => setBillingEmail(value)}
          label="Billing Email"
          placeholder="billing@example.org"
        />
        <input
          type="submit"
          className={button({
            color: "primary",
          })}
          value="Save"
        />
      </form>
    </div>
  );
}
