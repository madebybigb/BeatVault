import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ShoppingCart,
  Play,
  Music,
  Trash2,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Beat } from '@shared/schema';

interface WishlistItem {
  id: string;
  userId: string;
  beatId: string;
  createdAt: string;
  beat: Beat;
}

export default function Wishlist() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading: wishlistLoading } = useQuery<WishlistItem[]>({
    queryKey: ['/api/wishlist'],
    enabled: !!user?.id,
    retry: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
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
  }, [user, authLoading, toast]);

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const response = await apiRequest('DELETE', `/api/wishlist/${beatId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: "Removed from wishlist",
        description: "Beat has been removed from your wishlist.",
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
        description: "Failed to remove from wishlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const response = await apiRequest('POST', '/api/cart', {
        beatId: beatId,
        licenseType: 'basic',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: "Beat has been added to your cart.",
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
        description: "Failed to add to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || wishlistLoading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-60 bg-muted rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Your Wishlist
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Keep track of beats you love and want to purchase later
            </p>
          </div>
          
          <Badge variant="outline" className="px-4 py-2 text-lg">
            {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Wishlist Content */}
        {wishlistItems.length === 0 ? (
          <Card className="border-0 bg-gradient-to-br from-gray-900/50 to-gray-800/30">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <Heart className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-2xl font-semibold mb-4">Your wishlist is empty</h3>
                <p className="text-muted-foreground mb-6 text-lg">
                  Start exploring beats and add the ones you love to your wishlist for easy access later.
                </p>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                  <a href="/browse">
                    <Music className="h-4 w-4 mr-2" />
                    Browse Beats
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="border-0 bg-gradient-to-br from-gray-900/50 to-gray-800/30 hover:from-gray-900/70 hover:to-gray-800/50 transition-all duration-300 overflow-hidden group">
                <div className="relative">
                  {/* Beat Artwork */}
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center relative overflow-hidden">
                    {item.beat.artworkUrl ? (
                      <img 
                        src={item.beat.artworkUrl} 
                        alt={item.beat.title} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    ) : (
                      <Music className="h-16 w-16 text-primary" />
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button size="lg" className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90">
                        <Play className="h-6 w-6 ml-1" />
                      </Button>
                    </div>

                    {/* Remove from Wishlist Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-3 right-3 h-8 w-8 p-0 bg-red-500/20 border-red-500/30 hover:bg-red-500 hover:border-red-500"
                      onClick={() => removeFromWishlistMutation.mutate(item.beat.id)}
                      disabled={removeFromWishlistMutation.isPending}
                      data-testid={`button-remove-wishlist-${item.beat.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Beat Info */}
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Title and Producer */}
                      <div>
                        <h3 className="font-bold text-xl mb-2 truncate" data-testid={`text-beat-title-${item.beat.id}`}>
                          {item.beat.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <Badge variant="outline" className="text-xs">{item.beat.genre}</Badge>
                          <span>•</span>
                          <span>{item.beat.bpm} BPM</span>
                          <span>•</span>
                          <span>Key: {item.beat.key}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Play className="h-4 w-4" />
                            <span>{(item.beat.playCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{(item.beat.likeCount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-2xl font-bold text-primary">
                          {item.beat.isFree ? 'Free' : `$${item.beat.price}`}
                        </div>
                        <Button
                          onClick={() => addToCartMutation.mutate(item.beat.id)}
                          disabled={addToCartMutation.isPending}
                          className="bg-primary hover:bg-primary/90"
                          data-testid={`button-add-cart-${item.beat.id}`}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>

                      {/* Added Date */}
                      <div className="text-xs text-muted-foreground pt-2 border-t border-gray-800">
                        Added on {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}