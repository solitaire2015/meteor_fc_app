import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials not found in environment variables");
}

// AWS S3 Configuration
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const AWS_CONFIG = {
  region: process.env.AWS_REGION || "ap-northeast-2",
  bucketName: process.env.AWS_S3_BUCKET_NAME || "football-club-storage",
  cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || "",
} as const;

const BUCKET_NAME = AWS_CONFIG.bucketName
const CLOUDFRONT_DOMAIN = AWS_CONFIG.cloudFrontDomain

// File upload configuration
export const UPLOAD_CONFIG = {
  avatar: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    dimensions: { width: 200, height: 200 }, // Square avatars
  },
  comment: {
    maxSize: 5 * 1024 * 1024, // 5MB for comment images
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    dimensions: { width: 800, height: 600 }, // Max dimensions for comments
  },
}

export type UploadType = keyof typeof UPLOAD_CONFIG

// Generate unique file key with userId and timestamp
export function generateFileKey(userId: string, fileName: string, type: UploadType): string {
  const now = new Date()
  const dateFolder = now.toISOString().split('T')[0] // YYYY-MM-DD
  const timestamp = now.getTime()
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg'
  
  return `${type}/${userId}/${dateFolder}/${timestamp}-${type}.${extension}`
}

// Validate file type and size
export function validateFile(file: File, type: UploadType): { valid: boolean; error?: string } {
  const config = UPLOAD_CONFIG[type]
  
  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024))
    return { valid: false, error: `文件大小不能超过 ${maxSizeMB}MB` }
  }
  
  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: '只支持 JPG、PNG、WebP 格式的图片' }
  }
  
  return { valid: true }
}

// Process image (resize, optimize)
export async function processImage(file: File, type: UploadType): Promise<Buffer> {
  const config = UPLOAD_CONFIG[type]
  const buffer = Buffer.from(await file.arrayBuffer())
  
  let processor = sharp(buffer)
  
  // Resize to target dimensions
  if (type === 'avatar') {
    // For avatars, create square crops
    processor = processor
      .resize(config.dimensions.width, config.dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
  } else {
    // For comments, maintain aspect ratio but limit max dimensions
    processor = processor
      .resize(config.dimensions.width, config.dimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
  }
  
  // Convert to JPEG with optimization
  return processor
    .jpeg({ quality: 85, progressive: true })
    .toBuffer()
}

// Upload file to S3
export async function uploadToS3(
  processedBuffer: Buffer, 
  fileKey: string, 
  contentType: string = 'image/jpeg'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: processedBuffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year cache
  })
  
  await s3Client.send(command)
  
  // Return CloudFront URL
  return `${CLOUDFRONT_DOMAIN}/${fileKey}`
}

// Delete file from S3
export async function deleteFromS3(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  })
  
  await s3Client.send(command)
}

// Complete upload workflow
export async function uploadFile(
  file: File, 
  userId: string, 
  type: UploadType,
  existingFileKey?: string
): Promise<{ url: string; fileKey: string }> {
  // Validate file
  const validation = validateFile(file, type)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  
  // Generate file key
  const fileKey = generateFileKey(userId, file.name, type)
  
  // Process image
  const processedBuffer = await processImage(file, type)
  
  // Upload to S3
  const url = await uploadToS3(processedBuffer, fileKey)
  
  // Delete old file if exists
  if (existingFileKey) {
    try {
      await deleteFromS3(existingFileKey)
    } catch (error) {
      console.warn('Failed to delete old file:', error)
      // Don't fail the upload if old file deletion fails
    }
  }
  
  return { url, fileKey }
}

// Extract file key from CloudFront URL
export function extractFileKeyFromUrl(url: string): string | null {
  if (!url.startsWith(CLOUDFRONT_DOMAIN)) {
    return null
  }
  
  return url.replace(`${CLOUDFRONT_DOMAIN}/`, '')
}

// Get presigned URL for direct uploads (if needed in future)
export async function getPresignedUploadUrl(fileKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  })
  
  return getSignedUrl(s3Client, command, { expiresIn: 300 }) // 5 minutes
}