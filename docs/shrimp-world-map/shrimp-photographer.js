/**
 * 🍤📸 蝦家班 Minecraft 攝影師 v1.0 (Shrimp Photographer)
 * 
 * 基於 final_launch_v5b.js 的連線架構，加入 mineflayer-panorama 拍照能力。
 * Bot 降臨後自動拍攝全景照片，保存到 photos/ 目錄。
 * 
 * Usage:
 *   node shrimp-photographer.js              # 降臨 + 拍照 + 退出
 *   node shrimp-photographer.js --stay       # 降臨 + 拍照 + 留在世界中
 *   node shrimp-photographer.js --count 3    # 拍 3 張照片（不同方向）
 * 
 * Generated: 2026-05-22 by Opus (Antigravity)
 * For: 蝦家班世界地圖 T13
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
const JAVA_PATH = '/usr/bin/java' // Nest 2.0 Linux
const VIAPROXY_DIR = path.join(__dirname, 'viaproxy')
const LOCAL_PORT = 25568
const VIAPROXY_CONFIG = path.join(VIAPROXY_DIR, 'viaproxy.yml')
const VIAPROXY_JAR = path.join(VIAPROXY_DIR, 'ViaProxy-3.4.11.jar')
const PHOTOS_DIR = path.join(__dirname, 'photos')

// ─── Args ───
const args = process.argv.slice(2)
const STAY = args.includes('--stay')
const PHOTO_COUNT = (() => {
  const idx = args.indexOf('--count')
  return idx >= 0 ? parseInt(args[idx + 1]) || 1 : 1
})()

// ─── Helpers ───
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ─── Main ───
async function launch() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  🍤📸 蝦家班 Minecraft 攝影師 v1.0           ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log(`  Photos: ${PHOTO_COUNT} | Stay: ${STAY}\n`)

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

  // Check saves.json
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

  // === Phase 4: Bot + Camera ===
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
    bot.chat('🍤📸 蝦家班攝影師報到！')

    // Wait for chunks to load
    console.log('\n⏳ 等待區塊載入...')
    await bot.waitForChunksToLoad()
    console.log('✅ 區塊載入完成\n')

    // Try to load panorama plugin
    let hasPanorama = false
    try {
      const panorama = require('mineflayer-panorama')
      bot.loadPlugin(panorama.image)
      hasPanorama = true
      console.log('📸 mineflayer-panorama 載入成功')
    } catch (e) {
      console.log('⚠️ mineflayer-panorama 未安裝，使用替代方案...')
    }

    // Take photos
    for (let i = 0; i < PHOTO_COUNT; i++) {
      const filename = `shrimp-${timestamp()}-${i + 1}`
      console.log(`\n📸 拍攝 ${i + 1}/${PHOTO_COUNT}: ${filename}`)

      if (hasPanorama) {
        try {
          // Wait for camera ready event
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Camera timeout')), 10000)
            bot.once('camera_ready', () => { clearTimeout(timeout); resolve() })
          })

          const imageStream = await bot.panoramaImage.takePanoramaPictures()
          const filePath = path.join(PHOTOS_DIR, `${filename}.jpeg`)
          const writeStream = fs.createWriteStream(filePath)
          imageStream.pipe(writeStream)
          
          await new Promise((resolve) => writeStream.on('finish', resolve))
          
          const size = fs.statSync(filePath).size
          console.log(`   ✅ 已保存: ${filePath} (${(size / 1024).toFixed(1)} KB)`)
          bot.chat(`📸 照片 ${i + 1} 已拍攝！(${(size / 1024).toFixed(1)} KB)`)
        } catch (e) {
          console.log(`   ❌ 拍照失敗: ${e.message}`)
        }
      } else {
        // Fallback: capture world state snapshot
        const pos = bot.entity.position
        const snapshot = {
          timestamp: new Date().toISOString(),
          position: { x: pos.x.toFixed(1), y: pos.y.toFixed(1), z: pos.z.toFixed(1) },
          yaw: bot.entity.yaw.toFixed(2),
          pitch: bot.entity.pitch.toFixed(2),
          health: bot.health,
          food: bot.food,
          time: bot.time.timeOfDay,
          weather: bot.isRaining ? 'rain' : 'clear',
          biome: bot.world.getBiome(pos) || 'unknown',
          players_online: Object.keys(bot.players).length,
          players: Object.keys(bot.players),
          nearby_entities: Object.values(bot.entities)
            .filter(e => e !== bot.entity && e.position.distanceTo(pos) < 32)
            .map(e => ({
              type: e.type,
              name: e.displayName || e.name || 'unknown',
              distance: e.position.distanceTo(pos).toFixed(1),
            }))
            .slice(0, 20),
          nearby_blocks: (() => {
            const blocks = {}
            for (let dx = -4; dx <= 4; dx++) {
              for (let dz = -4; dz <= 4; dz++) {
                const block = bot.blockAt(pos.offset(dx, -1, dz))
                if (block) {
                  blocks[block.name] = (blocks[block.name] || 0) + 1
                }
              }
            }
            return blocks
          })(),
        }

        const filePath = path.join(PHOTOS_DIR, `${filename}.json`)
        fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))
        const size = fs.statSync(filePath).size
        console.log(`   ✅ 世界快照已保存: ${filePath} (${(size / 1024).toFixed(1)} KB)`)
        console.log(`   📍 ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)} | ❤️ ${bot.health} | 🕐 ${bot.time.timeOfDay}`)
        console.log(`   👥 線上: ${snapshot.players.join(', ') || 'none'}`)
        bot.chat(`📸 世界快照 ${i + 1} 已記錄！`)
      }

      // Rotate view for next shot
      if (i < PHOTO_COUNT - 1) {
        const newYaw = bot.entity.yaw + (Math.PI * 2 / PHOTO_COUNT)
        await bot.look(newYaw, 0, true)
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    console.log(`\n🎉 拍攝完成！共 ${PHOTO_COUNT} 張照片存於: ${PHOTOS_DIR}`)

    if (!STAY) {
      console.log('👋 任務完成，5 秒後離開...')
      bot.chat('📸 拍攝完成，蝦家班攝影師告退！')
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
