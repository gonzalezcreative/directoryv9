import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
export const LEAD_PRICE = 500; // $5.00 in cents

export async function createPaymentIntent(leadId: string, userId: string) {
  try {
    const response = await fetch('/.netlify/functions/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leadId, userId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize payment');
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Payment intent error:', error);
    throw new Error(error.message || 'Failed to initialize payment');
  }
}