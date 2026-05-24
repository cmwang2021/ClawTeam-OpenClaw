#!/usr/bin/env node
// test-canvas.js — Verify canvas module works on Nest 2.0
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const cv = createCanvas(200, 200);
const ctx = cv.getContext('2d');

// Draw a simple test pattern
ctx.fillStyle = '#0d1117';
ctx.fillRect(0, 0, 200, 200);

ctx.fillStyle = '#ff6b35';
ctx.font = 'bold 24px sans-serif';
ctx.fillText('🍤 Canvas', 20, 50);
ctx.fillText('Works!', 20, 90);

ctx.strokeStyle = '#58a6ff';
ctx.lineWidth = 3;
ctx.strokeRect(10, 10, 180, 180);

const buf = cv.toBuffer('image/png');
const outPath = path.join(__dirname, 'photos', 'canvas-test.png');
fs.writeFileSync(outPath, buf);
console.log(`✅ Canvas test passed! PNG saved: ${outPath} (${buf.length} bytes)`);
