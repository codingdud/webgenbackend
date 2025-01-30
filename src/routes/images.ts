// src/routes/images.ts
import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import { rateLimit } from "../middleware/rateLimit.ts";
import { generateImage,deleteImage} from "../controllers/imageController.ts";

const router = express.Router();

router.post('/generate/:id', authenticate, rateLimit, generateImage);
router.delete('/:id', authenticate, deleteImage);

export default router;
