import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Read server-only credentials without preventing the API from starting when uploads are disabled. */
export function getCloudinaryCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Configure and return the SDK only when all required server credentials exist. */
export function getCloudinaryClient() {
  const credentials = getCloudinaryCredentials();
  if (!credentials) return null;

  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  });

  return cloudinary;
}
