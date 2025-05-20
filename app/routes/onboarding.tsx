import { css } from "carbonyxation/css";
import { flex, vstack } from "carbonyxation/patterns";

import SmallLogo from "~/assets/logo_64x.png";
import { useEffect } from "react";
import { useNavigate, redirect } from "react-router";

import { authkitLoader, getWorkOS, switchToOrganization } from "@workos-inc/authkit-react-router";
import { WorkOsWidgets, OrganizationSwitcher } from "@workos-inc/widgets";

import type { Route } from './+types/onboarding'

export const loader = (args: Route.LoaderArgs) =>
  authkitLoader(args, async ({ request, auth }) => {
    const wos = getWorkOS()
    const orgList = await wos.userManagement.listOrganizationMemberships({
      userId: auth.user.id
    })

    if (orgList.data.length !== 0) {
      if (auth.organizationId) {
        return redirect('/dashboard')
      }

      return redirect('/') // tmp
      // re-authenticate the user for them to be on an org
    } else {
      if (!auth.organizationId) {
        return redirect('/')
      }
    }

    const authToken = await wos.widgets.getToken({
      userId: auth.user.id,
      organizationId: auth.organizationId,
      scopes: ['widgets:users-table:manage']
    })

    return { authToken }
  }, { ensureSignedIn: true })

export default function Onboarding({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate()

  useEffect(() => {
  })
  //   if (orgList.userMemberships.isFetching) return
  //   if (orgList.userMemberships.data && orgList.userMemberships.count !== 0) {
  //     navigate("/dashboard");
  //     return;
  //   }
  // }, [orgList.userMemberships.isFetching]);

  // const user = useUser();
  return (
    <div
      className={vstack({
        alignItems: "center",
        height: "svh",
      })}
    >
      <div
        className={flex({
          paddingY: 16,
        })}
      >
        <span
          className={flex({
            fontSize: "xl",
            fontWeight: "bold",
            alignItems: "center",
            gap: 2,
          })}
        >
          <img src={SmallLogo} alt="Carbonyx" width={32} />
          Carbonyx
        </span>
      </div>

      <div
        className={flex({
          alignItems: "center",
          justifyContent: "center",
          flexDir: "column",
          gap: 8,
        })}
      >
        <div
          className={flex({
            flexDir: "column",
          })}
        >
          <span
            className={css({
              fontSize: 28,
              fontWeight: "semibold",
              fontFamily: "Times New Roman, serif",
              textAlign: "center",
            })}
          >
            {/* Welcome, {user.user?.firstName} */}
          </span>
          <span>Let's get started with a fresh organization</span>
        </div>
        <WorkOsWidgets>
          <OrganizationSwitcher authToken={loaderData.authToken} switchToOrganization={switchToOrganization}>
          </OrganizationSwitcher>
        </WorkOsWidgets>
      </div>
    </div>
  );
}
