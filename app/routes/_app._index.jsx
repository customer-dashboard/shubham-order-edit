import { boundary } from "@shopify/shopify-app-react-router/server";
import { useRouteError, useOutletContext, useSearchParams } from "react-router";
import DashboardPage from "../features/dashboard/DashboardPage";
import OnboardingPage from "../features/onboarding/OnboardingPage";

export default function AppContent() {
  const { config } = useOutletContext();
  const [searchParams] = useSearchParams();
  
  const isReset = searchParams.get("test") === "onobarding_reset";
  const isOnboardingCompleted = config?.onboarding?.completed ?? false;

  // Show onboarding if not completed OR if reset parameter is present for testing
  if (!isOnboardingCompleted || isReset) {
    return <OnboardingPage isReset={isReset} />;
  }

  return <DashboardPage />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
