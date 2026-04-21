import { authenticate } from "../../../shopify.server";

export const getDashboardLoaderData = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query getDashboardData {
      shop {
        name
      }
    }
  `);

  const responseJson = await response.json();
  const shopName = responseJson.data?.shop?.name || session.shop;

  return {
    shopName,
  };
};
