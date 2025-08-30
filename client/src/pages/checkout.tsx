import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, Lock, ArrowLeft } from "lucide-react";

interface CartItem {
  id: string;
  userId: string;
  beatId: string;
  licenseType: 'basic' | 'premium' | 'exclusive';
  createdAt: string;
}

interface Beat {
  id: string;
  title: string;
  description: string;
  producerId: string;
  audioUrl: string;
  artworkUrl: string;
  price: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  duration: number;
  isExclusive: boolean;
  isFree: boolean;
}

interface CartWithBeat {
  item: CartItem;
  beat: Beat;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch cart items with beat details
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      const response = await fetch('/api/cart', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cart');
      
      const items: CartItem[] = await response.json();
      
      // Fetch beat details for each cart item
      const itemsWithBeats = await Promise.all(
        items.map(async (item) => {
          const beatResponse = await fetch(`/api/beats/${item.beatId}`, { credentials: 'include' });
          if (!beatResponse.ok) throw new Error(`Failed to fetch beat ${item.beatId}`);
          const beat: Beat = await beatResponse.json();
          return { item, beat };
        })
      );
      
      return itemsWithBeats;
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/checkout/create', 'POST');
    },
    onSuccess: (data) => {
      // Redirect to Dodo Payments checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      console.error('Checkout creation failed:', error);
      toast({
        title: "Checkout Failed",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add some beats to your cart before checking out.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    createCheckoutMutation.mutate();
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, { beat }) => total + parseFloat(beat.price), 0);
  };

  const getLicensePrice = (licenseType: string, basePrice: number) => {
    switch (licenseType) {
      case 'premium': return basePrice * 2;
      case 'exclusive': return basePrice * 5;
      default: return basePrice;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="checkout-loading">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="checkout-empty">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Browse our beats collection and add some tracks to your cart.
          </p>
          <Button onClick={() => setLocation('/browse')} data-testid="button-browse-beats">
            Browse Beats
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/cart')}
            data-testid="button-back-to-cart"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card data-testid="order-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map(({ item, beat }) => {
                const licensePrice = getLicensePrice(item.licenseType, parseFloat(beat.price));
                
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg" data-testid={`order-item-${beat.id}`}>
                    <img
                      src={beat.artworkUrl || "/placeholder-artwork.jpg"}
                      alt={`${beat.title} artwork`}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`beat-title-${beat.id}`}>
                        {beat.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {beat.genre} • {beat.bpm} BPM • {beat.key}
                      </p>
                      <Badge variant="secondary" data-testid={`license-type-${beat.id}`}>
                        {item.licenseType.charAt(0).toUpperCase() + item.licenseType.slice(1)} License
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" data-testid={`beat-price-${beat.id}`}>
                        ${licensePrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span data-testid="subtotal">${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Processing Fee</span>
                  <span data-testid="processing-fee">$0.00</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="total-amount">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card data-testid="payment-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Secure Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Secure Checkout
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your payment is secured by Dodo Payments. We accept all major credit cards and payment methods.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">What you'll get:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Instant download access to your beats</li>
                    <li>• High-quality audio files</li>
                    <li>• License agreement for each track</li>
                    <li>• 24/7 customer support</li>
                  </ul>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={isProcessing || createCheckoutMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-proceed-to-payment"
                >
                  {isProcessing || createCheckoutMutation.isPending ? (
                    "Processing..."
                  ) : (
                    `Proceed to Payment • $${calculateTotal().toFixed(2)}`
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By proceeding, you agree to our Terms of Service and Privacy Policy.
                  You will be redirected to our secure payment processor.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}