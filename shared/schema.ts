import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with indexes
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  username: varchar("username").unique(),
  profileImageUrl: varchar("profile_image_url"),
  bannerImageUrl: varchar("banner_image_url"),
  bio: text("bio"),
  location: varchar("location"),
  website: varchar("website"),
  role: varchar("role", { enum: ["producer", "artist", "both"] }).default("both"),
  isVerified: boolean("is_verified").default(false),
  socialLinks: jsonb("social_links"), // Store Instagram, Twitter, etc.
  preferences: jsonb("preferences"), // Store user preferences for recommendations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_username").on(table.username),
  index("idx_users_role").on(table.role),
  index("idx_users_created_at").on(table.createdAt),
]);

// Beats table with performance indexes
export const beats = pgTable("beats", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  producerId: varchar("producer_id").notNull(),
  audioUrl: varchar("audio_url").notNull(),
  artworkUrl: varchar("artwork_url"),
  stemsUrl: varchar("stems_url"),
  beatTagUrl: varchar("beat_tag_url"),
  waveformUrl: varchar("waveform_url"), // URL to generated waveform data
  previewUrl: varchar("preview_url"), // URL to 30-second preview clip
  audioFormat: varchar("audio_format", { length: 10 }).default("mp3"), // mp3, wav, flac
  fileSize: integer("file_size"), // in bytes
  sampleRate: integer("sample_rate"), // e.g., 44100
  bitRate: integer("bit_rate"), // e.g., 320
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  bpm: integer("bpm").notNull(),
  key: varchar("key", { length: 10 }).notNull(),
  genre: varchar("genre", { length: 50 }).notNull(),
  mood: varchar("mood", { length: 50 }).notNull(),
  tags: text("tags").array(),
  duration: integer("duration"), // in seconds
  playCount: integer("play_count").default(0),
  likeCount: integer("like_count").default(0),
  isExclusive: boolean("is_exclusive").default(false),
  isFree: boolean("is_free").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for frequently queried fields
  index("idx_beats_producer_id").on(table.producerId),
  index("idx_beats_genre").on(table.genre),
  index("idx_beats_mood").on(table.mood),
  index("idx_beats_price").on(table.price),
  index("idx_beats_is_free").on(table.isFree),
  index("idx_beats_is_active").on(table.isActive),
  index("idx_beats_created_at").on(table.createdAt),
  index("idx_beats_play_count").on(table.playCount),
  index("idx_beats_like_count").on(table.likeCount),
  // Composite indexes for common query patterns
  index("idx_beats_active_genre").on(table.isActive, table.genre),
  index("idx_beats_active_created").on(table.isActive, table.createdAt),
  index("idx_beats_producer_active").on(table.producerId, table.isActive),
  // Advanced search indexes
  index("idx_beats_bpm").on(table.bpm),
  index("idx_beats_key").on(table.key),
  index("idx_beats_tags").on(table.tags),
  index("idx_beats_duration").on(table.duration),
  // Multi-column indexes for advanced filtering
  index("idx_beats_genre_mood").on(table.genre, table.mood),
  index("idx_beats_bpm_key").on(table.bpm, table.key),
  index("idx_beats_price_free").on(table.price, table.isFree),
]);

// Cart items table with indexes
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  licenseType: varchar("license_type", { enum: ["basic", "premium", "exclusive"] }).default("basic"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_cart_user_id").on(table.userId),
  index("idx_cart_beat_id").on(table.beatId),
  index("idx_cart_user_beat").on(table.userId, table.beatId), // Unique constraint index
]);

// Purchases table with indexes
export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  producerId: varchar("producer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  licenseType: varchar("license_type", { enum: ["basic", "premium", "exclusive"] }).notNull(),
  status: varchar("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_purchases_user_id").on(table.userId),
  index("idx_purchases_producer_id").on(table.producerId),
  index("idx_purchases_beat_id").on(table.beatId),
  index("idx_purchases_status").on(table.status),
  index("idx_purchases_created_at").on(table.createdAt),
]);

// Likes table with indexes
export const likes = pgTable("likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_likes_user_id").on(table.userId),
  index("idx_likes_beat_id").on(table.beatId),
  index("idx_likes_user_beat").on(table.userId, table.beatId), // Unique constraint index
]);

