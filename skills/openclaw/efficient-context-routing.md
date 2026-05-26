# Efficient Context Routing — ClawTeam 整合附件

本文件是 `SKILL.md` 的上下文效率化擴充。當 Leader Agent 使用 ClawTeam 調度 sub-agent 時，必須遵守以下 Context Routing 規則以控制 token 成本與避免重複 Input。

## 核心原則

1. **Leader 不把完整歷史塞進 spawn prompt** — 只給 worker 該 task 的最小 context。
2. **Worker 不共享整包 context** — 每個 worker 只收到自己 task 的切片。
3. **inbox 訊息只傳摘要** — 禁止用 `inbox send` 傳完整日誌或完整檔案內容。
4. **所有 agent 遵守 token 預算** — 根據模型等級（Premium/Standard/Economy）動態調整。

---

## 一、與 ClawTeam 的整合點

### spawn 時的 Context 控制

`clawteam spawn --task` 的 `--task` 參數就是 worker 的全部初始 context。Leader 必須遵守：

```
✅ 好的 spawn:
clawteam spawn -t my-team -n worker1 \
  --task "實作 OAuth2 登入模組。API schema 見 docs/api.md。完成標準：通過 tests/auth_test.py"

❌ 壞的 spawn:
clawteam spawn -t my-team -n worker1 \
  --task "$(cat entire_project_history.md)"  # 禁止！灌完整歷史
```

**spawn --task 的上下文格式**（Context Pack）：

```
[TASK] 單一明確目標
[RULES] 不可違反的約束（最多 3 條）
[CONTEXT] 與此 task 直接相關的事實（最多 3 筆，每筆 ≤ 300 字）
[OUTPUT] 預期輸出格式
[STOP] 停止條件
```

### inbox 訊息的 Context 控制

Leader 透過 `clawteam inbox send` 傳遞補充資訊時：

```
✅ 好的 inbox:
clawteam inbox send my-team worker1 "API schema 已更新，新增了 /v2/users endpoint，參考 docs/api-v2.md"

❌ 壞的 inbox:
clawteam inbox send my-team worker1 "$(cat docs/full-api-spec-500-lines.json)"  # 禁止！
```

### task 描述的 Context 控制

`clawteam task create` 的描述欄位也是 context：

```bash
# 好：簡短任務 + 關鍵約束
clawteam task create my-team "實作 WebSocket 推送" -o backend \
  -d "使用 Socket.IO。端口 3001。必須支援 reconnection。"

# 壞：把需求文件全文塞進描述
```

---

## 二、上下文分層（適配 ClawTeam）

| 層 | 內容 | ClawTeam 載體 | 限制 |
|---|------|--------------|------|
| **A: Hard Rules** | 安全約束、Opus DNA 規則 | spawn --task 的 [RULES] 區塊 | 必含，最短 |
| **B: Task Brief** | 單一任務目標 | spawn --task 的 [TASK] 區塊 | 必含 |
| **C: Relevant Facts** | 與任務直接相關的事實 | spawn --task 的 [CONTEXT] 區塊 | ≤ 3 筆，每筆 ≤ 300 字 |
| **D: Reusable Memory** | 偏好、SOP、團隊知識 | inbox send（按需補充） | Top-K=3 |
| **E: Raw Logs** | 完整歷史、日誌 | **禁止注入** | 僅限除錯例外 |

---

## 三、Leader 決策流程（ClawTeam 版）

```
1. 使用者下達任務
2. Leader 建立 Task Brief
3. Leader 判斷複雜度：
   ├─ 簡單 → Leader 自己做，不 spawn
   ├─ 中等 → spawn 1-2 worker
   └─ 複雜 → spawn 3+ worker，用 --blocked-by 建立依賴鏈
4. 為每個 worker 撰寫最小 Context Pack（見上方格式）
5. 查詢當前模型狀態，決定 token budget：
   ├─ Premium (Opus/Pro): max 8K tokens → 從嚴，max_context_items=3
   ├─ Standard (Gemini Pro): max 16K → 標準
   └─ Economy (Flash): max 32K → 可放寬
6. clawteam spawn 各 worker
7. 進入 Monitor Loop（每 30s poll）
8. 收到 worker 回報後，只保留摘要，不轉發全文給其他 worker
9. 收斂最終結果
10. 高價值 delta 送 memory-distiller（蝦米）
```

---

## 四、去重規則（ClawTeam 場景）

### Worker 回報去重

當多個 worker 透過 inbox 回報結果時，Leader 須去重：

- 相同結論不重複收納
- 相同檔案修改以最新者為準
- Worker 間如有衝突結論，Leader 做 critic 判斷

### spawn 去重

禁止 spawn 已存在的 worker name。禁止對同一任務 spawn 多個 worker（除非刻意做 A/B 測試）。

### inbox 訊息去重

同一資訊不透過 inbox broadcast 重複發送。如需全隊同步，只發一次 broadcast，不逐一 send。

---

## 五、Token Budget（ClawTeam 版）

### 一般任務預算分配

