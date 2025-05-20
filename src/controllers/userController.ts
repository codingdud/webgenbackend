import { Request, Response } from "npm:express";
import cloudinary from '../utils/cloudinary.ts';
import { logger } from '../utils/logger.ts';

export const updateUserInfo = async (req: Request, res: Response) => {
    try {
    const { name,email, organization, role } = req.body;
    const profileImage = req.file;
    //console.log(profileImage)
    logger.debug('Processing user update request', { email, organization, role });

    const user = req.user;
    let imageUrl = user.profileImage;

    // Upload new profile image if provided
    if (profileImage) {
        try {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            
            const result = await cloudinary.uploader.upload(base64Image, {
                folder: `${user._id}/profile`,
                public_id: 'profile_image',
                overwrite: true
            });
            
            imageUrl = result.secure_url;
            logger.info('Profile image uploaded successfully');
        } catch (error) {
            logger.error('Failed to upload profile image', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    // Update user information
    //user.email = email || user.email;
    user.organization = organization || user.organization;
    user.role = role || user.role;
    user.profileImage = imageUrl;
    user.name = name || user.name;

    await user.save();
    logger.info('User information updated or Fetch successfully');

    const { password, ...userWithoutPassword } = user.toObject();
    
    res.json({
        success: true,
        data: userWithoutPassword
    });
    } catch (error: unknown) {
        //console.log(error)
        logger.error('User update failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: {
                code: '500',
                message: 'User update failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
};

//delete image and update with default image
