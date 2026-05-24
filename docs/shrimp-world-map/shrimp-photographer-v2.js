/**
 * 🍤📸 蝦家班 Minecraft 攝影師 v2.0 — 地圖渲染器
 * 
 * 使用 mineflayer 的 block/entity 資料，在 Bot 降臨後即時渲染
 * 一張「鳥瞰地形圖」PNG，無需 node-canvas 或 mineflayer-panorama。
 * 改用 sharp (libvips based, 預編譯二進位) 生成 PNG。
 * 
 * Usage:
 *   node shrimp-photographer-v2.js              # 降臨 + 渲染地圖 + 退出
 *   node shrimp-photographer-v2.js --stay       # 降臨 + 渲染 + 留在世界中
 *   node shrimp-photographer-v2.js --radius 32  # 渲染半徑 (預設 24)
 * 
 * Generated: 2026-05-22 by Opus (Antigravity)
 */

const mineflayer = require('mineflayer')
const { Authflow, Titles } = require('prismarine-auth')
const { RealmAPI } = require('prismarine-realms')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// ─── Config ───
const REALM_NAME = 'ShrimpClan Nexus'
const PLAYER_NAME = 'Piziwei7271'
const profilesFolder = path.join(__dirname, 'mc-auth-cache-java')
const JAVA_PATH = '/usr/bin/java'
const VIAPROXY_DIR = path.join(__dirname, 'viaproxy')
const LOCAL_PORT = 25568
const VIAPROXY_CONFIG = path.join(VIAPROXY_DIR, 'viaproxy.yml')
const VIAPROXY_JAR = path.join(VIAPROXY_DIR, 'ViaProxy-3.4.11.jar')
const PHOTOS_DIR = path.join(__dirname, 'photos')

// ─── Args ───
const args = process.argv.slice(2)
const STAY = args.includes('--stay')
const RADIUS = (() => {
  const idx = args.indexOf('--radius')
  return idx >= 0 ? parseInt(args[idx + 1]) || 24 : 24
})()

// ─── Block color map (Minecraft block → RGB) ───
const BLOCK_COLORS = {
  'grass_block': [124, 189, 60],
  'dirt': [134, 96, 67],
  'stone': [125, 125, 125],
  'cobblestone': [127, 127, 127],
  'sand': [219, 207, 163],
  'gravel': [136, 126, 126],
  'water': [61, 102, 198],
  'lava': [207, 99, 20],
  'oak_log': [109, 85, 50],
  'spruce_log': [58, 37, 16],
  'birch_log': [196, 196, 196],
  'oak_leaves': [59, 120, 21],
  'spruce_leaves': [50, 81, 50],
  'birch_leaves': [80, 132, 56],
  'oak_planks': [162, 130, 78],
  'coal_ore': [105, 105, 105],
  'iron_ore': [136, 130, 126],
  'gold_ore': [143, 140, 125],
  'diamond_ore': [93, 236, 218],
  'bedrock': [85, 85, 85],
  'snow': [249, 254, 254],
  'snow_block': [249, 254, 254],
  'ice': [145, 183, 254],
  'clay': [160, 166, 179],
  'tall_grass': [100, 170, 50],
  'short_grass': [100, 170, 50],
  'dandelion': [255, 255, 0],
  'poppy': [255, 50, 50],
  'air': [135, 206, 235],  // sky blue for air columns
  'cave_air': [30, 30, 30],
  'deepslate': [80, 80, 80],
  'moss_block': [100, 150, 50],
  'andesite': [136, 136, 136],
  'diorite': [180, 180, 180],
  'granite': [153, 114, 99],
}

const DEFAULT_COLOR = [128, 0, 128] // purple for unknown

function getBlockColor(name) {
  return BLOCK_COLORS[name] || DEFAULT_COLOR
}

// ─── Helpers ───
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ─── PPM Image Writer (no native deps!) ───
function writePPM(filepath, width, height, pixels) {
  // PPM P6 binary format — universally readable
  const header = `P6\n${width} ${height}\n255\n`
  const headerBuf = Buffer.from(header, 'ascii')
  const pixelBuf = Buffer.from(pixels) // flat RGB array
  const combined = Buffer.concat([headerBuf, pixelBuf])
  fs.writeFileSync(filepath, combined)
  return combined.length
}

