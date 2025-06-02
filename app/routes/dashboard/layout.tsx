import Shell from "~/components/dashboard/shell";
import type { Route } from "./+types/layout";
import { useNavigate, useRevalidator } from "react-router";
import { useOrganizationList, useAuth } from "@clerk/react-router";
import { useEffect } from "react";
import { getSubTier } from "~/utils/subscription";
import { useStore, type SubscriptionPlan } from "~/stores";

import { Toaster } from "sonner";

export async function loader(args: Route.LoaderArgs) {
  let current_tier: SubscriptionPlan | null = await getSubTier(args);

  if (!current_tier) {
    current_tier = "Demo";
  }

  return { current_tier };
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const orgList = useOrganizationList({ userMemberships: true });
  const auth = useAuth();

  const updateSubscriptionPlan = useStore(
    (state) => state.updateSubscriptionPlan,
  );

  const revalidator = useRevalidator();

  useEffect(() => {
    updateSubscriptionPlan(loaderData.current_tier);
  }, [loaderData.current_tier]);

  useEffect(() => {
    if (!orgList.isLoaded || orgList.userMemberships.isFetching) return;

    if (!orgList.setActive || orgList.userMemberships.count === 0) {
      navigate("/onboarding");
      return;
    }

    if (auth.isLoaded && !auth.orgId) {
      orgList.setActive({
        organization: orgList.userMemberships.data[0].organization,
      });

      revalidator.revalidate();
    }
  }, [
    orgList.isLoaded,
    orgList.userMemberships.isFetching,
    auth.isLoaded,
    auth.orgId,
  ]);

  return (
    <>
      <Toaster />
      <Shell />
    </>
  );
}