// Wishlist table for saved beats
export const wishlist = pgTable("wishlist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wishlist_user_id").on(table.userId),
  index("idx_wishlist_beat_id").on(table.beatId),
  index("idx_wishlist_user_beat").on(table.userId, table.beatId), // Unique constraint index
]);

// Collections table for genres and artist types
export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'genre' or 'artist'
  description: text("description"),
  color: varchar("color").notNull(), // Hex color code
  imageUrl: varchar("image_url"),
  beatCount: integer("beat_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_collections_type").on(table.type),
  index("idx_collections_name").on(table.name),
]);

// Followers table for social features
export const followers = pgTable("followers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_followers_follower").on(table.followerId),
  index("idx_followers_following").on(table.followingId),
  index("idx_followers_pair").on(table.followerId, table.followingId), // Unique constraint
]);

// Comments table for beat discussions
export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  beatId: uuid("beat_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id"), // For nested replies
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  likeCount: integer("like_count").default(0),
  replyCount: integer("reply_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_comments_beat").on(table.beatId),
  index("idx_comments_user").on(table.userId),
  index("idx_comments_parent").on(table.parentCommentId),
  index("idx_comments_created").on(table.createdAt),
]);

// Comment likes table
export const commentLikes = pgTable("comment_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: uuid("comment_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_comment_likes_comment").on(table.commentId),
  index("idx_comment_likes_user").on(table.userId),
  index("idx_comment_likes_unique").on(table.commentId, table.userId), // Unique constraint
]);

// Community challenges table
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  createdByUserId: varchar("created_by_user_id").notNull(),
  type: varchar("type", { enum: ["beat_battle", "remix_contest", "sample_flip", "theme_challenge"] }).notNull(),
  genre: varchar("genre"),
  bpm: integer("bpm"),
  key: varchar("key"),
  rules: jsonb("rules"), // JSON array of rules
  prizes: jsonb("prizes"), // JSON array of prizes
  submissionCount: integer("submission_count").default(0),
  maxSubmissions: integer("max_submissions").default(100),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date").notNull(),
  judgeUserIds: jsonb("judge_user_ids"), // JSON array of judge user IDs
  bannerImageUrl: varchar("banner_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_challenges_type").on(table.type),
  index("idx_challenges_active").on(table.isActive),
  index("idx_challenges_featured").on(table.isFeatured),
  index("idx_challenges_dates").on(table.startDate, table.endDate),
  index("idx_challenges_creator").on(table.createdByUserId),
]);

// Challenge submissions table
export const challengeSubmissions = pgTable("challenge_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: uuid("challenge_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  userId: varchar("user_id").notNull(),
  description: text("description"),
  isWinner: boolean("is_winner").default(false),
  placement: integer("placement"), // 1st, 2nd, 3rd place, etc.
  voteCount: integer("vote_count").default(0),
  judgeScore: decimal("judge_score", { precision: 5, scale: 2 }), // Out of 100
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_submissions_challenge").on(table.challengeId),
  index("idx_submissions_beat").on(table.beatId),
  index("idx_submissions_user").on(table.userId),
  index("idx_submissions_winner").on(table.isWinner),
  index("idx_submissions_unique").on(table.challengeId, table.beatId), // One submission per beat per challenge
]);

// Community showcases table
export const showcases = pgTable("showcases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  curatedByUserId: varchar("curated_by_user_id").notNull(),
  type: varchar("type", { enum: ["weekly_picks", "genre_spotlight", "rising_artists", "staff_picks"] }).notNull(),
  beatIds: jsonb("beat_ids").notNull(), // JSON array of featured beat IDs
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  viewCount: integer("view_count").default(0),
  bannerImageUrl: varchar("banner_image_url"),
  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_showcases_type").on(table.type),
  index("idx_showcases_active").on(table.isActive),
  index("idx_showcases_featured").on(table.isFeatured),
  index("idx_showcases_published").on(table.publishedAt),
  index("idx_showcases_curator").on(table.curatedByUserId),
]);

