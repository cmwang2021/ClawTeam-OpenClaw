# Phase B Baseline: Nest 2.0 ClawTeam 現況盤點

本文件記錄 Nest 2.0 (GCP VM `shrimp-nexus-01` / `100.123.6.86`) 上 **ClawTeam** 多代理協調框架與 **OpenClaw** 的現況基礎線 (Baseline) 盤點，做為解決工單 `AG-BRIDGE-PAIN002-B1-v0.1.md` 的技術基石。

---

## 1. 基礎運行環境資訊 (Host & Shell Environment)

* **主機節點**：GCP VM `shrimp-nexus-01` (區域 `us-central1-a`)。
* **網路通訊**：透過 Tailscale 節點 IP `100.123.6.86` 連線，支援 A2A (Agent-to-Agent) 與外部網路通訊。
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
