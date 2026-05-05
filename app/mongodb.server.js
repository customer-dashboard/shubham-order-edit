import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "order-edit";

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
const activities = db.collection("activity");


/**
 * Log uninstallation event.
 */
export async function logUninstallation(shop, payload = {}) {
  const now = new Date();

  return await activities.insertOne({
    shop,
    type: "uninstall",
    timestamp: now,
    message: "App uninstalled by merchant",
    payload
  });
}


/**
 * log activity to mongodb
 */
export async function logActivityToDB(shop, activity) {
  return await activities.insertOne({
    shop,
    ...activity,
    createdAt: new Date(),
  });
}



export { mongodb, db, activities };
