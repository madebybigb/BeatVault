import {
  users,
  beats,
  cartItems,
  purchases,
  likes,
  wishlist,
  collections,
  type User,
  type UpsertUser,
  type Beat,
  type InsertBeat,
  type CartItem,
  type InsertCartItem,
  type Purchase,
  type InsertPurchase,
  type Like,
  type InsertLike,
  type Wishlist,
  type InsertWishlist,
  type Collection,
  type InsertCollection,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined>;

  // Beat operations
  getBeats(filters?: {
    genre?: string;
    mood?: string;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    isFree?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Beat[]>;
  getBeat(id: string): Promise<Beat | undefined>;
  getBeatsByProducer(producerId: string): Promise<Beat[]>;
  createBeat(beat: InsertBeat): Promise<Beat>;
  updateBeat(id: string, beat: Partial<InsertBeat>): Promise<Beat | undefined>;
  deleteBeat(id: string): Promise<boolean>;
  incrementPlayCount(beatId: string): Promise<void>;
  getTrendingBeats(limit?: number): Promise<Beat[]>;
  getPopularBeats(limit?: number): Promise<Beat[]>;

  // Cart operations
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  removeFromCart(userId: string, beatId: string): Promise<boolean>;
  clearCart(userId: string): Promise<void>;

  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  getPurchasesByProducer(producerId: string): Promise<Purchase[]>;

  // Like operations
  likeBeats(like: InsertLike): Promise<Like>;
  unlikeBeat(userId: string, beatId: string): Promise<boolean>;
  getUserLikes(userId: string): Promise<Like[]>;
  isLiked(userId: string, beatId: string): Promise<boolean>;

  // Wishlist operations
  getWishlistItems(userId: string): Promise<any[]>;
  addToWishlist(wishlistItem: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: string, beatId: string): Promise<boolean>;

  // Collection operations
  getCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Beat operations
  async getBeats(filters?: {
    genre?: string;
    mood?: string;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    isFree?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Beat[]> {
    const conditions = [eq(beats.isActive, true)];

    if (filters?.genre) {
      conditions.push(eq(beats.genre, filters.genre));
    }
    if (filters?.mood) {
      conditions.push(eq(beats.mood, filters.mood));
    }
    if (filters?.priceMin !== undefined) {
      conditions.push(sql`${beats.price} >= ${filters.priceMin}`);
    }
    if (filters?.priceMax !== undefined) {
      conditions.push(sql`${beats.price} <= ${filters.priceMax}`);
    }
    if (filters?.isFree !== undefined) {
      conditions.push(eq(beats.isFree, filters.isFree));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(beats.title, `%${filters.search}%`),
          ilike(beats.description, `%${filters.search}%`),
          sql`${beats.tags} && ARRAY[${filters.search}]::text[]`
        )
      );
    }

    let query = db
      .select()
      .from(beats)
      .where(and(...conditions))
      .orderBy(desc(beats.createdAt));

    if (filters?.limit) {
      query = query.limit(Math.min(filters.limit, 100)); // Cap at 100 for performance
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getBeat(id: string): Promise<Beat | undefined> {
    try {
      const [beat] = await db.select().from(beats).where(eq(beats.id, id));
      return beat;
    } catch (error) {
      console.error(`Error fetching beat ${id}:`, error);
      return undefined;
    }
  }

  async getBeatsByProducer(producerId: string): Promise<Beat[]> {
    return await db
      .select()
      .from(beats)
      .where(and(eq(beats.producerId, producerId), eq(beats.isActive, true)))
      .orderBy(desc(beats.createdAt));
  }

  async createBeat(beat: InsertBeat): Promise<Beat> {
    const [newBeat] = await db.insert(beats).values(beat).returning();
    return newBeat;
  }

  async updateBeat(id: string, beat: Partial<InsertBeat>): Promise<Beat | undefined> {
    const [updatedBeat] = await db
      .update(beats)
      .set({ ...beat, updatedAt: new Date() })
      .where(eq(beats.id, id))
      .returning();
    return updatedBeat;
  }

  async deleteBeat(id: string): Promise<boolean> {
    const result = await db
      .update(beats)
      .set({ isActive: false })
      .where(eq(beats.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementPlayCount(beatId: string): Promise<void> {
    await db
      .update(beats)
      .set({ playCount: sql`${beats.playCount} + 1` })
      .where(eq(beats.id, beatId));
  }

  async getTrendingBeats(limit = 10): Promise<Beat[]> {
    try {
      return await db
        .select()
        .from(beats)
        .where(eq(beats.isActive, true))
        .orderBy(desc(beats.playCount), desc(beats.likeCount))
        .limit(Math.min(limit, 50)); // Cap at 50 for performance
    } catch (error) {
      console.error('Error fetching trending beats:', error);
      return [];
    }
  }

  async getPopularBeats(limit = 10): Promise<Beat[]> {
    try {
      return await db
        .select()
        .from(beats)
        .where(eq(beats.isActive, true))
        .orderBy(desc(beats.likeCount), desc(beats.playCount))
        .limit(Math.min(limit, 50)); // Cap at 50 for performance
    } catch (error) {
      console.error('Error fetching popular beats:', error);
      return [];
    }
  }

  // Cart operations
  async getCartItems(userId: string): Promise<CartItem[]> {
    return await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, cartItem.userId),
          eq(cartItems.beatId, cartItem.beatId)
        )
      );

    if (existing) {
      return existing;
    }

    const [newItem] = await db.insert(cartItems).values(cartItem).returning();
    return newItem;
  }

  async removeFromCart(userId: string, beatId: string): Promise<boolean> {
    const result = await db
      .delete(cartItems)
      .where(
        and(eq(cartItems.userId, userId), eq(cartItems.beatId, beatId))
      );
    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Purchase operations
  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  async getPurchasesByProducer(producerId: string): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.producerId, producerId))
      .orderBy(desc(purchases.createdAt));
  }

  // Like operations
  async likeBeats(like: InsertLike): Promise<Like> {
    // Check if already liked
    const [existing] = await db
      .select()
      .from(likes)
      .where(
        and(eq(likes.userId, like.userId), eq(likes.beatId, like.beatId))
      );

    if (existing) {
      return existing;
    }

    const [newLike] = await db.insert(likes).values(like).returning();
    
    // Increment like count
    await db
      .update(beats)
      .set({ likeCount: sql`${beats.likeCount} + 1` })
      .where(eq(beats.id, like.beatId));

    return newLike;
  }

  async unlikeBeat(userId: string, beatId: string): Promise<boolean> {
    const result = await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.beatId, beatId)));

    if ((result.rowCount ?? 0) > 0) {
      // Decrement like count
      await db
        .update(beats)
        .set({ likeCount: sql`${beats.likeCount} - 1` })
        .where(eq(beats.id, beatId));
      return true;
    }
    return false;
  }

  async getUserLikes(userId: string): Promise<Like[]> {
    return await db
      .select()
      .from(likes)
      .where(eq(likes.userId, userId))
      .orderBy(desc(likes.createdAt));
  }

  async isLiked(userId: string, beatId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.beatId, beatId)));
    return !!like;
  }

  // Wishlist operations
  async getWishlistItems(userId: string): Promise<any[]> {
    const result = await db
      .select({
        id: wishlist.id,
        userId: wishlist.userId,
        beatId: wishlist.beatId,
        createdAt: wishlist.createdAt,
        beat: beats,
      })
      .from(wishlist)
      .innerJoin(beats, eq(wishlist.beatId, beats.id))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt));
    
    return result;
  }

  async addToWishlist(wishlistItem: InsertWishlist): Promise<Wishlist> {
    // Check if already in wishlist
    const [existing] = await db
      .select()
      .from(wishlist)
      .where(
        and(
          eq(wishlist.userId, wishlistItem.userId),
          eq(wishlist.beatId, wishlistItem.beatId)
        )
      );

    if (existing) {
      return existing;
    }

    const [newWishlistItem] = await db.insert(wishlist).values(wishlistItem).returning();
    return newWishlistItem;
  }

  async removeFromWishlist(userId: string, beatId: string): Promise<boolean> {
    const result = await db
      .delete(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.beatId, beatId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Collection operations
  async getCollections(): Promise<Collection[]> {
    return await db
      .select()
      .from(collections)
      .where(eq(collections.isActive, true))
      .orderBy(desc(collections.beatCount), collections.name);
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id));
    return collection;
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db.insert(collections).values(collection).returning();
    return newCollection;
  }
}

export const storage = new DatabaseStorage();
