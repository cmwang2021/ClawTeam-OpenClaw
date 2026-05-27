# Phase B Baseline: Nest 2.0 ClawTeam 現況盤點

本文件記錄 Nest 2.0 (GCP VM `shrimp-nexus-01` / `100.123.6.86`) 上 **ClawTeam** 多代理協調框架與 **OpenClaw** 的現況基礎線 (Baseline) 盤點，做為解決工單 `AG-BRIDGE-PAIN002-B1-v0.1.md` 的技術基石。

---

## 1. 基礎運行環境資訊 (Host & Shell Environment)

* **主機節點**：GCP VM `shrimp-nexus-01` (區域 `us-central1-a`)。
* **網路通訊**：透過 Tailscale 節點 IP `100.123.6.86` 連線，支援 A2A (Agent-to-Agent) 與外部網路通訊。
  > **[B2a 範圍註]** 上述 Tailscale IP 屬 `shrimpclan.ai@` 二代商用網原生成員。另有 `piziwei.wang@` 初代蝦網以 Shared Node 方式可見此節點，但 Shared Node **不代表可達**——詳見 `control-boundary-report.md` §5 四層可達性判定準則。
* **執行用戶**：`shrimpclan_ai` (專屬無頭運行帳號)。
* **環境變數修復**：
  * 已成功於 `/home/shrimpclan_ai/.bashrc` 中追加：
    ```bash
    export GEMINI_CLI_TRUST_WORKSPACE=true
    ```
  * **關鍵修復理由**：解決新版 `google-gemini-cli` 於自動化無頭環境中，因工作目錄未被信任而拒絕執行並掛起的阻礙。此修復確保了 CLI 能夠平滑調用 Gemini 模型。

---

## 2. ClawTeam 協調框架現況 (ClawTeam CLI Baseline)

* **CLI 安裝路徑**：`/home/shrimpclan_ai/bin/clawteam` (已加載至 `shrimpclan_ai` 用戶的 `PATH` 中)。
* **生成後端 (Spawn Backend)**：
  * 預設支援 `tmux` 與 `subprocess`。
  * **當前首選**：`tmux`。所有代理會在專屬的 tmux 會話（例如 `clawteam-{team_name}`）中的獨立視窗內啟動，並自帶完整生命週期鉤子（如 `on-exit` 崩潰自愈、成本申報、以及工作區自動提交）。
* **配置狀態 (`clawteam config show`)**：
  * **資料目錄 (data_dir)**：`/home/shrimpclan_ai/.clawteam`
  * **工作區模式 (workspace)**：`auto` (在 Git 倉庫中自動生成 worktree，本次巡檢 `patrol-test3` 採用目錄直接運行)。
  * **傳輸層 (transport)**：`file` 本地信箱傳輸，穩定可靠。

---

## 3. OpenClaw 代理引擎與模型配置

* **引擎執行檔**：`/home/shrimpclan_ai/.npm-global/bin/openclaw`。
* **全域配置文件**：`/home/shrimpclan_ai/.openclaw/openclaw.json`。
* **模型鏈 (Model Priority Chain)**：
  * **主用模型 (Primary)**：`google-gemini-cli/gemini-3-flash-preview` (透過 Google Cloud Code Assist 憑證 OAuth 進行授權)。
  * **備用模型 (Fallback)**：`9router/combo2` (對接 9Router API Gateway `http://127.0.0.1:20129/`)。
* **當前運行進程**：
  * `openclaw-tui`：代理終端交互介面，顯示實時思維鏈與工具調用。
  * `openclaw-memory-pro`：基於 LanceDB 的長期記憶檢索庫，常駐後端進行語義檢索。
  > **[B2a 架構升級]** 上述為 **OpenClaw-A（宿主機）** 的配置。Nest 2.0 同時存在 **OpenClaw-B（Docker 容器）**，容器 `openclaw-runtime`，gateway port `:18790`（host-mapped from container `:18789`）。兩者共用同一 Tailscale IP 但各自佔用不同 port，形成雙控制面並行架構。詳見 `control-boundary-report.md` §3 Docker 容器隔離邊界。

---

## 4. 當前活動團隊：`patrol-test3` (巡檢測試隊)

* **團隊狀態**：
  * **建立時間**：`2026-04-24T14:23:33+00:00`
  * **成員名單**：
    * `patrol-leader` (隊長)
    * `check-memory` (記憶系統巡檢員)
    * `check-9router` (9Router 系統巡檢員)
    * `check-a2a` (A2A Gateway 巡檢員)
  * **看板狀態**：
    * 擁有四個預設巡檢任務。
    * 當前已成功喚醒並生成 `check-memory` 代理，並進入 Tmux 運作狀態。

---

## 5. B2a 重基線裁定（2026-05-27 三雙架構升級）

> **[B2a 聲明]** 根據 Antigravity Opus 於 2026-05-27 的深度審計，B1 基線需升級為三雙（雙 OpenClaw × 雙 9router × 雙 Tailnet）架構描述。以下為正式重基線裁定。

### 5.1 三層物理基線

| 層次 | 組件 A | 組件 B | 差異 |
|------|--------|--------|------|
| **Runtime Plane** | OpenClaw-A (Host / `shrimpclan_ai` / `:18800`) | OpenClaw-B (Docker / `openclaw-runtime` / `:18790`) | A 負責 ClawTeam 主協調，B 負責獨立任務 |
| **Router Plane** | 9router-A (`:20128` / 官方 Release / Degraded) | 9router-B (`:20129` / 蝦家班魔改 / Healthy) | A 的 codex 帳號已於 2026-05-21 過期；B 具 SHRIMP-HAMMER-9 增強 |
| **Network Plane** | Tailnet `piziwei.wang@` (初代蝦網) | Tailnet `shrimpclan.ai@` (二代商用網) | Nest 2.0 原生於二代網，以 Shared Node 向初代暴露 |

### 5.2 B1 證據邊界聲明

上述 §1-§4 的 B1 原始基線僅覆蓋以下路徑：

* ✅ **宿主機 OpenClaw-A 路徑**：`shrimpclan_ai` 用戶空間的 Gateway、CLI、Memory
* ✅ **宿主機 tmux 隔離**：`clawteam-patrol-test3` 會話
* ✅ **單一 9router 備用路由**：`:20129`（當時未區分 A/B）
* ❌ **未覆蓋**：Docker OpenClaw-B、9router-A (`:20128`)、雙 Tailnet 拓樸、Shared Node 治理規則

### 5.3 B1 過度概括修正

`phase-b-findings-summary.md` §1 原文：
> 「Nest 2.0 上的 ClawTeam 控制平面與 OpenClaw 引擎架構十分穩固」

此結論需降級為：
> 「B1 僅證明了**宿主機 A 路徑**上的 ClawTeam 控制面與 OpenClaw-A 引擎曾成功閉環。此結論不得外推至 Docker 路徑、雙 9router 全貌、或跨 Tailnet 可達性。」
