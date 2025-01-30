// src/routes/auth.ts
import express from "npm:express";
import { signUp, signIn, resetApiKey } from "../controllers/authController.ts";
import { authenticate,refreshToken } from "../middleware/authoriztion.ts";

const router = express.Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.get('/refresh-token', refreshToken);
router.post('/reset-api-key', authenticate, resetApiKey);

export default router;