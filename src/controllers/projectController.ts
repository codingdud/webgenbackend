// src/controllers/projectController.ts
import { Request, Response } from "npm:express";
import { Project } from "../models/Project.ts";

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    try {
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

        res.status(201).json({
            success: true,
            data: project,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project creation failed',
                details: error.message,
            },
        });
    }
};

// Get all projects for the authenticated user
export const getProjects = async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch projects',
                details: error.message,
            },
        });
    }
};

// Update an existing project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { title, description, tags, status } = req.body;

        // Find existing project
        const project = await Project.findOne({
            _id: id,
            user: user._id,
        });

        if (!project) {
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

        res.json({
            success: true,
            data: project,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project update failed',
                details: error.message,
            },
        });
    }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const project = await Project.findOneAndDelete({
            _id: id,
            user: user._id,
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Project not found' },
            });
        }

        res.json({
            success: true,
            data: { message: 'Project deleted successfully' },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Project deletion failed',
                details: error.message,
            },
        });
    }
};

// Get a project by ID
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const project = await Project.findOne({
            _id: id,
            user: user._id,
        }).populate('images'); // Populate the images field with actual image documents

        if (!project) {
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Project not found' },
            });
        }

        res.json({
            success: true,
            data: project,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch project',
                details: error.message,
            },
        });
    }
};