ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribe_token_hash" text;

CREATE TABLE IF NOT EXISTS "api_rate_limits" (
  "key" text PRIMARY KEY,
  "count" integer DEFAULT 0 NOT NULL,
  "first_request_at" timestamp DEFAULT now(),
  "blocked_until" timestamp,
  "updated_at" timestamp DEFAULT now()
);
