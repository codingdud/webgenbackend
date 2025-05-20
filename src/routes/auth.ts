// src/routes/auth.ts
import express from "npm:express";
import { signUp, signIn, resetApiKey } from "../controllers/authController.ts";
import { authenticate,refreshToken } from "../middleware/authoriztion.ts";

const router = express.Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/refresh-token', refreshToken);
router.get('/reset-api-key', authenticate, resetApiKey);

export default router;