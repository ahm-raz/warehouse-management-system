/**
 * Global Test Setup
 * Runs once before all test suites
 *
 * Starts the in-memory MongoDB server and stores its URI
 * for use by individual test suites
 */

import { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalSetup() {
  // Create a replica set for transaction support
  // (orderService and inventoryService use MongoDB transactions)
  const replSet = new MongoMemoryReplSet({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  await replSet.start();
  const uri = replSet.getUri();

  // Store reference globally so globalTeardown can access it
  globalThis.__MONGO_REPLSET__ = replSet;

  // Store URI for test suites to connect
  process.env.MONGO_URI_TEST = uri;

  console.log("\n[Test Setup] MongoDB Memory Replica Set started");
  console.log(`[Test Setup] URI: ${uri}`);
}
