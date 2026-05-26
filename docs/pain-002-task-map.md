# PAIN-002 Task Map: 四缺口對應任務拆解

本文件針對 `AG-BRIDGE-PAIN002-B1-v0.1.md` 工單中所指出的四大技術缺口 (Gaps) 進行深度剖析，並拆解出對應的解決方案與任務路徑。

---

## 缺口一：`clawteam spawn` 後端參數解析衝突

### 1. 缺口描述
* 在執行 `clawteam spawn -t patrol-test3 -n check-memory --task '...' /path/to/openclaw` 時，ClawTeam 的 Typer 命令列解析器會將最後一個位置參數 `/path/to/openclaw` 誤判為 **Backend (後端)** 參數（例如 `tmux` 或 `subprocess`），進而拋出 `Unknown spawn backend` 的錯誤，導致無法正確執行自訂路徑的代理。

### 2. 解決方案與任務拆解
* **任務 1.1: 位置參數規避 (Workaround)**
  * 在執行 `spawn` 時，顯式在命令行中補齊 `backend` 參數（如 `tmux` 或 `subprocess`），再接代理可執行文件路徑：
    ```bash
    clawteam spawn tmux /home/shrimpclan_ai/.npm-global/bin/openclaw [options]
    ```
  * **成果**：已成功在 Nest 2.0 上使用此格式喚醒 `check-memory` 巡檢員，完全解鎖自訂代理引擎路徑的生成能力！
* **任務 1.2: ClawTeam CLI 解析優化 (Refactoring)**
  * 修復 `clawteam/cli/commands.py` 中的 `_resolve_spawn_backend_and_command` 解析邏輯，當發現第一個位置參數不屬於有效後端值且為可執行路徑時，自動將其塞入 `command` 列表，並套用預設後端。

---

## 缺口二：Gemini CLI 無頭環境安全阻礙 (Untrusted Workspace)

### 1. 缺口描述
* 新版 `google-gemini-cli` 引入了「工作區信任機制 (Trusted Workspace)」。當 ClawTeam 為代理創建獨立的 Git Worktree 或是於特定自動化目錄下生成代理時，Gemini CLI 會因為目錄未經信任而拒絕運行，在無頭 (Headless) 狀態下直接掛起或返回錯誤，這也是先前代理停滯在 `hobnobbing...` 階段的根本元兇。

### 2. 解決方案與任務拆解
* **任務 2.1: 全域環境變數注入 (Environment Calibration)**
  * 在 `shrimpclan_ai` 用戶的 `/home/shrimpclan_ai/.bashrc` 中寫入 `export GEMINI_CLI_TRUST_WORKSPACE=true`。
  * **成果**：已完成！這使得不論是在互動式終端還是 Tmux 子視窗中，Gemini CLI 都會跳過信任確認，實現 100% 自動化安全啟動。
* **任務 2.2: ClawTeam 執行上下文注入 (Context Injection)**
  * 在 `clawteam spawn` 啟動進程的環境變數傳遞中，自動帶入此安全信任旗標，確保跨平台相容性。

---

## 缺口三：`9router` 認證與模型代理端點解析

### 1. 缺口描述
* 備用模型（Fallback）依賴 Nest 2.0 本地的 `9router` 轉發服務。若 `9router` 的憑證（如 codex）過期，或是轉發的端點（如 local 127.0.0.1 端口）在無頭代理中無法解析，代理在遭遇主用模型 429 頻寬限制時將會斷連，無法順利降級。

### 2. 解決方案與任務拆解
* **任務 3.1: 9Router 連通性與憑證校準 (Health Check)**
  * 檢查 `http://127.0.0.1:20129/` 的存活狀態。
  * 檢查並維護 `/home/shrimpclan_ai/.openclaw/openclaw.json` 中的 `9router/combo2` 等備用模型對應關係，確保當 `google-gemini-cli` 出現持續性的 429 或配額用盡時，備用轉發器能立即接管。

---

## 缺口四：多代理協調流程與閉環驗證 (Workflow Closure)

### 1. 缺口描述
* 當前巡檢團隊 `patrol-test3` 雖然註冊了成員，但由於上述三個缺口阻礙，代理無法順利走完「領取任務 -> 標記 In Progress -> 執行診斷 -> 提交 Completed -> 向隊長回報 -> 申報成本」的完整 Kanban 閉環。

### 2. 解決方案與任務拆解
* **任務 4.1: 實時思維鏈與任務推進監控 (Mind-chain Tracking)**
  * 透過 `tmux capture-pane` 捕獲 `clawteam-patrol-test3:check-memory` 會話，觀察代理是否能正確執行工具，並調用 `clawteam task update` 推進看板狀態。
* **任務 4.2: 信箱 A2A 通訊監聽 (A2A Verification)**
  * 驗證 `check-memory` 在任務完成後，是否能透過 `clawteam inbox send` 向 `patrol-leader` 發送回報信件，實現跨代理協同閉環。
