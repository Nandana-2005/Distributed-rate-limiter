const URL = 'http://localhost:3000/api/data';
const TOTAL_REQUESTS = 10;

async function fireSingleRequest(requestNumber) {
  try {
    const response = await fetch(URL);
    const text = await response.text();
    console.log(`[Request #${requestNumber}] Status: ${response.status} | Response: ${text}`);
  } catch (error) {
    console.error(`[Request #${requestNumber}] Failed to connect to server:`, error.message);
  }
}

async function runStressTest() {
  console.log(`🚀 Starting stress test: Firing ${TOTAL_REQUESTS} requests at once...`);
  
  // Create an array of 10 requests running at the exact same time
  const requestPromises = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    requestPromises.push(fireSingleRequest(i));
  }

  // Fire them all simultaneously!
  await Promise.all(requestPromises);
  console.log("🏁 Stress test complete.");
}

runStressTest();