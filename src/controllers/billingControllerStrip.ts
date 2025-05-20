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

// Define region-aware plans
const REGION_PLANS = [
  {
    title: 'Monthly Plan',
    duration: 'month',
    features: ['Basic access to all features', '24/7 Customer Support', 'Single user license'],
    isHighlighted: false,
    planId: 'monthly',
    prices: {
      US: { amount: 9.99, currency: 'USD', display: '$9.99', stripePriceId: 'price_1RPndrSGGIw3FmllowuprR1B' },
      IN: { amount: 499, currency: 'INR', display: '₹499', stripePriceId: 'price_1RPoePSGGIw3FmllJ4DNf5Rf' },
      GB: { amount: 7.99, currency: 'GBP', display: '£7.99', stripePriceId: 'price_1RPoEBSGGIw3Fmllbm1vDyIl' }
    }
  },
  {
    title: 'Yearly Plan',
    duration: 'year',
    features: [
      'All Monthly Plan features',
      'Save 25% annually',
      'Priority support',
      'Advanced features',
    ],
    isHighlighted: true,
    planId: 'yearly',
    prices: {
      US: { amount: 89.99, currency: 'USD', display: '$89.99', stripePriceId: 'price_1RPoKpSGGIw3FmllfhUEFNxj' },
      IN: { amount: 4499, currency: 'INR', display: '₹4,499', stripePriceId: 'price_1RPoJySGGIw3FmllxXAa0H4k' },
      GB: { amount: 69.99, currency: 'GBP', display: '£69.99', stripePriceId: 'price_1RPoLMSGGIw3Fmll4AVpl0Sv' }
    }
  },
  {
    title: 'Family Plan',
    duration: 'year',
    features: [
      'Up to 5 family members',
      'All Yearly Plan features',
      'Family dashboard',
      'Parental controls',
    ],
    isHighlighted: false,
    planId: 'family',
    prices: {
      US: { amount: 149.99, currency: 'USD', display: '$149.99', stripePriceId: 'price_xxx_us_family' },
      IN: { amount: 7499, currency: 'INR', display: '₹7,499', stripePriceId: 'price_xxx_in_family' },
      GB: { amount: 119.99, currency: 'GBP', display: '£119.99', stripePriceId: 'price_xxx_gb_family' }
    }
  }
];

