// src/controllers/projectController.ts
import { Request, Response } from "npm:express";
import { Project } from "../models/Project.ts";
import { logger } from "../utils/logger.ts";

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    try {
        logger.debug('Processing project creation request');
        const { title, description, tags } = req.body; // Accept imageIds instead of generating images
        const user = req.user;
        // Create project
        const project = new Project({
            title,
            description,
            user: user._id,
            tags,
        });

        await project.save();
        logger.info(`Project created successfully: ${project._id} by user: ${user._id}`);

        res.status(201).json({
            success: true,
            data: project,
        });
    } catch (error: unknown) {
        logger.error('Project creation failed', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project creation failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

// Get all projects for the authenticated user
export const getProjects = async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching projects');
        const user = req.user;
        const { page = 1, limit = 10, status, tags, title } = req.query;

        const query: any = { user: user._id };
        if (status) query.status = status;
        if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        if (title) query.title = { $regex: title, $options: 'i' };

        const projects = await Project.find(query)
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .populate({
              path: 'images', // Populate the images field
              options: { sort: { generatedAt: -1 } }, // Sort images by createdAt (newest first)
          });
        const total = await Project.countDocuments(query);
        logger.info(`Retrieved ${projects.length} projects for user: ${user._id}`);

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: unknown) {
        logger.error('Failed to fetch projects', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch projects',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

// Update an existing project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        logger.debug(`Updating project: ${id}`);
        const { title, description, tags, status } = req.body;

        // Find existing project
        const project = await Project.findOne({
            _id: id,
            user: user._id,
        });

        if (!project) {
            logger.warn(`Project not found: ${id} for user: ${user._id}`);
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Project not found' },
            });
        }

        // Update project fields
        project.title = title || project.title;
        project.description = description || project.description;
        project.tags = tags || project.tags;
        project.status = status || project.status;
        project.updatedAt = new Date();

        await project.save();
        logger.info(`Project updated successfully: ${id}`);

        res.json({
            success: true,
            data: project,
        });
    } catch (error: unknown) {
        logger.error('Project update failed', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project update failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        logger.debug(`Attempting to delete project: ${id}`);

        const project = await Project.findOneAndDelete({
            _id: id,
            user: user._id,
        });

        if (!project) {
            logger.warn(`Project not found for deletion: ${id}`);
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Project not found' },
            });
        }

        logger.info(`Project deleted successfully: ${id}`);
        res.json({
            success: true,
            data: { message: 'Project deleted successfully' },
        });
    } catch (error: unknown) {
        logger.error('Project deletion failed', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project deletion failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

// Get a project by ID
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        logger.debug(`Fetching project: ${id}`);

        const project = await Project.findOne({
            _id: id,
            user: user._id,
        }).populate({
            path: 'images', // Populate the images field
            options: { sort: { generatedAt: -1 } }, // Sort images by createdAt (newest first)
        }); // Populate the images field with actual image documents

        if (!project) {
            logger.warn(`Project not found: ${id} for user: ${user._id}`);
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Project not found' },
            });
        }

        logger.debug(`Project ${id} retrieved successfully`);
        res.json({
            success: true,
            data: project,
        });
    } catch (error: unknown) {
        logger.error('Failed to fetch project', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch project',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};