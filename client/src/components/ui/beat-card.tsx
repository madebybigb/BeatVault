import { useState, useCallback, memo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Play, Pause, ShoppingCart, Download, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Beat } from '@shared/schema';

interface BeatCardProps {
  beat: Beat;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  variant?: 'grid' | 'list';
}

export const BeatCard = memo(function BeatCard({ 
  beat, 
  isPlaying, 
  onPlay, 
  onPause, 
  className, 
  variant = 'grid' 
}: BeatCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { addToCart, isAddingToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }, [isPlaying, onPause, onPlay]);

  const handleAddToCart = useCallback(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to add beats to your cart.",
        variant: "destructive",
      });
      return;
    }

    addToCart({
      beatId: beat.id,
      licenseType: "basic",
    });
  }, [isAuthenticated, toast, addToCart, beat.id]);

  const handleLikeToggle = useCallback(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to like beats.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLiked(!isLiked);
  }, [isAuthenticated, toast, isLiked]);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        const response = await apiRequest('DELETE', `/api/wishlist/${beat.id}`);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/wishlist', { beatId: beat.id });
        return response.json();
      }
    },
    onSuccess: () => {
      setIsInWishlist(!isInWishlist);
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: isInWishlist ? "Removed from wishlist" : "Added to wishlist",
        description: isInWishlist 
          ? "Beat has been removed from your wishlist." 
          : "Beat has been added to your wishlist.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to save beats to your wishlist.",
        variant: "destructive",
      });
      return;
    }
    
    wishlistMutation.mutate();
  };

  if (variant === 'list') {
    return (
      <Card className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 bg-card border-border",
        className
      )} data-testid={`card-beat-list-${beat.id}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img 
                src={beat.artworkUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"} 
                alt={beat.title}
                className="w-16 h-16 rounded-lg object-cover"
                data-testid={`img-beat-artwork-list-${beat.id}`}
              />
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlayToggle}
                className="absolute inset-0 bg-black/60 hover:bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-beat-play-list-${beat.id}`}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-white ml-0.5" />
                )}
              </Button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate" data-testid={`text-beat-title-list-${beat.id}`}>
                {beat.title}
              </h3>
              <p className="text-xs text-muted-foreground" data-testid={`text-beat-details-list-${beat.id}`}>
                {beat.bpm} BPM • {beat.key}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {beat.genre}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {beat.mood}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLikeToggle}
                className="w-8 h-8 p-0"
                data-testid={`button-beat-like-list-${beat.id}`}
              >
                <Heart className={cn(
                  "h-4 w-4",
                  isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                )} />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleWishlistToggle}
                disabled={wishlistMutation.isPending}
                className="w-8 h-8 p-0"
                data-testid={`button-beat-wishlist-list-${beat.id}`}
              >
                <Bookmark className={cn(
                  "h-4 w-4",
                  isInWishlist ? "fill-blue-500 text-blue-500" : "text-muted-foreground"
                )} />
              </Button>
              
              <Button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                data-testid={`button-beat-add-cart-list-${beat.id}`}
              >
                {beat.isFree ? (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Free
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    ${beat.price}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 bg-card border-border beat-card",
      className
    )} data-testid={`card-beat-${beat.id}`}>
      <div className="relative">
        <img 
          src={beat.artworkUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"} 
          alt={beat.title}
          className="w-full h-48 object-cover"
          data-testid={`img-beat-artwork-${beat.id}`}
        />
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            size="lg"
            variant="ghost"
            onClick={handlePlayToggle}
            className="rounded-full bg-blue-600/90 hover:bg-blue-600 text-white w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
            data-testid={`button-beat-play-${beat.id}`}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-1" />
            )}
          </Button>
        </div>
        
        <div className="absolute top-3 right-3 bg-black/70 rounded-lg px-2 py-1">
          <span className="text-white text-sm font-semibold" data-testid={`text-beat-price-${beat.id}`}>
            {beat.isFree ? 'FREE' : `$${beat.price}`}
          </span>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLikeToggle}
            className="bg-black/70 hover:bg-black/80 rounded-full w-8 h-8 p-0"
            data-testid={`button-beat-like-${beat.id}`}
          >
            <Heart className={cn(
              "h-4 w-4",
              isLiked ? "fill-red-500 text-red-500" : "text-white"
            )} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleWishlistToggle}
            disabled={wishlistMutation.isPending}
            className="bg-black/70 hover:bg-black/80 rounded-full w-8 h-8 p-0"
            data-testid={`button-beat-wishlist-${beat.id}`}
          >
            <Bookmark className={cn(
              "h-4 w-4",
              isInWishlist ? "fill-blue-500 text-blue-500" : "text-white"
            )} />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-1 truncate" data-testid={`text-beat-title-${beat.id}`}>
          {beat.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3" data-testid={`text-beat-producer-${beat.id}`}>
          by Producer • {beat.bpm} BPM
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span data-testid={`text-beat-bpm-${beat.id}`}>{beat.bpm} BPM</span>
          <span data-testid={`text-beat-key-${beat.id}`}>{beat.key}</span>
        </div>
        
        <div className="flex gap-1 mb-3">
          <Badge variant="secondary" className="text-xs" data-testid={`badge-beat-genre-${beat.id}`}>
            {beat.genre}
          </Badge>
          <Badge variant="secondary" className="text-xs" data-testid={`badge-beat-mood-${beat.id}`}>
            {beat.mood}
          </Badge>
        </div>
        
        <Button
          onClick={handleAddToCart}
          disabled={isAddingToCart}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid={`button-beat-add-cart-${beat.id}`}
        >
          {beat.isFree ? (
            <>
              <Download className="h-4 w-4 mr-2" />
              {isAddingToCart ? 'Adding...' : 'Download Free'}
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isAddingToCart ? 'Adding...' : 'Add to Cart'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
});
