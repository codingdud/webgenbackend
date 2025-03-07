// src/controllers/imageController.ts
import { Request, Response } from "npm:express";
import cloudinary from '../utils/cloudinary.ts';
import { Image } from '../models/Image.ts';
import { Project } from '../models/Project.ts';

export const generateImage = async (req: Request, res: Response) => {
  try {
    const { style, colorScheme, prompt, type, negative_prompt,aspect_ratio,output_format } = req.body;
    //console.log(negative_prompt);
    const user = req.user;
    const projectId = req.params.id;
    // Check credits
    if (user.creditsRemaining <= 0) {
      return res.status(402).json({
        success: false,
        error: { code: '402', message: 'Insufficient credits' }
      });
    }
    // Call NVIDIA API
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
      return res.status(500).json({
        success: false,
        error: { code: '500', message: 'Image generation failed', details: nvResponse.statusText }
      });
    }
    const imageData = await nvResponse.json();
    if(imageData.finish_reason!=='SUCCESS'){
      return res.status(500).json({
        success: false,
        error: { code: '500', message: 'Image generation failed', details: imageData.finish_reason }
      });
    }
    // Update user credits
    user.subscription.creditsRemaining -= 1;
    await user.save();
    // Add the data URL prefix if missing
    const base64Image = `data:image/${output_format || 'jpeg'};base64,${imageData.image}`;

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
      if (project.status==='draft') {
        project.status='in-progress';
      }
      await project.save();
  }
  // Save the image to MongoDB
  await newImage.save();

  res.status(201).json({
    success: true,
    data: newImage,
});
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: '500', message: 'Image generation failed', details: error }
    });
  }
};




export const deleteImage = async (req: Request, res: Response) => {
  try {
      const imageId  = req.params.id; // Image ID to delete
      const user = req.user; // Authenticated user

      // Find the image in the database
      const image = await Image.findById(imageId);
      if (!image) {
          return res.status(404).json({
              success: false,
              error: { code: '404', message: 'Image not found' },
          });
      }

      // Check if the image belongs to the authenticated user
      if (image.user.toString() !== user._id.toString()) {
          return res.status(403).json({
              success: false,
              error: { code: '403', message: 'You are not authorized to delete this image' },
          });
      }

      // Delete the image from Cloudinary
      await cloudinary.uploader.destroy(image.publicId);

      // Remove the image reference from associated projects
      await Project.updateMany(
          { images: imageId }, // Find projects that reference this image
          { $pull: { images: imageId } } // Remove the image ID from the images array
      );

      // Delete the image document from MongoDB
      await Image.findByIdAndDelete(imageId);

      // Respond with success
      res.status(200).json({
          success: true,
          message: 'Image deleted successfully',
      });
  } catch (error: any) {
      console.error('Error deleting image:', error);
      res.status(500).json({
          success: false,
          error: { code: '500', message: 'Failed to delete image', details: error.message },
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