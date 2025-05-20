// src/routes/billingRoutes.ts
import { Router } from "npm:express";
import express from "npm:express";

import { authenticate } from "../middleware/authoriztion.ts";
import { 
  getCredits, 
  purchaseCredits, 
  createCheckoutSession,
  getBillingHistory,
  handleStripeWebhook
} from "../controllers/billingControllerStrip.ts";

const router = Router();

// Get user credits
router.get("/credits", authenticate, getCredits);

// Legacy endpoint for purchasing credits (redirect to checkout)
router.post("/purchase-credits", authenticate, purchaseCredits);

// New endpoint for creating a checkout session with Stripe Custom Checkout
router.post("/create-checkout-session", authenticate, createCheckoutSession);
router.get('/history',authenticate, getBillingHistory);
// Stripe webhook handler (no authentication - called by Stripe)
router.post("/webhook",express.raw({ type: "application/json" }), handleStripeWebhook);

export default router;