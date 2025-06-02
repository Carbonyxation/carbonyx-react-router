import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/landing-layout.tsx", [
    index("routes/home.tsx"),
    route("/pricing", "routes/plans.tsx"),
  ]),
  route("/signin/*", "routes/sign-in.tsx"),
  route("/signup/*", "routes/sign-up.tsx"),

  route("/api/flowise/*", "routes/api/flowise.tsx"),
  route("/api/chat", "routes/api/chat.tsx"),
  route("/api/stripe", "routes/api/stripe.tsx"),

  route("/onboarding", "routes/onboarding.tsx"),
  route("/checkout/success", "routes/checkout/success.tsx"),
  ...prefix("/dashboard", [
    layout("routes/dashboard/layout.tsx", [
      route("/", "routes/dashboard/dashboard.tsx"),
      route("/notebook", "routes/dashboard/pluem-ai.tsx", {
        id: "notebook-main",
      }),
      route("/notebook/:notebookId", "routes/dashboard/pluem-ai.tsx", {
        id: "notebook-id",
      }),
      route("/assets", "routes/dashboard/assets.tsx"),
      route("/info", "routes/dashboard/information.tsx"),
      route("/electricity", "routes/dashboard/electricity.tsx"),
      route("/stationary_fuels", "routes/dashboard/stationary_fuel.tsx"),
      route("/transportation", "routes/dashboard/transportation.tsx"),
      route("/waste", "routes/dashboard/waste.tsx"),
      route("/factor", "routes/dashboard/factor.tsx"),
      route("/navigation", "routes/dashboard/navigation.tsx"),
      route("/coming-soon-excel", "routes/dashboard/coming-soon.tsx", {
        id: "coming-soon-excel",
      }),
      route("/coming-soon-erp", "routes/dashboard/coming-soon.tsx", {
        id: "coming-soon-erp",
      }),
      ...prefix("/settings", [
        layout("routes/dashboard/settings.tsx", [
          route("/", "routes/dashboard/settings.tsx", { id: "settings-route" }),
          route(
            "/organization/billing",
            "routes/dashboard/settings/org-billing.tsx",
          ),
        ]),
      ]),
    ]),
  ]),
] satisfies RouteConfig;