// ─── Render top-down terrain map ───
function renderTerrainMap(bot, radius) {
  const pos = bot.entity.position
  const cx = Math.floor(pos.x)
  const cz = Math.floor(pos.z)
  const size = radius * 2 + 1
  const SCALE = 4 // pixels per block
  const imgW = size * SCALE
  const imgH = size * SCALE
  const pixels = new Uint8Array(imgW * imgH * 3)

  // Fill with sky blue
  for (let i = 0; i < imgW * imgH; i++) {
    pixels[i * 3 + 0] = 135
    pixels[i * 3 + 1] = 206
    pixels[i * 3 + 2] = 235
  }

  let blocksRendered = 0
  const Vec3 = require('vec3').Vec3

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const bx = cx + dx
      const bz = cz + dz

      // Find the highest non-air block (top-down view)
      // Scan from world height limit down
      let topBlock = null
      const maxY = Math.min(320, Math.floor(pos.y) + 40)
      const minY = Math.max(-64, Math.floor(pos.y) - 40)
      for (let by = maxY; by >= minY; by--) {
        try {
          const block = bot.blockAt(new Vec3(bx, by, bz))
          if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
            topBlock = block
            break
          }
        } catch (e) { }
      }

      const px = (dx + radius) * SCALE
      const pz = (dz + radius) * SCALE

      if (topBlock) {
        blocksRendered++
        let [r, g, b] = getBlockColor(topBlock.name)

        // Height-based shading for depth effect
        const heightFactor = Math.max(0, Math.min(1, (topBlock.position.y - (pos.y - 40)) / 80))
        const shade = 0.5 + heightFactor * 0.5
        r = Math.min(255, Math.floor(r * shade))
        g = Math.min(255, Math.floor(g * shade))
        b = Math.min(255, Math.floor(b * shade))

        // Draw scaled pixel
        for (let sy = 0; sy < SCALE; sy++) {
          for (let sx = 0; sx < SCALE; sx++) {
            const idx = ((pz + sy) * imgW + (px + sx)) * 3
            pixels[idx + 0] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
          }
        }
      }
    }
  }


  // Draw player marker (red cross at center)
  const centerPx = radius * SCALE + SCALE / 2
  for (let d = -3; d <= 3; d++) {
    for (let t = -1; t <= 1; t++) {
      // Horizontal
      const hIdx = ((centerPx + t) * imgW + (centerPx + d)) * 3
      pixels[hIdx] = 255; pixels[hIdx + 1] = 0; pixels[hIdx + 2] = 0
      // Vertical
      const vIdx = ((centerPx + d) * imgW + (centerPx + t)) * 3
      pixels[vIdx] = 255; pixels[vIdx + 1] = 0; pixels[vIdx + 2] = 0
    }
  }

  return { imgW, imgH, pixels, blocksRendered }
}

