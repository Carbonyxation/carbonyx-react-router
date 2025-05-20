import type { Route } from "./+types/success";

import { redirect } from "react-router";
import { STRIPE_CUSTOMER_ID_KV, syncStripeDataToKV } from "~/utils/kv";

import { authkitLoader, getWorkOS } from "@workos-inc/authkit-react-router";

export const loader = (args: Route.LoaderArgs) =>
  authkitLoader(args, async ({ request, auth }) => {
    // if there is no current active org, redirect to onboarding to force set one active
    if (!auth.organizationId) return redirect('/onboarding')

    const wos = getWorkOS()
    const orgList = await wos.userManagement.listOrganizationMemberships({
      userId: auth.user.id,
    })

    // if no organizations exist on the user, navigate to onboarding. onboarding should set the first org created for the user as the main active one
    if (orgList.data.length === 0) {
      return redirect('/onboarding')
    }

    const stripeCustomerId = await STRIPE_CUSTOMER_ID_KV.get(auth.organizationId)

    if (!stripeCustomerId) {
      return redirect('/')
    }

    await syncStripeDataToKV(stripeCustomerId)
    return redirect('/')
  }, { ensureSignedIn: true })

export default function SuccesCheckout() {
  return (
    <div>
      <span>Success!</span>
    </div>
  )
}
