#!/usr/bin/env node

/**
 * Texture compression script for optimizing 3D model textures
 * Reduces file sizes significantly while maintaining visual quality
 */

import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp'; // You may need to install: npm install sharp

const ASSETS_DIR = './src/assets';
const TEXTURE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
const TARGET_MAX_SIZE = 1024; // Max dimension
const QUALITY = 80; // JPEG quality

async function findTextureFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await findTextureFiles(fullPath));
      } else if (TEXTURE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Cannot read directory ${dir}:`, error.message);
  }
  
  return files;
}

async function compressTexture(inputPath) {
  try {
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size / (1024 * 1024); // MB
    
    if (originalSize < 0.5) {
      console.log(`⏭️  Skipping small file: ${inputPath} (${originalSize.toFixed(2)}MB)`);
      return;
    }
    
    console.log(`🗜️  Compressing: ${inputPath} (${originalSize.toFixed(2)}MB)`);
    
    const outputPath = inputPath.replace(path.extname(inputPath), '_compressed.webp');
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const { width = 0, height = 0 } = metadata;
    
    // Calculate new dimensions
    let newWidth = width;
    let newHeight = height;
    
    if (width > TARGET_MAX_SIZE || height > TARGET_MAX_SIZE) {
      const aspectRatio = width / height;
      if (width > height) {
        newWidth = TARGET_MAX_SIZE;
        newHeight = Math.round(TARGET_MAX_SIZE / aspectRatio);
      } else {
        newHeight = TARGET_MAX_SIZE;
        newWidth = Math.round(TARGET_MAX_SIZE * aspectRatio);
      }
    }
    
    // Compress image
    await sharp(inputPath)
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3, // High-quality resampling
        withoutEnlargement: true
      })
      .webp({
        quality: QUALITY,
        effort: 6, // Max compression effort
        smartSubsample: true
      })
      .toFile(outputPath);
    
    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size / (1024 * 1024);
    const savings = ((originalSize - newSize) / originalSize * 100);
    
    console.log(`✅ Compressed: ${path.basename(inputPath)}`);
    console.log(`   ${width}x${height} → ${newWidth}x${newHeight}`);
    console.log(`   ${originalSize.toFixed(2)}MB → ${newSize.toFixed(2)}MB (${savings.toFixed(1)}% savings)`);
    console.log(`   Output: ${outputPath}\n`);
    
  } catch (error) {
    console.error(`❌ Failed to compress ${inputPath}:`, error.message);
  }
}

async function main() {
  console.log('🎨 Starting texture compression...\n');
  
  // Check if sharp is available
  try {
    await import('sharp');
  } catch (error) {
    console.error('❌ Sharp is required for texture compression.');
    console.error('Install it with: npm install sharp');
    process.exit(1);
  }
  
  const textureFiles = await findTextureFiles(ASSETS_DIR);
  
  if (textureFiles.length === 0) {
    console.log('No texture files found to compress.');
    return;
  }
  
  console.log(`Found ${textureFiles.length} texture files to process:\n`);
  
  for (const file of textureFiles) {
    await compressTexture(file);
  }
  
  console.log('🎉 Texture compression complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Update your model files to reference the compressed textures');
  console.log('2. Consider using the _compressed.webp versions in production');
  console.log('3. Test that the visual quality meets your requirements');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { compressTexture, findTextureFiles };