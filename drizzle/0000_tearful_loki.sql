CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text DEFAULT 'owner' NOT NULL,
	"user_email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"last_active_at" timestamp DEFAULT now(),
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"featured_image" text NOT NULL,
	"author_name" text NOT NULL,
	"author_role" text,
	"category" text NOT NULL,
	"tags" jsonb NOT NULL,
	"image_captions" jsonb,
	"reading_time" integer DEFAULT 5 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" jsonb DEFAULT '[]',
	"status" text DEFAULT 'published' NOT NULL,
	"is_auto_published" boolean DEFAULT false,
	"adsense_compliant" boolean DEFAULT true,
	"published_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_publish_locks" (
	"lock_key" text PRIMARY KEY NOT NULL,
	"locked_by" text NOT NULL,
	"locked_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_publish_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_key" text,
	"status" text DEFAULT 'running' NOT NULL,
	"trigger_source" text DEFAULT 'server_daemon' NOT NULL,
	"article_id" text,
	"article_title" text,
	"word_count" integer,
	"images_count" integer,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contractor_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"client" text NOT NULL,
	"phone" text,
	"address" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"agreed_price" integer DEFAULT 0 NOT NULL,
	"total_paid" integer DEFAULT 0 NOT NULL,
	"items" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"image_url" text NOT NULL,
	"image_hash" text NOT NULL,
	"caption" text,
	"alt_text" text,
	"topic_category" text,
	"width" integer,
	"height" integer,
	"format" text,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_rate_limits" (
	"ip" text PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" timestamp DEFAULT now(),
	"blocked_until" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"platform" text NOT NULL,
	"channel_type" text NOT NULL,
	"has_posting_permission" boolean DEFAULT true NOT NULL,
	"privacy_verified" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"specialization" text,
	"posts_count" integer DEFAULT 0 NOT NULL,
	"last_posted_at" timestamp,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_dispatch_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"article_title" text NOT NULL,
	"article_slug" text NOT NULL,
	"article_url" text NOT NULL,
	"target_channel_id" text NOT NULL,
	"target_channel_name" text NOT NULL,
	"target_platform" text NOT NULL,
	"post_snippet" text NOT NULL,
	"privacy_check_passed" boolean DEFAULT true NOT NULL,
	"age_hours_at_publish" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"notes" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploaded_media" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'supervisor' NOT NULL,
	"password_hash" text,
	"must_change_password" boolean DEFAULT false,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
