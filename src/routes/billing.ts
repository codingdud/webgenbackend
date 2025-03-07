// src/routes/billing.ts
import express from "npm:express";
import { authenticate } from "../middleware/auth.ts";
import { getCredits, purchaseCredits } from "../controllers/billingControllerStrip.ts";

const router = express.Router();

router.get('/credits', authenticate, getCredits);
router.post('/credits/purchase', authenticate, purchaseCredits);

export default router;