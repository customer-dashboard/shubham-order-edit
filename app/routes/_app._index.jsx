import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError, useOutletContext } from "react-router";
import DashboardPage from "../features/dashboard/DashboardPage";
import OnboardingPage from "../features/onboarding/OnboardingPage";

export default function AppContent() {
  const { config } = useOutletContext();
  const isOnboardingCompleted = config?.onboarding?.completed ?? false;

  if (!isOnboardingCompleted) {
    return <OnboardingPage />;
  }

  return <DashboardPage />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
