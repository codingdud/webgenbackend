// src/controllers/imageController.ts
import { Request, Response } from "npm:express";
import cloudinary from '../utils/cloudinary.ts';
import { Image } from '../models/Image.ts';
import { Project } from '../models/Project.ts';
import { logger } from '../utils/logger.ts';

export const generateImage = async (req: Request, res: Response) => {
  try {
    logger.debug('Starting image generation process');
    const { style, colorScheme, prompt, type, negative_prompt, aspect_ratio, output_format } = req.body;
    const user = req.user;
    const projectId = req.params.id;

    // Check credits
    if (user.subscription.creditsRemaining <= 0) {
      logger.warn(`User ${user._id} attempted to generate image with insufficient credits`);
      return res.status(402).json({
        success: false,
        error: { code: '402', message: 'Insufficient credits' }
      });
    }

    logger.debug('Calling NVIDIA API for image generation');
    const nvResponse = await fetch(
      "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium",
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': `Bearer ${Deno.env.get("NVIDIA_API_KEY")}`
        },
        body: JSON.stringify({
          aspect_ratio:aspect_ratio||"1:1",
          cfg_scale: 5,
          mode: 'text-to-image',
          model: 'sd3',
          output_format: output_format||'jpeg',
          negative_prompt: negative_prompt,
          seed: Math.floor(Math.random() * 1000000),
          steps: 50,
          prompt: prompt
        })
      }
    );

    if(!nvResponse.ok){
      logger.error('NVIDIA API request failed', { status: nvResponse.status, statusText: nvResponse.statusText });
      return res.status(500).json({
        success: false,
        error: { code: '500', message: 'Image generation failed', details: nvResponse.statusText }
      });
    }

    const imageData = await nvResponse.json();
    if(imageData.finish_reason !== 'SUCCESS'){
      logger.error('Image generation failed', { reason: imageData.finish_reason });
      return res.status(500).json({
        success: false,
        error: { code: '500', message: 'Image generation failed', details: imageData.finish_reason }
      });
    }

    logger.debug('Updating user credits');
    user.subscription.creditsRemaining -= 1;
    await user.save();

    logger.debug('Uploading image to Cloudinary');
    const base64Image = `data:image/${output_format || 'jpeg'};base64,${imageData.image}`;
    const cloudinaryResponse = await cloudinary.uploader.upload(base64Image, {
      folder: `${user._id}/${projectId}/`,
      resource_type: 'image',
    });

    logger.debug('Creating new image document');
    const newImage = new Image({
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      metadata: {
          type: type||'custom', // Default type, can be dynamic based on your logic         
          prompt,
          style,
          colorScheme,
          aspectRatio: aspect_ratio,
      },
      user: user._id, // Associate the image with the user
    });

    if (projectId) {
      logger.debug(`Adding image to project: ${projectId}`);
      const project = await Project.findById(projectId);
      if (!project) {
        logger.warn(`Project not found: ${projectId}`);
        return res.status(404).json({
          success: false,
          error: { code: '404', message: 'Project not found' },
        });
      }

      project.images.push(newImage._id);
      project.updatedAt = new Date();
      if (project.status === 'draft') {
        project.status = 'in-progress';
        logger.info(`Project ${projectId} status updated to in-progress`);
      }
      await project.save();
    }

    await newImage.save();
    logger.info(`Successfully generated and saved image for user ${user._id}`);

    res.status(201).json({
      success: true,
      data: newImage,
    });
  } catch (error: unknown) {
    logger.error('Image generation failed', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { code: '500', message: 'Image generation failed', details: error }
    });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const imageId = req.params.id;
    const user = req.user;

    logger.debug(`Attempting to delete image: ${imageId}`);

    const image = await Image.findById(imageId);
    if (!image) {
      logger.warn(`Image not found: ${imageId}`);
      return res.status(404).json({
        success: false,
        error: { code: '404', message: 'Image not found' },
      });
    }

    if (image.user.toString() !== user._id.toString()) {
      logger.warn(`Unauthorized deletion attempt for image ${imageId} by user ${user._id}`);
      return res.status(403).json({
        success: false,
        error: { code: '403', message: 'You are not authorized to delete this image' },
      });
    }

    logger.debug('Deleting image from Cloudinary');
    await cloudinary.uploader.destroy(image.publicId);

    logger.debug('Updating project references');
    await Project.updateMany(
      { images: imageId },
      { $pull: { images: imageId } }
    );

    await Image.findByIdAndDelete(imageId);
    logger.info(`Successfully deleted image ${imageId}`);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: unknown) {
    logger.error('Error deleting image', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({
      success: false,
      error: { 
        code: '500', 
        message: 'Failed to delete image', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
    });
  }
};

/* export const saveImage = async (req: Request, res: Response) => {
  try {
      const { image, finish_reason} = req.body; // Include projectId in the request
      const { style, colorScheme, prompt, type, aspect_ratio, output_format } = req.body; // Metadata
      const user = req.user; // Authenticated user
      const projectId = req.params.id; // Project ID

      // Validate the response
      if (!image || finish_reason !== 'SUCCESS') {
          return res.status(400).json({
              success: false,
              error: { code: '400', message: 'Invalid image data' },
          });
      }

      // Add the data URL prefix if missing
      const base64Image = `data:image/${output_format || 'jpeg'};base64,${image}`;

      // Upload the Base64 image to Cloudinary
      const cloudinaryResponse = await cloudinary.uploader.upload(base64Image, {
          folder: `${user._id}/${projectId}/`, // Optional: Organize images in a folder
          resource_type: 'image',
      });

      // Create a new Image document
      const newImage = new Image({
          url: cloudinaryResponse.secure_url,
          publicId: cloudinaryResponse.public_id,
          metadata: {
              type: type||'custom', // Default type, can be dynamic based on your logic         
              prompt,
              style,
              colorScheme,
              aspectRatio: aspect_ratio,
          },
          user: user._id, // Associate the image with the user
      });

      // Save the image to MongoDB
      await newImage.save();

      // If projectId is provided, add the image ID to the project
      if (projectId) {
          const project = await Project.findById(projectId);
          if (!project) {
              return res.status(404).json({
                  success: false,
                  error: { code: '404', message: 'Project not found' },
              });
          }

          // Add the image ID to the project's images array
          project.images.push(newImage._id);
          project.updatedAt = new Date(); // Update the project's updatedAt timestamp
          await project.save();
      }

      // Respond with the saved image data
      res.status(201).json({
          success: true,
          data: newImage,
      });
  } catch (error:any) {
      console.error('Error saving image:', error);
      res.status(500).json({
          success: false,
          error: { code: '500', message: 'Failed to save image', details: error.message },
      });
  }
}; */