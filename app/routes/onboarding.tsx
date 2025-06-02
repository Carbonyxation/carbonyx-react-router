import { css } from "carbonyxation/css";
import { flex, vstack } from "carbonyxation/patterns";
import { useUser, CreateOrganization } from "@clerk/react-router";

import SmallLogo from "~/assets/logo_64x.png";
import { useOrganizationList } from "@clerk/react-router";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function Onboarding() {
  const orgList = useOrganizationList({ userMemberships: true });
  const navigate = useNavigate();

  useEffect(() => {
    if (orgList.userMemberships.isFetching) return;
    if (orgList.userMemberships.data && orgList.userMemberships.count !== 0) {
      navigate("/dashboard");
      return;
    }
  }, [orgList.userMemberships.isFetching]);

  const user = useUser();
  return (
    !orgList.userMemberships.isFetching && (
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
              Welcome, {user.user?.firstName}
            </span>
            <span>Let's get started with a fresh organization</span>
          </div>
          <CreateOrganization />
        </div>
      </div>
    )
  );
}
