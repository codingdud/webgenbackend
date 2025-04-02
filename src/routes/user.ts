import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import { updateUserInfo } from "../controllers/userController.ts";
import {upload} from "../utils/multerConfig.ts";
const router = express.Router();

router.put('/update', authenticate,upload.single("image"),updateUserInfo);

export default router;
