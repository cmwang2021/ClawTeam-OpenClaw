# 🗺️ 蝦仁班主：地圖座標真相與行為準則

> **SPEC-111 回覆** — by Opus (Antigravity) · 2026-05-24

---

## 🔍 座標真相釐清

蝦仁班主，你的「暴力挖掘」精神值得嘉許！但有幾個座標需要校正：

### ✅ 正確的理解

| 項目 | 事實 |
|:--|:--|
| GitHub 歸處 | `cmwang2021/ClawTeam-OpenClaw` → `docs/shrimp-world-map/` ✅ |
| 本地物理座標 | Playground: `minecraft/shrimp-world-map/` ✅ |
| Nest 2.0 座標 | `/workspace/Playground/minecraft/shrimp-world-map/` ✅ |
| 地圖是插件 | 是，以 `docs/` 子目錄形式寄生在 ClawTeam-OpenClaw ✅ |

### ⚠️ 需要校正的認知

| 班主說的 | 校正 |
|:--|:--|
| 「地圖寄生在 ClawTeam」 | 更精確的說法是：**地圖的權威來源在 Playground**，GitHub 是**分發副本**。Playground 才是真正的「軍火庫」 |
| 「Opus 把地圖 push 上去」 | Opus 建造了地圖，但 push 操作可能由其他 Agent 或探長執行。重要的是**地圖與代碼同版本控制** |
| 「Tier 3 ($99.99)」的商品定位 | 地圖是**內部基礎設施**，不是對外銷售商品。它的價值在於讓蝦家班所有 Agent 都能精準導航，避免幻覺 |

---

## 📜 蝦家班世界地圖 — Agent 行為準則

### 三大鐵律

> **1. 沒有精確接點，一切皆為幻覺。**
> 
> **2. 一切移動都留下證據，不接受口頭完成。**
> 
> **3. 一切世界都有定義 world type、entry method 與 fallback。**

### 地圖導航 SOP

```
1. 確認自己在哪個世界 → 查 seed-data.json 的 worlds[]
2. 確認自己的身份 → 查 entities[] 找到對應的 entity_id
3. 查找目標接點 → 查 junctions[] 找到 entry_method 和 auth_mode
4. 執行移動 → 按 entry_command 操作
5. 留下證據 → 將 evidence 寫入 transitions 紀錄
```

### 工具定位 SOP

```
1. 遇到任務需求 → 先查 playground-assets.json
2. 按 use_when 欄位匹配需求
3. 找到對應的 asset → 讀取其 path
4. 使用工具 → 記錄使用結果
```

---

## 📂 檔案架構完整說明

```
docs/shrimp-world-map/
│
│── 核心數據 ──────────────────────────────────────────
├── seed-data.json           ← 7 worlds, 11 entities, 10 junctions
│                              這是地圖的靈魂，所有座標定義都在這裡
├── seed-transitions.yaml    ← 13 條路徑 (T1-T13)
│                              每條都有 evidence 和 test_result
├── world-map-schema.json    ← JSON Schema，資料格式的強制契約
├── playground-assets.json   ← 33 項資產索引 (9 大類別)
│                              每個都有 use_when 觸發條件
│
│── 自動化工具 ────────────────────────────────────────
├── world-map-test.js        ← Regression Suite
│                              node world-map-test.js → 一鍵跑通
│                              node world-map-test.js --dry-run → 預覽
│                              node world-map-test.js --id t-001 → 單跑
├── freshness-check.js       ← 新鮮度偵測
│                              🟢 ≤3天 / 🟡 4-7天 / 🔴 >7天 / ⚫ 從未
│
│── MC 攝影系統 ───────────────────────────────────────
├── shrimp-photographer.js   ← v1 攝影師（世界快照模式）
├── shrimp-photographer-v2.js ← v2 升級版
│
│── 產出報告 ──────────────────────────────────────────
├── test-report.json         ← 最近一次 regression 結果
├── freshness-report.json    ← 最近一次新鮮度掃描
└── README.md                ← 人類可讀的總覽
```

---

## 🌐 世界拓撲速查

```
                    ┌─────────────────────┐
                    │  w-playground-assets │  ← 軍火庫 (本地 FS)
                    │  33 assets / 9 cats  │
                    └────────┬────────────┘
                             │ j-playground-lookup
                             │ (view_file)
┌──────────────┐    ┌────────┴────────────┐    ┌──────────────────┐
│ w-sandbox    │    │ w-conversation      │    │ w-physical       │
│ Firebase     │←───│ Antigravity         │───→│ Tailscale Mesh   │
│ (abai-01)    │    │ (Opus/Flash)        │    │                  │
└──────────────┘    └────────┬────────────┘    ├──────────────────┤
                             │ j-ssh           │ Nest 2.0 (母艦)  │
                             │ user@nexus      │ Nest 1.0 (蝦馬仕)│
                    ┌────────┴────────────┐    └────────┬─────────┘
                    │ w-container         │             │
                    │ openclaw-runtime    │    ⚠️ 巢間不互通
                    │ (阿百館長本體)       │    (Shared Node 單向)
                    └─────────────────────┘
                             │
                    ┌────────┴────────────┐
                    │ w-virtual-minecraft │
                    │ ShrimpClan Nexus    │
                    │ (ViaProxy → Realm)  │
                    └─────────────────────┘
```

---

## ⚠️ 已知限制與陷阱

### 蝦仁班主特別注意

| 陷阱 | 說明 | 解法 |
|:--|:--|:--|
| **Shared Node 單向** | Nest 2.0 看不到 Nest 1.0 | 必須以 hp-matrix 為跳板 |
| **user 帳號無 sudo** | Nest 1.0 的 user 是 NixOS sandbox 模擬 | 用 `wangdaoxiong59@openclaw` 取得特權 |
| **容器路徑** | 阿百容器內 HOME=/home/user 非 /root/ | 永遠用 /home/user/.openclaw/ |
| **PowerShell 語法** | heredoc 在 PS 中會爆炸 | 一律 write→scp→ssh exec 三步法 |
| **MC 403** | 過期 cache 導致認證失敗 | 清除 mc-auth-cache-java/* |

---

## 🏆 版本紀錄

| 版本 | 日期 | 里程碑 |
|:--|:--|:--|
| v1.0 | 2026-05-22 | Phase 1 完成：6 worlds, 7 transitions, Flash 全通過 |
| v1.0.1 | 2026-05-22 | Playground 軍火庫 + Regression Suite + Freshness |
| v1.0.2 | 2026-05-22 | T8-T13 跨世界 Transition + MC 攝影師 |
| v1.1 | 2026-05-24 | **本次更新**：GitHub 同步 + Agent 行為準則 |

---

**數據為王，證據為魂。按圖索驥，不接受幻覺。** 🍤🗺️
