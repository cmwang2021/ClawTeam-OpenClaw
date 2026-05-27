# Phase B Findings Summary: 最終結論、阻塞點與建議下一步

本文件總結 Nest 2.0 上 ClawTeam 多代理協調系統的 Phase B 評估結論，分析系統核心痛點，並提出切實可行的優化建議與後續行動方案。

---

## 1. 核心結論 (Core Findings)

經過深入的現況診斷與測試，**Nest 2.0 上的 ClawTeam 控制平面與 OpenClaw 引擎架構十分穩固**，具備優秀的高可用隔離機制與靈活的協同能力。
然而，在自動化及無頭 (Headless) 運行情境中，由於**命令行參數解析歧義**與**安全信任機制 (Google Gemini CLI Untrusted Workspace)** 的雙重影響，導致代理啟動時出現閃退或思維鏈掛起。透過 Antigravity 的精確環境標定與變數注入，**目前已成功將核心阻礙全數掃除，成功實現了巡檢代理 `check-memory` 在 tmux 中的健康流轉與網關對接！**

> **[B2a 重要修正]** 上述「十分穩固」的結論需降級。根據 2026-05-27 的 B2a 深度審計：
> - B1 僅證明了**宿主機 A 路徑**（OpenClaw-A + tmux 隔離）上的單次 workflow ingress/evidence 閉環曾成功發生。
> - 此結論**不得外推**至 Docker OpenClaw-B 路徑、雙 9router 全貌、或跨 Tailnet 可達性。
> - Nest 2.0 實際為三雙架構（雙 OpenClaw × 雙 9router × 雙 Tailnet），B1 僅觸及其中一條路徑。

---

## 2. 當前關鍵阻塞點與系統痛點 (Blockers & Pain Points)

雖然通訊與執行閉環已順利打通，但在進一步推廣至高頻多代理生產環境時，仍需關注以下兩點：

1. **主用模型 Quota 頻率限制 (GCP Code Assist 429)**：
   * **痛點**：主用模型 `google-gemini-cli/gemini-3-flash-preview` 整合度高且授權正常，但受限於 Cloud Code Assist API 的短期頻寬額度，頻繁的大型上下文思維鏈容易觸發 `You have exhausted your capacity on this model` 的 429 限流。
   * **影響**：代理在限流時需要進入冷卻等待，使得多代理任務流轉速度受限。
2. **`clawteam spawn` 位置參數解析的易用性缺失**：
   * **痛點**：命令列在遇到自訂可執行路徑時，極易將其誤判為 `backend`。使用者必須手動在命令行中安插 `tmux` 作為佔位符，否則會觸發無效後端報錯。
3. **`check-9router` 探針能力不足**（B2a 新增）：
   * **痛點**：B1 時期的 `check-9router` 僅執行了 **Legacy/Basic Probe**（PID 檢查 + 基本端口回應），無法區分 9router-A (Degraded, `:20128`) 與 9router-B (Healthy, `:20129`)。因此，B1 關於路由穩固的結論需降級，**不得代表 9router 全貌**。
   * **影響**：如不升級為 Enhanced Audit（RPC 生存心跳 + codex token 過期檢測），將無法正確評估路由平面健康度。
4. **跨 Tailnet 可達性幻覺**（B2a 新增）：
   * **痛點**：Shared Node 僅提供 DNS/IP 可見性，不代表實際可達。B1 觀察到的連通性僅適用於 `shrimpclan.ai@` 二代商用網內部，不代表 Tailnet 雙向打通。
   * **影響**：在代理世界地圖/調度中，將 Shared Node「可見」誤判為「可達」將導致導航失敗。

---

## 3. 建議下一步行動方案 (Recommended Next Steps)

為了進一步提升多代理系統的流暢度與維護性，建議執行以下行動：

### 建議一：代碼層修復 CLI 參數歧義
* **方案**：優化 `clawteam/cli/commands.py` 中的 `_resolve_spawn_backend_and_command` 函數。
* **改動邏輯**：
  ```python
  def _resolve_spawn_backend_and_command(backend: Optional[str], command: list[str] | None) -> tuple[Optional[str], list[str]]:
      normalized_command = list(command or [])
      # 如果 backend 帶有路徑特徵（以 / 或 . 開頭），說明它是一個執行路徑而非後端關鍵字
      if backend is not None and (backend.startswith("/") or backend.startswith(".")):
          normalized_command = [backend, *normalized_command]
          backend = None
      elif backend is not None and backend not in ("tmux", "subprocess"):
          normalized_command = [backend, *normalized_command]
          backend = None
      return backend, normalized_command
  ```
* **效果**：修復後，使用者無需再刻意安插 `tmux`，CLI 將能聰明地自動識別自訂路徑，極大提升開發體驗。

### 建議二：全域自動注入安全信任旗標
* **方案**：在 ClawTeam CLI 的 `spawn` 與 `launch` 核心邏輯中，將 `GEMINI_CLI_TRUST_WORKSPACE=true` 納入底層默認注入的環境變數字典，免去依賴主機 `.bashrc` 的前置條件，實現即插即用。

### 建議三：優化模型分流與降級策略
* **方案**：針對 429 Quota 痛點，可考慮在 `/home/shrimpclan_ai/.openclaw/openclaw.json` 中配置更靈活的 `9router/combo2` 自動降級閾值，或在啟動巡檢任務時，透過 `clawteam spawn --model 9router/combo2` 直接調用配額更寬鬆的備用渠道，分散 GCP 主渠道壓力。
  > **[B2a 补充]** 降級策略應明確指向 **9router-B (`:20129`，狀態 Healthy)**，而非 9router-A (`:20128`，狀態 Degraded，codex 帳號已於 2026-05-21 過期)。兩者的區分詳見 `control-boundary-report.md` §4 Router Plane。

### 建議四：全隊伍聯合巡檢閉環測試
* **方案**：依序啟動 `check-9router` 與 `check-a2a` 代理，協同隊長 `patrol-leader` 發送匯總報告，以完整的「聯合多兵種實戰」完成 PAIN-002 工單的最終驗證。

### 建議五：建立 Enhanced Router Audit 流程（B2a 新增）
* **方案**：淘汰舊有的 PID 檢查式 `check-9router`，建立包含以下檢查項的 Enhanced Audit 流程：
  1. **RPC 生存心跳**：向 9router-A 與 9router-B 分別發送實際的 LLM 請求，驗證響應品質而非僅檢查 PID。
  2. **Codex Token 過期檢測**：自動檢查 9router-A 的認證狀態，避免將 Degraded 路由認定為 Healthy。
  3. **雙 Router 對照報告**：產出明確區分 A/B 狀態的健康度報告，取代舊有的單一「路由正常」結論。
* **目標**：確保未來所有路由降級策略指向健康的 9router-B (`:20129`)，而非已過期的 9router-A。

### 建議六：雙 OpenClaw 感知納入代理世界地圖（B2a 新增）
* **方案**：在 `AGENTS_WORLD_MAP.md` 中明確區分 OpenClaw-A (Host, `:18800`) 與 OpenClaw-B (Docker, `:18790`) 的存在，確保代理在調度時知道自己與哪個 Gateway 通訊。
* **目標**：避免代理將單一 Gateway 地址誤判為「唯一真實」，導致跨 OpenClaw 調度失敗。