| 角色 | 預算占比 | 說明 |
|------|---------|------|
| Leader | 40% | 決策 + planner/critic 兼任 |
| Workers 總和 | 45% | 依 worker 數均分 |
| Memory-distiller | 10% | 蝦米蒸餾 |
| 通信開銷 | 5% | inbox 訊息 |

### 成本感知規則

蝦家班月預算 ≤ $30 USD（One Dollar Project）。

**Leader 必須在 spawn 前估算成本**：
- 每個 spawn 的 worker = 一個獨立 Agent session = 獨立 token 消耗
- 能用 2 個 worker 解決就不開 5 個
- 簡單子任務用 Economy 模型，核心任務用 Standard/Premium

使用 `clawteam cost report` 追蹤：
```bash
clawteam cost report my-team --input-tokens 5000 --output-tokens 2000 --cost-cents 3
clawteam cost show my-team  # 查看累計
clawteam cost budget my-team 5.00  # 設定上限 $5
```

---

## 六、SOP 模板

### SOP-CT-A：一般 ClawTeam 任務

```bash
# 1. 建團
clawteam team spawn-team {team} -d "{goal}" -n leader

# 2. 建任務（帶依賴）
TASK1=$(clawteam --json task create {team} "{task1}" -o worker1 | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
clawteam task create {team} "{task2}" -o worker2 --blocked-by $TASK1

# 3. Spawn（用最小 Context Pack）
clawteam spawn -t {team} -n worker1 --task "[TASK] {task1_brief}
[RULES] 遵守 token budget、結論先行
[CONTEXT] {relevant_fact_1}
[OUTPUT] {expected_format}
[STOP] {completion_criteria}"

# 4. Monitor
clawteam board live {team} --interval 30

# 5. 收斂
clawteam cost show {team}
clawteam task stats {team}
for agent in worker1 worker2; do
  clawteam workspace merge {team} --agent $agent
done
clawteam team cleanup {team} --force
```

### SOP-CT-B：故障排除

```bash
# Leader 拆分故障為 5 類，每類一個 worker
clawteam team spawn-team debug-{issue} -d "排除 {issue}" -n leader

for category in config mount auth network logs; do
  clawteam spawn -t debug-{issue} -n check-$category \
    --task "[TASK] 檢查 {issue} 是否為 $category 問題
[RULES] 只查此類別，不跨界。修復步驟必須可回滾。
[CONTEXT] 錯誤訊息: {error_msg}
[OUTPUT] 結論(是/否) + 修復步驟(若有)
[STOP] 判斷完成即停止"
done
```

---

## 七、Prompt 模板（ClawTeam Leader）

以下模板注入 Leader Agent 的 system prompt：

```text
你是 ClawTeam 的 Leader Agent，同時是蝦家班的 main Agent。
你透過 clawteam CLI 調度 worker sub-agent。

Context Routing 規則（不可違反）：
1. spawn --task 只給最小 Context Pack，禁止灌入完整歷史。
2. inbox send 只傳摘要與差異，禁止傳完整檔案。
3. 能自己做就不 spawn worker。
4. spawn 前先估算成本，用最少 worker 完成任務。
5. 收到 worker 結果後只保留摘要，不全文轉發。
6. 最終將高價值 delta 送蝦米（memory-distiller）蒸餾。

Opus DNA 釘選規則：
- 自動推進：不等待許可，持續推進任務。
- 最小上下文：只注入與當前 task 直接相關的資訊。
- 工具優先：能用工具解決就不用推理猜測。
- 結論先行：先給結論，再附細節。
```

---

## 八、蝦家班角色 → ClawTeam 映射

| 蝦家班角色 | ClawTeam 角色 | spawn 方式 | 備註 |
|-----------|--------------|-----------|------|
| 蝦仁班主 (main) | **Leader** | 不 spawn，是發起者 | AI 大工頭，兼 planner/critic |
| 阿百本體 (main) | **Leader** (Nest2) | 不 spawn，7×24 自治 | 跨節點透過 A2A Gateway |
| Worker | **Worker** | `clawteam spawn` | 每個獨立 tmux + worktree |
| 蝦米 (memory-distiller) | **Worker** (特殊) | spawn 或常駐 | 只處理 delta 蒸餾 |
| Observer | **不 spawn** | claw-radar.js + shrimp-hub | 非 Agent，是腳本 |
| Planner | Leader 兼任 | — | ClawTeam task create |
| Critic | Leader 兼任 | — | Leader 自行驗收 |

---

## 九、驗收指標

| 指標 | 閾值 | 說明 |
|------|------|------|
| spawn --task 平均長度 | ≤ 500 字 | Context Pack 精簡度 |
| worker 數 / 任務複雜度比 | ≤ 1.5 | 不過度 spawn |
| inbox 訊息平均長度 | ≤ 200 字 | 摘要式通信 |
| dedup ratio (重複回報率) | ≥ 0 | 越低越好 |
| Leader direct-resolution rate | ≥ 40% | 簡單任務不派工 |
| cost per task ($) | ≤ $1.00 | One Dollar Project |
| 蝦米重複收錄率 | ≤ 10% | 蒸餾品質 |
