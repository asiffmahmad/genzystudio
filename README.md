# GenzyStudio

GenzyStudio is a social media command center designed for publishing, scheduling, and tracking posts across multiple social platforms (LinkedIn, Facebook, Instagram, etc.).

## Scheduled Publishing System Architecture

Scheduled posts in GenzyStudio are managed via a database-driven queue model. 

### Flow Diagram
```
User (UI) 
  ↓ (Schedules Post)
Database (Prisma / MySQL)
  └─ creates ScheduledPost record (status: 'SCHEDULED')
  └─ stores scheduledAt time (UTC ISO string)
  
External Cron Scheduler (e.g. cron-job.org)
  ↓ (GET /api/cron/publish, once per minute)
GenzyStudio Endpoint (app/api/cron/publish/route.ts)
  ├─ 1. Authenticates request using CRON_SECRET Bearer token
  ├─ 2. Finds all SCHEDULED posts where scheduledAt <= now
  ├─ 3. Claims posts atomically using database-level status update (concurrency protection)
  ├─ 4. Resolves credentials & executes publication call to Social Providers (Meta, LinkedIn, etc.)
  └─ 5. Updates status to PUBLISHED or schedules a retry on failure
```

---

## 1. How Production Scheduling Works

Since Vercel Hobby plan does not permit high-frequency cron jobs, scheduled publishing is driven by an **external cron scheduler** triggering GenzyStudio's secure API endpoint.

### Configuring an External Scheduler (e.g., cron-job.org)
1. Register for a free account at [cron-job.org](https://cron-job.org/).
2. Create a new cron job with the following parameters:
   - **URL**: `https://YOUR_APP_DOMAIN.vercel.app/api/cron/publish` (Replace with your Vercel deployment URL)
   - **Schedule**: `Every minute` (or every 5 minutes depending on desired precision)
   - **Request Method**: `GET`
   - **Headers**: Add custom header:
     - Key: `Authorization`
     - Value: `Bearer YOUR_CRON_SECRET_VALUE` (Must match the `CRON_SECRET` environment variable set in Vercel)
3. Save the job. It will trigger the publisher automatically.

---

## 2. Expected Scheduling Precision
* Post publishing precision is determined by the frequency of your external cron trigger.
* If configured to trigger **every minute**, posts will be processed and published within **60 seconds** of their scheduled time.
* All scheduled dates are serialized and saved in **UTC** in the database to prevent server and client timezone offsets.

---

## 3. Concurrency & Duplicate Protection
To prevent duplicate publishing if two cron tasks execute simultaneously:
* We perform a database-level atomic claim check when retrieving posts.
* The status of the target post is modified from `SCHEDULED` to `PUBLISHING` using an atomic `updateMany` statement:
  ```typescript
  const updateResult = await prisma.scheduledPost.updateMany({
    where: { id: post.id, status: 'SCHEDULED' },
    data: { status: 'PUBLISHING', lastAttemptAt: new Date() }
  });
  ```
* If `updateResult.count === 0`, it means another worker already claimed the post; the current worker immediately skips it.

---

## 4. Retry and Failure Behavior
If a publishing call to a social network fails (e.g. due to a transient API rate limit or network glitch):
* The system reschedules the post by resetting its status to `SCHEDULED`.
* The `retryCount` is incremented.
* The maximum retry limit is **3 attempts** (governed by `maxRetries` column).
* If a post fails after reaching the max retry threshold, its status is permanently set to `FAILED`, the `errorMessage` is logged in the database, and it will no longer be retrieved by the scheduler.

---

## 5. Security & Authentication
The `/api/cron/publish` route is protected to ensure it cannot be run by unauthorized third parties:
* It requires an `Authorization: Bearer <CRON_SECRET>` HTTP header in production.
* If the `CRON_SECRET` env variable is set to a custom value (non-default), any requests lacking the exact bearer token are rejected with `401 Unauthorized`.
* Access secrets are kept on the server and are never exposed in frontend code, URLs, or client-side assets.

---

## 6. Environment Variables

Define the following environment variables in Vercel for production scheduling:

| Env Name | Description | Example / Recommendations |
| :--- | :--- | :--- |
| `CRON_SECRET` | Secure key used to authenticate external cron requests | Generate a secure random string (e.g. using `openssl rand -hex 32`) |
| `DATABASE_URL` | MySQL Database Connection URI | Configured automatically for TiDB Cloud |
| `ENCRYPTION_KEY` | 32-byte key for encrypting OAuth access tokens | Hexadecimal string |

---

## 7. How to Test the Scheduler Locally

1. Set up your local `.env` variables (you can copy `.env.example`).
2. Ensure you have some posts scheduled in the database whose scheduled date/time is in the past:
   - Status: `SCHEDULED`
   - `scheduledAt` <= Current local time
3. Trigger the scheduler endpoint manually:
   - If `CRON_SECRET` is left as `your-cron-secret-here` (default development setting), no authentication is required:
     ```bash
     curl -i http://localhost:3000/api/cron/publish
     ```
   - If you set a custom `CRON_SECRET`, pass the Bearer header:
     ```bash
     curl -i -H "Authorization: Bearer your-custom-secret" http://localhost:3000/api/cron/publish
     ```
