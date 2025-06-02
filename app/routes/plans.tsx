import { stripe_kv } from "~/kv/stripe";
import type { Route } from "./+types/plans";
import { getAuth } from "~/utils/auth-helper";

import { redirect } from "react-router";
import { stripe } from "~/stripe";
import { env } from "~/env.server";

import { createClerkClient } from "@clerk/backend";
import { useState } from "react";
import { button } from "~/components/button";
import { getUrl } from "~/utils/utilities";
import { flex, hstack, vstack } from "carbonyxation/patterns";
import { css } from "carbonyxation/css";
import Switch from "~/components/switch";
import { getSubTier } from "~/utils/subscription";

import { toast } from "sonner";

export async function loader(args: Route.LoaderArgs) {
  const current_tier = await getSubTier(args);

  return { current_tier };
}

export async function action(args: Route.ActionArgs) {
  const auth = await getAuth(args);
  const formData = await args.request.formData();
  const plan = formData.get("plan") as "standard";
  const recurring = formData.get("recurring") as "monthly" | "annually";

  const priceID =
    plan === "standard" && recurring === "annually"
      ? env.ANNUALLY_STANDARD_PRICE_ID
      : env.MONTHLY_STANDARD_PRICE_ID; // expand later

  if (!auth.userId || !auth.sessionId || !auth.orgId) {
    return redirect("/signin");
  }

  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  });

  const org = await clerkClient.organizations.getOrganization({
    organizationId: auth.orgId,
  });

  let stripeCustomerId = await stripe_kv.get(`stripe:org:${auth.orgId}`);

  if (!stripeCustomerId) {
    const newCustomer = await stripe.customers.create({
      email: org.privateMetadata.billingEmail as string,
      name: org.name,
      metadata: {
        userId: auth.userId, // the user ID who did the checkout
        orgId: auth.orgId, // the org id
      },
    });

    await stripe_kv.set(`stripe:org:${auth.orgId}`, newCustomer.id);
    stripeCustomerId = newCustomer.id;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: getUrl("/checkout/success"),
      line_items: [{ price: priceID, quantity: 1 }],
      mode: "subscription",
      cancel_url: getUrl("/pricing"),
      subscription_data: {
        metadata: {
          userId: auth.userId,
        },
      },
      allow_promotion_codes: true,
    });
  } catch (error) {
    console.error("Error creating checkout session: ", error);
    throw new Error("Something went wrong :( Please refresh and try again");
  }

  return redirect(session.url!, 303);
}

const headerIcon = css({
  color: "green",
  fontSize: 24,
});

const iconStyle = css({
  color: "green", // Set the fill color to green
  marginRight: 2, // Optional: Adjust margin instead of using inline style
});

const featureList = css({
  listStyle: "none", // Remove default bullets
  padding: 0, // Remove padding
  marginTop: 4, // Adjust as needed
  marginBottom: 4, // Adjust as needed
  fontSize: 16,
  lineHeight: 1.8,
});

