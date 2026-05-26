# shrimp-world-map 驗證矩陣 v0.1

## 目的

本文件定義蝦家班 `shrimp-world-map` 的第一版驗證矩陣，目標不是描述角色故事，而是把獨立 Agent、工具型 Agent、A2A Gateway 節點與外部驗證器統一轉成「可驗證節點」。世界地圖先前已被定義為以 Agent 可直接使用的接點作為座標，而不是以敘事或人格名稱作為定位方式[cite:39][cite:48]。

這份矩陣的直接用途有三個：第一，確認節點是否真實存在；第二，確認節點是否能從既定控制平面被觸達；第三，確認節點是否能留下可追溯證據。這樣的設計延續了既有 Phase 1/Phase 2 路線：先以結構化世界地圖與 transition 驗證路徑，再把可重跑、可回報、可檢驗的結果回填為活地圖[cite:45][cite:46]。

## 適用範圍

本矩陣適用於下列四類對象：

- OpenClaw 獨立 Agent，例如蝦仁班主、阿百 1 號、Docker 容器內的阿百館長本體。
- 整合 A2A 的工具型 Agent，例如 shrimp-gemini-cli。
- 外部驗證器，例如 hp-Matrix 上的 Antigravity Agent Opus 與 Gemini 3.5 Flash；既有規劃中，Opus 與探長負責落地，Flash 負責沿著世界地圖完整試跑[cite:37][cite:38][cite:47]。
- 後續納入世界地圖的其他獨立節點，只要其具備固定入口、身分宣稱與證據回報能力，即應納入同一套規格。

## 設計原則

### 1. 先驗路，再驗人

任何節點都必須先被證明「路能走」，再談它是否能被委派任務。這一原則延續了既有世界地圖的 transition-first 思路：世界地圖的價值在於讓 Agent 知道從哪裡進、如何進、成功證據是什麼[cite:48][cite:47]。

### 2. 先驗端點，再驗敘事

A2A Gateway 的核心價值在於把 Agent 暴露為可被發現、可認證、可路由的端點，包括 Agent Card、Bearer Token、HTTP/JSON-RPC 端點與對 peer agent 的呼叫能力[cite:56][cite:61]。因此本矩陣預設「端點事實」優先於「角色宣稱」。

### 3. 沒有證據，不算完成

既有世界地圖與根治理討論都已反覆強調，沒有 session、log、命令輸出或落地檔案的完成式回報，只能視為草案或敘事，不應視為系統狀態[cite:44][cite:54]。

### 4. 外部驗證器優先

第一輪驗證應優先由 hp-Matrix 上的 Opus 或 Gemini 3.5 Flash 執行，因為既有實務已證明 Opus 常用於 SSH 與自動化流程，而 Flash 曾完成世界地圖 transition 試跑[cite:38][cite:45][cite:47]。這能降低由主代理自證自述所造成的偏差。

## 節點分類

| 類型 | 定義 | 典型例子 | 控制方式 | 證據來源 |
|------|------|----------|----------|----------|
| Verifier | 用來驗證其他節點的外部驗證器 | hp-Matrix Opus、hp-Matrix Gemini 3.5 Flash[cite:37][cite:38] | SSH、CLI、A2A client | 本機 log、測試輸出、repo commit |
| OpenClaw Agent Node | 具備獨立 Agent 身分的 OpenClaw 節點 | 蝦仁班主、阿百 1 號 | OpenClaw/A2A | gateway log、agent card、task evidence |
| Container Agent Node | 以容器或服務型態獨立運作的 Agent 節點 | Docker 容器阿百館長本體 | 容器入口、A2A、API | container log、gateway log |
| Tool Agent Node | 本質上是外部 AI 工具，但提供穩定入口與協作能力 | shrimp-gemini-cli | CLI、A2A、腳本包裝 | stdout、trace、A2A log |
| Human-Gated Node | 必須經人工補位才能完成驗證的節點 | 需人工授權或人工登入的節點 | 人工 + 腳本 | 驗證紀錄、人工簽核 |

## 核心欄位

