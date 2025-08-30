import {
  users,
  followers,
  comments,
  commentLikes,
  challenges,
  challengeSubmissions,
  showcases,
  opportunities,
  beats,
  type User,
  type Comment,
  type Challenge,
  type ChallengeSubmission,
  type Showcase,
  type Opportunity,
  type InsertComment,
  type InsertChallenge,
  type InsertChallengeSubmission,
  type InsertShowcase,
  type InsertOpportunity
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count, sum, inArray, isNull } from "drizzle-orm";

interface ProducerProfile {
  user: User;
  stats: {
    followerCount: number;
    followingCount: number;
    beatCount: number;
    totalPlays: number;
    totalLikes: number;
    joinedDate: string;
  };
  recentBeats: Array<any>;
  isFollowing?: boolean;
}

interface CommentWithUser {
  comment: Comment;
  user: User;
  replies?: CommentWithUser[];
  isLiked?: boolean;
  canEdit?: boolean;
}

export class SocialService {
  /**
   * Get comprehensive producer profile
   */
  async getProducerProfile(
    producerId: string,
    viewerId?: string
  ): Promise<ProducerProfile | null> {
    try {
      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, producerId));

      if (!user) {
        return null;
      }

      // Get stats
      const [followerCount] = await db
        .select({ count: count(followers.id) })
        .from(followers)
        .where(eq(followers.followingId, producerId));

      const [followingCount] = await db
        .select({ count: count(followers.id) })
        .from(followers)
        .where(eq(followers.followerId, producerId));

      const [beatStats] = await db
        .select({
          beatCount: count(beats.id),
          totalPlays: sql<number>`COALESCE(SUM(${beats.playCount}), 0)`,
          totalLikes: sql<number>`COALESCE(SUM(${beats.likeCount}), 0)`
        })
        .from(beats)
        .where(eq(beats.producerId, producerId));

      // Get recent beats
      const recentBeats = await db
        .select()
        .from(beats)
        .where(eq(beats.producerId, producerId))
        .orderBy(desc(beats.createdAt))
        .limit(6);

      // Check if viewer is following
      let isFollowing = false;
      if (viewerId && viewerId !== producerId) {
        const [followCheck] = await db
          .select()
          .from(followers)
          .where(and(
            eq(followers.followerId, viewerId),
            eq(followers.followingId, producerId)
          ))
          .limit(1);
        isFollowing = !!followCheck;
      }

