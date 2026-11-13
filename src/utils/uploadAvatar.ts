import type { UploadApiOptions } from 'cloudinary';
import cloudinary from '../config/cloudinary';

export function uploadAvatarToCloudinary(
    publicId: string,
    buffer: Buffer,
    allowedFormats?: UploadApiOptions['allowed_formats'],
): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'chesshub/avatars',
                public_id: publicId,
                overwrite: true,
                resource_type: 'image',
                allowed_formats: allowedFormats,
            },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error('Avatar upload failed'));
                resolve(result.secure_url);
            },
        );

        uploadStream.end(buffer);
    });
}