下表為驗證矩陣 v0.1 的必填欄位。第一版故意收斂為少量硬欄位，避免把世界觀、人格、商品任務與技能生命週期過早混入同一張表。

| 欄位 | 必填 | 說明 |
|------|------|------|
| `node_id` | 是 | 節點唯一識別碼，例如 `hp-matrix-opus`、`shrimp-01`、`abai-docker`。 |
| `node_type` | 是 | 節點分類，限定為 `verifier`、`openclaw_agent`、`container_agent`、`tool_agent`、`human_gated`。 |
| `declared_identity` | 是 | 節點對外宣稱的名稱與角色，用來比對 Agent Card 與實際服務標頭。 |
| `control_plane` | 是 | 節點隸屬的控制平面，例如 hp-Matrix、Nest 2.0、Docker、CLI Runtime。 |
| `entry_method` | 是 | 進入方式，例如 SSH、CLI、A2A HTTP、JSON-RPC。 |
| `discovery_url` | 條件必填 | 若為 A2A 節點，填寫 `/.well-known/agent-card.json` 或等價入口；A2A Gateway 支援透過 Agent Card 發現節點能力[cite:56][cite:61]。 |
| `reachability_probe` | 是 | 用於確認網路可達的最小探測，例如 `curl -I`、`nc -zv`、健康檢查 API。 |
| `auth_mode` | 是 | 驗證模式，例如 bearer token、local shell、manual approval。A2A Gateway 支援 bearer token 安全設定[cite:61]。 |
| `auth_roundtrip_probe` | 是 | 最小可用操作，要求節點在授權後回應一次合法結果。 |
| `evidence_artifact` | 是 | 證據落點，例如 curl 輸出、session log、gateway log、container log、commit hash。 |
| `freshness_timestamp` | 是 | 最近一次驗證完成時間，用於避免過期接點被誤當可用路徑[cite:46]。 |
| `result_status` | 是 | 限定為 `UNVERIFIED`、`DISCOVERED`、`REACHABLE`、`AUTH_OK`、`ROUNDTRIP_OK`、`BLOCKED`、`STALE`。 |
| `owner` | 是 | 節點負責人或治理責任歸屬。 |
| `fallback_route` | 否 | 驗證失敗時的替代進入方式或人工補位路徑。 |
| `notes` | 否 | 補充說明，但不得用來取代證據。 |

## 驗證狀態定義

| 狀態 | 意義 | 是否可納入可用地圖 |
|------|------|--------------------|
| `UNVERIFIED` | 尚未執行任何探測 | 否 |
| `DISCOVERED` | 已取得節點宣稱資料，如 Agent Card 或節點識別資訊 | 否 |
| `REACHABLE` | 網路層或入口層可達 | 否 |
| `AUTH_OK` | 驗證成功，但尚未完成最小任務往返 | 條件式 |
| `ROUNDTRIP_OK` | 完成授權後的最小合法 round-trip，屬第一版可用節點 | 是 |
| `BLOCKED` | 存在明確阻塞，例如權限、路由、服務未啟 | 否 |
| `STALE` | 過去曾可用，但 freshness 已過期 | 否 |

## 首批納入節點

依既有規劃，第一輪先納入 4 個節點，讓 hp-Matrix 上的外部驗證器沿著既有 world-map 1.0 的模式試跑，再逐步擴大到更多節點[cite:37][cite:45]。

| node_id | node_type | declared_identity | control_plane | 優先目的 |
|---------|-----------|------------------|---------------|----------|
| `hp-matrix-opus` | `verifier` | Antigravity Agent Opus | hp-Matrix | 第一驗證器；負責執行 SSH/A2A 探測[cite:38][cite:47] |
| `hp-matrix-flash` | `verifier` | Gemini 3.5 Flash | hp-Matrix | 第二驗證器；重演 world-map 試跑模式[cite:37][cite:45] |
| `shrimp-01` | `openclaw_agent` | 蝦仁班主 | Nest 2.0 / OpenClaw | 驗證其 A2A 節點事實，不先採信口頭 orchestration |
| `abai-docker` | `container_agent` | 阿百館長本體 | Docker / A2A Gateway | 驗證獨立容器代理的可達與回報能力 |
| `shrimp-gemini-cli` | `tool_agent` | 屠龍寶刀 shrimp-gemini-cli | CLI Runtime / A2A | 驗證工具型 Agent 是否可作為穩定節點 |

