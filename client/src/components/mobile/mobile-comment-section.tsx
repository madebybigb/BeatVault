import { useState } from "react";
import { Heart, Reply, MoreVertical, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  comment: {
    id: string;
    content: string;
    likeCount: number;
    replyCount: number;
    createdAt: string;
    parentCommentId?: string;
  };
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  replies?: Comment[];
  isLiked?: boolean;
  canEdit?: boolean;
}

interface MobileCommentSectionProps {
  beatId: string;
}

export function MobileCommentSection({ beatId }: MobileCommentSectionProps) {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  // Get comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: [`/api/beat/${beatId}/comments`],
    enabled: !!beatId
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      return await apiRequest(`/api/beat/${beatId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId })
      });
    },
    onSuccess: () => {
      setNewComment("");
      setReplyText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: [`/api/beat/${beatId}/comments`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await apiRequest(`/api/comment/${commentId}/like`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/beat/${beatId}/comments`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to like comment",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    addCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleReply = (parentCommentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to reply",
        variant: "destructive",
      });
      return;
    }

    if (!replyText.trim()) return;

    addCommentMutation.mutate({ 
      content: replyText.trim(),
      parentCommentId 
    });
  };

  const handleLike = (commentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to like comments",
        variant: "destructive",
      });
      return;
    }

    likeCommentMutation.mutate(commentId);
  };

  const toggleReplies = (commentId: string) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const getDisplayName = (user: Comment['user']) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Anonymous';
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 border-l-2 border-gray-700 pl-4' : ''} mb-4`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
          {comment.user.profileImageUrl ? (
            <img 
              src={comment.user.profileImageUrl} 
              alt={getDisplayName(comment.user)}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getDisplayName(comment.user).charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* User and time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">
              {getDisplayName(comment.user)}
            </span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(comment.comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Comment content */}
          <p className="text-sm text-gray-300 mb-2 break-words">
            {comment.comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleLike(comment.comment.id)}
              disabled={likeCommentMutation.isPending}
              className="h-6 px-2 text-gray-400 hover:text-red-400"
              data-testid={`button-like-comment-${comment.comment.id}`}
            >
              <Heart className={`h-3 w-3 mr-1 ${comment.isLiked ? 'fill-red-400 text-red-400' : ''}`} />
              {comment.comment.likeCount > 0 && (
                <span className="text-xs">{comment.comment.likeCount}</span>
              )}
            </Button>

            {!isReply && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(replyingTo === comment.comment.id ? null : comment.comment.id)}
                className="h-6 px-2 text-gray-400 hover:text-blue-400"
                data-testid={`button-reply-${comment.comment.id}`}
              >
                <Reply className="h-3 w-3 mr-1" />
                <span className="text-xs">Reply</span>
              </Button>
            )}

            {comment.comment.replyCount > 0 && !isReply && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleReplies(comment.comment.id)}
                className="h-6 px-2 text-gray-400 hover:text-white"
                data-testid={`button-toggle-replies-${comment.comment.id}`}
              >
                <span className="text-xs">
                  {showReplies[comment.comment.id] ? 'Hide' : 'Show'} {comment.comment.replyCount} replies
                </span>
              </Button>
            )}
          </div>

          {/* Reply input */}
          {replyingTo === comment.comment.id && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
                maxLength={1000}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={() => handleReply(comment.comment.id)}
                  disabled={!replyText.trim() || addCommentMutation.isPending}
                  className="h-8 w-8 p-0"
                  data-testid="button-send-reply"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(null)}
                  className="h-8 w-8 p-0 text-gray-400"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {showReplies[comment.comment.id] && comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.comment.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-700 rounded w-full mb-1" />
              <div className="h-3 bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="mobile-comment-section">
      {/* Add comment */}
      {isAuthenticated && (
        <div className="flex gap-3 p-4 bg-gray-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Your avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getDisplayName(user as any).charAt(0).toUpperCase()
            )}
          </div>
          
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px] text-sm resize-none"
              maxLength={1000}
              data-testid="textarea-new-comment"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="h-8 w-8 p-0"
              data-testid="button-send-comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No comments yet.</p>
          {!isAuthenticated && (
            <p className="text-sm mt-2">
              <Button
                variant="link"
                onClick={() => window.location.href = '/api/login'}
                className="p-0 h-auto text-blue-400"
              >
                Sign in
              </Button>
              {' '}to be the first to comment!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentItem key={comment.comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}