#!/usr/bin/env node

/**
 * Script to optimize GLTF/GLB models using gltfjsx
 * Usage: node scripts/optimize-models.js [model-path]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../public/models');
const OUTPUT_DIR = path.join(__dirname, '../src/models');

// Ensure directories exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function optimizeModel(modelPath, options = {}) {
  const {
    typescript = true,
    transform = true,
    simplify = true,
    resolution = 1024,
    format = 'webp',
    shadows = true,
    instance = true
  } = options;

  const fileName = path.basename(modelPath, path.extname(modelPath));
  const outputPath = path.join(OUTPUT_DIR, `${fileName}.tsx`);
  
  console.log(`🔧 Optimizing ${modelPath}...`);
  
  // Build gltfjsx command
  const flags = [
    typescript ? '--types' : '',
    transform ? '--transform' : '',
    simplify ? '--simplify' : '',
    shadows ? '--shadows' : '',
    instance ? '--instance' : '',
    `--resolution ${resolution}`,
    `--format ${format}`,
    `--output ${outputPath}`,
    '--keepnames', // Keep original mesh names for easier debugging
    '--printwidth 100' // Shorter line width for better readability
  ].filter(Boolean).join(' ');

  try {
    const command = `pnpm dlx gltfjsx "${modelPath}" ${flags}`;
    console.log(`Running: ${command}`);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log(`✅ Successfully optimized ${fileName}`);
    console.log(`📂 Output: ${outputPath}`);
    
    // Add our custom optimization annotations
    addOptimizationAnnotations(outputPath);
    
  } catch (error) {
    console.error(`❌ Failed to optimize ${fileName}:`, error.message);
    process.exit(1);
  }
}

function addOptimizationAnnotations(filePath) {
  console.log(`📝 Adding optimization annotations to ${filePath}...`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import for our optimization systems
    const imports = `import { 
  FrustumCullingManager, 
  AssetDisposalManager,
  performanceMonitor 
} from '../engine';
import { useEffect, useRef } from 'react';

`;
    
    // Find the import section and add our imports
    if (content.includes('import')) {
      const lastImportIndex = content.lastIndexOf('import');
      const nextLineIndex = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, nextLineIndex + 1) + '\n' + imports + content.slice(nextLineIndex + 1);
    } else {
      content = imports + content;
    }
    
    // Add optimization props to the main component interface
    const interfaceRegex = /interface\s+(\w+Props)\s*{([^}]*)}/;
    const interfaceMatch = content.match(interfaceRegex);
    
    if (interfaceMatch) {
      const [fullMatch, interfaceName, interfaceBody] = interfaceMatch;
      const newInterfaceBody = interfaceBody + `
  // Optimization props
  cullingManager?: FrustumCullingManager;
  assetDisposalManager?: AssetDisposalManager;
  enableOptimizations?: boolean;`;
      
      const newInterface = `interface ${interfaceName} {${newInterfaceBody}}`;
      content = content.replace(fullMatch, newInterface);
    }
    
    // Add optimization hook
    const optimizationHook = `
  // Optimization setup
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (enableOptimizations && cullingManager && groupRef.current) {
      // Register with culling manager
      cullingManager.addObject(groupRef.current, 'gltf-model-' + Date.now());
      
      // Register with asset disposal manager
      if (assetDisposalManager) {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              assetDisposalManager.registerAsset(
                \`geometry-\${child.name || child.uuid}\`,
                child.geometry,
                'medium'
              );
            }
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((material, index) => {
                assetDisposalManager.registerAsset(
                  \`material-\${child.name || child.uuid}-\${index}\`,
                  material,
                  'medium'
                );
              });
            }
          }
        });
      }
      
      // Touch assets for usage tracking
      performanceMonitor.logStats('GLTF-Model');
    }
  }, [cullingManager, assetDisposalManager, enableOptimizations]);
`;
    
    // Find the component function and add the hook
    const componentRegex = /export default function (\w+)\([^)]*\) {/;
    const componentMatch = content.match(componentRegex);
    
    if (componentMatch) {
      const insertIndex = content.indexOf('{', componentMatch.index) + 1;
      content = content.slice(0, insertIndex) + optimizationHook + content.slice(insertIndex);
    }
    
    // Add ref to the main group
    content = content.replace(
      /<group\s+([^>]*?)>/,
      '<group ref={groupRef} $1>'
    );
    
    // Add "use no memo" directive to prevent React Compiler optimization
    content = `"use no memo";\n\n` + content;
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added optimization annotations`);
    
  } catch (error) {
    console.warn(`⚠️  Failed to add optimization annotations:`, error.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 GLTF Model Optimizer

Usage:
  node scripts/optimize-models.js <model-path> [options]
  node scripts/optimize-models.js public/models/scene.glb
  
Options:
  --no-typescript     Disable TypeScript generation
  --no-transform      Skip web optimization
  --no-simplify       Skip mesh simplification
  --resolution=512    Set texture resolution (default: 1024)
  --format=jpg        Set texture format (default: webp)
  --no-shadows        Disable shadow casting/receiving
  --no-instance       Disable geometry instancing

Examples:
  # Basic optimization
  pnpm optimize:models public/models/scene.glb
  
  # High-performance optimization
  node scripts/optimize-models.js public/models/scene.glb --simplify --resolution=512
  
  # Low-quality for mobile
  node scripts/optimize-models.js public/models/scene.glb --resolution=256 --format=jpg
`);
    return;
  }
  
  const modelPath = args[0];
  
  if (!fs.existsSync(modelPath)) {
    console.error(`❌ Model file not found: ${modelPath}`);
    process.exit(1);
  }
  
  // Parse options
  const options = {};
  args.slice(1).forEach(arg => {
    if (arg === '--no-typescript') options.typescript = false;
    if (arg === '--no-transform') options.transform = false;
    if (arg === '--no-simplify') options.simplify = false;
    if (arg === '--no-shadows') options.shadows = false;
    if (arg === '--no-instance') options.instance = false;
    if (arg.startsWith('--resolution=')) options.resolution = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--format=')) options.format = arg.split('=')[1];
  });
  
  optimizeModel(modelPath, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { optimizeModel };