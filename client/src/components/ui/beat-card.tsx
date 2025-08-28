import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Play, Pause, ShoppingCart, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Beat } from '@shared/schema';

interface BeatCardProps {
  beat: Beat;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  className?: string;
  variant?: 'grid' | 'list';
}

export function BeatCard({ 
  beat, 
  isPlaying, 
  onPlay, 
  onPause, 
  className, 
  variant = 'grid' 
}: BeatCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const { addToCart, isAddingToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handlePlayToggle = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  const handleAddToCart = () => {
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
  };

  const handleLikeToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to like beats.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLiked(!isLiked);
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
            className="rounded-full bg-primary/90 hover:bg-primary text-primary-foreground w-16 h-16 play-button"
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

        <Button
          size="sm"
          variant="ghost"
          onClick={handleLikeToggle}
          className="absolute top-3 left-3 bg-black/70 hover:bg-black/80 rounded-full w-8 h-8 p-0"
          data-testid={`button-beat-like-${beat.id}`}
        >
          <Heart className={cn(
            "h-4 w-4",
            isLiked ? "fill-red-500 text-red-500" : "text-white"
          )} />
        </Button>
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
}
