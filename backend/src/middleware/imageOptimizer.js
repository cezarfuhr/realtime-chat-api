const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure thumbnails directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const thumbnailDir = path.join(uploadDir, 'thumbnails');

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

/**
 * Optimize image using Sharp
 * - Compress images
 * - Convert to WebP for better compression
 * - Generate thumbnails
 * - Preserve original if needed
 */
const optimizeImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  const isImage = file.mimetype.startsWith('image/');

  if (!isImage) {
    return next();
  }

  try {
    const originalPath = file.path;
    const filename = path.parse(file.filename).name;
    const optimizedFilename = `${filename}.webp`;
    const optimizedPath = path.join(uploadDir, optimizedFilename);
    const thumbnailFilename = `${filename}-thumb.webp`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // Process image with Sharp
    const image = sharp(originalPath);
    const metadata = await image.metadata();

    // Resize if image is too large
    let processedImage = image;

    // Max dimensions
    const maxWidth = 1920;
    const maxHeight = 1920;

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      processedImage = processedImage.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to WebP and optimize
    await processedImage
      .webp({ quality: 85 })
      .toFile(optimizedPath);

    // Generate thumbnail (300x300)
    await sharp(originalPath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 75 })
      .toFile(thumbnailPath);

    // Get file sizes
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

    logger.info(`Image optimized: ${file.originalname} | Original: ${(originalSize / 1024).toFixed(2)}KB | Optimized: ${(optimizedSize / 1024).toFixed(2)}KB | Savings: ${savings}%`);

    // Delete original file to save space
    fs.unlinkSync(originalPath);

    // Update req.file with optimized file info
    req.file.filename = optimizedFilename;
    req.file.path = optimizedPath;
    req.file.size = optimizedSize;
    req.file.mimetype = 'image/webp';
    req.file.optimized = true;
    req.file.thumbnail = {
      filename: thumbnailFilename,
      path: thumbnailPath,
      url: `/uploads/thumbnails/${thumbnailFilename}`
    };

    next();
  } catch (error) {
    logger.error('Image optimization error:', error);

    // Continue with original file if optimization fails
    req.file.optimized = false;
    next();
  }
};

/**
 * Batch optimize existing images
 * Useful for migrating old uploads
 */
const batchOptimizeImages = async () => {
  try {
    const files = fs.readdirSync(uploadDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });

    logger.info(`Found ${imageFiles.length} images to optimize`);

    for (const file of imageFiles) {
      const filePath = path.join(uploadDir, file);
      const filename = path.parse(file).name;
      const optimizedFilename = `${filename}.webp`;
      const optimizedPath = path.join(uploadDir, optimizedFilename);

      // Skip if already optimized
      if (fs.existsSync(optimizedPath)) {
        continue;
      }

      try {
        await sharp(filePath)
          .webp({ quality: 85 })
          .toFile(optimizedPath);

        // Generate thumbnail
        const thumbnailFilename = `${filename}-thumb.webp`;
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

        await sharp(filePath)
          .resize(300, 300, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 75 })
          .toFile(thumbnailPath);

        logger.info(`Optimized: ${file}`);
      } catch (error) {
        logger.error(`Failed to optimize ${file}:`, error);
      }
    }

    logger.info('Batch optimization complete');
  } catch (error) {
    logger.error('Batch optimization error:', error);
  }
};

module.exports = {
  optimizeImage,
  batchOptimizeImages
};
