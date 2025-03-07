import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import {getLatestGeneratedImages,getStartCardData,getDashboardStats} from "../controllers/dashboardController.ts"

const router = express.Router();

router.get('/', authenticate, getLatestGeneratedImages);
router.get('/storage', authenticate, getStartCardData);
router.get('/stats', authenticate, getDashboardStats);



export default router;
