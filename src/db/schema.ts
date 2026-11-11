import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('supervisor'), // 'owner' | 'supervisor'
  passwordHash: text('password_hash'),
  mustChangePassword: boolean('must_change_password').default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  featuredImage: text('featured_image').notNull(),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role'),
  category: text('category').notNull(),
  tags: jsonb('tags').notNull(), // array of strings
  imageCaptions: jsonb('image_captions'), // array of strings
  readingTime: integer('reading_time').notNull().default(5),
  views: integer('views').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  comments: jsonb('comments').default('[]'),
  status: text('status').notNull().default('published'),
  isAutoPublished: boolean('is_auto_published').default(false),
  adSenseCompliant: boolean('adsense_compliant').default(true),
  publishedAt: timestamp('published_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(), // 'main_settings'
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const socialChannels = pgTable('social_channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  platform: text('platform').notNull(),
  channelType: text('channel_type').notNull(),
  hasPostingPermission: boolean('has_posting_permission').notNull().default(true),
  privacyVerified: boolean('privacy_verified').notNull().default(true),
  status: text('status').notNull().default('active'),
  specialization: text('specialization'),
  postsCount: integer('posts_count').notNull().default(0),
  lastPostedAt: timestamp('last_posted_at'),
  addedAt: timestamp('added_at').defaultNow(),
});

export const socialDispatchLogs = pgTable('social_dispatch_logs', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull(),
  articleTitle: text('article_title').notNull(),
  articleSlug: text('article_slug').notNull(),
  articleUrl: text('article_url').notNull(),
  targetChannelId: text('target_channel_id').notNull(),
  targetChannelName: text('target_channel_name').notNull(),
  targetPlatform: text('target_platform').notNull(),
  postSnippet: text('post_snippet').notNull(),
  privacyCheckPassed: boolean('privacy_check_passed').notNull().default(true),
  ageHoursAtPublish: integer('age_hours_at_publish').notNull().default(0),
  status: text('status').notNull().default('queued'), // 'not_configured' | 'queued' | 'publishing' | 'published' | 'failed' | 'skipped_expired_24h'
  externalPostId: text('external_post_id'),
  rawResponse: text('raw_response'),
  notes: text('notes'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const contractorProjects = pgTable('contractor_projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  client: text('client').notNull(),
  phone: text('phone'),
  address: text('address'),
  status: text('status').notNull().default('in_progress'),
  agreedPrice: integer('agreed_price').notNull().default(0),
  totalPaid: integer('total_paid').notNull().default(0),
  items: jsonb('items').default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const uploadedMedia = pgTable('uploaded_media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const autoPublishRuns = pgTable('auto_publish_runs', {
  id: text('id').primaryKey(),
  cycleKey: text('cycle_key'), // e.g. "cycle-2026-10-24" for 24h idempotency
  status: text('status').notNull().default('running'), // 'running' | 'success' | 'failed' | 'skipped'
  triggerSource: text('trigger_source').notNull().default('server_daemon'), // 'cloud_scheduler' | 'admin_manual' | 'server_daemon'
  articleId: text('article_id'),
  articleTitle: text('article_title'),
  wordCount: integer('word_count'),
  imagesCount: integer('images_count'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').defaultNow(),
  finishedAt: timestamp('finished_at'),
});

export const autoPublishLocks = pgTable('auto_publish_locks', {
  lockKey: text('lock_key').primaryKey(), // 'auto_publish_mutex'
  lockedBy: text('locked_by').notNull(),
  lockedAt: timestamp('locked_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Persistent, secure admin sessions stored in PostgreSQL
// Token is hashed with SHA-256 before storing to ensure tokens are never leaked from DB dumps
export const adminSessions = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull().default('owner'),
  userEmail: text('user_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// Persistent login rate limits stored in PostgreSQL
// Survives server restarts and enforces lockouts across all Cloud Run instances
export const loginRateLimits = pgTable('login_rate_limits', {
  ip: text('ip').primaryKey(),
  attemptCount: integer('attempt_count').notNull().default(0),
  firstAttemptAt: timestamp('first_attempt_at').defaultNow(),
  blockedUntil: timestamp('blocked_until'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Persistent registry of image usage across articles for deduplication & perceptual hash verification
export const imageUsageLogs = pgTable('image_usage_logs', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull(),
  imageUrl: text('image_url').notNull(),
  imageHash: text('image_hash').notNull(), // 16-hex character perceptual difference hash (dHash)
  caption: text('caption'),
  altText: text('alt_text'),
  topicCategory: text('topic_category'),
  width: integer('width'),
  height: integer('height'),
  format: text('format'),
  usedAt: timestamp('used_at').defaultNow(),
});

// Persistent client contact inquiries stored in PostgreSQL
export const contactMessages = pgTable('contact_messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Persistent newsletter subscribers stored in PostgreSQL
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status').notNull().default('active'), // 'active' | 'unsubscribed'
  source: text('source').default('footer_form'),
  ipAddress: text('ip_address'),
  unsubscribeTokenHash: text('unsubscribe_token_hash'),
  subscribedAt: timestamp('subscribed_at').defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at'),
});

// Distributed persistent API rate limits across Cloud Run instances
export const apiRateLimits = pgTable('api_rate_limits', {
  key: text('key').primaryKey(), // e.g. "contact:1.2.3.4", "newsletter:1.2.3.4", "ai:1.2.3.4", "like:1.2.3.4"
  count: integer('count').notNull().default(0),
  firstRequestAt: timestamp('first_request_at').defaultNow(),
  blockedUntil: timestamp('blocked_until'),
  updatedAt: timestamp('updated_at').defaultNow(),
});



