import { useState, useCallback } from "react";
import { Play, Pause, Heart, Share, Download, Clock, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { Beat } from "@shared/schema";

interface MobileBeatCardProps {
  beat: Beat;
  isPlaying?: boolean;
  isLiked?: boolean;
  onPlay: () => void;
  onLike?: () => void;
  showPrice?: boolean;
  size?: "small" | "medium" | "large";
}

export function MobileBeatCard({
  beat,
  isPlaying = false,
  isLiked = false,
  onPlay,
  onLike,
  showPrice = true,
  size = "medium"
}: MobileBeatCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/beats/${beat.id}/like`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/beats'] });
      if (onLike) onLike();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/cart', {
        method: 'POST',
        body: JSON.stringify({
          beatId: beat.id,
          licenseType: 'basic'
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: `${beat.title} added to your cart`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to cart",
        variant: "destructive",
      });
    }
  });

  // Touch handlers for mobile interactions
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    });
    setIsPressed(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const distance = Math.sqrt(
      Math.pow(touchEnd.x - touchStart.x, 2) + 
      Math.pow(touchEnd.y - touchStart.y, 2)
    );
    
    const duration = touchEnd.time - touchStart.time;
    
    // Long press detection (500ms)
    if (duration > 500 && distance < 10) {
      handleLongPress();
    }
    
    setIsPressed(false);
    setTouchStart(null);
  };

  const handleLongPress = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to add beats to cart",
        variant: "destructive",
      });
      return;
    }
    
    addToCartMutation.mutate();
  };

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to like beats",
        variant: "destructive",
      });
      return;
    }
    
    likeMutation.mutate();
  }, [isAuthenticated, likeMutation, toast]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/beat/${beat.id}/share`);
      const shareData = await response.json();

      if (navigator.share) {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url
        });
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied",
          description: "Beat link copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share this beat",
        variant: "destructive",
      });
    }
  }, [beat.id, toast]);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPlay();
  }, [onPlay]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const cardSizeClasses = {
    small: "p-3",
    medium: "p-4", 
    large: "p-5"
  };

  const imageSizeClasses = {
    small: "w-12 h-12",
    medium: "w-16 h-16",
    large: "w-20 h-20"
  };

  return (
    <div
      className={`
        relative bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 
        transition-all duration-200 touch-manipulation select-none
        ${cardSizeClasses[size]}
        ${isPressed ? 'scale-95 bg-gray-800/70' : 'hover:bg-gray-800/30'}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid={`beat-card-${beat.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Album art / Play button */}
        <div className="relative group">
          <div className={`
            ${imageSizeClasses[size]} rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 
            flex items-center justify-center relative overflow-hidden
          `}>
            {beat.artworkUrl ? (
              <img 
                src={beat.artworkUrl} 
                alt={beat.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-lg font-bold">
                {beat.title.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlay}
                className="h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="button-play"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Beat info */}
        <div className="flex-1 min-w-0">
          <Link href={`/beat/${beat.id}`}>
            <h3 className={`
              text-white font-medium truncate
              ${size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'}
            `} data-testid="beat-title">
              {beat.title}
            </h3>
          </Link>
          
          <Link href={`/producer/${beat.producerId}`}>
            <p className={`
              text-gray-400 truncate flex items-center gap-1
              ${size === 'small' ? 'text-xs' : 'text-sm'}
            `} data-testid="beat-producer">
              <User className="h-3 w-3" />
              {beat.producer}
            </p>
          </Link>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-1">
            {beat.bpm && (
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <Clock className="h-3 w-3" />
                <span>{beat.bpm} BPM</span>
              </div>
            )}
            
            {beat.keySignature && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {beat.keySignature}
              </Badge>
            )}
            
            {beat.genre && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {beat.genre}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {/* Price */}
          {showPrice && (
            <div className="flex items-center gap-1 text-green-400 font-semibold text-sm">
              <DollarSign className="h-3 w-3" />
              {beat.price > 0 ? beat.price : 'Free'}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className="p-2 h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
              data-testid="button-like"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-400 text-red-400' : ''}`} />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShare}
              className="p-2 h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10"
              data-testid="button-share"
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="text-xs text-gray-500 text-right">
            <div>{beat.playCount} plays</div>
            <div>{beat.likeCount} likes</div>
          </div>
        </div>
      </div>

      {/* Long press hint */}
      {isPressed && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          Hold to add to cart
        </div>
      )}
    </div>
  );
}