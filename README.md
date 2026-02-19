# 🛒 Flash Sale Reservation System

A production-ready stock reservation system built using:

-   Node.js
-   Express.js
-   MongoDB (with transactions)
-   Redis (WATCH / MULTI for atomic reservation)
-   TTL-based automatic stock recovery

Designed to prevent overselling during high-concurrency flash sales.

------------------------------------------------------------------------

# 🧠 Why Redis Is Used

Redis is used for temporary stock reservation because:

-   It is in-memory (extremely fast)
-   Supports atomic operations using WATCH / MULTI / EXEC
-   Supports TTL (automatic key expiration)
-   Handles high concurrency better than database-only locking

Instead of locking MongoDB rows during checkout, we:

1.  Reserve stock in Redis
2.  Set a TTL (time limit)
3.  Finalize purchase in MongoDB

This prevents database locking under heavy traffic.

------------------------------------------------------------------------

# ⏳ How TTL Works

When a user reserves a product, a TTL key is created:

Example:

reservation:ttl:{userId}:{productId}

This key is set with an expiration time (e.g., 600 seconds).

If the user does not complete checkout within that time:

-   The key automatically expires
-   Redis deletes the key
-   Expiry listener restores reserved stock

This ensures abandoned reservations do not permanently block inventory.

------------------------------------------------------------------------

# 🔔 How Expiry Listener Works

Redis keyspace notifications are enabled:

notify-keyspace-events Ex

The system subscribes to expiration events:

**keyevent@0**:expired

When a TTL key expires:

1.  The listener detects which reservation expired
2.  Reserved quantity is reduced
3.  Reservation data is cleaned up

This restores stock automatically without cron jobs.

------------------------------------------------------------------------

# 🛡 How Transactions Prevent Overselling

Even though Redis manages reservations, final validation happens in
MongoDB using transactions.

During checkout:

1.  Start MongoDB session
2.  Recalculate available stock
3.  Verify stock again inside transaction
4.  Increase soldStock
5.  Decrease reserved count
6.  Commit transaction

If two users attempt to buy the last item:

-   Only one transaction succeeds
-   The other fails

This guarantees zero overselling.

------------------------------------------------------------------------

# 🚀 How to Run the Project

## 1️⃣ Clone the Repository

`git clone https://github.com/shahabahmed3339/flash-deal-api.git`

`cd flash-deal-api`

## 2️⃣ Install Dependencies

`npm install`

## 3️⃣ Start MongoDB

`mongod`

Or use `MongoDB Atlas`.

## 4️⃣ Start Redis

`redis-server`

Enable keyspace notifications in `redis.conf`:

`notify-keyspace-events Ex`

Or use Docker container for MongoDB and Redis (Recommended)

## 5️⃣ Create .env File

`PORT=5000`

`MONGO_URI=mongodb://localhost:27017/flashdeal`

`REDIS_URL=redis://127.0.0.1:6379`

`RESERVATION_TTL=600`

## 6️⃣ Start the Server

`npm run dev`

------------------------------------------------------------------------

# 📦 Required Environment Variables

  Variable          Description
  ----------------- ------------------------------------
  `PORT`              Server port

  `MONGO_URI`         MongoDB connection string

  `REDIS_URL`         Redis url

  `RESERVATION_TTL`   Reservation expiry time in seconds

------------------------------------------------------------------------

# 📊 API Endpoints

## 1️⃣ Create Product

`POST /products`

`Body: { "name": "iPhone 15", "totalStock": 10 }`

## 2️⃣ Reserve Product

`POST /cart/reserve`

`Body: { "userId": "user1", "productId": "PRODUCT_ID", "quantity": 1 }`

## 3️⃣ Cancel Reservation

`POST /cart/cancel`

`Body: { "userId": "user1", "productId": "PRODUCT_ID" }`

## 4️⃣ Checkout

`POST /cart/checkout`

`Body: { "userId": "user1", "productId": "PRODUCT_ID" }`

## 5️⃣ Get Product Status

`GET /products/:productId`

------------------------------------------------------------------------

# 🏗 System Design Summary

-   Redis handles high-speed temporary reservations
-   TTL ensures automatic expiration
-   Expiry listener restores abandoned stock
-   MongoDB transactions guarantee final consistency
-   Optimistic concurrency using WATCH prevents race conditions

------------------------------------------------------------------------

# ✅ Production Characteristics

✔ Handles high concurrency\
✔ Prevents overselling\
✔ Automatic stock recovery\
✔ Clean separation between reservation and checkout\
✔ Horizontally scalable

------------------------------------------------------------------------

# 👨‍💻 Author

Flash Sale System Implementation by Shahab Ahmed.
