const express = require('express');
const { createClient } = require('redis');

const app = express();
const PORT = 3000;

// 1. Initialize our Redis Client (connects to localhost:6379 by default)
const redisClient = createClient();

async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("✅ Successfully connected to background Redis container!");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
  }
}
connectRedis();

// 2. Define the Atomic Lua Script
// This entire block of logic runs uninterrupted inside Redis memory
const rateLimitLuaScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local requested = 1

    -- Fetch the user's current record from Redis
    local data = redis.call('HMGET', key, 'tokens', 'last_updated')
    local tokens = tonumber(data[1])
    local last_updated = tonumber(data[2])

    -- If it's a completely new user, initialize their bucket
    if not tokens then
        tokens = capacity
        last_updated = now
    else
        -- LAZY EVALUATION MATH: Calculate time passed and add earned tokens
        local elapsed = math.max(0, now - last_updated)
        local tokens_to_add = (elapsed / 1000) * refill_rate
        tokens = math.min(capacity, tokens + tokens_to_add)
    end

    -- THE DECISION
    if tokens >= requested then
        tokens = tokens - requested
        -- Save the updated counts back to Redis
        redis.call('HMSET', key, 'tokens', tokens, 'last_updated', now)
        redis.call('PEXPIRE', key, 3600000) -- Auto-clean this user data after 1 hour of silence
        return {1, tokens} -- Success code and remaining tokens
    else
        return {0, tokens} -- Blocked code and current tokens
    end
`;

// 3. The Distributed Rate Limiter Middleware
app.use(async (req, res, next) => {
  const userIp = req.ip;
  const maxCapacity = "3"; // Max 3 tokens
  const refillRate = "1";  // 1 token refilled per second
  const now = Date.now().toString();

  try {
    // Send the script, keys, and arguments to our background Redis instance
    const [status, remainingTokens] = await redisClient.eval(rateLimitLuaScript, {
      keys: [`rate_limit:${userIp}`],
      arguments: [maxCapacity, refillRate, now]
    });

    if (status === 1) {
      console.log(`✅ [Distributed] ALLOWED | Tokens left: ${Number(remainingTokens).toFixed(2)}`);
      next();
    } else {
      console.log(`❌ [Distributed] BLOCKED | Bucket empty!`);
      res.status(429).send("Too Many Requests! (Protected by Distributed Redis Gateway)");
    }
  } catch (err) {
    console.error("Redis Error:", err);
    next(); // "Fail-open" strategy: If Redis dies, don't crash the app for users!
  }
});

// 4. Our core API endpoint
app.get('/api/data', (req, res) => {
  res.send("Success! You successfully bypassed the distributed gateway security.");
});

app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});