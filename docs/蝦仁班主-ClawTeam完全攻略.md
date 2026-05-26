# 🦐 蝦仁班主 ClawTeam 完全攻略

> **作者**：阿百（Antigravity Opus）  
> **日期**：2026-04-24  
> **目標讀者**：蝦仁班主（探長）— 蝦家班 AI 大工頭  
> **前置條件**：Windows 本機 + Nest2 (GCP VM) SSH 可達

---

## 零、這份攻略要解決什麼問題

蝦家班有大量智慧資產，但 Agent 之間各做各的——阿百在 Nest2 跑、蝦米蒸餾記憶、各種腳本獨立運行。**ClawTeam 是讓這些 Agent 像一支真正的團隊一樣協作的框架**。

讀完這份攻略，蝦仁班主你可以：

1. ✅ 在 Nest2 上安裝並運行 ClawTeam
2. ✅ 一句話拉起一支 Agent 小隊
3. ✅ 讓多個 Agent 平行工作、互傳訊息、自動收斂結果
4. ✅ 用內建模板快速啟動不同任務類型的團隊
5. ✅ 自製蝦家班專屬 Team Template
6. ✅ 看懂看板、追蹤成本、管理生命週期

---

## 一、安裝（在 Nest2 執行）

### 1.1 前置檢查

```bash
# SSH 進 Nest2
ssh ubuntu@shrimp-nexus-01

# 檢查環境
python3 --version    # 需要 3.10+
tmux -V              # 需要已安裝
git --version        # 需要已安裝
openclaw --version   # 如果有安裝 OpenClaw
```

### 1.2 安裝 ClawTeam

```bash
# 在 Nest2 上 clone（如果還沒有的話）
cd ~/projects
git clone https://github.com/win4r/ClawTeam-OpenClaw.git
cd ClawTeam-OpenClaw

# 安裝（可編輯模式，方便後續改碼）
pip install -e .

# 驗證
clawteam --version
clawteam config health
```

### 1.3 建立 symlink（關鍵！）

Spawn 出來的 Agent 跑在新 shell，可能找不到 `clawteam`：

```bash
mkdir -p ~/bin
ln -sf "$(which clawteam)" ~/bin/clawteam

# 確保 ~/bin 在 PATH（加到 ~/.bashrc）
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 1.4 設定 OpenClaw 權限（如用 OpenClaw）

```bash
# 讓 spawned agent 能自動執行 clawteam 命令
mkdir -p ~/.openclaw/workspace/skills/clawteam
cp ~/projects/ClawTeam-OpenClaw/skills/openclaw/SKILL.md \
   ~/.openclaw/workspace/skills/clawteam/SKILL.md

# 複製 context routing 規則
cp ~/projects/ClawTeam-OpenClaw/skills/openclaw/efficient-context-routing.md \
   ~/.openclaw/workspace/skills/clawteam/efficient-context-routing.md
```

---

## 二、五分鐘上手：你的第一支 Agent 小隊

### 2.1 情境：讓三個 Agent 平行審查 shrimp-9router-core 的程式碼

```bash
# Step 1: 建團
clawteam team spawn-team code-audit \
  -d "審查 shrimp-9router-core 四個插件的程式碼品質" \
  -n leader

