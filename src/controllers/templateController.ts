import { Project } from "../models/Project.ts";
import { Template } from "../models/Template.ts";
import { Request, Response } from 'npm:express';
import { logger } from "../utils/logger.ts";

// Publish a project as a template
export const publishProjectAsTemplate = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const user = req.user;
        logger.info(`Publishing project as template: ${projectId} by user: ${user._id}`);

        // Set publish: true in Project
        const project = await Project.findByIdAndUpdate(
            projectId,
            { $set: { publish: true } },
            { new: true }
        );
        if (!project) {
            logger.warn(`Project not found: ${projectId}`);
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Create Template entry if not exists
        let template = await Template.findOne({ project: project._id });
        if (!template) {
            template = await Template.create({ project: project._id });
            logger.info(`Template created for project: ${projectId}`);
        } else {
            logger.info(`Template already exists for project: ${projectId}`);
        }
        res.json({ success: true, template });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`Error publishing project as template: ${errorMessage}`);
        res.status(500).json({ success: false, message: errorMessage });
    }
};

// Like a template (push user id to likes, remove from dislikes if present)
export const likeTemplate = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        const user = req.user;
        logger.info(`User ${user._id} liking template: ${templateId}`);

        const template = await Template.findByIdAndUpdate(
            templateId,
            {
                $addToSet: { likes: user._id },
                $pull: { dislikes: user._id }
            },
            { new: true }
        );
        if (!template) {
            logger.warn(`Template not found: ${templateId}`);
            return res.status(404).json({ success: false, message: "Template not found" });
        }
        logger.info(`Template liked: ${templateId} by user: ${user._id}`);
        res.json({ success: true, template });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`Error liking template: ${errorMessage}`);
        res.status(500).json({ success: false, message: errorMessage });
    }
};

// Dislike a template (push user id to dislikes, remove from likes if present)
export const dislikeTemplate = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        const user = req.user;
        logger.info(`User ${user._id} disliking template: ${templateId}`);

        const template = await Template.findByIdAndUpdate(
            templateId,
            {
                $addToSet: { dislikes: user._id },
                $pull: { likes: user._id }
            },
            { new: true }
        );
        if (!template) {
            logger.warn(`Template not found: ${templateId}`);
            return res.status(404).json({ success: false, message: "Template not found" });
        }
        logger.info(`Template disliked: ${templateId} by user: ${user._id}`);
        res.json({ success: true, template });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`Error disliking template: ${errorMessage}`);
        res.status(500).json({ success: false, message: errorMessage });
    }
};

// Unpublish a project and remove its template
export const unpublishProject = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const user = req.user;
        logger.info(`User ${user._id} unpublishing project: ${projectId}`);

        // Set publish: false in Project
        const project = await Project.findByIdAndUpdate(
            projectId,
            { $set: { publish: false } },
            { new: true }
        );
        if (!project) {
            logger.warn(`Project not found: ${projectId}`);
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Remove the Template associated with this project
        await Template.findOneAndDelete({ project: projectId });
        logger.info(`Template removed for unpublished project: ${projectId}`);

        res.json({ success: true, message: "Project unpublished and template removed", project });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`Error unpublishing project: ${errorMessage}`);
        res.status(500).json({ success: false, message: errorMessage });
    }
};

// Get a template and its associated project data
export const getTemplateWithProject = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        logger.debug(`Fetching template and project for template: ${templateId}`);

        // Find the template and populate the project field
        const template = await Template.findById(templateId)
            .populate({
                path: 'project',
                populate: {
                    path: 'images', // If you want to populate images inside project
                    options: { sort: { generatedAt: -1 } }
                }
            })
            .populate('likes', 'username email') // Optionally populate user info for likes
            .populate('dislikes', 'username email'); // Optionally populate user info for dislikes

        if (!template) {
            logger.warn(`Template not found: ${templateId}`);
            return res.status(404).json({
                success: false,
                error: { code: '404', message: 'Template not found' },
            });
        }

        logger.info(`Template and project data retrieved for template: ${templateId}`);
        res.json({
            success: true,
            data: template,
        });
    } catch (error: unknown) {
        logger.error('Failed to fetch template and project data', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch template and project data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};

// Get all templates with pagination and optional filters for tags and status
export const getTemplates = async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching templates');
        const { page = 1, limit = 10, projectTitle, tags, status } = req.query;

        // Build query for filtering by project fields
        const match: any = {};
        if (projectTitle) {
            match.title = { $regex: projectTitle, $options: 'i' };
        }
        if (status) {
            match.status = status;
        }
        if (tags) {
            match.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }

        // Find templates and populate project field with filters
        const templates = await Template.find()
            .populate({
                path: 'project',
                match,
                populate: {
                    path: 'images',
                    options: { sort: { generatedAt: -1 } }
                }
            })
            .populate('likes', 'username email')
            .populate('dislikes', 'username email')
            .sort({ createdAt: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        // Filter out templates where project is null (if filters are used)
        const filteredTemplates = templates.filter(t => t.project);

        // Count total templates matching the filter
        const total = await Template.countDocuments();

        logger.info(`Retrieved ${filteredTemplates.length} templates`);

        res.json({
            success: true,
            data: {
                templates: filteredTemplates,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error: unknown) {
        logger.error('Failed to fetch templates', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'Failed to fetch templates',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
        });
    }
};