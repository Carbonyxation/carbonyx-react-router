import { Outlet } from "react-router";
import LandingBar from "~/components/landingbar";
import { authkitLoader, getSignUpUrl } from "@workos-inc/authkit-react-router";
import type { Route } from './+types/landing-layout'

export const loader = (args: Route.LoaderArgs) =>
  authkitLoader(args, async () => {
    return {
      signUpUrl: await getSignUpUrl()
    }
  })

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <LandingBar user={loaderData.user} signUpUrl={loaderData.signUpUrl} />
      <Outlet />
    </>
  );
}
