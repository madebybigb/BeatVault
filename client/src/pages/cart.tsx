import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Trash2, 
  Music, 
  CreditCard, 
  Shield, 
  Download,
  X,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { CartItem, Beat } from '@shared/schema';

interface CartItemWithBeat extends CartItem {
  beat: Beat;
}

const LICENSE_TYPES = {
  basic: {
    name: 'Basic License',
    description: 'For non-commercial use, up to 10,000 streams',
    multiplier: 1,
  },
  premium: {
    name: 'Premium License',
    description: 'For commercial use, up to 100,000 streams',
    multiplier: 2,
  },
  exclusive: {
    name: 'Exclusive License',
    description: 'Full rights, unlimited use, beat removed from store',
    multiplier: 5,
  },
};

export default function Cart() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: cartItems = [], isLoading } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    retry: false,
  });

  // Fetch beat details for each cart item
  const { data: cartItemsWithBeats = [], isLoading: beatsLoading } = useQuery<CartItemWithBeat[]>({
    queryKey: ['/api/cart/with-beats', cartItems],
    queryFn: async () => {
      if (cartItems.length === 0) return [];
      
      const beatsPromises = cartItems.map(async (item) => {
        const response = await fetch(`/api/beats/${item.beatId}`, {
          credentials: 'include',
        });
        const beat = await response.json();
        return { ...item, beat };
      });
      
      return Promise.all(beatsPromises);
    },
    enabled: cartItems.length > 0,
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

  const removeFromCartMutation = useMutation({
    mutationFn: async (beatId: string) => {
      const response = await apiRequest('DELETE', `/api/cart/${beatId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Removed from cart",
        description: "Beat has been removed from your cart.",
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
        description: "Failed to remove beat from cart.",
        variant: "destructive",
      });
    },
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ beatId, licenseType }: { beatId: string; licenseType: string }) => {
      // Remove old item and add new one with updated license
      await apiRequest('DELETE', `/api/cart/${beatId}`);
      const response = await apiRequest('POST', '/api/cart', {
        beatId,
        licenseType,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
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
        description: "Failed to update license type.",
        variant: "destructive",
      });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/cart');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
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
        description: "Failed to clear cart.",
        variant: "destructive",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      // Create purchases for each cart item
      const purchasePromises = cartItemsWithBeats.map(async (item) => {
        const licenseInfo = LICENSE_TYPES[item.licenseType as keyof typeof LICENSE_TYPES];
        const finalPrice = parseFloat(item.beat.price) * licenseInfo.multiplier;
        
        return await apiRequest('POST', '/api/purchases', {
          beatId: item.beatId,
          producerId: item.beat.producerId,
          amount: finalPrice.toString(),
          licenseType: item.licenseType,
        });
      });
      
      await Promise.all(purchasePromises);
      
      // Clear cart after successful purchase
      await apiRequest('DELETE', '/api/cart');
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      toast({
        title: "Purchase successful!",
        description: "Your beats have been licensed and are ready for download.",
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      setIsProcessing(false);
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
        title: "Purchase failed",
        description: "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateItemPrice = (item: CartItemWithBeat) => {
    const licenseInfo = LICENSE_TYPES[item.licenseType as keyof typeof LICENSE_TYPES];
    return parseFloat(item.beat.price) * licenseInfo.multiplier;
  };

  const totalPrice = cartItemsWithBeats.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="text-cart-title">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground" data-testid="text-cart-subtitle">
              Review your selected beats and choose your licensing options.
            </p>
          </div>

          {isLoading || beatsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
            </div>
          ) : cartItemsWithBeats.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2" data-testid="text-empty-cart-title">
                  Your cart is empty
                </h2>
                <p className="text-muted-foreground mb-6" data-testid="text-empty-cart-description">
                  Discover amazing beats from talented producers and start building your next hit.
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90" data-testid="button-browse-beats">
                  <a href="/browse">
                    <Music className="h-4 w-4 mr-2" />
                    Browse Beats
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Cart Items ({cartItemsWithBeats.length})
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCartMutation.mutate()}
                    disabled={clearCartMutation.isPending}
                    className="text-destructive hover:text-destructive"
                    data-testid="button-clear-cart"
                  >
                    Clear All
                  </Button>
                </div>

                {cartItemsWithBeats.map((item) => (
                  <Card key={item.id} className="overflow-hidden" data-testid={`cart-item-${item.beatId}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Beat Artwork */}
                        <img
                          src={item.beat.artworkUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120"}
                          alt={item.beat.title}
                          className="w-20 h-20 rounded-lg object-cover"
                          data-testid={`img-cart-beat-${item.beatId}`}
                        />

                        <div className="flex-1">
                          {/* Beat Info */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg mb-1" data-testid={`text-cart-beat-title-${item.beatId}`}>
                                {item.beat.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {item.beat.bpm} BPM • {item.beat.key} • {item.beat.genre}
                              </p>
                              <div className="flex gap-2 mb-3">
                                <Badge variant="secondary">{item.beat.genre}</Badge>
                                <Badge variant="secondary">{item.beat.mood}</Badge>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCartMutation.mutate(item.beatId)}
                              disabled={removeFromCartMutation.isPending}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-remove-${item.beatId}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* License Selection */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <label className="text-sm font-medium mb-1 block">License Type</label>
                                <Select
                                  value={item.licenseType}
                                  onValueChange={(value) =>
                                    updateLicenseMutation.mutate({
                                      beatId: item.beatId,
                                      licenseType: value,
                                    })
                                  }
                                  disabled={updateLicenseMutation.isPending}
                                >
                                  <SelectTrigger className="w-48" data-testid={`select-license-${item.beatId}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(LICENSE_TYPES).map(([key, license]) => (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex flex-col">
                                          <span>{license.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {license.description}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Price</p>
                              <p className="text-2xl font-bold text-primary" data-testid={`text-cart-price-${item.beatId}`}>
                                ${calculateItemPrice(item).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {cartItemsWithBeats.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="truncate mr-2">{item.beat.title}</span>
                          <span>${calculateItemPrice(item).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-cart-total">
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      onClick={() => checkoutMutation.mutate()}
                      disabled={checkoutMutation.isPending || isProcessing}
                      className="w-full bg-primary hover:bg-primary/90 py-6 text-lg"
                      data-testid="button-checkout"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5 mr-3" />
                          Complete Purchase
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* License Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      License Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {Object.entries(LICENSE_TYPES).map(([key, license]) => (
                      <div key={key} className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{license.name}</p>
                          <p className="text-muted-foreground text-xs">{license.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    <Separator />
                    
                    <div className="flex items-start gap-3">
                      <Download className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Instant Download</p>
                        <p className="text-muted-foreground text-xs">
                          Get your beats immediately after purchase
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Secure Checkout Info */}
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium">Secure Checkout</p>
                    <p className="text-xs text-muted-foreground">
                      Your payment information is protected with industry-standard encryption.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