// Helper to get plan by planId and region (country code)
const getPlanDetails = async (planId: string, region: string) => {
  const plan = REGION_PLANS.find(p => p.planId === planId);
  if (!plan) return null;
  // Default to US if region not found
  const price = plan.prices[region] || plan.prices['US'];
  return { ...plan, ...price, stripePriceId: price.stripePriceId };
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

// Legacy method - maintained for backward compatibility
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

// New method for creating a checkout session for Custom Checkout
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const stripeInstance = initializeStripe();
    const { planId, region } = req.body; // region should be 'US', 'IN', 'GB', etc.
    const user = req.user;

    // Get plan details based on planId and region
    const plan = await getPlanDetails(planId, region);

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: { code: '400', message: 'Invalid plan selected' }
      });
    }

    const isSubscription = plan.duration === 'month' || plan.duration === 'year';

    // Create a Stripe Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        isSubscription
          ? {
              price: plan.stripePriceId, // Use the recurring price ID for the region
              quantity: 1
            }
          : {
              price_data: {
                currency: plan.currency.toLowerCase(),
                unit_amount: Math.round(plan.amount * 100),
                product_data: {
                  name: plan.title,
                  description: `Subscription for ${plan.duration}`
                }
              },
              quantity: 1
            }
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      //customer_email: user.email,
      client_reference_id: user._id.toString(),
      success_url: `${Deno.env.get('FRONTEND_URL')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL')}/billing/cancel`,
      metadata: {
        userId: user._id.toString(),
        planId: planId,
        planTitle: plan.title,
        planDuration: plan.duration,
        region: region
      },
      customer: user.stripeCustomerId || (async () => {
        const customer = await stripeInstance.customers.create({
          email: user.email,
          metadata: { userId: user._id.toString() }
        });
        await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
        logger.info(`new stripe id is created for use ${user._id}`)
        return customer.id;
      })(),
      billing_address_collection: 'required',
      /* shipping_address_collection: {
        allowed_countries: ['IN', 'US', 'GB', 'CA', 'AU']
      } */
    });

    res.json({
      success: true,
      data: { 
        checkoutUrl: session.url,
        sessionId: session.id 
      }
    });
  } catch (error: unknown) {
    console.log(error)
    logger.error('Checkout session creation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Checkout session creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

// Webhook handler for Stripe credit purchases
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const rawBody=req.body;
  try {
    const stripeInstance = initializeStripe();
    const event = await stripeInstance.webhooks.constructEventAsync(
      rawBody,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ""
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const checkoutUserId = session.metadata?.userId || session.client_reference_id;
        const planId = session.metadata?.planId;
        const userId = session.metadata?.userId;
        if (checkoutUserId) {
          // For subscription plans
          if (planId && (planId === 'monthly' || planId === 'yearly' || planId === 'family')) {
            const tier = planId === 'monthly' ? 'basic' : planId === 'yearly' ? 'premium' : 'family';
            
            // Update user subscription tier and set appropriate credits
            const user = await User.findById(userId);
            const currentDate = new Date();
            const validUntil = user?.subscription?.validUntil && user.subscription.validUntil > currentDate
              ? new Date(user.subscription.validUntil.getTime() + (planId === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000)
              : new Date(currentDate.getTime() + (planId === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000);

            await User.findByIdAndUpdate(userId, {
              $set: {
                'subscription.tier': tier,
                'subscription.active': true,
                'subscription.validUntil': validUntil
              },
              $inc: {
                'subscription.creditsRemaining': tier === 'basic' ? 100 : tier === 'premium' ? 500 : 1000
              }
            });
          } 
          // For one-time credit purchases
          else if (session.metadata?.creditsAmount) {
            const creditsAmount = Number(session.metadata.creditsAmount);
            
            // Update user credits
            await User.findByIdAndUpdate(checkoutUserId, {
              $inc: { 'subscription.creditsRemaining': creditsAmount }
            });
          }
        }
        break;
      }  // Close the checkout.session.completed case
        
      case 'invoice.payment_succeeded': {
        // Handle subscription renewal
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (typeof subscriptionId === 'string') {
          const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
          const userId = subscription.metadata?.userId;
          const planId = subscription.metadata?.planId;
          
          if (userId && planId) {
            const tier = planId === 'monthly' ? 'basic' : planId === 'yearly' ? 'premium' : 'family';
            
            // Renew subscription and add credits
            await User.findByIdAndUpdate(userId, {
              $set: {
                'subscription.validUntil': new Date(Date.now() + (planId === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
              },
              $inc: {
                'subscription.creditsRemaining': tier === 'basic' ? 100 : tier === 'premium' ? 500 : 1000
              }
            });
          }
        }
        break;
      }  // Close the invoice.payment_succeeded case
        
      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        const canceledSubscription = event.data.object;
        const canceledUserId = canceledSubscription.metadata?.userId;
        
        if (canceledUserId) {
          // Mark subscription as inactive
          await User.findByIdAndUpdate(canceledUserId, {
            $set: {
              'subscription.active': false
            }
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error:any) {
    console.log(error)
    logger.error('Webhook processing error', { error: error.message });
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


export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const user = await req.user;
    const stripeInstance = initializeStripe();
    // Fetch charges
    //console.log(user)
    const charges = await stripeInstance.charges.list({
      customer: user.stripeCustomerId,
      limit: 20
    });
    // Fetch invoices (for subscriptions)
    const invoices = await stripeInstance.invoices.list({
      customer: user.stripeCustomerId,
      limit: 20
    });

    res.json({
      success: true,
      data: {
        charges: charges.data,
        invoices: invoices.data
      }
    });
  } catch (error: any) {
    console.log(error)
    logger.error('Failed to fetch billing history', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: {
        code: '500',
        message: 'Failed to fetch billing history',
        details: error.message
      }
    });
  }
};