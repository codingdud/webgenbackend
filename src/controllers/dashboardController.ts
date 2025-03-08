import { Request, Response } from 'express';
import { Image } from '../models/Image.ts';
import { Project } from '../models/Project.ts';
import { getUserImageStorage } from '../utils/storageUtils.ts';
import { logger } from '../utils/logger.ts';

// Get latest generated Image
export const getLatestGeneratedImages = async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching latest generated images');
        const user = req.user;
        const page = parseInt(req?.query?.page as string) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const images = await Image.find({ user: user._id })
            .sort({ generatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        if (!images.length) {
            logger.info(`No images found for user: ${user._id}`);
            return res.status(404).json({ message: 'No images found' });
        }

        logger.debug(`Retrieved ${images.length} images for user: ${user._id}`);
        res.status(200).json(images);
    } catch (error: unknown) {
        logger.error('Error fetching latest images', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ message: 'Server error', error });
    }
};

// Endpoint to fetch startcarddata
export const getStartCardData = async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching start card data');
        const user = req.user;

        const totalImagesGenerated = await Image.countDocuments({ user: user._id });
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const totalImagesGeneratedToday = await Image.countDocuments({ 
            user: user._id, 
            generatedAt: { $gte: startOfDay } 
        });

        logger.debug(`User ${user._id} stats - Total: ${totalImagesGenerated}, Today: ${totalImagesGeneratedToday}`);

        const totalInProgressProjects = await Project.countDocuments({ user: user._id, status: 'in-progress' });
        const { total100MB, percentageOf100MB } = await getUserImageStorage(user._id);

        const startcarddata = [
            { title: "Images Generated", value: totalImagesGenerated.toString(), percentageChange: `${totalImagesGeneratedToday}+`},
            { title: "API Credits", value: user.subscription.creditsRemaining.toString(), percentageChange:user.subscription.tier, color: "green" },
            { title: "Projects", value: totalInProgressProjects, percentageChange: "active", color: "red" },
            { title: "Storage Use", value: `${total100MB}MB`, percentageChange: `${percentageOf100MB}%`, color: "yellow" },
        ];

        res.status(200).json(startcarddata);
    } catch (error: unknown) {
        logger.error('Error fetching start card data', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ message: 'Server error', error });
    }
};

enum ComponentType {
  HEADER = "Header",
  CARD = "Card",
  PROFILE = "Profile",
  BACKGROUND = "Background",
  THUMBNAIL = "Thumbnail",
  PRODUCT = "Product",
  ICON = "Icon",
  INFOGRAPHIC = "Infographic",
  TESTIMONIAL = "Testimonial",
  CTA = "CTA"
}

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        logger.debug('Fetching dashboard statistics');
        const user = req.user;
        const today = new Date();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const generationHistory = (await Promise.all(
            Array(7).fill(0).map(async (_, index) => {
                const date = new Date(today);
                date.setDate(date.getDate() - index);
                date.setHours(0, 0, 0, 0);

                const nextDate = new Date(date);
                nextDate.setDate(date.getDate() + 1);

                const count = await Image.countDocuments({
                    user: user._id,
                    generatedAt: {
                        $gte: date,
                        $lt: nextDate
                    }
                });

                return {
                    name: days[(7 + (today.getDay() - index)) % 7],
                    value: count
                };
            })
        )).filter(day => day.value > 0);

        logger.debug(`Generated history for last 7 days for user: ${user._id}`);

        const categories = await Image.aggregate([
            {
                $match: {
                    user: user._id
                }
            },
            {
                $group: {
                    _id: "$metadata.type",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]);

        logger.debug(`Retrieved ${categories.length} categories for user: ${user._id}`);

        const popularCategories = categories.map(cat => ({
            name: cat._id || "custom",
            value: cat.count
        }));

        const finalHistory = generationHistory.length ? 
            generationHistory.reverse() : 
            [{ name: days[today.getDay()], value: 0 }];

        logger.info(`Dashboard stats compiled successfully for user: ${user._id}`);
        
        res.status(200).json({
            generationHistory: finalHistory,
            popularCategories: popularCategories.length ? popularCategories : [
                { name: ComponentType.HEADER, value: 0 },
                { name: ComponentType.CARD, value: 0 },
                { name: ComponentType.PROFILE, value: 0 },
                { name: ComponentType.BACKGROUND, value: 0 },
                { name: ComponentType.THUMBNAIL, value: 0 },
                { name: ComponentType.PRODUCT, value: 0 },
                { name: ComponentType.ICON, value: 0 },
                { name: ComponentType.INFOGRAPHIC, value: 0 },
                { name: ComponentType.TESTIMONIAL, value: 0 },
                { name: ComponentType.CTA, value: 0 }
            ]
        });
    } catch (error: unknown) {
        logger.error('Error fetching dashboard stats', { 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({ message: 'Server error', error });
    }
};