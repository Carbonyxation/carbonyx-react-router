import { create } from "zustand";

export type SubscriptionPlan = "Demo" | "Standard";

type State = {
  subscriptionPlan: SubscriptionPlan; // Enterprise plan to be implemented
};

type Action = {
  updateSubscriptionPlan: (plan: State["subscriptionPlan"]) => void;
};

export const useStore = create<State & Action>((set) => ({
  subscriptionPlan: "Demo",
  updateSubscriptionPlan: (plan) => set(() => ({ subscriptionPlan: plan })),
}));
