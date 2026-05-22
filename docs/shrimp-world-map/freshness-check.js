#!/usr/bin/env node
/**
 * 蝦家班世界地圖 — Freshness Check v1.0
 * 偵測哪些節點/接點超過指定天數未驗證
 * 
 * Usage:
 *   node freshness-check.js              # 預設閾值 (3/7 天)
 *   node freshness-check.js --stale=2    # 2 天以上即標記 Stale
 * 
 * Freshness 等級：
 *   🟢 Fresh:   ≤ 3 天
 *   🟡 Aging:   4-7 天
 *   🔴 Stale:   > 7 天
 *   ⚫ Never:   從未驗證 (null)
 * 
 * Generated: 2026-05-22 by Opus (Antigravity)
 */

const fs = require('fs');
const path = require('path');

const MAP_DIR = __dirname;
const SEED_DATA = path.join(MAP_DIR, 'seed-data.json');

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function freshnessLevel(days, thresholds) {
  if (days === Infinity) return { icon: '⚫', label: 'Never', priority: 0 };
  if (days <= thresholds.fresh) return { icon: '🟢', label: 'Fresh', priority: 3 };
  if (days <= thresholds.aging) return { icon: '🟡', label: 'Aging', priority: 2 };
  return { icon: '🔴', label: 'Stale', priority: 1 };
}

function main() {
  const args = process.argv.slice(2);
  const staleOverride = args.find(a => a.startsWith('--stale='));
  const thresholds = {
    fresh: staleOverride ? parseInt(staleOverride.split('=')[1]) : 3,
    aging: staleOverride ? parseInt(staleOverride.split('=')[1]) * 2 : 7,
  };

  const data = JSON.parse(fs.readFileSync(SEED_DATA, 'utf8'));

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🗺️  蝦家班世界地圖 — Freshness Check v1.0   ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Thresholds: Fresh ≤${thresholds.fresh}d, Aging ≤${thresholds.aging}d, Stale >${thresholds.aging}d`);
  console.log('');

  // ── Entities ──
  console.log('── Entities ──');
  const entityResults = [];
  for (const e of data.entities) {
    const days = daysSince(e.last_verified);
    const level = freshnessLevel(days, thresholds);
    const daysStr = days === Infinity ? 'never' : `${days}d ago`;
    entityResults.push({ ...level, name: e.name, id: e.entity_id, days, status: e.status });
    console.log(`  ${level.icon} ${e.name.padEnd(45)} ${daysStr.padStart(10)}  ${e.status || '?'}`);
  }

  console.log('');

  // ── Transitions (from yaml notes, use last_tested in seed-transitions) ──
  // We'll parse the transitions YAML for last_tested
  console.log('── Transitions ──');
  const transContent = fs.readFileSync(path.join(MAP_DIR, 'seed-transitions.yaml'), 'utf8');
  const transMatches = [...transContent.matchAll(/transition_id:\s*"([^"]+)"[\s\S]*?last_tested:\s*"?([^"\n]+)"?[\s\S]*?test_result:\s*"?([^"\n]+)"?/g)];
  
  const transResults = [];
  for (const m of transMatches) {
    const id = m[1];
    const lastTested = m[2].trim().replace(/"/g, '');
    const result = m[3].trim().replace(/"/g, '');
    const days = lastTested === 'null' ? Infinity : daysSince(lastTested);
    const level = freshnessLevel(days, thresholds);
    const daysStr = days === Infinity ? 'never' : `${days}d ago`;
    const resultIcon = result === 'pass' ? '✅' : result === 'partial' ? '⚠️' : result === 'fail' ? '❌' : '🔲';
    
    transResults.push({ ...level, id, days, result });
    console.log(`  ${level.icon} ${id.padEnd(35)} ${daysStr.padStart(10)}  ${resultIcon} ${result}`);
  }

  // ── Summary ──
  console.log('');
  console.log('── Summary ──');
  
  const allItems = [...entityResults, ...transResults];
  const counts = {
    fresh: allItems.filter(i => i.label === 'Fresh').length,
    aging: allItems.filter(i => i.label === 'Aging').length,
    stale: allItems.filter(i => i.label === 'Stale').length,
    never: allItems.filter(i => i.label === 'Never').length,
  };
  
  console.log(`  🟢 Fresh: ${counts.fresh}  🟡 Aging: ${counts.aging}  🔴 Stale: ${counts.stale}  ⚫ Never: ${counts.never}`);
  
  if (counts.stale > 0 || counts.never > 0) {
    console.log('');
    console.log('── ⚠️ Action Required ──');
    allItems
      .filter(i => i.label === 'Stale' || i.label === 'Never')
      .sort((a, b) => a.priority - b.priority)
      .forEach(i => {
        console.log(`  ${i.icon} ${i.name || i.id} — ${i.days === Infinity ? 'never verified' : i.days + ' days since last check'}`);
      });
  }
  
  // ── Save report ──
  const report = {
    generated: new Date().toISOString(),
    thresholds,
    summary: counts,
    entities: entityResults.map(e => ({ id: e.id, name: e.name, days: e.days, level: e.label, status: e.status })),
    transitions: transResults.map(t => ({ id: t.id, days: t.days, level: t.label, result: t.result })),
  };
  
  const reportPath = path.join(MAP_DIR, 'freshness-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`  📄 Report saved: ${reportPath}`);
}

main();
