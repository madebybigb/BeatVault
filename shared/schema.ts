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

// User storage table.
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
});

// Beats table
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
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  licenseType: varchar("license_type", { enum: ["basic", "premium", "exclusive"] }).default("basic"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchases table
export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  producerId: varchar("producer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  licenseType: varchar("license_type", { enum: ["basic", "premium", "exclusive"] }).notNull(),
  status: varchar("status", { enum: ["pending", "completed", "failed"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Likes table
export const likes = pgTable("likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  beatId: uuid("beat_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
