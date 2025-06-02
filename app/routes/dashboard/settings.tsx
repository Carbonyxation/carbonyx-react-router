import { css } from "carbonyxation/css";
import { flex, hstack } from "carbonyxation/patterns";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MenuItem } from "~/components/menuitem";

import { Outlet, useLocation } from "react-router";

export default function Settings() {
  const location = useLocation();
  return (
    <div
      className={flex({
        w: "full",
        p: 4,
        flexDirection: "column",
        gap: 4,
        h: "full",
      })}
    >
      <div
        className={hstack({
          justifyContent: "space-between",
        })}
      >
        <span
          className={css({
            fontSize: "xl",
            fontWeight: "bold",
          })}
        >
          Settings
        </span>
      </div>

      <PanelGroup
        direction="horizontal"
        className={css({
          bg: "white",
          rounded: "2xl",
          border: "1px black solid",
        })}
      >
        <Panel minSize={25} defaultSize={25} maxSize={50}>
          <MenuItem text="Organization" icon="assets" pad={2}>
            <MenuItem
              text="Billing"
              icon="money"
              pad={2}
              route="/dashboard/settings/organization/billing"
            />
          </MenuItem>
        </Panel>
        <PanelResizeHandle
          className={css({
            borderColor: "black",
            borderWidth: 0.5,
          })}
        />
        <Panel defaultSize={75}>
          {!location.pathname.replaceAll("/", "").endsWith("settings") && (
            <Outlet />
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}