// Opportunities table (label signups, collaborations, etc.)
export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  postedByUserId: varchar("posted_by_user_id").notNull(),
  type: varchar("type", { enum: ["collaboration", "label_signup", "remix_request", "ghost_production", "mixing_mastering"] }).notNull(),
  genre: varchar("genre"),
  budget: decimal("budget", { precision: 10, scale: 2 }), // Optional budget
  currency: varchar("currency").default("USD"),
  location: varchar("location"), // Optional location requirement
  isRemote: boolean("is_remote").default(true),
  requirements: jsonb("requirements"), // JSON array of requirements
  contactInfo: jsonb("contact_info"), // Contact details
  applicationCount: integer("application_count").default(0),
  maxApplications: integer("max_applications"),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_opportunities_type").on(table.type),
  index("idx_opportunities_active").on(table.isActive),
  index("idx_opportunities_featured").on(table.isFeatured),
  index("idx_opportunities_deadline").on(table.deadline),
  index("idx_opportunities_poster").on(table.postedByUserId),
  index("idx_opportunities_genre").on(table.genre),
]);

// PWA offline cache table
export const offlineCache = pgTable("offline_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  audioUrl: varchar("audio_url").notNull(),
  cachedAt: timestamp("cached_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  cacheSize: integer("cache_size"), // Size in bytes
  isPreloaded: boolean("is_preloaded").default(false), // User vs automatic caching
}, (table) => [
  index("idx_cache_user").on(table.userId),
  index("idx_cache_beat").on(table.beatId),
  index("idx_cache_accessed").on(table.lastAccessedAt),
  index("idx_cache_user_beat").on(table.userId, table.beatId), // Unique constraint
]);

// Push notification subscriptions for PWA
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
}, (table) => [
  index("idx_push_user").on(table.userId),
  index("idx_push_active").on(table.isActive),
  index("idx_push_endpoint").on(table.endpoint), // Unique constraint needed
]);

// User listening history for AI recommendations
export const listeningHistory = pgTable("listening_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  listenDuration: integer("listen_duration").notNull(), // seconds
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }), // percentage
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_listening_user").on(table.userId),
  index("idx_listening_beat").on(table.beatId),
  index("idx_listening_created").on(table.createdAt),
  index("idx_listening_user_created").on(table.userId, table.createdAt),
]);

// Analytics data for producers
export const analytics = pgTable("analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  producerId: varchar("producer_id").notNull(),
  beatId: uuid("beat_id"),
  metricType: varchar("metric_type").notNull(), // 'play', 'like', 'purchase', 'download'
  metricValue: integer("metric_value").default(1),
  metadata: jsonb("metadata"), // Additional data like location, device, etc.
  date: timestamp("date").defaultNow(),
}, (table) => [
  index("idx_analytics_producer").on(table.producerId),
  index("idx_analytics_beat").on(table.beatId),
  index("idx_analytics_type").on(table.metricType),
  index("idx_analytics_date").on(table.date),
  index("idx_analytics_producer_date").on(table.producerId, table.date),
]);

// Search suggestions for advanced search
export const searchSuggestions = pgTable("search_suggestions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  query: varchar("query").notNull(),
  category: varchar("category").notNull(), // 'beat', 'producer', 'genre', 'tag', 'bpm', 'key'
  popularity: integer("popularity").default(1),
  resultCount: integer("result_count").default(0), // Number of results for this query
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_search_query").on(table.query),
  index("idx_search_category").on(table.category),
  index("idx_search_popularity").on(table.popularity),
  index("idx_search_result_count").on(table.resultCount),
  index("idx_search_query_category").on(table.query, table.category),
]);

// Search analytics for improving search performance
export const searchAnalytics = pgTable("search_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  query: varchar("query").notNull(),
  userId: varchar("user_id"),
  resultCount: integer("result_count").notNull(),
  clickedBeatId: uuid("clicked_beat_id"), // Which beat was clicked from search results
  searchType: varchar("search_type").notNull(), // 'text', 'filter', 'advanced'
  filters: jsonb("filters"), // Applied filters as JSON
  responseTime: integer("response_time"), // Search response time in ms
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_search_analytics_query").on(table.query),
  index("idx_search_analytics_user").on(table.userId),
  index("idx_search_analytics_created").on(table.createdAt),
  index("idx_search_analytics_clicked_beat").on(table.clickedBeatId),
]);

