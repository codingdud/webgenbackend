import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import {getLatestGeneratedImages,getStartCardData} from "../controllers/dashboardController.ts"

const router = express.Router();

router.get('/', authenticate, getLatestGeneratedImages);
router.get('/storage', authenticate, getStartCardData);


export default router;
