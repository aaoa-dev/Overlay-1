#!/usr/bin/env node

/**
 * Generate Preview Placeholder Script
 * 
 * This script creates placeholder SVG files for widget previews.
 * These can be replaced with actual screenshots later.
 * 
 * Usage: node scripts/generate-preview-placeholders.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OVERLAYS = [
  { id: 'chat', title: 'Modern Chat', icon: '💬' },
  { id: 'thermal', title: 'Thermal Receipt', icon: '🧾' },
  { id: 'alerts', title: 'Smart Alerts', icon: '🔔' },
  { id: 'chatters', title: 'Active Bubbles', icon: '👥' },
  { id: 'signature', title: 'Signature Alerts', icon: '✍️' },
  { id: 'cursor-welcome', title: 'Cursor Welcome', icon: '🖱️' },
  { id: 'polaroid-alerts', title: 'Polaroid Alerts', icon: '📷' },
  { id: 'followers', title: 'Follower Goal', icon: '📈' },
  { id: 'subscribers', title: 'Sub Counter', icon: '❤️' },
  { id: 'custom-goal', title: 'Custom Goal', icon: '🚩' },
  { id: 'timer', title: 'Stream Timer', icon: '⏱️' },
  { id: 'sound-board', title: 'Sound Board', icon: '🔊' },
  { id: 'backgrounds', title: 'Animated Backgrounds', icon: '🎨' },
  { id: 'mesh-gradient', title: 'Reactive Mesh', icon: '🌊' },
  { id: 'sticker', title: 'Sticker Overlay', icon: '🎯' },
  { id: 'lower-third', title: 'Lower Third', icon: '📺' },
];

function generateSVGPlaceholder(overlay) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${overlay.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1280" height="720" fill="#0a0a0a"/>
  <rect width="1280" height="720" fill="url(#grad-${overlay.id})"/>
  
  <!-- Icon Circle -->
  <circle cx="640" cy="300" r="80" fill="#8b5cf6" opacity="0.2"/>
  
  <!-- Icon Text -->
  <text x="640" y="330" font-family="Arial, sans-serif" font-size="80" fill="#8b5cf6" text-anchor="middle">${overlay.icon}</text>
  
  <!-- Title -->
  <text x="640" y="450" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">${overlay.title}</text>
  
  <!-- Subtitle -->
  <text x="640" y="500" font-family="Arial, sans-serif" font-size="24" fill="#a0a0a0" text-anchor="middle">Preview Placeholder</text>
  
  <!-- Instructions -->
  <text x="640" y="580" font-family="Arial, sans-serif" font-size="18" fill="#666666" text-anchor="middle">Replace this with an actual screenshot</text>
  <text x="640" y="610" font-family="Arial, sans-serif" font-size="18" fill="#666666" text-anchor="middle">See PREVIEW_IMAGES_GUIDE.md for instructions</text>
</svg>`;
}

function main() {
  const previewsDir = resolve(__dirname, '../previews');
  
  // Create previews directory if it doesn't exist
  if (!existsSync(previewsDir)) {
    mkdirSync(previewsDir, { recursive: true });
    console.log('✅ Created previews directory');
  }
  
  let created = 0;
  let skipped = 0;
  
  OVERLAYS.forEach(overlay => {
    const svgPath = resolve(previewsDir, `${overlay.id}.svg`);
    const pngPath = resolve(previewsDir, `${overlay.id}.png`);
    
    // Only create if neither SVG nor PNG exists
    if (!existsSync(svgPath) && !existsSync(pngPath)) {
      const svg = generateSVGPlaceholder(overlay);
      writeFileSync(svgPath, svg);
      console.log(`✅ Created placeholder: ${overlay.id}.svg`);
      created++;
    } else {
      console.log(`⏭️  Skipped (already exists): ${overlay.id}`);
      skipped++;
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${OVERLAYS.length}`);
  
  if (created > 0) {
    console.log('\n💡 Note: SVG placeholders were created. For better quality:');
    console.log('   1. Take screenshots of actual widgets');
    console.log('   2. Save as PNG files (1280x720 or 1920x1080)');
    console.log('   3. Replace the SVG files with PNG files');
    console.log('   4. See PREVIEW_IMAGES_GUIDE.md for detailed instructions');
  }
}

main();