// Audio processing jobs for waveform and preview generation
export const audioProcessingJobs = pgTable("audio_processing_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  beatId: uuid("beat_id").notNull(),
  jobType: varchar("job_type").notNull(), // 'waveform', 'preview', 'format_conversion'
  status: varchar("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending"),
  inputUrl: varchar("input_url").notNull(),
  outputUrl: varchar("output_url"),
  metadata: jsonb("metadata"), // Job-specific metadata
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audio_jobs_beat").on(table.beatId),
  index("idx_audio_jobs_status").on(table.status),
  index("idx_audio_jobs_type").on(table.jobType),
  index("idx_audio_jobs_created").on(table.createdAt),
]);

// Payment sessions for Dodo Payments
export const paymentSessions = pgTable("payment_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  dodoPaymentId: varchar("dodo_payment_id"), // Dodo Payment ID
  checkoutUrl: varchar("checkout_url"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status", { enum: ["pending", "processing", "succeeded", "failed", "cancelled"] }).default("pending"),
  cartItems: jsonb("cart_items").notNull(), // Store cart items at time of payment
  metadata: jsonb("metadata"), // Additional payment metadata
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payment_sessions_user").on(table.userId),
  index("idx_payment_sessions_dodo_id").on(table.dodoPaymentId),
  index("idx_payment_sessions_status").on(table.status),
  index("idx_payment_sessions_expires").on(table.expiresAt),
]);

// Webhook events for payment tracking
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").unique().notNull(), // Dodo webhook event ID
  eventType: varchar("event_type").notNull(), // payment.succeeded, payment.failed, etc.
  paymentSessionId: uuid("payment_session_id"),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  error: text("error"), // Store any processing errors
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_webhook_events_event_id").on(table.eventId),
  index("idx_webhook_events_type").on(table.eventType),
  index("idx_webhook_events_session").on(table.paymentSessionId),
  index("idx_webhook_events_processed").on(table.processed),
]);

// Licensing information
export const licenses = pgTable("licenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: uuid("purchase_id").notNull(),
  licenseType: varchar("license_type", { enum: ["basic", "premium", "exclusive"] }).notNull(),
  terms: jsonb("terms").notNull(), // License terms and limitations
  downloadCount: integer("download_count").default(0),
  maxDownloads: integer("max_downloads").default(5),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_licenses_purchase").on(table.purchaseId),
  index("idx_licenses_type").on(table.licenseType),
  index("idx_licenses_active").on(table.isActive),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  beats: many(beats),
  cartItems: many(cartItems),
  purchases: many(purchases),
  likes: many(likes),
}));

export const beatsRelations = relations(beats, ({ one, many }) => ({
  producer: one(users, {
    fields: [beats.producerId],
    references: [users.id],
  }),
  cartItems: many(cartItems),
  purchases: many(purchases),
  likes: many(likes),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [cartItems.beatId],
    references: [beats.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [purchases.beatId],
    references: [beats.id],
  }),
  producer: one(users, {
    fields: [purchases.producerId],
    references: [users.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [likes.beatId],
    references: [beats.id],
  }),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [wishlist.beatId],
    references: [beats.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  beats: many(beats),
}));

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
  }),
}));

export const listeningHistoryRelations = relations(listeningHistory, ({ one }) => ({
  user: one(users, {
    fields: [listeningHistory.userId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [listeningHistory.beatId],
    references: [beats.id],
  }),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  producer: one(users, {
    fields: [analytics.producerId],
    references: [users.id],
  }),
  beat: one(beats, {
    fields: [analytics.beatId],
    references: [beats.id],
  }),
}));

export const paymentSessionsRelations = relations(paymentSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentSessions.userId],
    references: [users.id],
  }),
  webhookEvents: many(webhookEvents),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  paymentSession: one(paymentSessions, {
    fields: [webhookEvents.paymentSessionId],
    references: [paymentSessions.id],
  }),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  purchase: one(purchases, {
    fields: [licenses.purchaseId],
    references: [purchases.id],
  }),
}));

