import {
  notifications,
  users,
  beats,
  comments,
  type Notification,
  type InsertNotification,
  type User,
  type Beat,
  type Comment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export class NotificationService {
  /**
   * Create a notification for a user action
   */
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    try {
      // Don't create notification if actor and recipient are the same
      if (notificationData.actorId === notificationData.userId) {
        throw new Error('Cannot create notification for self-action');
      }

      const [notification] = await db
        .insert(notifications)
        .values(notificationData)
        .returning();

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    includeRead: boolean = true
  ): Promise<Notification[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .where(
          includeRead
            ? eq(notifications.userId, userId)
            : and(
                eq(notifications.userId, userId),
                eq(notifications.isRead, false)
              )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      const userNotifications = await query;
      return userNotifications;
    } catch (error) {
      console.error('Get user notifications error:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      return true;
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return false;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .update(notifications)
        .set({ isArchived: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Archive notification error:', error);
      return false;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        ));

      return result?.count || 0;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Create notification for beat like
   */
  async notifyBeatLike(beatId: string, likerId: string): Promise<void> {
    try {
      // Get beat and producer info
      const [beat] = await db
        .select({
          beat: beats,
          producer: users
        })
        .from(beats)
        .innerJoin(users, eq(users.id, beats.producerId))
        .where(eq(beats.id, beatId))
        .limit(1);

      if (!beat) return;

      // Get liker info
      const [liker] = await db
        .select()
        .from(users)
        .where(eq(users.id, likerId))
        .limit(1);

      if (!liker) return;

      await this.createNotification({
        userId: beat.producer.id,
        actorId: likerId,
        type: 'like',
        entityType: 'beat',
        entityId: beatId,
        title: 'Beat Liked',
        message: `${liker.firstName || liker.email} liked your beat "${beat.beat.title}"`,
        metadata: {
          beatTitle: beat.beat.title,
          beatId: beatId,
          likerName: `${liker.firstName || ''} ${liker.lastName || ''}`.trim() || liker.email
        }
      });
    } catch (error) {
      console.error('Notify beat like error:', error);
    }
  }

  /**
   * Create notification for comment
   */
  async notifyComment(beatId: string, commentId: string, commenterId: string): Promise<void> {
    try {
      // Get beat, comment, and producer info
      const [data] = await db
        .select({
          beat: beats,
          comment: comments,
          commenter: users,
          producer: users
        })
        .from(comments)
        .innerJoin(beats, eq(beats.id, comments.beatId))
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(users, eq(users.id, beats.producerId))
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!data) return;

      await this.createNotification({
        userId: data.producer.id,
        actorId: commenterId,
        type: 'comment',
        entityType: 'beat',
        entityId: beatId,
        title: 'New Comment',
        message: `${data.commenter.firstName || data.commenter.email} commented on your beat "${data.beat.title}"`,
        metadata: {
          beatTitle: data.beat.title,
          beatId: beatId,
          commentId: commentId,
          commenterName: `${data.commenter.firstName || ''} ${data.commenter.lastName || ''}`.trim() || data.commenter.email,
          commentContent: data.comment.content
        }
      });
    } catch (error) {
      console.error('Notify comment error:', error);
    }
  }

  /**
   * Create notification for comment reply
   */
  async notifyCommentReply(commentId: string, replierId: string): Promise<void> {
    try {
      // Get comment and parent comment info
      const [data] = await db
        .select({
          comment: comments,
          parentComment: comments,
          replier: users,
          originalCommenter: users
        })
        .from(comments)
        .innerJoin(comments, eq(comments.parentCommentId, comments.id))
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(users, eq(users.id, comments.userId))
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!data || data.replier.id === data.originalCommenter.id) return;

      await this.createNotification({
        userId: data.originalCommenter.id,
        actorId: replierId,
        type: 'reply',
        entityType: 'comment',
        entityId: commentId,
        title: 'Comment Reply',
        message: `${data.replier.firstName || data.replier.email} replied to your comment`,
        metadata: {
          commentId: commentId,
          parentCommentId: data.parentComment.id,
          replierName: `${data.replier.firstName || ''} ${data.replier.lastName || ''}`.trim() || data.replier.email,
          replyContent: data.comment.content
        }
      });
    } catch (error) {
      console.error('Notify comment reply error:', error);
    }
  }

  /**
   * Create notification for follow
   */
  async notifyFollow(followerId: string, followingId: string): Promise<void> {
    try {
      // Get follower and following user info
      const [follower] = await db
        .select()
        .from(users)
        .where(eq(users.id, followerId))
        .limit(1);

      const [following] = await db
        .select()
        .from(users)
        .where(eq(users.id, followingId))
        .limit(1);

      if (!follower || !following) return;

      await this.createNotification({
        userId: followingId,
        actorId: followerId,
        type: 'follow',
        entityType: 'user',
        entityId: followerId,
        title: 'New Follower',
        message: `${follower.firstName || follower.email} started following you`,
        metadata: {
          followerName: `${follower.firstName || ''} ${follower.lastName || ''}`.trim() || follower.email,
          followerId: followerId
        }
      });
    } catch (error) {
      console.error('Notify follow error:', error);
    }
  }

  /**
   * Create notification for beat sale
   */
  async notifyBeatSale(beatId: string, buyerId: string, producerId: string, amount: number): Promise<void> {
    try {
      // Get beat and buyer info
      const [beat] = await db
        .select()
        .from(beats)
        .where(eq(beats.id, beatId))
        .limit(1);

      const [buyer] = await db
        .select()
        .from(users)
        .where(eq(users.id, buyerId))
        .limit(1);

      if (!beat || !buyer) return;

      await this.createNotification({
        userId: producerId,
        actorId: buyerId,
        type: 'sale',
        entityType: 'beat',
        entityId: beatId,
        title: 'Beat Sold!',
        message: `${buyer.firstName || buyer.email} purchased your beat "${beat.title}" for $${amount}`,
        metadata: {
          beatTitle: beat.title,
          beatId: beatId,
          buyerName: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || buyer.email,
          amount: amount
        }
      });
    } catch (error) {
      console.error('Notify beat sale error:', error);
    }
  }
}

export const notificationService = new NotificationService();