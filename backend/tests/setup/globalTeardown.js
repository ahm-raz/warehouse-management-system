/**
 * Global Test Teardown
 * Runs once after all test suites complete
 *
 * Stops the in-memory MongoDB server
 */

export default async function globalTeardown() {
  const replSet = globalThis.__MONGO_REPLSET__;

  if (replSet) {
    await replSet.stop();
    console.log("\n[Test Teardown] MongoDB Memory Replica Set stopped");
  }
}