## 驗證流程

### A. Discovery

1. 從 hp-Matrix 驗證器出發。
2. 取得目標節點的 Agent Card 或等價宣稱資料。
3. 比對 `declared_identity` 與服務回傳內容是否一致。

A2A Gateway 將 Agent Card 與可路由端點作為發現層核心，因此 discovery 不通者，不應進入後續自動導航[cite:56][cite:61]。

### B. Reachability

1. 驗證 host/port 是否可達。
2. 記錄使用的路由方式，例如 Tailscale、LAN、localhost bridge。
3. 將探測輸出寫入 evidence。

### C. Auth

1. 以配置的 `auth_mode` 執行授權。
2. 若為 bearer token，需證明未授權與已授權狀態的差異。
3. 若需人工補位，狀態標示為 `human_gated`，不可假裝自動通過。

### D. Round-trip

1. 發送最小合法請求。
2. 接收合法回應，且回應內容可對應節點身分。
3. 將請求摘要、回應摘要、時間戳與 log 路徑納入 evidence。

## 證據規格

每一筆 `ROUNDTRIP_OK` 至少應附以下證據：

- discovery 證據：Agent Card 或等價身分宣稱輸出。
- reachability 證據：探測命令與結果摘要。
- auth 證據：授權成功紀錄，必要時保留遮蔽後的 token 指紋。
- round-trip 證據：請求摘要、回應摘要、時間戳、log 路徑。
- freshness 證據：最近驗證完成時間。

世界地圖前期成果已證明，將結果綁定到 evidence artifact 與 last verified/freshness 欄位，是避免節點老化與幻覺導航的必要條件[cite:46][cite:48]。

## 不納入事項

以下項目暫不列入 v0.1 強制欄位：

- 商品上架任務、SKU 任務、商業流程敘事。
- 技能生命週期、bundle 關係、注入規則。
- 人格層敘事描述。
- 多跳協作鏈的高階績效評分。

這些項目可以在 v0.2 之後再加，但 v0.1 的目標只是在世界地圖上先釘住「節點是真的、路是通的、證據是留得住的」。

## 驗收標準

v0.1 視為成立，至少需滿足以下條件：

- `hp-matrix-opus` 成功完成對至少 2 個目標節點的 `ROUNDTRIP_OK` 驗證。
- `hp-matrix-flash` 成功重跑至少 1 個相同節點並得到一致結論，以形成 shadow verification[cite:37][cite:45]。
- 每個通過節點皆有 freshness timestamp 與 evidence artifact。
- 任一節點若只能由人工完成，必須顯式標記為 `human_gated` 或 `BLOCKED`，不得口頭宣稱已打通。

## 建議的資料列範本

```yaml
- node_id: shrimp-01
  node_type: openclaw_agent
  declared_identity: 蝦仁班主
  control_plane: Nest 2.0 / OpenClaw
  entry_method: A2A HTTP
  discovery_url: https://<host>:<port>/.well-known/agent-card.json
  reachability_probe: curl -I https://<host>:<port>/.well-known/agent-card.json
  auth_mode: bearer_token
  auth_roundtrip_probe: POST /message/send (minimal payload)
  evidence_artifact:
    - logs/a2a/shrimp-01-discovery.log
    - logs/a2a/shrimp-01-roundtrip.log
  freshness_timestamp: 2026-05-26T00:00:00Z
  result_status: ROUNDTRIP_OK
  owner: ShrimpClan
  fallback_route: manual shell verification
  notes: A2A gateway verified from hp-Matrix verifier
```

## 版本註記

本文件定義的是 v0.1，屬於「節點存在性與最小往返驗證」版本。下一版 v0.2 才建議納入 `allowed_actions`、`risk_level`、`transition_chain`、`skill_dependency` 與更完整的 capability graph，延續既有 Phase 3 將世界地圖升級為可持續驗證的活地圖方向[cite:46][cite:55]。
