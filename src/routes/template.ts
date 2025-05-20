import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import {
  publishProjectAsTemplate,
  unpublishProject,
  likeTemplate,
  dislikeTemplate,
  getTemplateWithProject,
  getTemplates
} from '../controllers/templateController.ts';

const router = express.Router();

// Publish a project as a template
router.post('/publish/:projectId', authenticate, publishProjectAsTemplate);

// Unpublish a project and remove its template
router.post('/unpublish/:projectId', authenticate, unpublishProject);

// Like a template
router.post('/like/:templateId', authenticate, likeTemplate);

// Dislike a template
router.post('/dislike/:templateId', authenticate, dislikeTemplate);

router.get('/template/:templateId',authenticate, getTemplateWithProject);
router.get('/template',authenticate, getTemplates);

export default router;
