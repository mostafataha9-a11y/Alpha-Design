/**
 * High-performance browser-side image compression utility
 * Compresses camera and high-res images to max 1600px width/height in WebP or JPEG format
 * Drastically reduces payload from 5-10MB down to 100-300KB before upload
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.82)
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export async function compressImageClient(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputFormat = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    // Check if valid image type
    if (file.type && !file.type.startsWith('image/')) {
      return reject(new Error('الملف المحدد ليس ملف صورة صالح.'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة.'));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل تحميل الصورة في المتصفح.'));

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate aspect ratio preserving dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create offscreen canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('تعذر إنشاء سياق رسم Canvas.'));
          }

          // Support transparency for PNGs or fill white for JPEGs
          const isTransparent = file.type === 'image/png' && outputFormat === 'image/png';
          if (!isTransparent) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Test WebP support with fallback to JPEG
          let targetMime = outputFormat;
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL(targetMime, quality);
            // If browser doesn't support WebP, canvas returns image/png
            if (targetMime === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
              targetMime = 'image/jpeg';
              dataUrl = canvas.toDataURL(targetMime, quality);
            }
          } catch {
            targetMime = 'image/jpeg';
            dataUrl = canvas.toDataURL(targetMime, quality);
          }

          // Approximate compressed size in bytes from base64
          const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const compressedSize = Math.round((base64Length * 3) / 4);

          resolve({
            dataUrl,
            width,
            height,
            originalSize,
            compressedSize,
          });
        } catch (err) {
          reject(err);
        }
      };

      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };

    reader.readAsDataURL(file);
  });
}