      return {
        user,
        stats: {
          followerCount: followerCount?.count || 0,
          followingCount: followingCount?.count || 0,
          beatCount: beatStats?.beatCount || 0,
          totalPlays: Number(beatStats?.totalPlays) || 0,
          totalLikes: Number(beatStats?.totalLikes) || 0,
          joinedDate: user.createdAt?.toISOString().split('T')[0] || ''
        },
        recentBeats,
        isFollowing
      };
    } catch (error) {
      console.error('Get producer profile error:', error);
      return null;
    }
  }

  /**
   * Follow/unfollow a producer
   */
  async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<{ isFollowing: boolean; followerCount: number }> {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const [existing] = await db
        .select()
        .from(followers)
        .where(and(
          eq(followers.followerId, followerId),
          eq(followers.followingId, followingId)
        ));

      let isFollowing: boolean;

      if (existing) {
        // Unfollow
        await db
          .delete(followers)
          .where(eq(followers.id, existing.id));
        isFollowing = false;
      } else {
        // Follow
        await db
          .insert(followers)
          .values({
            followerId,
            followingId,
            notificationsEnabled: true
          });
        isFollowing = true;
      }

      // Get updated follower count
      const [followerCount] = await db
        .select({ count: count(followers.id) })
        .from(followers)
        .where(eq(followers.followingId, followingId));

      return {
        isFollowing,
        followerCount: followerCount?.count || 0
      };
    } catch (error) {
      console.error('Toggle follow error:', error);
      throw new Error('Failed to update follow status');
    }
  }

  /**
   * Get followers for a user
   */
  async getFollowers(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<User[]> {
    try {
      const followerUsers = await db
        .select({
          user: users
        })
        .from(followers)
        .innerJoin(users, eq(users.id, followers.followerId))
        .where(eq(followers.followingId, userId))
        .orderBy(desc(followers.createdAt))
        .limit(limit)
        .offset(offset);

      return followerUsers.map(row => row.user);
    } catch (error) {
      console.error('Get followers error:', error);
      return [];
    }
  }

  /**
   * Get following for a user
   */
  async getFollowing(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<User[]> {
    try {
      const followingUsers = await db
        .select({
          user: users
        })
        .from(followers)
        .innerJoin(users, eq(users.id, followers.followingId))
        .where(eq(followers.followerId, userId))
        .orderBy(desc(followers.createdAt))
        .limit(limit)
        .offset(offset);

      return followingUsers.map(row => row.user);
    } catch (error) {
      console.error('Get following error:', error);
      return [];
    }
  }

  /**
   * Add comment to a beat
   */
  async addComment(
    beatId: string,
    userId: string,
    content: string,
    parentCommentId?: string
  ): Promise<CommentWithUser> {
    try {
      // Insert comment
      const commentData: InsertComment = {
        beatId,
        userId,
        content,
        parentCommentId: parentCommentId || null
      };

      const [comment] = await db
        .insert(comments)
        .values(commentData)
        .returning();

      // Update parent comment reply count if this is a reply
      if (parentCommentId) {
        await db
          .update(comments)
          .set({
            replyCount: sql`${comments.replyCount} + 1`
          })
          .where(eq(comments.id, parentCommentId));
      }

      // Get user info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      return {
        comment,
        user: user!,
        replies: [],
        isLiked: false,
        canEdit: true
      };
    } catch (error) {
      console.error('Add comment error:', error);
      throw new Error('Failed to add comment');
    }
  }

  /**
   * Get comments for a beat with nested replies
   */
  async getBeatComments(
    beatId: string,
    userId?: string,
    limit: number = 50
  ): Promise<CommentWithUser[]> {
    try {
      // Get top-level comments (no parent)
      const topLevelComments = await db
        .select({
          comment: comments,
          user: users
        })
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .where(and(
          eq(comments.beatId, beatId),
          isNull(comments.parentCommentId),
          eq(comments.isDeleted, false)
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit);

      // Get all replies for these comments
      const topLevelIds = topLevelComments.map(c => c.comment.id);
      let replies: Array<{ comment: Comment; user: User }> = [];
      
      if (topLevelIds.length > 0) {
        replies = await db
          .select({
            comment: comments,
            user: users
          })
          .from(comments)
          .innerJoin(users, eq(users.id, comments.userId))
          .where(and(
            inArray(comments.parentCommentId, topLevelIds),
            eq(comments.isDeleted, false)
          ))
          .orderBy(comments.createdAt);
      }

      // Get user's liked comments if authenticated
      let likedCommentIds: string[] = [];
      if (userId) {
        const allCommentIds = [
          ...topLevelComments.map(c => c.comment.id),
          ...replies.map(r => r.comment.id)
        ];
        
        if (allCommentIds.length > 0) {
          const userLikes = await db
            .select({ commentId: commentLikes.commentId })
            .from(commentLikes)
            .where(and(
              eq(commentLikes.userId, userId),
              inArray(commentLikes.commentId, allCommentIds)
            ));
          
          likedCommentIds = userLikes.map(like => like.commentId);
        }
      }

      // Structure the nested comments
      const result: CommentWithUser[] = topLevelComments.map(({ comment, user }) => {
        const commentReplies = replies
          .filter(r => r.comment.parentCommentId === comment.id)
          .map(({ comment: reply, user: replyUser }) => ({
            comment: reply,
            user: replyUser,
            isLiked: likedCommentIds.includes(reply.id),
            canEdit: userId === replyUser.id
          }));

        return {
          comment,
          user,
          replies: commentReplies,
          isLiked: likedCommentIds.includes(comment.id),
          canEdit: userId === user.id
        };
      });

      return result;
    } catch (error) {
      console.error('Get beat comments error:', error);
      return [];
    }
  }

  /**
   * Like/unlike a comment
   */
  async toggleCommentLike(
    commentId: string,
    userId: string
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    try {
      // Check if already liked
      const [existing] = await db
        .select()
        .from(commentLikes)
        .where(and(
          eq(commentLikes.commentId, commentId),
          eq(commentLikes.userId, userId)
        ));

      let isLiked: boolean;

      if (existing) {
        // Unlike
        await db
          .delete(commentLikes)
          .where(eq(commentLikes.id, existing.id));
        
        await db
          .update(comments)
          .set({
            likeCount: sql`${comments.likeCount} - 1`
          })
          .where(eq(comments.id, commentId));
        
        isLiked = false;
      } else {
        // Like
        await db
          .insert(commentLikes)
          .values({
            commentId,
            userId
          });
        
        await db
          .update(comments)
          .set({
            likeCount: sql`${comments.likeCount} + 1`
          })
          .where(eq(comments.id, commentId));
        
        isLiked = true;
      }

      // Get updated like count
      const [comment] = await db
        .select({ likeCount: comments.likeCount })
        .from(comments)
        .where(eq(comments.id, commentId));

      return {
        isLiked,
        likeCount: comment?.likeCount || 0
      };
    } catch (error) {
      console.error('Toggle comment like error:', error);
      throw new Error('Failed to update comment like');
    }
  }

  /**
   * Create a new challenge
   */
  async createChallenge(
    creatorId: string,
    challengeData: Omit<InsertChallenge, 'id' | 'createdByUserId' | 'createdAt' | 'updatedAt'>
  ): Promise<Challenge> {
    try {
      const [challenge] = await db
        .insert(challenges)
        .values({
          ...challengeData,
          createdByUserId: creatorId
        })
        .returning();

      return challenge;
    } catch (error) {
      console.error('Create challenge error:', error);
      throw new Error('Failed to create challenge');
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(
    limit: number = 20,
    type?: string
  ): Promise<Array<Challenge & { creator: User; submissionCount: number }>> {
    try {
      let query = db
        .select({
          challenge: challenges,
          creator: users
        })
        .from(challenges)
        .innerJoin(users, eq(users.id, challenges.createdByUserId))
        .where(and(
          eq(challenges.isActive, true),
          gte(challenges.endDate, new Date())
        ));

      if (type) {
        query = query.where(eq(challenges.type, type));
      }

      const challengesWithCreators = await query
        .orderBy(desc(challenges.isFeatured), desc(challenges.createdAt))
        .limit(limit);

      // Get submission counts
      const challengeIds = challengesWithCreators.map(c => c.challenge.id);
      const submissionCounts = challengeIds.length > 0 ? await db
        .select({
          challengeId: challengeSubmissions.challengeId,
          count: count(challengeSubmissions.id)
        })
        .from(challengeSubmissions)
        .where(inArray(challengeSubmissions.challengeId, challengeIds))
        .groupBy(challengeSubmissions.challengeId) : [];

      return challengesWithCreators.map(({ challenge, creator }) => {
        const submissionCount = submissionCounts.find(
          s => s.challengeId === challenge.id
        )?.count || 0;

        return {
          ...challenge,
          creator,
          submissionCount
        };
      });
    } catch (error) {
      console.error('Get active challenges error:', error);
      return [];
    }
  }

  /**
   * Submit a beat to a challenge
   */
  async submitToChallenge(
    challengeId: string,
    beatId: string,
    userId: string,
    description?: string
  ): Promise<ChallengeSubmission> {
    try {
      // Check if challenge is still active
      const [challenge] = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, challengeId));

      if (!challenge || !challenge.isActive || challenge.endDate < new Date()) {
        throw new Error('Challenge is not active or has ended');
      }

      // Check if user already submitted this beat
      const [existing] = await db
        .select()
        .from(challengeSubmissions)
        .where(and(
          eq(challengeSubmissions.challengeId, challengeId),
          eq(challengeSubmissions.beatId, beatId)
        ));

      if (existing) {
        throw new Error('Beat already submitted to this challenge');
      }

      // Create submission
      const [submission] = await db
        .insert(challengeSubmissions)
        .values({
          challengeId,
          beatId,
          userId,
          description
        })
        .returning();

      // Update challenge submission count
      await db
        .update(challenges)
        .set({
          submissionCount: sql`${challenges.submissionCount} + 1`
        })
        .where(eq(challenges.id, challengeId));

      return submission;
    } catch (error) {
      console.error('Submit to challenge error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to submit to challenge');
    }
  }

  /**
   * Get opportunities
   */
  async getOpportunities(
    limit: number = 20,
    type?: string,
    genre?: string
  ): Promise<Array<Opportunity & { poster: User }>> {
    try {
      let query = db
        .select({
          opportunity: opportunities,
          poster: users
        })
        .from(opportunities)
        .innerJoin(users, eq(users.id, opportunities.postedByUserId))
        .where(eq(opportunities.isActive, true));

      if (type) {
        query = query.where(eq(opportunities.type, type));
      }

      if (genre) {
        query = query.where(eq(opportunities.genre, genre));
      }

      const result = await query
        .orderBy(desc(opportunities.isFeatured), desc(opportunities.createdAt))
        .limit(limit);

      return result.map(({ opportunity, poster }) => ({
        ...opportunity,
        poster
      }));
    } catch (error) {
      console.error('Get opportunities error:', error);
      return [];
    }
  }

  /**
   * Create a new opportunity
   */
  async createOpportunity(
    userId: string,
    opportunityData: Omit<InsertOpportunity, 'id' | 'postedByUserId' | 'createdAt' | 'updatedAt'>
  ): Promise<Opportunity> {
    try {
      const [opportunity] = await db
        .insert(opportunities)
        .values({
          ...opportunityData,
          postedByUserId: userId
        })
        .returning();

      return opportunity;
    } catch (error) {
      console.error('Create opportunity error:', error);
      throw new Error('Failed to create opportunity');
    }
  }
}

export const socialService = new SocialService();