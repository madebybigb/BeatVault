import DodoPayments from 'dodopayments';
import { storage } from './storage';
import type { InsertPaymentSession, CartItem, Beat } from '@shared/schema';

export class DodoPaymentsService {
  private client: DodoPayments;

  constructor() {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      console.warn('DODO_PAYMENTS_API_KEY not found. Payment functionality will be disabled.');
      // Initialize with dummy client to prevent crashes
      this.client = null as any;
      return;
    }

    this.client = new DodoPayments({
      bearerToken: apiKey,
    });
  }

  async createCheckoutSession(
    userId: string, 
    cartItems: Array<{ item: CartItem; beat: Beat }>,
    customerInfo: {
      email: string;
      name: string;
    }
  ) {
    if (!this.client) {
      throw new Error('Dodo Payments is not configured. Please set DODO_PAYMENTS_API_KEY environment variable.');
    }
    
    try {
      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, { beat, item }) => {
        return sum + parseFloat(beat.price);
      }, 0);

      // Create products for each cart item if they don't exist
      const productCart = [];
      for (const { beat, item } of cartItems) {
        // For now, we'll use beat ID as product ID
        // In production, you might want to create actual products in Dodo
        productCart.push({
          product_id: `beat_${beat.id}`,
          quantity: 1,
          name: beat.title,
          price: Math.round(parseFloat(beat.price) * 100), // Convert to cents
          description: beat.description || `${beat.genre} beat by producer`,
        });
      }

      // Create payment session in Dodo Payments
      const payment = await this.client.payments.create({
        payment_link: true,
        billing: {
          city: 'San Francisco',
          country: 'US',
          state: 'CA',
          street: '123 Main St',
          zipcode: 94105
        },
        customer: {
          email: customerInfo.email,
          name: customerInfo.name,
        },
        product_cart: productCart,
        metadata: {
          userId: userId,
          cartItems: JSON.stringify(cartItems.map(c => c.item)),
        }
      });

      // Store payment session in our database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Get the checkout URL from the payment response
      const checkoutUrl = (payment as any).payment_url || (payment as any).checkout_url || `https://checkout.dodopayments.com/buy/${payment.payment_id}`;

      const sessionData: InsertPaymentSession = {
        userId: userId,
        dodoPaymentId: payment.payment_id,
        checkoutUrl: checkoutUrl,
        amount: totalAmount.toString(),
        currency: 'USD',
        status: 'pending',
        cartItems: cartItems.map(c => c.item),
        metadata: {
          customerEmail: customerInfo.email,
          customerName: customerInfo.name,
        },
        expiresAt: expiresAt,
      };

      const paymentSession = await storage.createPaymentSession(sessionData);

      return {
        sessionId: paymentSession.id,
        checkoutUrl: checkoutUrl,
        paymentId: payment.payment_id,
      };
    } catch (error) {
      console.error('Error creating Dodo Payments checkout session:', error);
      throw new Error('Failed to create payment session');
    }
  }

  async retrievePayment(paymentId: string) {
    if (!this.client) {
      throw new Error('Dodo Payments is not configured. Please set DODO_PAYMENTS_API_KEY environment variable.');
    }
    
    try {
      return await this.client.payments.retrieve(paymentId);
    } catch (error) {
      console.error('Error retrieving payment:', error);
      throw error;
    }
  }

  async processSuccessfulPayment(paymentId: string) {
    try {
      // Get payment session from our database
      const session = await storage.getPaymentSessionByDodoId(paymentId);
      if (!session) {
        throw new Error('Payment session not found');
      }

      // Update session status
      await storage.updatePaymentSession(session.id, {
        status: 'succeeded'
      });

      // Create purchases for each cart item
      const cartItems = Array.isArray(session.cartItems) ? session.cartItems : [];
      const purchases = [];
      
      for (const cartItem of cartItems) {
        const beat = await storage.getBeat(cartItem.beatId);
        if (!beat) continue;

        const purchase = await storage.createPurchase({
          userId: session.userId,
          beatId: cartItem.beatId,
          producerId: beat.producerId,
          amount: beat.price,
          licenseType: cartItem.licenseType,
          status: 'completed',
        });
        purchases.push(purchase);
      }

      // Clear user's cart
      await storage.clearCart(session.userId);

      return {
        session,
        purchases,
      };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  async processFailedPayment(paymentId: string) {
    try {
      const session = await storage.getPaymentSessionByDodoId(paymentId);
      if (!session) {
        throw new Error('Payment session not found');
      }

      await storage.updatePaymentSession(session.id, {
        status: 'failed'
      });

      return session;
    } catch (error) {
      console.error('Error processing failed payment:', error);
      throw error;
    }
  }
}

export const dodoPaymentsService = new DodoPaymentsService();