const express = require('express');
const app = express();
const PORT = 3000;


class TokenBucketManager {
  constructor(maxCapacity, refillRatePerSecond) {
    this.maxCapacity = maxCapacity; 
    this.refillRatePerSecond = refillRatePerSecond; 
    this.buckets = new Map(); 
  }

  isRequestAllowed(clientId) {
    const now = Date.now();

    if (!this.buckets.has(clientId)) {
      this.buckets.set(clientId, {
        tokens: this.maxCapacity,
        lastRefillTimestamp: now
      });
    }

    const bucket = this.buckets.get(clientId);
    const elapsedTimeInSeconds = (now - bucket.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedTimeInSeconds * this.refillRatePerSecond;

    bucket.tokens = Math.min(this.maxCapacity, bucket.tokens + tokensToAdd);
    bucket.lastRefillTimestamp = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1; 
      return true;        
    }
    return false; 
  }
}

// Instantiate our guard: Max 3 tokens, refills at 1 token per second
const limiter = new TokenBucketManager(3, 1);




app.use((req, res, next) => {
  const userIp = req.ip; 

  if (limiter.isRequestAllowed(userIp)) {
    // SUCCESS: Print it clearly in the terminal!
    console.log(`Request ALLOWED for ${userIp} | Tokens left: ${limiter.buckets.get(userIp).tokens.toFixed(2)}`);
    next(); 
  } else {
    // BLOCKED: Print it clearly in the terminal!
    console.log(`Request BLOCKED for ${userIp} | Bucket is empty!`);
    res.status(429).send("Too Many Requests! Please wait for your bucket to refill.");
  }
});

// The actual data endpoint they are trying to reach
app.get('/api/data', (req, res) => {
  res.send("Success! Here is your secure data.");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});