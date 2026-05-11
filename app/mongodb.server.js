import { MongoClient } from "mongodb";
import dns from "node:dns";

// Force Node.js to use Google's DNS servers to resolve MongoDB SRV records
// This fixes querySrv ECONNREFUSED errors in some environments
dns.setServers(['8.8.8.8', '8.8.4.4']);
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}


const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "order-edit";

let mongodb;

const clientOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

if (process.env.NODE_ENV === "production") {
  mongodb = new MongoClient(MONGODB_URI, clientOptions);
} else {
  if (!global.__mongodb) {
    global.__mongodb = new MongoClient(MONGODB_URI, clientOptions);
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
