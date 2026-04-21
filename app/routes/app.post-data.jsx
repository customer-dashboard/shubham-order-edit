import { setAppConfig } from "../server/graphql";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  return {};
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const reqbody = await request.json();
  const target = reqbody.target;

  switch (target) {
    case "SAVE_ONBOARDING_STATE":
      const config = reqbody.config;
      const result = await setAppConfig(admin, config);
      return { success: true, result };

    default:
      return { message: "Target not found" };
  }
};