import { authenticate } from "../../../shopify.server";
import { getRecentActivity } from "../../../server/graphql";
import { activities as activitiesCol } from "../../../mongodb.server";

export const getDashboardLoaderData = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const [shopResponse, recentActivities, totalEdits, todayEdits, yesterdayEdits] = await Promise.all([
    admin.graphql(`query getDashboardData { shop { name } }`),
    getRecentActivity(admin),
    activitiesCol.countDocuments({ shop }),
    activitiesCol.countDocuments({ shop, createdAt: { $gte: startOfToday } }),
    activitiesCol.countDocuments({ shop, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
  ]);

  const shopJson = await shopResponse.json();
  const shopName = shopJson.data?.shop?.name || session.shop;

  let change = 0;
  if (yesterdayEdits > 0) {
    change = Math.round(((todayEdits - yesterdayEdits) / yesterdayEdits) * 100);
  } else if (todayEdits > 0) {
    change = 100;
  }

  return {
    shopName,
    activities: recentActivities || [],
    metrics: { totalEdits, todayEdits, yesterdayEdits, change },
  };
};
