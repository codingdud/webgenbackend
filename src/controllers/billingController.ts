// src/controllers/billingController.ts
import { Request, Response } from "npm:express";
import { User } from "../models/User.ts";
import Stripe from "npm:stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

export const getCredits = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: { 
        credits: user.subscription.creditsRemaining,
        tier: user.subscription.tier
      }
    });
  } catch (error:any) {
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Failed to fetch credits', 
        details: error.message 
      }
    });
  }
};

export const purchaseCredits = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Invalid credit amount' }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
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
  } catch (error:any) {
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Purchase failed', 
        details: error.message 
      }
    });
  }
};


// Webhook handler for Stripe credit purchases
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
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