// ─── Main ───
async function launch() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  🍤📸 蝦家班 Minecraft 攝影師 v2.0           ║')
  console.log('║  (鳥瞰地形渲染模式 — 無需 native deps)       ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`  Radius: ${RADIUS} blocks | Stay: ${STAY}\n`)

  ensureDir(PHOTOS_DIR)

  // === Phase 1: Realm IP ===
  console.log('📡 Phase 1: 取得 Realm 動態 IP...')
  const flow = new Authflow(PLAYER_NAME, profilesFolder, {
    onMsaCode: (data) => {
      console.log(`\n⚠️  認證: ${data.verification_uri} → 代碼: ${data.user_code}\n`)
    },
    flow: 'live',
    authTitle: Titles.MinecraftNintendoSwitch
  })

  let realmHost, realmPort
  try {
    const api = RealmAPI.from(flow, 'java')
    const realms = await api.getRealms()
    const target = realms.find(r => r.name === REALM_NAME)
    if (!target) { console.error('❌ Realm 不存在'); return }
    const address = await target.getAddress()
    realmHost = address.host
    realmPort = address.port
    console.log(`✅ ${target.name} → ${realmHost}:${realmPort}\n`)
  } catch (err) {
    console.error('💥 Realms API:', err.message); return
  }

  // === Phase 2: ViaProxy Config ===
  console.log('🔧 Phase 2: 更新 ViaProxy 設定...')
  let config = fs.readFileSync(VIAPROXY_CONFIG, 'utf-8')
  config = config.replace(/target-address: .*/, `target-address: ${realmHost}:${realmPort}`)
  config = config.replace(/target-version: .*/, 'target-version: "26.1.2"')
  config = config.replace(/auth-method: .*/, 'auth-method: ACCOUNT')
  config = config.replace(/proxy-online-mode: .*/, 'proxy-online-mode: false')
  config = config.replace(/bind-address: .*/, `bind-address: 127.0.0.1:${LOCAL_PORT}`)
  fs.writeFileSync(VIAPROXY_CONFIG, config)
  console.log('   ✅ viaproxy.yml 已更新\n')

  // === Phase 3: Start ViaProxy ===
  console.log('🚀 Phase 3: 啟動 ViaProxy...')
  const savesPath = path.join(VIAPROXY_DIR, 'saves.json')
  const hasAccount = fs.existsSync(savesPath) && (() => {
    try {
      const saves = JSON.parse(fs.readFileSync(savesPath, 'utf-8'))
      const accts = saves.accountsV4 || saves.accounts
      return accts && accts.length > 0
    } catch { return false }
  })()

  if (!hasAccount) {
    console.error('❌ 未找到已認證帳號！請先執行 final_launch_v5b.js 完成認證。')
    return
  }

  const viaProxyProc = await new Promise((resolve, reject) => {
    const proc = spawn(JAVA_PATH, ['-jar', VIAPROXY_JAR, 'cli'], { cwd: VIAPROXY_DIR })
    let started = false
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('ViaProxy 啟動超時'))
    }, 30000)

    proc.stdout.on('data', (data) => {
      const line = data.toString().trim()
      if (line) console.log('   [VP]', line)
      if (line.includes('started successfully')) {
        started = true
        clearTimeout(timeout)
        setTimeout(() => resolve(proc), 1500)
      }
    })
    proc.stderr.on('data', (data) => console.log('   [VP ERR]', data.toString().trim()))
    proc.on('close', (code) => { if (!started) { clearTimeout(timeout); reject(new Error(`exit: ${code}`)) } })
  })

  console.log('✅ ViaProxy 已就緒\n')

  // === Phase 4: Bot + Render ===
  console.log('🤖 Phase 4: 建立 Bot 連線...')

  const bot = mineflayer.createBot({
    host: '127.0.0.1',
    port: LOCAL_PORT,
    username: 'Piziwei',
    auth: 'offline',
    version: '1.21.11',
    checkTimeoutInterval: 60000,
  })

  bot.once('spawn', async () => {
    console.log('\n🎉 Piziwei 已成功降臨！')
    console.log(`📍 座標: ${bot.entity.position}`)
    bot.chat('🍤📸 蝦家班攝影師 v2.0 報到！')

    console.log('\n⏳ 等待區塊載入...')
    await bot.waitForChunksToLoad()
    // Give extra time for blocks to fully load
    await new Promise(r => setTimeout(r, 3000))
    console.log('✅ 區塊載入完成\n')

    // === Render terrain map ===
    console.log(`🎨 渲染鳥瞰地形圖 (半徑 ${RADIUS} 方塊)...`)
    const ts = timestamp()
    const { imgW, imgH, pixels, blocksRendered } = renderTerrainMap(bot, RADIUS)

    const filename = `shrimp-terrain-${ts}.ppm`
    const filepath = path.join(PHOTOS_DIR, filename)
    const filesize = writePPM(filepath, imgW, imgH, pixels)

    console.log(`   ✅ 鳥瞰圖已保存: ${filepath}`)
    console.log(`   📐 尺寸: ${imgW}×${imgH}px | 渲染方塊: ${blocksRendered}`)
    console.log(`   📄 大小: ${(filesize / 1024).toFixed(1)} KB`)

    // Also save JSON snapshot
    const pos = bot.entity.position
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: 'photographer-v2.0',
      position: { x: pos.x.toFixed(1), y: pos.y.toFixed(1), z: pos.z.toFixed(1) },
      render: {
        radius: RADIUS,
        image_file: filename,
        image_size: `${imgW}x${imgH}`,
        blocks_rendered: blocksRendered,
        format: 'PPM (P6)',
      },
      health: bot.health,
      food: bot.food,
      time: bot.time.timeOfDay,
      weather: bot.isRaining ? 'rain' : 'clear',
      players: Object.keys(bot.players),
    }

    const jsonPath = path.join(PHOTOS_DIR, `shrimp-terrain-${ts}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2))
    console.log(`   📋 元資料: ${jsonPath}`)

    bot.chat(`📸 鳥瞰地形圖已拍攝！ ${imgW}×${imgH}px, ${blocksRendered} blocks`)

    console.log(`\n🎉 拍攝完成！`)

    if (!STAY) {
      console.log('👋 任務完成，5 秒後離開...')
      bot.chat('📸 攝影師 v2.0 任務完成，告退！')
      setTimeout(() => {
        bot.quit()
        if (viaProxyProc && !viaProxyProc.killed) viaProxyProc.kill('SIGINT')
        process.exit(0)
      }, 5000)
    } else {
      console.log('📸 攝影師留守中... (Ctrl+C 退出)')
    }
  })

  bot.on('error', (err) => console.log('⚠️ Bot:', err.message))
  bot.on('kicked', (reason) => console.log('❌ Kicked:', reason))
  bot.on('end', (reason) => {
    console.log('🔌 End:', reason)
    if (viaProxyProc && !viaProxyProc.killed) viaProxyProc.kill('SIGINT')
  })

  process.on('SIGINT', () => {
    bot.quit()
    if (viaProxyProc && !viaProxyProc.killed) viaProxyProc.kill('SIGINT')
    process.exit(0)
  })
}

launch()
