import { MongoClient } from "mongodb";

const MONGODB_URI = "mongodb+srv://testingchatbot123:testingchatbot123@kingofgk.xlmgrbr.mongodb.net/?appName=Kingofgk";
const DB_NAME = "order-edit";
const COLLECTION_NAME = "store_plans";

let mongodb;

if (process.env.NODE_ENV === "production") {
  mongodb = new MongoClient(MONGODB_URI);
} else {
  if (!global.__mongodb) {
    global.__mongodb = new MongoClient(MONGODB_URI);
  }
  mongodb = global.__mongodb;
}

const db = mongodb.db(DB_NAME);
const storePlans = db.collection(COLLECTION_NAME);

/**
 * Save or update a subscription for a shop.
 */
export async function saveSubscription(shop, shopName, planData) {
  const record = {
    shop,
    shopName,
    plan: planData.plan,
    status: planData.status || "active",
    activatedAt: planData.activatedAt || new Date(),
    updatedAt: new Date(),
    // Store additional info if needed
    isTest: planData.isTest ?? false,
    shopifyId: planData.shopifyId,
  };

  return await storePlans.updateOne(
    { shop },
    { $set: record },
    { upsert: true }
  );
}

/**
 * Get active subscription for a shop.
 */
export async function getSubscription(shop) {
  return await storePlans.findOne({ shop });
}

/**
 * Cancel subscription for a shop (usually on uninstall or plan change).
 */
export async function cancelSubscription(shop) {
  return await storePlans.updateOne(
    { shop },
    { $set: { status: "cancelled", cancelledAt: new Date() } }
  );
}

export { mongodb, db, storePlans };
