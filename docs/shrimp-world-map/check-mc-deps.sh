#!/bin/bash
# check-mc-deps.sh — Verify Minecraft photography pipeline readiness on Nest 2.0

echo "═══ 蝦家班攝影管道環境檢查 ═══"
echo ""

# 1. Node.js version
echo "── Node.js ──"
node --version 2>/dev/null || echo "❌ Node.js not found"
echo ""

# 2. Check key npm modules
echo "── Node Modules ──"
cd /workspace/projects/shrimp-mc-agent/final-build
for mod in mineflayer prismarine-auth prismarine-realms; do
  if node -e "require.resolve('$mod')" 2>/dev/null; then
    echo "✅ $mod"
  else
    echo "❌ $mod (missing)"
  fi
done
echo ""

# 3. Check optional panorama module
echo "── Optional: mineflayer-panorama ──"
if node -e "require.resolve('mineflayer-panorama')" 2>/dev/null; then
  echo "✅ mineflayer-panorama (JPEG panorama enabled)"
else
  echo "⚠️  mineflayer-panorama not installed (will use JSON snapshot fallback)"
fi
echo ""

# 4. ViaProxy
echo "── ViaProxy ──"
VIAPROXY_JAR="./viaproxy/ViaProxy-3.4.11.jar"
if [ -f "$VIAPROXY_JAR" ]; then
  echo "✅ ViaProxy JAR: $(ls -lh $VIAPROXY_JAR | awk '{print $5}')"
else
  echo "❌ ViaProxy JAR not found at $VIAPROXY_JAR"
fi

SAVES="./viaproxy/saves.json"
if [ -f "$SAVES" ]; then
  SIZE=$(stat -c%s "$SAVES")
  if [ "$SIZE" -gt 100 ]; then
    echo "✅ saves.json: ${SIZE}B (authenticated)"
  else
    echo "⚠️  saves.json: ${SIZE}B (too small, may need re-auth)"
  fi
else
  echo "❌ saves.json not found"
fi
echo ""

# 5. Java
echo "── Java ──"
java -version 2>&1 | head -1 || echo "❌ Java not found"
echo ""

# 6. Photographer script
echo "── Photographer ──"
if [ -f "./shrimp-photographer.js" ]; then
  echo "✅ shrimp-photographer.js: $(stat -c%s ./shrimp-photographer.js)B"
else
  echo "❌ shrimp-photographer.js not found"
fi
echo ""

# 7. Photos directory
echo "── Photos Dir ──"
if [ -d "./photos" ]; then
  COUNT=$(ls -1 ./photos/ 2>/dev/null | wc -l)
  echo "✅ photos/ exists ($COUNT files)"
else
  echo "ℹ️  photos/ will be created on first run"
fi

echo ""
echo "═══ 檢查完成 ═══"