export default function Plans({ loaderData }: Route.ComponentProps) {
  const [recurringType, setRecurringType] = useState<"annually" | "monthly">(
    "annually",
  );
  const handleCheckoutPlan = (plan: "standard") => {
    const form = document.createElement("form");
    form.method = "POST";

    const actionInput = document.createElement("input");
    actionInput.type = "hidden";
    actionInput.name = "plan";
    actionInput.value = plan;
    form.appendChild(actionInput);

    const notebookIdInput = document.createElement("input");
    notebookIdInput.type = "hidden";
    notebookIdInput.name = "recurring";
    notebookIdInput.value = recurringType;
    form.appendChild(notebookIdInput);

    document.body.appendChild(form);
    form.submit();
    form.remove();
  };
  return (
    <div
      className={vstack({
        justifyContent: "center",
        h: "svh",
      })}
    >
      <div
        className={vstack({
          justifyContent: "center",
          mb: 12,
        })}
      >
        <span
          className={css({
            fontSize: "4xl",
            fontWeight: "extrabold",
            maxWidth: "xl",
            textAlign: "center",
          })}
        >
          Predictable Pricing for Sustainable Growth
        </span>
        <span
          className={css({
            fontSize: "md",
            color: "neutral.600",
          })}
        >
          Scale your sustainability efforts, not your carbon accounting costs
        </span>
      </div>
      <Switch
        leftLabel="Monthly"
        rightLabel="Annually"
        defaultChecked={true}
        onChange={() =>
          setRecurringType(recurringType === "monthly" ? "annually" : "monthly")
        }
      />
      <div
        className={flex({
          flexDir: "column",
          gap: 4,
          md: {
            flexDir: "row",
          },
        })}
      >
        <div
          className={flex({
            flexDir: "column",
            p: 4,
            border: "1px black solid",
            rounded: "xl",
            bg: "white",
            width: "24rem",
            boxShadowColor: "accent.200",
            boxShadow: "xl",
          })}
        >
          <div
            className={hstack({
              justifyContent: "space-between",
            })}
          >
            <span
              className={css({
                fontSize: "xl",
                fontWeight: "bold",
              })}
            >
              Standard
            </span>
            <i className={`fa-solid fa-leaf ${headerIcon}`}></i>
          </div>
          <div
            className={hstack({
              gap: 2,
            })}
          >
            <div>
              <span
                className={css({
                  fontSize: "3xl",
                  fontWeight: "bold",
                })}
              >
                &#3647;{recurringType === "annually" ? "40,000" : "4,000"}
              </span>
              <span
                className={css({
                  color: "neutral.600",
                  fontWeight: "medium",
                })}
              >
                {" "}
                / {recurringType === "annually" ? "year" : "month"}
              </span>
            </div>
            {recurringType === "annually" && (
              <span
                className={css({
                  fontSize: "sm",
                  bg: "accent.200",
                  px: 2,
                  py: 1,
                  color: "white",
                  rounded: "lg",
                  fontWeight: "bold",
                })}
              >
                Save 16.67%
              </span>
            )}
          </div>
          <span
            className={css({
              color: "neutral.600",
              mt: 2,
            })}
          >
            The only plan needed for most organizations and SMBs
          </span>
          <ul className={featureList}>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>One feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Two feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Three feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Four feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Five feature</span>
            </li>
          </ul>{" "}
          <button
            className={button({
              color: "accent",
              disabled: loaderData.current_tier === "Standard",
            })}
            disabled={loaderData.current_tier === "Standard"}
            onClick={() => handleCheckoutPlan("standard")}
          >
            {loaderData.current_tier === "Standard"
              ? "Subscribed"
              : "Get Started"}
          </button>
        </div>
        <div
          className={flex({
            flexDir: "column",
            p: 4,
            border: "1px black solid",
            rounded: "xl",
            bg: "white",
            width: "24rem",
          })}
        >
          <span
            className={css({
              fontSize: "xl",
              fontWeight: "bold",
            })}
          >
            Enterprise
          </span>
          <div
            className={hstack({
              gap: 2,
            })}
          >
            <span
              className={css({
                fontSize: "3xl",
                fontWeight: "bold",
              })}
            >
              Contact Us
            </span>
          </div>
          <span
            className={css({
              color: "neutral.600",
              mt: 2,
            })}
          >
            For when you need something a little more automated
          </span>
          <ul className={featureList}>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>One feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Two feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Three feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Four feature</span>
            </li>
            <li style={{ display: "flex", alignItems: "center" }}>
              <i className={`fa-solid fa-circle-check ${iconStyle}`}></i>
              <span>Five feature</span>
            </li>
          </ul>
          <button
            className={button({
              color: "primary",
            })}
            onClick={() => toast("Coming Soon!")}
          >
            Talk to Us
          </button>
        </div>
      </div>
    </div>
  );
}
