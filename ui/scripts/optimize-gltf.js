#!/usr/bin/env node

/**
 * GLTF optimization script using gltf-transform
 * Applies Draco compression, texture optimization, and other optimizations
 */

import { NodeIO } from '@gltf-transform/core';
import { draco, textureCompress, dedup, prune, weld } from '@gltf-transform/functions';
import { promises as fs } from 'fs';
import path from 'path';

const ASSETS_DIR = './src/assets/models';

async function findGLTFFiles(dir) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await findGLTFFiles(fullPath));
      } else if (entry.name.endsWith('.gltf') || entry.name.endsWith('.glb')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Cannot read directory ${dir}:`, error.message);
  }
  
  return files;
}

async function optimizeGLTF(inputPath) {
  try {
    console.log(`🔧 Optimizing: ${inputPath}`);
    
    const io = new NodeIO();
    
    // Load the GLTF file
    const document = await io.read(inputPath);
    
    // Get original file size
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size / 1024; // KB
    
    // Apply optimizations
    await document.transform(
      // Remove duplicate vertices, textures, and materials
      dedup(),
      
      // Weld vertices (merge vertices that are very close)
      weld({ tolerance: 0.0001 }),
      
      // Remove unused nodes, meshes, materials, etc.
      prune(),
      
      // Apply Draco compression to geometry
      draco({
        quantizationBits: {
          POSITION: 14,
          NORMAL: 10,
          COLOR: 8,
          TEX_COORD: 12,
          GENERIC: 12
        },
        quantizationVolume: 'mesh'
      }),
      
      // Compress textures
      textureCompress({
        formats: ['webp'],
        quality: 80,
        resize: [1024, 1024] // Max texture size
      })
    );
    
    // Generate output path
    const outputPath = inputPath.replace(/\.(gltf|glb)$/, '_optimized.$1');
    
    // Write optimized file
    await io.write(outputPath, document);
    
    // Get new file size
    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size / 1024; // KB
    const savings = ((originalSize - newSize) / originalSize * 100);
    
    console.log(`✅ Optimized: ${path.basename(inputPath)}`);
    console.log(`   ${originalSize.toFixed(1)}KB → ${newSize.toFixed(1)}KB (${savings.toFixed(1)}% savings)`);
    console.log(`   Output: ${outputPath}\n`);
    
    return { originalSize, newSize, savings };
    
  } catch (error) {
    console.error(`❌ Failed to optimize ${inputPath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting GLTF optimization...\n');
  
  // Check if required packages are available
  try {
    await import('@gltf-transform/core');
    await import('@gltf-transform/functions');
  } catch (error) {
    console.error('❌ gltf-transform is required for GLTF optimization.');
    console.error('Install it with: npm install @gltf-transform/core @gltf-transform/functions @gltf-transform/cli');
    process.exit(1);
  }
  
  const gltfFiles = await findGLTFFiles(ASSETS_DIR);
  
  if (gltfFiles.length === 0) {
    console.log('No GLTF files found to optimize.');
    return;
  }
  
  console.log(`Found ${gltfFiles.length} GLTF files to process:\n`);
  
  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let successCount = 0;
  
  for (const file of gltfFiles) {
    const result = await optimizeGLTF(file);
    if (result) {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;
      successCount++;
    }
  }
  
  if (successCount > 0) {
    const totalSavings = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100);
    console.log('📊 Optimization Summary:');
    console.log(`   Files processed: ${successCount}/${gltfFiles.length}`);
    console.log(`   Total size: ${totalOriginalSize.toFixed(1)}KB → ${totalNewSize.toFixed(1)}KB`);
    console.log(`   Total savings: ${totalSavings.toFixed(1)}%`);
  }
  
  console.log('\n🎉 GLTF optimization complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Update your code to use the _optimized.gltf files');
  console.log('2. Test that the models load and render correctly');
  console.log('3. Monitor memory usage improvements');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { optimizeGLTF, findGLTFFiles };