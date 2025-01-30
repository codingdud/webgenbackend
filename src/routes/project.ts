// src/routes/project.ts
import express from "npm:express";
import { authenticate } from "../middleware/authoriztion.ts";
import { 
  createProject, 
  getProjects, 
  updateProject, 
  deleteProject,
  getProjectById
} from "../controllers/projectController.ts";

const router = express.Router();

router.post('/', authenticate, createProject);
router.get('/', authenticate, getProjects);
router.get('/:id', authenticate, getProjectById);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);

export default router;