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
  profileImageUrl: varchar("profile_image_url"),
  bannerImageUrl: varchar("banner_image_url"),
  bio: text("bio"),
  role: varchar("role", { enum: ["producer", "artist", "both"] }).default("both"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
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
  type: 'beat_processing' | 'email_notification' | 'analytics_update';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
