# Distributed Rate Limiter Gateway 

A high-performance, distributed API rate limiter built from scratch using **Node.js**, **Express**, **Docker**, and **Redis**. This project implements the **Token Bucket Algorithm** using optimized time-math and atomic scripting to protect backend services from traffic spikes and concurrency vulnerabilities.

---

## Quick Interview Refresh (The 60-Second Summary)

* **What is this?** A backend middleware gateway that limits how many API requests a user can make within a given timeframe (e.g., max 3 requests, refilling at 1 token/sec).
* **The Analogy:** It acts like a security guard at a popular bakery. Every customer gets a bucket with a maximum of 3 tokens. Each pastry costs 1 token. When the bucket is empty, they must wait for it to refill.
* **The Core Problem Solved:** Local server memory (`Map()`) breaks when scaling to multiple servers behind a load balancer. Moving the state to a shared database (**Redis**) introduces **Race Conditions** (concurrency bugs). This architecture solves both problems using **Atomic Lua Scripts**.

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
