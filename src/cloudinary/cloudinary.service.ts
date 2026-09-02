import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No file provided');

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, JPEG, and PNG files are allowed',
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');

    // If Cloudinary is not configured in local environment, generate data URI
    if (!cloudName || !apiKey) {
      const base64Data = file.buffer ? file.buffer.toString('base64') : '';
      const dataUri = `data:${file.mimetype};base64,${base64Data}`;
      const mockId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        url: dataUri,
        publicId: mockId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'glory-admissions',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result?.secure_url || '',
            publicId: result?.public_id || '',
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
