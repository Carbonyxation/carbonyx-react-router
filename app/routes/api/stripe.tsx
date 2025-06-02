import { stripe } from "~/stripe";
import type { Route } from "./+types/stripe";

import { data } from "react-router";
import { env } from "~/env.server";
import type Stripe from "stripe";
import { syncStripeDataToKV } from "~/utils/kv";

import { waitUntil } from "@vercel/functions";
import { tryCatch } from "~/utils/utilities";

const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

async function processEvent(event: Stripe.Event) {
  // Skip processing if the event isn't one I'm tracking (list of all events below)
  if (!allowedEvents.includes(event.type)) return;

  // All the events I track have a customerId
  const { customer: customerId } = event?.data?.object as {
    customer: string; // Sadly TypeScript does not know this
  };

  // This helps make it typesafe and also lets me know if my assumption is wrong
  if (typeof customerId !== "string") {
    throw new Error(
      `[STRIPE HOOK][CANCER] ID isn't string.\nEvent type: ${event.type}`,
    );
  }

  return await syncStripeDataToKV(customerId);
}

export async function action(args: Route.ActionArgs) {
  const body = await args.request.text();
  const signature = args.request.headers.get("Stripe-Signature");

  if (!signature) throw data({}, { status: 400 });

  async function doEventProcessing() {
    if (typeof signature !== "string") {
      throw new Error("[STRIPE HOOK] Header is not a string");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    waitUntil(processEvent(event));
  }

  const { error } = await tryCatch(doEventProcessing);

  if (error) {
    console.error("[STRIPE HOOK] Error processing event", error);
  }

  return { received: true };
}