export const searchAnalyticsRelations = relations(searchAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [searchAnalytics.userId],
    references: [users.id],
  }),
  clickedBeat: one(beats, {
    fields: [searchAnalytics.clickedBeatId],
    references: [beats.id],
  }),
}));

export const audioProcessingJobsRelations = relations(audioProcessingJobs, ({ one }) => ({
  beat: one(beats, {
    fields: [audioProcessingJobs.beatId],
    references: [beats.id],
  }),
}));

// Schemas for validation
export const insertBeatSchema = createInsertSchema(beats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  playCount: true,
  likeCount: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  createdAt: true,
});

export const insertWishlistSchema = createInsertSchema(wishlist).omit({
  id: true,
  createdAt: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFollowerSchema = createInsertSchema(followers).omit({
  id: true,
  createdAt: true,
});

export const insertListeningHistorySchema = createInsertSchema(listeningHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  date: true,
});

export const insertPaymentSessionSchema = createInsertSchema(paymentSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  createdAt: true,
});

export const insertSearchSuggestionSchema = createInsertSchema(searchSuggestions).omit({
  id: true,
  lastUsed: true,
  createdAt: true,
});

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertAudioProcessingJobSchema = createInsertSchema(audioProcessingJobs).omit({
  id: true,
  createdAt: true,
});

// Pagination types
export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Background job types
export interface BackgroundJob {
  id: string;
  type: 'beat_processing' | 'email_notification' | 'analytics_update' | 'waveform_generation' | 'preview_generation' | 'search_indexing';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Comment types
export type InsertComment = typeof comments.$inferInsert;
export type Comment = typeof comments.$inferSelect;

// Challenge types  
export type InsertChallenge = typeof challenges.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallengeSubmission = typeof challengeSubmissions.$inferInsert;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;

// Showcase types
export type InsertShowcase = typeof showcases.$inferInsert;
export type Showcase = typeof showcases.$inferSelect;

// Opportunity types
export type InsertOpportunity = typeof opportunities.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;

// Social types
export type InsertFollower = typeof followers.$inferInsert;
export type Follower = typeof followers.$inferSelect;

// PWA types
export type InsertOfflineCache = typeof offlineCache.$inferInsert;
export type OfflineCache = typeof offlineCache.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Beat = typeof beats.$inferSelect;
export type InsertBeat = z.infer<typeof insertBeatSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Like = typeof likes.$inferSelect;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
// Removed duplicate - already defined above
export type ListeningHistory = typeof listeningHistory.$inferSelect;
export type InsertListeningHistory = z.infer<typeof insertListeningHistorySchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type PaymentSession = typeof paymentSessions.$inferSelect;
export type InsertPaymentSession = z.infer<typeof insertPaymentSessionSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type SearchSuggestion = typeof searchSuggestions.$inferSelect;
export type InsertSearchSuggestion = z.infer<typeof insertSearchSuggestionSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type AudioProcessingJob = typeof audioProcessingJobs.$inferSelect;
export type InsertAudioProcessingJob = z.infer<typeof insertAudioProcessingJobSchema>;

// Advanced search interfaces
export interface SearchFilters {
  query?: string;
  genre?: string;
  mood?: string;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  priceMin?: number;
  priceMax?: number;
  duration?: { min?: number; max?: number };
  tags?: string[];
  isFree?: boolean;
  isExclusive?: boolean;
  producerId?: string;
  sortBy?: 'relevance' | 'newest' | 'popular' | 'price_low' | 'price_high' | 'bpm' | 'duration';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  beats: Beat[];
  totalCount: number;
  facets: {
    genres: { value: string; count: number }[];
    moods: { value: string; count: number }[];
    keys: { value: string; count: number }[];
    bpmRanges: { range: string; count: number }[];
    priceRanges: { range: string; count: number }[];
  };
  suggestions: string[];
  searchTime: number;
}

export interface AudioStreamMetadata {
  duration: number;
  sampleRate: number;
  bitRate: number;
  format: string;
  waveformData?: number[];
  peaks?: number[];
}
