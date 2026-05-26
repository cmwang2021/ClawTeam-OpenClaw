# Phase B Findings Summary: 最終結論、阻塞點與建議下一步

本文件總結 Nest 2.0 上 ClawTeam 多代理協調系統的 Phase B 評估結論，分析系統核心痛點，並提出切實可行的優化建議與後續行動方案。

---

## 1. 核心結論 (Core Findings)

經過深入的現況診斷與測試，**Nest 2.0 上的 ClawTeam 控制平面與 OpenClaw 引擎架構十分穩固**，具備優秀的高可用隔離機制與靈活的協同能力。
然而，在自動化及無頭 (Headless) 運行情境中，由於**命令行參數解析歧義**與**安全信任機制 (Google Gemini CLI Untrusted Workspace)** 的雙重影響，導致代理啟動時出現閃退或思維鏈掛起。透過 Antigravity 的精確環境標定與變數注入，**目前已成功將核心阻礙全數掃除，成功實現了巡檢代理 `check-memory` 在 tmux 中的健康流轉與網關對接！**

---

## 2. 當前關鍵阻塞點與系統痛點 (Blockers & Pain Points)

雖然通訊與執行閉環已順利打通，但在進一步推廣至高頻多代理生產環境時，仍需關注以下兩點：

1. **主用模型 Quota 頻率限制 (GCP Code Assist 429)**：
   * **痛點**：主用模型 `google-gemini-cli/gemini-3-flash-preview` 整合度高且授權正常，但受限於 Cloud Code Assist API 的短期頻寬額度，頻繁的大型上下文思維鏈容易觸發 `You have exhausted your capacity on this model` 的 429 限流。
   * **影響**：代理在限流時需要進入冷卻等待，使得多代理任務流轉速度受限。
2. **`clawteam spawn` 位置參數解析的易用性缺失**：
   * **痛點**：命令列在遇到自訂可執行路徑時，極易將其誤判為 `backend`。使用者必須手動在命令行中安插 `tmux` 作為佔位符，否則會觸發無效後端報錯。

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

### 建議四：全隊伍聯合巡檢閉環測試
* **方案**：依序啟動 `check-9router` 與 `check-a2a` 代理，協同隊長 `patrol-leader` 發送匯總報告，以完整的「聯合多兵種實戰」完成 PAIN-002 工單的最終驗證。