# Step 2: 建任務（帶依賴）
T1=$(clawteam --json task create code-audit \
  "審查 latency-monitor 插件" -o reviewer-latency \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

T2=$(clawteam --json task create code-audit \
  "審查 active-steering 插件" -o reviewer-steering \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

T3=$(clawteam --json task create code-audit \
  "審查 rule-engine 插件" -o reviewer-rules \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 彙總任務 — 等三個審查都完成後才執行
clawteam task create code-audit \
  "彙總三份審查報告，產出改善建議" -o leader \
  --blocked-by "$T1,$T2,$T3"

# Step 3: Spawn workers（用 Context Pack 格式）
clawteam spawn -t code-audit -n reviewer-latency \
  --task "[TASK] 審查 shrimp-9router-core/plugins/latency-monitor/index.js
[RULES] 只看這一個檔案。評估：效能、錯誤處理、可讀性。
[CONTEXT] 這是 PARL-QM 延遲監測演算法的實作，約 19KB。
[OUTPUT] 問題清單 + 改善建議（markdown 格式）
[STOP] 審查完成即回報 leader"

clawteam spawn -t code-audit -n reviewer-steering \
  --task "[TASK] 審查 shrimp-9router-core/plugins/active-steering/
[RULES] 審查 index.js + config.js 兩個檔案。重點：熔斷器邏輯、Never-Deny 安全性。
[CONTEXT] 預判型路由插件，含 Circuit Breaker。已通過 SAG 壓測。
[OUTPUT] 問題清單 + 改善建議
[STOP] 審查完成即回報 leader"

clawteam spawn -t code-audit -n reviewer-rules \
  --task "[TASK] 審查 shrimp-9router-core/plugins/rule-engine/
[RULES] 審查 index.js + default-rules.json。重點：規則注入安全性。
[CONTEXT] 宣告式規則引擎，用於 payload 清洗。
[OUTPUT] 問題清單 + 改善建議
[STOP] 審查完成即回報 leader"

# Step 4: 看他們工作！
clawteam board attach code-audit     # tmux 分割畫面，即時看
# 或者：
clawteam board live code-audit       # 自動刷新看板
```

### 2.2 你會看到什麼

```
┌────────────────────────────────────────────┐
│ 🦐 code-audit                              │
├──────────┬──────────┬──────────┬───────────┤
│ PENDING  │ PROGRESS │ COMPLETE │ BLOCKED   │
├──────────┼──────────┼──────────┼───────────┤
│          │ latency  │          │ 彙總報告  │
│          │ steering │          │ (等3個完) │
│          │ rules    │          │           │
└──────────┴──────────┴──────────┴───────────┘
```

### 2.3 收斂結果

```bash
# 等所有任務完成
clawteam task wait code-audit --timeout 600

# 查看結果
clawteam inbox receive code-audit    # 讀取 worker 回報
clawteam cost show code-audit        # 查看成本
clawteam task stats code-audit       # 查看耗時

# 清理
clawteam team cleanup code-audit --force
```

---

## 三、核心概念圖解

```
蝦仁班主（你）
     │
     │ "用 3 個 Agent 審查程式碼"
     ▼
┌─────────────────────────────────────┐
│  Leader Agent (你的 OpenClaw)       │
│  ┌─────────────────────────────┐    │
│  │ clawteam team spawn-team    │    │
│  │ clawteam task create ×3     │    │
│  │ clawteam spawn ×3           │    │
│  │ clawteam board live         │    │  ←─ 你看這裡
│  │ clawteam inbox receive      │    │
│  └─────────────────────────────┘    │
└──────┬──────────┬──────────┬────────┘
       │          │          │
       ▼          ▼          ▼
   ┌───────┐  ┌───────┐  ┌───────┐
   │Worker1│  │Worker2│  │Worker3│    ← 各自獨立 tmux window
   │(tmux) │  │(tmux) │  │(tmux) │    ← 各自獨立 git worktree
   │latency│  │steer  │  │rules  │
   └───┬───┘  └───┬───┘  └───┬───┘
       │          │          │
       └──── inbox send ─────┘ → Leader 收斂
                                 → 蝦米蒸餾
```

**關鍵機制**：
- **tmux**：每個 Worker 是一個 tmux window，可以 `board attach` 一次看全部
- **git worktree**：每個 Worker 在獨立 branch 工作，不會互相衝突
- **filesystem**：所有狀態存在 `~/.clawteam/`，無需資料庫
- **inbox**：Agent 間透過檔案信箱通信，支援 point-to-point 和 broadcast

---

## 四、常用指令速查表

### 團隊管理

| 你想做什麼 | 指令 |
|-----------|------|
| 建一支新團隊 | `clawteam team spawn-team <name> -d "<目標>" -n leader` |
| 看所有團隊 | `clawteam team discover` |
| 看某團隊狀態 | `clawteam team status <team>` |
| 刪除團隊（含清理） | `clawteam team cleanup <team> --force` |

### 任務管理

| 你想做什麼 | 指令 |
|-----------|------|
| 建任務 | `clawteam task create <team> "<標題>" -o <worker>` |
| 建有依賴的任務 | `clawteam task create <team> "<標題>" -o <worker> --blocked-by <id1>,<id2>` |
| 看任務清單 | `clawteam task list <team>` |
| 只看某人的任務 | `clawteam task list <team> --owner <name>` |
| 更新任務狀態 | `clawteam task update <team> <id> --status completed` |
| 等所有任務完成 | `clawteam task wait <team> --timeout 300` |

### Agent 調度

| 你想做什麼 | 指令 |
|-----------|------|
| spawn 一個 worker | `clawteam spawn -t <team> -n <name> --task "<Context Pack>"` |
| 看所有 agent 畫面 | `clawteam board attach <team>` |
| 看 kanban 看板 | `clawteam board show <team>` |
| 自動刷新看板 | `clawteam board live <team> --interval 5` |
| Web 看板 | `clawteam board serve --port 8080` |

### 通信

| 你想做什麼 | 指令 |
|-----------|------|
| 傳訊給某 agent | `clawteam inbox send <team> <to> "<msg>"` |
| 廣播給全隊 | `clawteam inbox broadcast <team> "<msg>"` |
| 讀取收到的訊息 | `clawteam inbox receive <team>` |
| 偷看但不消費 | `clawteam inbox peek <team>` |

### 成本

| 你想做什麼 | 指令 |
|-----------|------|
| 設定預算上限 | `clawteam cost budget <team> 5.00` |
| 查看已花費 | `clawteam cost show <team>` |
| 回報用量 | `clawteam cost report <team> --input-tokens 5000 --output-tokens 2000 --cost-cents 3` |

### JSON 輸出（適合腳本串接）

在任何指令前加 `--json`：
```bash
clawteam --json task list my-team
clawteam --json board show my-team | jq '.taskSummary'
```

---

## 五、四個內建 Template — 一鍵拉起團隊

### 5.1 code-review（程式碼審查）

```bash
clawteam launch code-review --team review-9router \
  --goal "審查 shrimp-9router-core 的四個插件"
```

自動建立：lead-reviewer + security-reviewer + perf-reviewer + arch-reviewer（共 4 人）

### 5.2 strategy-room（戰略會議室）

```bash
clawteam launch strategy-room --team next-quarter \
  --goal "規劃蝦家班 Q3 技術路線圖，整合 ClawTeam、9router、A2A Gateway"
```

自動建立：strategy-lead + systems-analyst + delivery-planner + risk-mapper + decision-editor（共 5 人）

### 5.3 hedge-fund（投資分析）

```bash
clawteam launch hedge-fund --team crypto-check \
  --goal "分析 BTC、ETH、SOL 的 Q2 走勢"
```

自動建立：7 個 Agent（分析師 ×5 + 風控 + 決策）

### 5.4 research-paper（研究論文）

```bash
clawteam launch research-paper --team ai-routing \
  --goal "撰寫一篇關於 AI Agent 路由優化的技術報告"
```

### 查看所有可用 template

```bash
clawteam template list
clawteam template show strategy-room   # 看詳細結構
```

---

## 六、自製蝦家班 Template

在 `ClawTeam-OpenClaw/clawteam/templates/` 新增 `.toml` 檔即可。

### 範例：shrimp-patrol.toml（蝦家巡邏隊）

```toml
[template]
name = "shrimp-patrol"
description = "蝦家班日常巡檢：檢查 Nest2 各系統健康狀態"
command = ["openclaw"]
backend = "tmux"

[template.leader]
name = "patrol-leader"
type = "patrol-leader"
task = """你是蝦家巡邏隊隊長。
目標: {goal}

工作流程：
1. 派出各檢查員，每人負責一個系統
2. 等待回報 via `clawteam inbox receive {team_name}`
3. 彙總成日報：
   - 🟢 正常項
   - 🟡 注意項
   - 🔴 告警項
4. 將日報送蝦仁班主"""

[[template.agents]]
name = "check-9router"
type = "system-checker"
task = """檢查 9router 健康狀態。
目標: {goal}

檢查項目：
- Provider 在線數量
- 過去 1 小時 429 次數
- Latency P99
- Active Steering 熔斷器狀態

回報格式: `clawteam inbox send {team_name} patrol-leader "9ROUTER: [🟢/🟡/🔴] | [摘要]"`
完成後: `clawteam task update {team_name} [task-id] --status completed`"""

[[template.agents]]
name = "check-memory"
type = "system-checker"
task = """檢查記憶系統健康狀態。
目標: {goal}

檢查項目：
- Vertex AI Search 回應時間
- 最近 24h 蒸餾紀錄數量
- Embedding API 429 頻率
- 記憶重複率

回報格式: `clawteam inbox send {team_name} patrol-leader "MEMORY: [🟢/🟡/🔴] | [摘要]"`"""

[[template.agents]]
name = "check-a2a"
type = "system-checker"
task = """檢查 A2A Gateway 連通性。
目標: {goal}

檢查項目：
- Gateway 是否在線
- 最近 24h 訊息送達率
- 跨節點延遲
- 是否有超時未完成的任務

回報格式: `clawteam inbox send {team_name} patrol-leader "A2A: [🟢/🟡/🔴] | [摘要]"`"""

[[template.tasks]]
subject = "彙總巡檢報告"
owner = "patrol-leader"

[[template.tasks]]
subject = "檢查 9router 系統"
owner = "check-9router"

[[template.tasks]]
subject = "檢查記憶系統"
owner = "check-memory"

[[template.tasks]]
subject = "檢查 A2A Gateway"
owner = "check-a2a"
```

使用方式：
```bash
clawteam launch shrimp-patrol --team patrol-0424 \
  --goal "蝦家班 2026-04-24 日常巡檢"
```

---

## 七、實戰劇本：讓蝦家班動起來

### 劇本 A：用 ClawTeam 盤點所有專案狀態

```bash
# 一行指令拉起 5 個 Agent 同時工作
clawteam team spawn-team inventory -d "盤點 Playground 所有專案最新狀態" -n leader

# 每個 worker 負責一個專案群
clawteam spawn -t inventory -n w-router --task "[TASK] 盤點 9router + shrimp-9router-core 狀態
[RULES] 只看 README、package.json、最近 commit
[CONTEXT] 位於 ~/projects/ 目錄下
[OUTPUT] 版本號 + 最後更新日 + 健康度(🟢/🟡/🔴)
[STOP] 兩個專案都查完"

clawteam spawn -t inventory -n w-cli --task "[TASK] 盤點 gemini-cli + shrimp-gemini-cli 狀態
[RULES] 只看 DASHBOARD.md 和 package.json
[OUTPUT] 當前版本 + pending 項目數 + 健康度
[STOP] 兩個專案都查完"

clawteam spawn -t inventory -n w-gateway --task "[TASK] 盤點 openclaw-a2a-gateway 狀態
[RULES] 只看 README、CHANGELOG、最近 5 個 commit
[OUTPUT] 版本 + 已知問題 + 健康度
[STOP] 查完即報"

clawteam spawn -t inventory -n w-hub --task "[TASK] 盤點 shrimp-hub + OpenSpec 狀態
[OUTPUT] 版本 + 功能完成度 + 健康度
[STOP] 兩個都查完"

clawteam spawn -t inventory -n w-infra --task "[TASK] 盤點 Nest2 基礎設施
[RULES] 檢查 Docker 容器狀態、磁碟空間、記憶體
[OUTPUT] 資源使用率 + 告警項 + 健康度
[STOP] 查完即報"

# 看板追蹤
clawteam board live inventory --interval 10
```

### 劇本 B：用 strategy-room 規劃下季路線

```bash
clawteam launch strategy-room --team q3-plan \
  --goal "規劃蝦家班 2026 Q3 技術演進方向：
1. ClawTeam 是否正式取代 A2A Gateway 成為主力協作框架？
2. shrimp-9router-core 是否啟動 Rust 重寫？
3. One Dollar Project 預算是否需要調整？
4. 蝦仁一號是否穢土轉生？"
```

### 劇本 C：用 code-review 審查新功能

```bash
clawteam launch code-review --team review-context-skill \
  --goal "審查 openclaw-efficient-context-skill v2 的 SKILL.md，
檢查：上下文分層是否合理、去重規則是否完備、
Token Budget 是否符合 One Dollar Project 約束"
```

---

## 八、疑難排解

| 問題 | 原因 | 解法 |
|------|------|------|
| `clawteam: command not found` | pip bin 不在 PATH | 執行 §1.3 的 symlink 步驟 |
| Spawned agent 卡住不動 | 權限提示等待輸入 | 確認 exec-approvals 設為 allowlist |
| Worker 看不到 repo 檔案 | git worktree 在新 branch | 用 `--no-workspace` 或 `--repo /path` |
| 看板空白 | 任務還沒建 | 先 `task create` 再 `board show` |
| `tmux` 視窗太小 | terminal 太窄 | 放大 terminal 後 `board attach` |
| inbox receive 沒東西 | Worker 還沒回報 | 用 `inbox peek` 檢查，或等 |
| cost 都是 0 | 沒有 agent 回報成本 | Worker 需主動 `cost report` |

---

## 九、蝦家班推薦工作流

### 日常（每天）

```bash
# 早上：拉巡邏隊
clawteam launch shrimp-patrol --team patrol-$(date +%m%d)

# 看結果
clawteam task wait patrol-$(date +%m%d) --timeout 300
clawteam inbox receive patrol-$(date +%m%d)

# 清理
clawteam team cleanup patrol-$(date +%m%d) --force
```

### 開發（按需）

```bash
# 需要多人平行開發時
clawteam team spawn-team feat-xxx -d "..." -n leader
clawteam spawn ...  # 派 worker
clawteam board attach feat-xxx  # 看他們幹活
# 完成後 merge worktree
```

### 週報（每週）

```bash
clawteam launch strategy-room --team weekly-$(date +%V) \
  --goal "本週蝦家班工作回顧與下週計畫"
```

---

## 十、一句話攻略

> **記住這個公式就夠了：**
>
> ```bash
> spawn-team → task create → spawn workers → board live → inbox receive → cleanup
> ```
>
> 建團 → 建任務 → 派工 → 看板 → 收結果 → 清理
>
> **Context 鐵律：spawn --task 只給最小必要資訊。能自己做就不 spawn。**

---

🦐 *蝦仁班主，蝦家班等你一聲令下。clawteam 在手，蝦兵蝦將隨時待命！*
