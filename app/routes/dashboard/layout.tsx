import Shell from "~/components/dashboard/shell";
import type { Route } from "./+types/layout";
import { redirect } from 'react-router'
import { useEffect } from "react";
import { getSubTier } from "~/utils/subscription";
import { useStore, type SubscriptionPlan } from "~/stores";

import { authkitLoader, getWorkOS } from "@workos-inc/authkit-react-router";

import { Toaster } from 'sonner'

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

    let current_tier: SubscriptionPlan | null = await getSubTier(auth.organizationId)

    if (!current_tier) {
      current_tier = 'Demo'
    }

    return { current_tier, orgList }

  }, { ensureSignedIn: true })

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const updateSubscriptionPlan = useStore((state) => state.updateSubscriptionPlan)

  useEffect(() => {
    updateSubscriptionPlan(loaderData.current_tier)
  }, [loaderData.current_tier])

  return (
    <>
      <Toaster />
      <Shell />
    </>
  );
}
