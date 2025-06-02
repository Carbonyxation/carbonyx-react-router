import SmallLogo from "~/assets/logo_64x.png";
import { MenuItem, MenuSection } from "../menuitem";
import { OrganizationSwitcher, UserButton, useAuth } from "@clerk/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import NotificationBox from "../notification-box";
import { useStore } from "~/stores";

import { useRevalidator, Link, Outlet } from "react-router";
import { css } from "carbonyxation/css";
import { hstack, flex } from "carbonyxation/patterns";

export default function Shell() {
  // Calculate the header height (assuming padding: "4" is 16px on each side, total 32px + assumed content height of 24px)
  const headerHeight = "65px";
  const [displayMenu, setDisplayMenu] = useState(false);
  const auth = useAuth();
  const [currentOrgId, setCurrentOrgId] = useState("");
  const { revalidate } = useRevalidator();

  const subscriptionPlan = useStore((state) => state.subscriptionPlan);

  useEffect(() => {
    if (!auth.isLoaded || !auth.isSignedIn) return;

    if (auth.orgId !== currentOrgId && auth.orgId) {
      setCurrentOrgId(auth.orgId);
      revalidate();
    }
  }, [auth.orgId, auth.isLoaded, auth.isSignedIn]);

  return (
    <div
      className={css({
        height: "100vh", // Use vh directly for clarity
      })}
    >
      <div
        className={hstack({
          padding: "4",
          width: "full",
          bg: "white",
          borderBottom: "1px solid",
          justifyContent: "space-between",
        })}
      >
        <Link to="/dashboard">
          <span
            className={flex({
              fontSize: "xl",
              fontWeight: "bold",
              alignItems: "center",
              gap: 2,
            })}
          >
            {!displayMenu ? (
              <Menu
                className={css({
                  display: "unset",
                  sm: {
                    display: "none",
                  },
                })}
                onClick={() => setDisplayMenu(!displayMenu)}
              />
            ) : (
              <X
                className={css({
                  display: "unset",
                  sm: {
                    display: "none",
                  },
                })}
                onClick={() => setDisplayMenu(!displayMenu)}
              />
            )}
            <img src={SmallLogo} alt="Carbonyx" width={32} />
            Carbonyx
            <OrganizationSwitcher hidePersonal={true} />
          </span>
        </Link>
        <UserButton />
      </div>
      <div
        className={flex({
          w: "full",
          // Calculate the remaining height after subtracting the header
          height: `calc(100vh - ${headerHeight})`,
        })}
      >
        <div
          className={css({
            display: `${displayMenu ? "flex" : "none"}`,
            maxWidth: "18rem",
            sm: {
              display: "flex",
              minW: "56",
              width: "unset",
            },
            flexDirection: "column",
            height: "full",
            bg: "white",
            borderRight: "1px solid",
            justifyContent: "space-between",
            overflowY: "auto",
          })}
        >
          <div>
            <MenuSection>
              <MenuItem text="Dashboard" icon="home" route="/dashboard" exact />
              <MenuItem
                text="Pluem AI"
                icon="comment"
                route="/dashboard/notebook"
              />

              <div
                className={css({
                  p: 2,
                  pt: 4,
                  borderBottomWidth: 1,
                  borderBottom: "solid",
                  borderBottomColor: "neutral.400",
                })}
              >
                <span
                  className={css({
                    fontWeight: "semibold",
                    color: "neutral.600",
                  })}
                >
                  Inventory
                </span>
              </div>

              <MenuItem
                text="Navigation"
                icon="location"
                route="/dashboard/navigation"
              />
              <MenuItem text="Assets" icon="assets" route="/dashboard/assets" />
              <MenuItem text="Manual Emissions" icon="emissions">
                <MenuItem text="Electricity" route="/dashboard/electricity" />
                <MenuItem
                  text="Stationary Fuels"
                  route="/dashboard/stationary_fuels"
                />
                <MenuItem
                  text="Transportation"
                  route="/dashboard/transportation"
                />
                <MenuItem text="Waste" route="/dashboard/waste" />
              </MenuItem>
              <MenuItem text="Integration" icon="integration">
                <MenuItem text="Excel" route="/dashboard/coming-soon-excel" />
                <MenuItem text="ERP" route="/dashboard/coming-soon-erp" />
              </MenuItem>
              <MenuItem
                text="Custom Factor"
                icon="custom_factor"
                route="/dashboard/factor"
              />
            </MenuSection>
          </div>
          <div>
            {subscriptionPlan === "Demo" && (
              <NotificationBox
                title="You are on a Demo Plan!"
                content="This is a demo plan, organization data may be deleted after a month. Select a plan to make it permanent!"
                buttonText="Choose Plan"
                color="primary"
                actionLink="/pricing"
              />
            )}

            <hr
              className={css({
                borderTop: "1px solid",
                borderTopColor: "neutral.400",
              })}
            />
            <MenuItem text="0% of footprint" icon="circle" />
            <MenuItem text="Help center" icon="question" />
            <MenuItem text="Settings" icon="gear" route="/dashboard/settings" />
          </div>
        </div>
        <div
          className={css({
            flex: 1,
            overflowY: "auto", // Use overflowY for better control
          })}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
