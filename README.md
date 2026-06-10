# Distributed Rate Limiter Gateway 

A high-performance, distributed API rate limiter built from scratch using **Node.js**, **Express**, **Docker**, and **Redis**. This project implements the **Token Bucket Algorithm** using optimized time-math and atomic scripting to protect backend services from traffic spikes and concurrency vulnerabilities.

---

## Key Architectural Concepts

### 1. Lazy Evaluation (Resource Optimization)
* **The Problem:** Running a continuous background timer (`setInterval`) to constantly increment user tokens burns massive CPU cycles, especially when scaling to millions of users.
* **The Solution:** The bucket state is calculated **on-demand (lazily)** only when a request actually hits the server. The system looks at the current timestamp, calculates elapsed time since the last request, and adds the newly earned tokens mathematically instantly:
    $$\text{Tokens to Add} = \text{Elapsed Time} \times \text{Refill Rate}$$

### 2. Distributed State Management (Docker & Redis)
* Instead of holding user data inside the isolated, temporary memory of a single Node.js instance, all data is centralized into an independent, ultra-fast **Redis** cache running inside a **Docker container**. This allows multiple server instances to share the exact same rate-limiting state smoothly.

### 3. Eliminating Race Conditions (Atomicity via Lua)
* **The Danger:** In a multi-server setup, if two requests hit different servers at the exact same millisecond, both servers might read the same old token count from Redis simultaneously, causing data corruption (allowing requests that should be blocked).
* **The Fix:** The entire calculation logic is shipped to Redis as an embedded **Lua Script**. Redis executes Lua scripts **atomically** in a single thread, freezing all other operations until the math is written back to memory, completely eliminating race conditions.

---

## Technology Stack

* **Backend:** Node.js, Express
* **Infrastructure:** Docker, Redis
* **Scripting:** Lua (Embedded inside Redis)
* **Testing:** Concurrent Promises (`Promise.all`) for automated stress testing

---

## How to Run & Test

### Prerequisites
Ensure you have **Node.js** and **Docker Desktop** installed.

### 1. Boot up the Redis Infrastructure
Wake up the isolated background Redis container:
```bash
docker start my-redis

## 1. Start Redis

If running for the first time:

```bash
$ docker run --name my-redis -p 6379:6379 -d redis
```

If the container already exists:

```bash
$ docker start my-redis
```

---

## 2. Start the API Gateway

Open a terminal and run:

```bash
$ npm install
$ node server.js
```

Expected output:

```console
Gateway running on http://localhost:3000
✅ Successfully connected to background Redis container!
```

---

## 3. Run the Stress Test

Open a second terminal:

```bash
$ node stressTest.js
```

Expected output:

```console
Starting stress test: Firing 10 requests at once...

[Request #1] Status: 200
[Request #2] Status: 200
[Request #3] Status: 200
[Request #4] Status: 429
...
Stress test complete.
```

