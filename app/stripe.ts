import { env } from "~/env.server";

import Stripe from "stripe";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export { stripe };
