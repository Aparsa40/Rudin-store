import { useState } from 'react';
import type { ProductImage, ProductVideo } from '../../types';

interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  allowedFormats: string;
  resourceType: 'image' | 'video';
}

interface CloudinaryUploadResponse {
  public_id?: string;
  secure_url?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  resource_type?: string;
}

interface Props {
  accessToken: string | null;
  apiBaseUrl: string;
  images: ProductImage[];
  videos: ProductVideo[];
  onChange: (images: ProductImage[], videos: ProductVideo[]) => void;
  onError: (message: string) => void;
}

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEO_FORMATS = ['mp4', 'webm', 'mov'];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function ProductMediaUploader({
  accessToken,
  apiBaseUrl,
  images,
  videos,
  onChange,
  onError,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadSelected = async () => {
    if (!accessToken) {
      onError('Sign in with an approved seller account before uploading product media.');
      return;
    }
    if (!files.length) {
      onError('Choose one or more image or video files first.');
      return;
    }

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if ((!isImage && !isVideo) ||
        (isImage && !IMAGE_FORMATS.includes(extension)) ||
        (isVideo && !VIDEO_FORMATS.includes(extension))) {
        onError(`Unsupported media format: ${file.name}. Use PNG, JPEG, WebP, GIF, MP4, WebM, or MOV.`);
        return;
      }
      if ((isImage && file.size > MAX_IMAGE_BYTES) || (isVideo && file.size > MAX_VIDEO_BYTES)) {
        onError(isImage
          ? 'Each image must be 20 MB or smaller.'
          : 'Each video must be 100 MB or smaller.');
        return;
      }
    }

    setUploading(true);
    try {
      const nextImages = [...images];
      const nextVideos = [...videos];

      for (const file of files) {
        const resourceType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
        const signedResponse = await fetch(`${apiBaseUrl}/api/uploads/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ resourceType }),
        });
        const signedPayload = await signedResponse.json().catch(() => ({}));
        if (!signedResponse.ok) {
          throw new Error(signedPayload?.error?.message || 'Could not prepare a secure media upload.');
        }
        const signed = signedPayload.upload as SignedUpload;
        const form = new FormData();
        form.set('file', file);
        form.set('api_key', signed.apiKey);
        form.set('timestamp', String(signed.timestamp));
        form.set('folder', signed.folder);
        form.set('signature', signed.signature);
        form.set('allowed_formats', signed.allowedFormats);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/${resourceType}/upload`,
          { method: 'POST', body: form },
        );
        const uploaded = await uploadResponse.json().catch(() => ({})) as CloudinaryUploadResponse & {
          error?: { message?: string };
        };
        if (!uploadResponse.ok || !uploaded.public_id || !uploaded.secure_url) {
          throw new Error(uploaded.error?.message || `Cloudinary could not upload ${file.name}.`);
        }

        if (resourceType === 'image') {
          nextImages.push({
            id: uploaded.public_id,
            url: uploaded.secure_url,
            altText: file.name.replace(/\.[^.]+$/, '').slice(0, 300),
            isPrimary: nextImages.length === 0,
            displayOrder: nextImages.length,
          });
        } else {
          nextVideos.push({
            id: uploaded.public_id,
            url: uploaded.secure_url,
            format: uploaded.format ?? extensionOf(file.name),
            bytes: uploaded.bytes ?? file.size,
            duration: uploaded.duration,
            displayOrder: nextVideos.length,
          });
        }
      }

      onChange(nextImages, nextVideos);
      setFiles([]);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Media upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Product gallery</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Images: PNG, JPEG, WebP or GIF (up to 20 MB each). Videos: MP4, WebM or MOV (up to 100 MB each).
          Files upload directly to Cloudinary; API secrets never reach the browser.
        </p>
      </div>
      <input
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))}
        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-[11px] text-slate-600"
        disabled={uploading}
      />
      {files.length > 0 && (
        <p className="text-[11px] text-slate-600">{files.length} file(s) selected</p>
      )}
      <button
        type="button"
        onClick={() => void uploadSelected()}
        disabled={uploading || files.length === 0}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Uploading media…' : 'Upload selected media'}
      </button>
      {(images.length > 0 || videos.length > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <img src={item.url} alt={item.altText || 'Product image'} className="h-24 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-[10px] text-slate-600">{item.isPrimary ? 'Primary image' : 'Image'}</span>
                <button type="button" onClick={() => {
                  const remaining = images.filter((image) => image.id !== item.id);
                  if (remaining.length && !remaining.some((image) => image.isPrimary)) remaining[0] = { ...remaining[0], isPrimary: true };
                  onChange(remaining.map((image, index) => ({ ...image, displayOrder: index })), videos);
                }} className="text-[10px] font-bold text-red-600">Remove</button>
              </div>
            </div>
          ))}
          {videos.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <video src={item.url} controls preload="metadata" className="h-24 w-full bg-black object-contain" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-[10px] text-slate-600">Video ({item.format.toUpperCase()})</span>
                <button type="button" onClick={() => onChange(images, videos.filter((video) => video.id !== item.id).map((video, index) => ({ ...video, displayOrder: index })))} className="text-[10px] font-bold text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function extensionOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}
