CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'footer_form',
	"ip_address" text,
	"subscribed_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);

ALTER TABLE "social_dispatch_logs" ADD COLUMN IF NOT EXISTS "external_post_id" text;
ALTER TABLE "social_dispatch_logs" ADD COLUMN IF NOT EXISTS "raw_response" text;
