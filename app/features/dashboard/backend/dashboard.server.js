import { authenticate } from "../../../shopify.server";
import { getRecentActivity } from "../../../server/graphql";
import { activities as activitiesCol } from "../../../mongodb.server";

export const getDashboardLoaderData = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

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

  // Fetch recent activities from Metafield for UI feed
  const recentActivities = await getRecentActivity(admin);

  // Fetch metrics from MongoDB
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const [totalEdits, todayEdits, yesterdayEdits] = await Promise.all([
    activitiesCol.countDocuments({ shop }),
    activitiesCol.countDocuments({ shop, createdAt: { $gte: startOfToday } }),
    activitiesCol.countDocuments({ shop, createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
  ]);

  // Calculate percentage change
  let change = 0;
  if (yesterdayEdits > 0) {
    change = Math.round(((todayEdits - yesterdayEdits) / yesterdayEdits) * 100);
  } else if (todayEdits > 0) {
    change = 100; // 100% increase if there was nothing yesterday but something today
  }

  return {
    shopName,
    activities: recentActivities,
    metrics: {
      totalEdits,
      todayEdits,
      yesterdayEdits,
      change,
    },
  };
};
