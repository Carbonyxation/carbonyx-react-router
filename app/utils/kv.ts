import type Stripe from "stripe";
import { stripe_kv } from "~/kv/stripe";
import { stripe } from "~/stripe";

export type STRIPE_SUB_CACHE =
  | {
      subscriptionId: string | null;
      status: Stripe.Subscription.Status;
      priceId: string | null;
      currentPeriodStart: number | null;
      currentPeriodEnd: number | null;
      cancelAtPeriodEnd: boolean;
      paymentMethod: {
        brand: string | null; // e.g., "visa", "mastercard"
        last4: string | null; // e.g., "4242"
      } | null;
    }
  | {
      status: "none";
    };

export const STRIPE_CUSTOMER_ID_KV = {
  generateKey(orgId: string) {
    return `stripe:org:${orgId}`;
  },
  async get(orgId: string) {
    return await stripe_kv.get(this.generateKey(orgId));
  },
  async set(orgId: string, customerId: string) {
    await stripe_kv.set(this.generateKey(orgId), customerId);
  },
};

export const STRIPE_CUSTOMER_CACHE_KV = {
  generateKey(customerId: string) {
    return `stripe:customer:${customerId}`;
  },
  async get(customerId: string) {
    const response = await stripe_kv.get(this.generateKey(customerId));

    if (!response) return { status: "none" };
    return JSON.parse(response) as STRIPE_SUB_CACHE;
  },
  async set(customerId: string, status: STRIPE_SUB_CACHE) {
    await stripe_kv.set(this.generateKey(customerId), JSON.stringify(status));
  },
};

export async function syncStripeDataToKV(customerId: string) {
  // Fetch latest subscription data from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    await STRIPE_CUSTOMER_CACHE_KV.set(customerId, { status: "none" });
    return { status: "none" };
  }

  // If a user can have multiple subscriptions, that's your problem
  const subscription = subscriptions.data[0];

  // Store complete subscription state
  const subData = {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.items.data[0].current_period_end,
    currentPeriodStart: subscription.items.data[0].current_period_start,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== "string"
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };

  // Store the data in your KV
  await STRIPE_CUSTOMER_CACHE_KV.set(customerId, subData);
  return subData;
}

export async function getStripeSubByOrgId(orgId: string) {
  const stripeCustomerId = await STRIPE_CUSTOMER_ID_KV.get(orgId);

  if (!stripeCustomerId) return null;

  return STRIPE_CUSTOMER_CACHE_KV.get(stripeCustomerId);
}
