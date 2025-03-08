// src/controllers/billingController.ts
import { Request, Response } from "npm:express";
import { User } from "../models/User.ts";
import Stripe from "npm:stripe";
import { logger } from "../utils/logger.ts";
import "jsr:@std/dotenv/load";

// Initialize Stripe with proper error handling
let stripe: Stripe | null = null;

const initializeStripe = () => {
  if (stripe) return stripe;

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logger.error("STRIPE_SECRET_KEY is not set in environment variables");
    throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
  }

  try {
    stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia' // Use latest stable version
    });
    logger.info("Stripe initialized successfully");
    return stripe;
  } catch (error) {
    logger.error("Failed to initialize Stripe", { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const getCredits = async (req: Request, res: Response) => {
  try {
    logger.debug('Fetching user credits');
    const user = await req.user;
    res.json({
      success: true,
      data: { 
        credits: user.subscription.creditsRemaining,
        tier: user.subscription.tier
      }
    });
    logger.info(`Credits fetched for user: ${user._id}`);
  } catch (error: unknown) {
    logger.error('Failed to fetch credits', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Failed to fetch credits', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

export const purchaseCredits = async (req: Request, res: Response) => {
  try {
    const stripeInstance = initializeStripe();
    const { amount } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Invalid credit amount' }
      });
    }

    // Create Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amount * 100, // Convert to cents
          product_data: {
            name: `Image Generation Credits (${amount} credits)`
          }
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${Deno.env.get('FRONTEND_URL')}/billing/success`,
      cancel_url: `${Deno.env.get('FRONTEND_URL')}/billing/cancel`,
      metadata: {
        userId: user._id.toString(),
        creditsAmount: amount
      }
    });

    res.json({
      success: true,
      data: { 
        checkoutUrl: session.url,
        sessionId: session.id 
      }
    });
  } catch (error: unknown) {
    logger.error('Purchase failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Purchase failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};


// Webhook handler for Stripe credit purchases
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    const stripeInstance = initializeStripe();
    const event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ""
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.userId || '';
      const creditsAmount = session.metadata ? Number(session.metadata.creditsAmount) : 0;

      // Update user credits
      await User.findByIdAndUpdate(userId, {
        $inc: { creditsRemaining: creditsAmount }
      });
    }

    res.json({ received: true });
  } catch (error:any) {
    res.status(400).json({
      success: false,
      error: { 
        code: '400', 
        message: 'Webhook error', 
        details: error.message 
      }
    });
  }
};