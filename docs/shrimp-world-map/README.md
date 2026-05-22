# 🗺️ Shrimp World Map — 蝦家班世界地圖

> **AI Agent 專用的行動底圖** — 以接點（Junction Points）為座標，以證據（Evidence）為貨幣

## 設計理念

**沒有精確接點，一切皆為幻覺。**

這份地圖不是視覺展示品，而是一份讓 AI Agent 能自主導航的**可執行底圖**。
每個位置都綁定了進入指令、權限限制和驗證方式，不接受模糊描述。

## 三層架構

```
┌─────────────────────────────────────────────┐
│  Transition Layer  (誰從哪到哪，留下什麼證據)    │
├─────────────────────────────────────────────┤
│  Junction Layer    (怎麼進出，需要什麼認證)      │
├─────────────────────────────────────────────┤
│  Entity Layer      (誰存在，在哪個世界)          │
└─────────────────────────────────────────────┘
```

## 檔案結構

```
shrimp-world-map/
├── README.md                  ← 本文件
├── world-map-schema.json      ← 五張核心表的 JSON Schema 定義
├── seed-data.json             ← 已驗證的實體、世界、接點、能力
├── seed-transitions.yaml      ← 11 條路徑演練用例 (T1-T11)
├── playground-assets.json     ← Playground 資產分類索引 (33 assets / 9 categories)
├── world-map-test.js          ← Regression Suite — 一鍵自動化測試
├── freshness-check.js         ← Freshness 機制 — 節點過期偵測
├── test-report.json           ← 自動產出的測試報告
├── freshness-report.json      ← 自動產出的新鮮度報告
└── world-map-probe.sh         ← T4 產出的系統探針腳本
```

## 資產庫 (Playground)

Playground 是蝦家班與協作 Agent (Opus, Perplexity, Flash, Claude Code) 的**核心軍火庫**。
完整索引見 `playground-assets.json`，每個資產都標有 `use_when` 欄位：

| 類別 | 數量 | 代表資產 |
|:--|:--|:--|
| 🏗️ 基礎設施與路由 | 4 | 9Router, Vertex AI 工具 |
| 🦞 OpenClaw 生態系 | 4 | ClawTeam-OpenClaw, A2A Gateway |
| 💰 One Dollar 產品線 | 4 | JSONGuard, Shrimp HUD |
| 🛠️ Agent 技能庫 | 6 (共26) | firebase-connect, sandbox-audit, qa-testing |
| ⚙️ 運維與腳本 | 4 | claw-radar.js, key_manager.py |
| 📚 知識與研究 | 5 | OpenSpec (OSDA), AI Recall PoC |
| 🎮 Minecraft 專區 | 2 | SPEC-MC-001, World Map |
| 🔧 Gemini CLI 工具 | 2 | shrimp-gemini-cli (蝦小刀) |
| 🧪 實驗區 | 2 | SHRIMP-HAMMER-9, ticket-nexus |

## 驗證狀態 (Flash 實測 — 2026-05-22)

| Transition | 描述 | 狀態 | 修正紀錄 |
|:--|:--|:--|:--|
| T1 | Opus → SSH → shrimp-nexus-01 | ✅ Pass | — |
| T2 | nexus-01 → Docker exec → openclaw-runtime | ✅ Pass | 路徑修正 `/root/` → `/home/user/` |
| T3 | Tailscale 網路拓撲掃描 | ✅ Pass | — |
| T4 | 完整任務循環 (寫腳本+回傳) | ✅ Pass | 採 scp 上傳方式避開 PowerShell 衝突 |
| T5 | Minecraft 認證管道探測 | ✅ Pass | 定位 `viaproxy/saves.json` (14.7KB MSA Token) |
| T6 | Git Sync 接點探測 | ✅ Pass | Repo = `ClawTeam-OpenClaw` (非 shrimpclan-ark) |
| T7 | Firebase Studio (abai-01) 可達性 | ✅ Pass | P2P 直連 (35.221.236.71:8480) |

## 關鍵發現

1. **容器名稱修正**: 正確名稱是 `openclaw-runtime` 而非 `openclaw-xiaren`
2. **雙 tailnet 架構**: 主網 `piziwei.wang@` + 實驗網 `shrimpclan.ai@`，透過 Shared Node 互通
3. **UID 影子帳號**: SSH 以 `ubuntu` 登入，落地為 `user` (UID:1000)，與 Firebase Studio NIX Workspace 保持環境一致
4. **母艦健康**: uptime 27 天，磁碟 /dev/root 59%、/mnt/shrimp-data 49%

## 角色分工

| 角色 | 職責 |
|:--|:--|
| 🔭 **探長** | 世界規則制定者，決策與審批 |
| 🎯 **Opus** | 實作型探路者，接線與腳本 |
| ⚡ **Flash** | 路徑演練者，模擬 Agent 移動 |
| 📊 **蝦皮總監** | 藍圖與治理層，Schema 設計 |

## 軍規

1. **一切以接點為座標，不以敘事為座標**
2. **一切移動都要留下證據，不接受口頭完成**
3. **一切世界都可被納入，但必須先定義 world type、entry method 與 fallback**
