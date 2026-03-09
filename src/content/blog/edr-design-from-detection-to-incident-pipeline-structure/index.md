---
title: 'EDR 設計筆記：從 Detection 到 Incident 的 Pipeline 架構'
description: 本文以實務攻防視角，簡單整理 EDR 從原始事件到 Incident 的完整流程，涵蓋資料來源信任分級、Detection 與 Tag 設計、告警關聯、SQLite 本地可靠性、Agent 與 Cloud 分工，以及效能與誤報間的取捨。同時對照 MDE、CrowdStrike、SentinelOne、Elastic 的做法，總結一套能持續調整的設計原則。
date: 2026/03/09
updated: 2026/03/09
image: ''
categories: []
tags: ['EDR']
authors: ['claude', 'yuto']
draft: false
pinned: false
---

# EDR 設計筆記：從 Detection 到 Incident 的 Pipeline 架構

> 本文整理自一系列對 EDR 架構的深度討論，涵蓋事件來源、偵測管線、告警聚合、本地儲存、Agent 與 Cloud 的職責分工，以及業界主流實作的比較分析。目標是設計一個在效能和偵測能力之間取得平衡的現代 EDR 系統。

## 一、問題的起點：Process Tree 的侷限

許多 EDR 的初階實作方式是以 Sigma rule 的匹配作為觸發點，向上查詢 process tree，把這棵樹當作事件的「樣貌」。這個方法雖然直覺，但有幾個根本性的問題：

- **Process Injection 後行為換主體**：注入到 `svchost.exe` 的惡意程式碼，其 process tree 看起來完全無害
- **靜態快照，非動態鏈**：Sigma hit 的時間點不一定是攻擊鏈的起點，只是某一個橫截面
- **跨 process 的橫向移動完全斷鏈**：lateral movement 本質上就是換 process，tree 追不到

更根本的問題在於：現實的 attack chain 不是一條線，而是一張圖。

---

## 二、重新定義問題

與其試圖「還原完整的 attack chain」，更務實的目標是：

> 任何一個攻擊環節，只要有足夠的 confidence 就觸發 response，再靠 context 讓 SOC 快速判斷。

這把問題拆成三件同時進行的事：

```
Detection           →    任一環節有足夠 confidence 就觸發
Contextualization   →    自動帶入周邊 context，讓 SOC 30 秒內能判斷
Response            →    blocking 不需要等 chain 完整
```

---

## 三、事件來源的信任分級

EDR 的輸入來自多個來源，但品質差異極大。

### 主要來源

| 來源                                                  | 延遲 | 可信度 | 特性                                |
| ----------------------------------------------------- | ---- | ------ | ----------------------------------- |
| ETW kernel provider (ETW-TI)                          | 即時 | 高     | 不可在 userspace 被竄改，需 ELAM    |
| Kernel callbacks (PsSetCreateProcessNotifyRoutine 等) | 即時 | 高     | 行為原語，process/thread/image 事件 |
| Windows Event Log（高語意）                           | 秒級 | 中高   | 狀態變化，單一事件語意完整          |
| Usermode hooks (ntdll.dll)                            | 即時 | 低     | 可被 direct syscall 或 unhook 繞過  |

### 信任模型的關鍵認知

PEB（Process Environment Block）完全在 userspace，可被自由竄改。CommandLine、ImagePathName、PPID 都不可直接信任——PPID spoofing 可以透過 `STARTUPINFOEX` 在 process 創建時就植入假值，cmdline spoofing 可以在 child process 啟動後立刻覆寫自己的 PEB。

這意味著許多 Sigma rule 的判斷條件（如 cmdline 包含特定字串）是可以被精心構造的攻擊者繞過的。

### 事件路由策略

蒐集到的事件依信任度和語意層次分流到不同位置，而不是全部走同一條 pipeline：

```
Kernel Callbacks / ETW-TI         → Detection Layer（行為原語，需組合才有意義）

Windows Event Log 高語意事件       → 直接進 Incident Layer
  1102 (Log cleared)
  7045 (Service installed)
  4719 (Audit policy changed)
  4698 (Scheduled task created)

Windows Event Log 需聚合的事件     → Detection Layer（計數型 Sigma rule）
  4625 × 50 in 5min               → Brute force detection
```

---

## 四、三層 Pipeline 架構

業界的告警處理不是「Sigma match 就 alert」，而是有明確的分層結構：

```
Raw Events
    │  atomic rule (Sigma/YARA)
    ▼
Detection          ← 單一 indicator，帶 entity context
    │  correlation rule
    ▼
Incident           ← 同 entity scope 內的 detection 聚合
    │  correlation rule
    ▼
Campaign           ← 跨 host/entity 的 incident 聚合（Cloud 端）
```

這個 pipeline 有一個統一的抽象：

```
Rule {
    input_type:    Detection | Incident
    correlate_by:  List<correlation_key>
    time_window:   Duration
    conditions:    List<predicate>
    output_type:   Incident | Campaign
    severity:      low | medium | high | critical
}
```

每一層的輸出即是下一層的輸入，結構完全同構，Rule Engine 只需實作一次。

---

## 五、Detection Layer 的設計

### Atomic Detection 的輸出格式

Detection 不應該是裸的 alert，而是帶著 entity context 的 indicator：

```
BehavioralIndicator {
    entity_id:     "proc-guid-xxxx"
    tactic:        "Defense Evasion"
    technique:     "T1055.001"
    score:         0.87
    anchor_events: [event_id_1, event_id_2]
    tags:          ["origin.office_child", "behavior.suspicious_cmdline"]
    entity_ctx:    {parent, cmdline, image_path, user, integrity_level}
}
```

### Tag 系統

Tag 是整個 pipeline 的核心機制，Elastic Security 和 Microsoft mpengine（Lua ASR rules）都採用類似做法。

Tag 的價值在於將 low-level 的事件條件提升為高語意的行為標籤，讓上層 rule 可以用語意組合而非重複寫 raw event 條件：

```yaml
# 沒有 tag：rule 要自己描述 low-level 條件
condition: process.parent == "winword.exe" AND cmdline contains "powershell"

# 有 tag：rule 用語意，可跨 rule 共享
condition: tags.contains("origin.office_child") AND tags.contains("behavior.suspicious_cmdline")
```

建議用三個 namespace 管理 tag taxonomy，避免命名空間爆炸：

```
origin.*    → 來源類  (origin.office_child, origin.browser_child)
behavior.*  → 行為類  (behavior.suspicious_cmdline, behavior.hollowing)
risk.*      → 風險類  (risk.rwx_private_memory, risk.lsass_access)
```

Memory region 的類型也是重要的 tag 來源：IMAGE（backed）memory 來自 PE 檔案相對可信；PRIVATE（unbacked）memory 是 `VirtualAlloc` 出來的，shellcode 幾乎都住在這裡。

```
memory.type == PRIVATE AND memory.perm == RWX
    → tag: risk.rwx_private_memory

thread.start_address in PRIVATE region
    → tag: risk.thread_from_unbacked
```

---

## 六、Incident Correlation Layer 的核心設計

### 為什麼需要這一層

業界很多 EDR/SIEM 的現實是「Sigma match 就 alert」，SOC 因此每天收到上萬個 alert，其中 90% 是 FP 或 noise——這就是 alert fatigue 的根源。

Incident correlation 的存在理由就是解決這個問題：將多個低層次的 detection 聚合成少量高語意的 incident，SOC 只需要處理 incident，而不是一堆散的 detection。

CrowdStrike 的分層可以作為參考：Detection（單一 indicator）→ Incident（自動 group 的聚合體，SOC 實際看到的）。Group 的依據不是 rule，而是 process lineage 重疊、時間窗口內的 entity 重疊、以及 ML-based similarity。

### Correlation 的本質問題

判斷兩個 detection 是否屬於同一個 incident，需要兩個維度：

```
Structural：是否來自同一攻擊實體？
            (process lineage, same host, same user)

Semantic：  合在一起是否有意義？
            (tactic 組合, TTP 相關性, temporal ordering)
```

### 推薦方案：Tag-based + Sliding Window + Lightweight Lineage

Tag-based predicate 和 Sliding Window 並不互斥——Tag 是 predicate 的輸入資料來源。結合兩者，再補上 lineage 作為 structural key，可以在不引入 full graph 的情況下解決大部分問題。

**Correlation Key 的設計**：

```
太細（process_guid）  → injection 換 process 後斷鏈
太粗（host）          → 不相關事件被 group 在一起

建議：lineage_id 為主，host 為輔
  lineage_id = hash(proc_guid + parent_guid + grandparent_guid)
  三層祖先覆蓋大多數 injection/spawn chain
```

**Incident Rule 範例**：

```yaml
name: 'Suspicious Execution Chain'
input: detections
correlate_by:
  - lineage_id
time_window: 60m
conditions:
  - tactic_count >= 2
  - any:
      - tags.contains("origin.office_child")
  - any:
      - tactic: Defense Evasion
      - tactic: Persistence
severity: high
```

---

## 七、Correlation Engine 的效能設計

### First Principles 分析

問題的本質是：在無限的 event stream 上，即時判斷「這些 events 是否構成值得注意的行為模式」，可以拆成三個子問題：

```
1. Grouping：哪些 events 應該放在一起考慮？  → O(1) hash map
2. Pattern：這群 events 符合什麼模式？        → O(T × C × D)
3. Scoring：這個模式的嚴重程度？              → O(1)
```

效能瓶頸在 Pattern matching。

**Naive 做法**：每個新 detection 進來，對所有 rule 跑一次 → `O(R × D)`，R = rule 數量。

**正確做法**：Inverted Index，用 tag/tactic 作為索引鍵，只 evaluate 可能相關的 candidate rules：

```
index: tag → List<Rule>

新 Detection 進來：
  for tag in detection.tags:
    candidate_rules |= index[tag]
  for rule in candidate_rules:
    evaluate(rule, window)
```

實際攤銷複雜度降到 `O(T × C × D)`，T ≈ 5 tags，C ≈ 10 candidate rules，D ≈ 20 window detections，每個 detection 約 1000 次操作，完全 real-time 可行。

### CorrelationBucket 的資料結構

```
CorrelationBucket {
    key:              string                         // host|lineage_id
    detections:       Deque<Detection>               // 保留 ordering，O(1) evict
    tag_index:        HashMap<Tag, List<DetId>>      // O(1) tag lookup
    tactic_refcount:  HashMap<Tactic, u32>           // reference count 維護
    last_updated:     Timestamp                      // GC 用
}
```

Tactic coverage 用 reference count 而非 rebuild 維護，避免每次 evict 後重算：

```
insert: refcount[tactic]++
evict:  refcount[tactic]--
        if refcount[tactic] == 0: remove from tactic_set
```

### Window Size 策略

不同 rule 需要不同的 window size（Brute force 用 5 分鐘，slow persistence 可能需要 24 小時）。解法是 cache 保留最長 window，rule evaluate 時自己過濾：

```
全域 max_window = max(所有 rule 的 window_size)
Rule A (5min)  → filter: d.timestamp > now - 5min
Rule B (24h)   → filter: 不過濾，看全部
```

**Session-based Window**（推薦）：

固定 window 的問題是攻擊者不照你的邊界行動。Session-based window 在每次有新 detection 進來時延伸 deadline，並設定 `max_session_duration` 防止無限延伸：

```
Rule {
    window_type:   Fixed | Session
    idle_timeout:  Duration     // 超過此時間無新 detection → session 結束
    max_duration:  Duration     // 防止無限延伸
}
```

---

## 八、本地儲存：SQLite 的職責

In-memory cache 的職責是 rule evaluation 用的 working set，SQLite 解決的是三個完全不同的問題：

### 職責一：歷史紀錄

SOC 事後調查用，回答「這台 host 過去 7 天有哪些 detection？」

### 職責二：網路錯誤 Retry

Agent 到 server 的傳輸失敗時，事件不能掉：

```
detection 產生 → 先寫 SQLite → 傳送到 server → 確認收到 → 標記 delivered
                                   ↓ 失敗
                             retry queue 從 SQLite 撈未 delivered 的重傳
```

### 職責三：Agent 重啟後的 Cache 還原

Agent crash 或更新後，從 SQLite 撈 window 內還沒過期的 detections 重建 bucket。

### Write 策略

同步寫 SQLite 會造成每個 detection 都做 disk write，延遲過高。正確做法是 WAL mode + batch write：

```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
```

```
寫入策略：
  detection → pending_batch
  每 100ms 或 batch >= 50 → 批次寫入 SQLite
  寫入完成 → 放入 cache → trigger rule evaluation
```

SQLite 在 WAL mode 下批次寫入吞吐量可達每秒數千筆。

### Retry 邏輯

```sql
-- 背景 worker 每 30 秒跑一次
SELECT * FROM detections
  WHERE delivered=0 AND retry_count < 5
  ORDER BY timestamp ASC LIMIT 100
```

```
成功 → delivered=1
失敗 → retry_count++, exponential backoff: min(30s × 2^n, 1h)
retry_count >= 5 → dead letter，保留紀錄但不再重試
```

---

## 九、Agent 與 Cloud 的職責分離

### Agent 端的邊界

Agent 的本質限制是**只能看到自己這台機器上的事件**。因此 agent 端 correlation 的上限是：

```
可以做：
  同一 process lineage 的 detection 聚合（Incident）
  同一 host 短時間窗口內的 tactic coverage 判斷
  Inline blocking（single event，near-zero FP 的 hard rules）

不能做：
  跨 host 的 lateral movement 關聯
  跨天的 slow attack（window 太長，資源成本不可接受）
  需要 threat intel 比對的判定（IOC 資料庫太大）
```

### Cloud 端補足的能力

```
Host A: T1055     ─┐
Host B: T1078     ─┼→ Cloud 看到三台 host 構成 lateral movement campaign
Host C: T1021     ─┘    Agent 單獨看任何一台都不知道
```

Cloud 的 correlation 輸入是 Incident，不是 raw detection，資料量可控。

### 架構全貌

```
┌─────────────────────────────────────────────┐
│  Agent                                      │
│                                             │
│  Kernel Events (ETW / Callbacks)            │
│       │                                     │
│       ▼                                     │
│  Detection Layer     (Sigma/YARA)           │
│       │                                     │
│       ├──→ Inline Block   (ASR hard rules)  │
│       ▼                                     │
│  Incident Correlation (同 host, 短 window)  │
│       │                                     │
│       ▼                                     │
│  Incident                                   │
│       │                                     │
│  SQLite (local cache + retry)               │
└───────────────────┬─────────────────────────┘
                    │ HTTPS/2 + mTLS
                    ▼
┌─────────────────────────────────────────────┐
│  Cloud                                      │
│                                             │
│  Ingest Service                             │
│       ├──→ Elasticsearch  (threat hunting)  │
│       └──→ PostgreSQL     (incident state)  │
│                                             │
│  Campaign Correlation                       │
│       │  跨 host / 跨時間 / ML scoring      │
│       ▼                                     │
│  Campaign → PostgreSQL + Elasticsearch      │
│                                             │
│  SOC Console                                │
└─────────────────────────────────────────────┘
```

### 各層的設計差異

| 面向      | Agent                  | Cloud                      |
| --------- | ---------------------- | -------------------------- |
| 輸入      | Raw detections         | Incidents                  |
| 關聯鍵    | process lineage / host | host / subnet / user / IOC |
| 時間窗口  | 分鐘級                 | 小時到天級                 |
| 儲存      | In-memory + SQLite     | Elasticsearch + PostgreSQL |
| 輸出      | Incident               | Campaign                   |
| Rule 來源 | Cloud 下發             | Cloud 本地執行             |

### Rule 下發機制

Agent 的 rule 不應 hardcode，而應由 Cloud 下發 versioned rule package：

```
Rule package：
  detection_rules/    ← Sigma/YARA
  correlation_rules/  ← Incident correlation
  asr_rules/          ← Inline block rules
  version: "2026.03.09.1"
```

Agent 定期 polling 拉最新版本，新 TTP 出現時無需更新 agent binary，幾小時內即可完成全球部署。

### Cloud 端的儲存分工

```
Elasticsearch   → detection/incident 全文搜尋，threat hunting
                  「hash=abc123 出現在哪些 host？」
                  「過去 7 天有 T1055 的所有 detection」

PostgreSQL      → incident 狀態機和 workflow
                  「所有 assigned to Alice 且 open 的 incident」
                  asset metadata, policy, RBAC

Redis           → 跨 agent 的 correlation shared state（Campaign 層，選配）
```

---

## 十、Anti-EDR 視角下的設計盲點

從攻擊者的視角去理解偵測盲點，是設計 detection rule 最有效率的方法。

### 主要繞過手法與對應的偵測設計

| 攻擊手法                    | 影響                       |                                                   EDR 應對 |
| --------------------------- | -------------------------- | ---------------------------------------------------------: |
| PPID Spoofing               | process lineage 斷掉       |     kernel callback 的 creator thread PID 與 PPID 交叉比對 |
| Cmdline Spoofing            | cmdline-based Sigma 全失效 |         CreateProcess event cmdline 與 PEB 查詢結果做 diff |
| Direct/Indirect Syscall     | usermode hook 全盲         |                  依賴 ETW kernel provider + callstack 分析 |
| ETW-patch                   | userspace ETW event 消失   |                偵測 `.text` 被設成 RW 再改回 RX 的行為本身 |
| Process Hollowing           | image name 看起來正常      |                     memory content vs disk image hash 比對 |
| Memory Encryption (Ekko 等) | memory scan 看不到 payload | 偵測記憶體加密產生的 telemetry（CreateTimerQueueTimer 等） |
| Callstack Spoofing          | callstack 看起來合法       |        thread start address 驗證，unbacked region 起源偵測 |

### Callstack Analysis 的高 CP 值

Callstack analysis 比 memory scan 便宜很多（memory scan 的效能成本是 event 的 100 倍），但能偵測一大類繞過手法：

- Direct syscall（callstack 缺少正常的 ntdll.dll frame）
- Thread 從 unbacked region 啟動
- Module stomping（.text section 被覆寫後，file 和 memory 的 hash 不一致）

主要監控的 API：`VirtualAlloc`、`VirtualProtect`、`WriteProcessMemory`、`SetThreadContext`、`MapViewOfFile`。

### 攻擊機制的繞過難度分層

理解每個蒐集機制對應的繞過成本，有助於設計多層防禦：

| 機制                  | 繞過方式                              | 所需權限        |
| --------------------- | ------------------------------------- | --------------- |
| Usermode Hook         | Direct syscall / ntdll remapping      | User            |
| Windows Event Log     | Patch `lsass.exe` 的 ETW write        | High Integrity  |
| ETW-TI                | Patch kernel 的 `ProviderEnableInfo`  | Kernel（BYOVD） |
| Kernel Callbacks      | Callback table unlink（EDRSandblast） | Kernel（BYOVD） |
| ELAM + Boot Integrity | Bootkit / firmware implant            | 實際上不可行    |

這就是為什麼現代 EDR bypass 幾乎都需要 BYOVD（Bring Your Own Vulnerable Driver）——只有 kernel-level 的攻擊才能對抗 kernel-level 的防禦，而進入 kernel 需要合法的 signed driver 作為跳板。

---

## 十一、效能成本的現實考量

不同操作的成本差異懸殊，在設計 pipeline 時必須明確標記：

| 操作              | 相對成本 |
| ----------------- | -------- |
| Event（基準）     | 1×       |
| Event Correlation | 3×       |
| Query Process     | 10×      |
| Memory Scan       | 100×     |
| File Scan         | 1000×    |

**核心原則**：把昂貴操作放在有條件觸發的位置，而不是高頻路徑上。

- Kernel inline blocking 必須在 callback 裡完成，不能有任何 correlation 或 ML inference
- Memory scan 不能常態觸發，需要高置信度的 trigger（如 `CreateRemoteThread()` + `risk.rwx_private_memory` tag 組合）
- ETW-TI 的 LOCAL variants 量遠大於 REMOTE variants，訂閱策略需要精心設計

大多數 detection 的最佳位置是中間層：一個或多個 event 加上 lightweight correlation，必要時才觸發 memory scan。

---

## 十二、事件蒐集的底層機制

前面章節討論的 BehavioralIndicator 和 Tag 是怎麼產生的？這一章往下一層，把 telemetry 蒐集機制本身拆開來看。

整個 Windows EDR 的事件蒐集來源只有以下幾種，所有廠商都是這些的排列組合：

```
1. Kernel Callbacks（Notify Routines）
2. ETW / ETW-TI（Event Tracing for Windows / Threat Intelligence）
3. Minifilter Driver（File System Filter）
4. Object Callbacks（ObRegisterCallbacks）
5. Usermode Hooks（ntdll.dll inline hook）
6. AMSI（Antimalware Scan Interface）
```

---

### Kernel Callbacks（Notify Routines）

這是 EDR 最核心、最難被繞過的蒐集方式。透過 Windows DDK 提供的 API，kernel driver 可以在特定事件發生時直接收到 kernel 的同步通知：

```c
// 三個最重要的 Notify Routine API
PsSetCreateProcessNotifyRoutineEx()  // Process 建立/終止
PsSetCreateThreadNotifyRoutine()     // Thread 建立/終止
PsSetLoadImageNotifyRoutineEx()      // Image load（exe/dll）
```

這些 callback 的關鍵特性：

- 在 kernel context 中同步執行，攻擊者無法在 userland 繞過
- `ProcessNotifyRoutineEx` 可以直接返回 `STATUS_ACCESS_DENIED` 做 inline blocking
- callback 會收到 `PEPROCESS`、`PETHREAD` 指標，可以直接查 kernel object 取得最可信的資訊（比 PEB 更難偽造）
- 每種 callback 在系統全域最多只能有 64 個 slot，廠商之間實際上在搶 slot

**WdFilter.sys 的具體實作**（來自 EDRSandblast 逆向研究）：

```
[NotifyRoutines] WdFilter.sys + 0x4fdc0   ← PsCreateProcess callback
[NotifyRoutines] WdFilter.sys + 0x515c0   ← PsCreateThread callback
[NotifyRoutines] WdFilter.sys + 0x4f0820  ← PsLoadImage callback
[ObjectCallbacks] WdFilter.sys + 0x4da30  ← ObRegisterCallbacks
```

`ObRegisterCallbacks` 是另一個重要機制：當任何 process 嘗試對目標 process 開 handle（`OpenProcess`）時，EDR 可以在 pre-operation callback 裡降權——例如把 `PROCESS_ALL_ACCESS` 改成不含 `PROCESS_VM_READ`，這是 LSASS 保護的底層原理。

---

### ETW-TI（Microsoft-Windows-Threat-Intelligence）

這是目前被研究最深、也最重要的一個 ETW provider，GUID 為 `{F4E1897C-BB5D-5668-F1D8-040F4D8DD344}`。

**ETW-TI 與普通 ETW 的關鍵差異**：

普通 ETW provider 把事件寫到 user buffer，所有有權限的 consumer 都能訂閱。ETW-TI 不同，它直接 hook 在 kernel 的關鍵函數路徑上，提供的是低延遲、高語意的事件。在 PatchGuard 使 SSDT hooking 變得不可行之後，ETW-TI 填補了 EDR 在記憶體操作可見性的空白，尤其是 `Mm*` 函數和 APC 相關操作。

**存取限制**：訂閱者必須以 `PS_PROTECTED_ANTIMALWARE_LIGHT` 或更高等級執行，且關聯的 ELAM driver 需使用 Early Launch EKU 憑證簽署。這是大廠 EDR 的隱形門檻。

**完整 Event 列表**（從 `x nt!EtwTiLog*` 逆向）：

```
EtwTiLogAllocExecVm          → VirtualAllocEx / NtAllocateVirtualMemory
EtwTiLogProtectExecVm        → VirtualProtectEx / NtProtectVirtualMemory
EtwTiLogMapExecView          → MapViewOfSection / NtMapViewOfSection
EtwTiLogReadWriteVm          → ReadProcessMemory / WriteProcessMemory
EtwTiLogInsertQueueUserApc   → QueueUserAPC / NtQueueApcThread
EtwTiLogSetContextThread     → SetThreadContext / NtSetContextThread
EtwTiLogSuspendResumeThread  → SuspendThread / ResumeThread
EtwTiLogSuspendResumeProcess → NtSuspendProcess / NtResumeProcess
EtwTiLogDriverObjectLoad     → Driver 載入（配合 IMAGE_NOTIFY）
```

每個 event 都有 LOCAL（同 process）和 REMOTE（跨 process）兩個變體：

```c
// Keyword bitmask（摘自 ETW-TI manifest）
KERNEL_THREATINT_KEYWORD_ALLOCVM_LOCAL              = 0x1
KERNEL_THREATINT_KEYWORD_ALLOCVM_LOCAL_KERNEL_CALLER = 0x2
KERNEL_THREATINT_KEYWORD_ALLOCVM_REMOTE             = 0x4   // 跨 process！
KERNEL_THREATINT_KEYWORD_ALLOCVM_REMOTE_KERNEL_CALLER= 0x8

KERNEL_THREATINT_KEYWORD_PROTECTVM_REMOTE           = 0x40
KERNEL_THREATINT_KEYWORD_MAPVIEW_REMOTE             = 0x100
KERNEL_THREATINT_KEYWORD_QUEUEUSERAPC_REMOTE        = 0x400
KERNEL_THREATINT_KEYWORD_SETTHREADCONTEXT_REMOTE    = 0x1000
KERNEL_THREATINT_KEYWORD_READVM                     = 0x2000
KERNEL_THREATINT_KEYWORD_WRITEVM                    = 0x4000
```

**EDR 的訂閱策略**：

```
高 ROI，優先訂閱：
  ALLOCVM_REMOTE      → process injection 第一步
  PROTECTVM_REMOTE    → RWX 記憶體準備
  WRITEVM_REMOTE      → shellcode 寫入
  MAPVIEW_REMOTE      → section-based injection
  QUEUEUSERAPC_REMOTE → APC injection
  SETTHREADCONTEXT_REMOTE → thread hijacking

有成本考量，按需訂閱：
  READVM_REMOTE       → LSASS dump 偵測（但量大）
  *_LOCAL variants    → 大多是良性行為，噪音多
  *_KERNEL_CALLER     → 幾乎都是系統行為
```

**ETW-TI 的根本限制**：它是非同步的——事件在操作完成後才產生，而不是同步攔截。對長期 APT 偵測很好，但對需要「在加密前攔截」的勒索病毒防護，非同步路徑可能太慢（需要搭配 Minifilter 的同步路徑）。

**ETW-TI 的繞過與反制**：

```
攻擊面 1：patch kernel 記憶體中的 ProviderEnableInfo
  target: nt!EtwThreatIntProvRegHandle → _ETW_GUID_ENTRY.ProviderEnableInfo
  patch to 0x0 → 所有 ETW-TI 事件靜默
  需要 kernel write primitive（通常靠 BYOVD）

攻擊面 2：DKOM 操作 _ETW_SILODRIVERSTATE
  Lazarus APT 的 FudModule rootkit 使用此技術

EDR 的反制：
  driver 載入時驗證 ProviderEnableInfo 不為 null
  發現被清零 → 回報 telemetry server
```

---

### Minifilter Driver（I/O Filter Stack）

Minifilter 掛在 Windows Filter Manager 框架下，透過 `FltRegisterFilter` 加入 I/O 攔截鏈，可以在每個 IRP 操作的前後插入 Pre/Post callback：

```
IRP_MJ_CREATE          → 檔案開啟
IRP_MJ_WRITE           → 檔案寫入
IRP_MJ_SET_INFORMATION → 檔案改名/刪除
IRP_MJ_READ            → 檔案讀取
```

每個 Minifilter 都有一個 Altitude 數字，決定在 I/O stack 中的位置。WdFilter 的 Altitude 是 `328010`，屬於 Anti-Virus 群組，會在大部分其他 filter 之前看到操作。

WdFilter 在 Pre-callback 可以直接返回 `FLT_PREOP_DISALLOW_FASTIO` 來阻止操作——這是 Real-time Protection（檔案寫入攔截）的底層機制，也是勒索病毒偵測的同步攔截路徑。

---

### Usermode Hook 為什麼大廠不愛用

Usermode Hook 是把 ntdll.dll 的 syscall wrapper 開頭幾個 byte 換成 jump 指令，把執行流劫持到 EDR 的 DLL。問題在於繞過方式過於簡單：

```
1. Direct Syscall → 直接呼叫 syscall 指令，完全跳過 ntdll
2. Indirect Syscall → 用 ntdll 裡的 syscall gadget，繞過 hook 位置
3. ntdll 自我恢復 → 從 \KnownDlls\ntdll.dll 重新 map 乾淨的版本
```

Elastic 的工程師明確表示：usermode hook 不是安全邊界（not a security boundary）——它對高階攻擊者幾乎沒有阻力。有效的 Kernel Callbacks + ETW-TI 才是真正的防線。

---

### MDE 的 ETW 訂閱規模（作為參考基線）

根據 FalconForce 的逆向研究，MDE 的設定檔（Bond 格式序列化、從 cloud 下載、簽章保護）包含約 65 個 ETW providers、500 個 registry path 監控、70,000 行 JSON 設定。

**Tier 1：Kernel 高信任 Providers**

```
Microsoft-Windows-Threat-Intelligence      GUID: f4e1897c-...（需 ELAM）
Microsoft-Windows-Kernel-Process           GUID: 22FB2CD6-...
Microsoft-Windows-Kernel-Audit-API-Calls   GUID: e02a841c-...
Microsoft-Windows-Kernel-File              GUID: edd08927-...
```

**Tier 2：高語意 Windows 系統 Providers**

```
Microsoft-Windows-Security-Auditing        38 個 Event ID（MDE 內部稱 "SecureETW"）
Microsoft-Windows-Win32k                   GUI hook 偵測
Microsoft-Windows-PowerShell               Script Block Logging
Microsoft-Windows-DNS-Client               DNS 查詢記錄
Microsoft-Windows-WinINet / WebIO          HTTP 活動
```

**重要部署陷阱**：`Security-Auditing` 的多個 EventID 預設未啟用，需要 GPO 開啟 Advanced Audit Policy。4688（Process Creation）需啟用 "Audit Process Creation" 並開啟 cmdline logging；4625（Logon failure）需要 "Audit Logon" 包含 Failure。設定不正確時 MDE 會有靜默的 blind spot。

---

## 十三、業界大廠的實作比較

有了前兩章對蒐集機制的認識，這一章用大廠的實際決策來驗證哪些思路是工業標準，哪些是各家的差異化選擇。

---

### 各家蒐集機制總覽

| 機制                | MDE                 | CrowdStrike    | SentinelOne        | Elastic Defend         |
| ------------------- | ------------------- | -------------- | ------------------ | ---------------------- |
| Kernel Callbacks    | ✅ WdFilter.sys     | ✅ csagent.sys | ✅ sentinelone.sys | ✅ ElasticEndpoint.sys |
| ETW-TI              | ✅（需 ELAM）       | ✅（需 ELAM）  | ✅                 | ✅ 全面 + callstack    |
| Minifilter          | ✅ Altitude 328010  | ✅             | ✅                 | ✅                     |
| ObRegisterCallbacks | ✅（LSASS 保護）    | ✅             | ✅                 | ✅                     |
| Usermode Hook       | ❌                  | ❌             | ⚠️ 部分使用        | ⚠️ 部分使用            |
| AMSI                | ✅（整合 mpengine） | ✅             | ✅                 | ✅                     |
| Windows Event Log   | ✅（38 EventID）    | 部分           | 少                 | ✅（直接訂閱 ETW）     |
| Intel PT            | ❌                  | ✅（部分）     | ❌                 | ❌                     |
| eBPF（Linux）       | ❌                  | ✅             | ✅                 | ✅                     |

---

### Microsoft Defender for Endpoint（MDE）

**ASR Rules 作為 Inline Blocking 層**

MDE 的 ASR（Attack Surface Reduction）rules 是 Layer 1 Inline Blocking 的工業實作：

```
Block Office applications from creating executable content
Block Office applications from injecting code into other processes
Block credential stealing from Windows local security authority subsystem
Block process creations originating from PSExec and WMI commands
```

ASR rule 有三個模式：Audit（只記錄）→ Warn（警告但不阻擋）→ Block，讓部署方可以先用 Audit 模式觀察 FP 衝擊，再逐步收緊。這解決了 inline blocking 最難的問題：如何在不影響業務的前提下部署。

**mpengine.dll 的 Tag + Lua 架構**

mpengine.dll 的內部架構正好對應 tag-based detection：

```
Event 進來
  → 打 tag（Lua 腳本處理）
  → 多個 tag 組合判斷
  → 觸發 ASR rule 或 alert
```

Lua 腳本讓規則邏輯可以在不更新引擎 binary 的情況下部署，這就是「Cloud 下發 rule package」概念的具體實現。

**Alert → Incident 的自動聚合**

MDE 在 Microsoft 365 Defender 中把多個相關 Alert 自動聚合成 Incident，聚合依據包括同機器相近時間的 alerts、相同 process lineage、相關 IOC。SOC 看到的是 Incident，而不是一堆散的 Alert。

---

### CrowdStrike Falcon

**Cloud-native 的核心決策**

CrowdStrike 最重要的架構決策是：**大多數判定邏輯在 Cloud 端而非 Agent 端**。Falcon Sensor 盡量輕量，主要職責是高保真的 telemetry 收集，把事件串流到 cloud 的 Threat Graph 做分析。

這個選擇的 tradeoff：

```
優點：Agent 更輕量，偵測邏輯更新不需要 Agent 升級
缺點：離線環境下保護能力下降，網路延遲影響即時 blocking
```

**動態設定檔（.cy 檔案）機制**

Falcon 最具特色的設計是把偵測邏輯從 driver binary 分離出來。csagent.sys 本身只是一個 interpreter，真正的規則和 pcode 存在 `.cy` 設定檔中，從 cloud 動態推送。新 TTP 偵測規則可以在幾小時內部署到全球端點，不需 driver 更新。2024 年 BSOD 事件的根源是有缺陷的 `.cy` 檔被 driver 未經驗證地執行，暴露的不是這個設計思路的問題，而是 interpreter 本身缺乏對 pcode 格式的防禦性驗證。

**Intel PT 硬體加速**

CrowdStrike 是少數商業 EDR 中實際啟用 Intel Processor Trace 的廠商之一，用於 ROP chain 偵測（Control Flow Integrity 檢查）和 shellcode 執行路徑分析，比軟體 callstack 有更低的 overhead。

---

### SentinelOne

**Storyline：在 Agent 端的輕量 Provenance Graph**

SentinelOne 的核心差異化是 Storyline，它在 Agent 端實時維護 lightweight in-memory provenance graph：

```
每個 process 建立時分配 Storyline ID（STID）
STID = hash(parent_STID + process_guid + boot_time)
  → 跨 process injection 後 thread 的活動仍關聯到注入者的 Storyline

Storyline 的 alert grouping：
  同 STID 的所有 alerts → 合成一個 Storyline alert
  SOC 直接看到完整 attack chain，不需手動關聯
```

這和我們建議的設計高度對應：不需要 full graph，用 lineage_id + entity relationship 在 agent 端維護輕量版 graph。Storyline 從資料模型層就解決了 alert grouping 的問題，而不是在 alert 之後再去 group。

**Usermode Hook 的脆弱性**

S1 相對其他大廠更依賴 usermode hook。這解釋了為什麼 S1 對 `MicrosoftSignedOnly` process mitigation 特別脆弱——一旦啟用，S1 的非 Microsoft 簽署 DLL 無法注入，整個 usermode hook 機制失效；而 CrowdStrike 和 MDE 因為元件都有 Microsoft 簽署，不受影響。

**STAR：把 hunting query 轉成 detection rule**

STAR（Storyline Active Response）讓分析師把 threat hunting 的 query 直接轉成 detection rule 並即時 push 到整個 fleet，這跟我們設計的 Cloud 下發 rule 的概念完全一致，只是 SentinelOne 把這個流程做成了 no-code 的產品功能。

---

### Elastic Security（Elastic Defend）

Elastic 是這幾家中最透明的，detection rules 幾乎全部公開在 GitHub 的 `elastic/detection-rules` 和 `elastic/protections-artifacts` 兩個 repo 中，是研究 EDR rule 設計最好的公開資源。

**EQL：Sequence Detection 的專用語言**

Elastic 自行設計了 EQL（Event Query Language）來表達 temporal sequence 的 detection rule：

```eql
// 偵測 msxsl.exe 建立 process 後立刻建立 outbound connection
sequence by process.entity_id
  [process where event.type == "start" and process.name == "msxsl.exe"]
  [network where process.name == "msxsl.exe" and network.direction == "outgoing"]
```

EQL 的 `sequence by` 語法直接表達了「事件 A 發生後 N 秒內事件 B 也發生」這種 temporal ordering，這是 tag-based 難以表達的缺口的解法。只有當整個 sequence 都 match 才觸發 alert，從 rule 語言層就解決了 FP 問題。

**Linux 的 eBPF 策略**

Elastic 在 Linux 上放棄傳統的 kprobe 或 kernel module，完全轉向 eBPF：

```
核心機制：eBPF programs 掛在 syscall tracepoints 和 LSM hooks

監控的 syscall（部分）：
  execve / execveat     → process 執行
  ptrace                → 偵錯/注入行為
  memfd_create          → fileless payload 偵測（5.10+）
  connect / accept      → 網路連線
  mmap / mprotect       → 記憶體操作

eBPF 的優勢：
  verifier 在載入時靜態驗證安全性，不可能 kernel panic
  CO-RE 跨 kernel 版本（Compile Once, Run Everywhere）
```

**Callstack 強化**

Elastic 在 8.8 版引入了 kernel call stack 蒐集，在 8.11 進一步強化。對 ETW-TI 事件同時蒐集觸發 thread 的 kernel callstack，用於偵測 direct syscall（callstack 缺少 ntdll.dll frame）和 unbacked memory 起源。

---

### 各大廠的設計對比

| 面向             | MDE                  | CrowdStrike         | SentinelOne     | Elastic            |
| ---------------- | -------------------- | ------------------- | --------------- | ------------------ |
| 判定主體         | Agent + Cloud        | 偏 Cloud            | Agent 為主      | Agent + Cloud      |
| Correlation 機制 | Alert grouping       | Threat Graph        | Storyline       | EQL Sequence       |
| Rule 語言        | Lua (mpengine)       | 專有 pcode          | STAR Query      | EQL / KQL          |
| Inline Blocking  | ASR Rules            | Prevention Policy   | App Control     | Prevention Rules   |
| 透明度           | 文件公開             | 黑箱                | 部分公開        | 完全公開           |
| Graph 深度       | 淺（Alert grouping） | 深（全 Provenance） | 中（Storyline） | 中（EQL sequence） |

**從這張表可以得到幾個設計結論**：

1. 沒有人「只是 Sigma match 就 alert」——所有大廠都有某種形式的 correlation/grouping layer
2. Inline blocking 是標配，每家有自己的實作
3. Rule 下發機制是必要的，沒有一家把 rule hardcode 在 agent binary 裡
4. Provenance Graph 的深度是差異化點：CrowdStrike 做最深（cloud 端完整圖），SentinelOne 做輕量版（agent 端 Storyline），Elastic 用 EQL sequence 在 rule 語言層繞過這個問題

---

## 十四、整體設計收斂

前面十三章把 pipeline 的每個環節個別拆解。這一章做三件事：用一張完整的架構圖把所有元件的位置關係收斂；用場景比較表說明在不同的資源與目標限制下哪些決策會改變；列出開發者的設計原則；最後指出這套架構已知的失效條件。

---

### 完整架構圖

```
BOOT
  ELAM Driver (e.g. WdBoot.sys)
      掃描 boot drivers → 分類 known-good / unknown / known-bad
      → 啟用 ETW-TI Secure Channel（ELAM EKU 憑證認證）

─────────────────────────── KERNEL SPACE ───────────────────────────

  EDR Driver (e.g. WdFilter.sys / csagent.sys)
  │
  ├─ PsSetCreateProcessNotifyRoutineEx   → ProcessEvent{pid, ppid, cmdline, image}
  ├─ PsSetCreateThreadNotifyRoutine      → ThreadEvent{tid, start_addr}
  ├─ PsSetLoadImageNotifyRoutineEx       → ImageLoadEvent{path, base, size}
  ├─ ObRegisterCallbacks                 → HandleEvent{target_pid, access_mask}
  └─ FltRegisterFilter (Minifilter)      → FileEvent{op, path, size}

  ETW-TI Provider  GUID: f4e1897c-bb5d-5668-f1d8-040f4d8dd344
  │  [只有 ELAM-backed PPL process 可訂閱]
  ├─ EtwTiLogAllocExecVm      → ALLOCVM_{LOCAL,REMOTE}
  ├─ EtwTiLogProtectExecVm    → PROTECTVM_{LOCAL,REMOTE}
  ├─ EtwTiLogMapExecView      → MAPVIEW_{LOCAL,REMOTE}
  ├─ EtwTiLogReadWriteVm      → {READ,WRITE}VM_{LOCAL,REMOTE}
  ├─ EtwTiLogInsertQueueUserApc → QUEUEUSERAPC_REMOTE
  ├─ EtwTiLogSetContextThread → SETTHREADCONTEXT_REMOTE
  └─ EtwTiLogSuspendResumeThread/Process

─────────────────────────── USER SPACE (PPL) ───────────────────────

  EDR Sensor Service (e.g. MsSense.exe)  [PS_PROTECTED_ANTIMALWARE_LIGHT]
  │
  ├─ ETW Session（~65 providers）
  │   ├─ Microsoft-Windows-Kernel-Process        (ProcessStart/Stop/ImageLoad)
  │   ├─ Microsoft-Windows-Kernel-Audit-API-Calls (OpenProcess + DesiredAccess)
  │   ├─ Microsoft-Windows-Security-Auditing      (38 Event IDs via WEL)
  │   ├─ Microsoft-Windows-PowerShell             (Script Block Logging)
  │   ├─ Microsoft-Windows-DNS-Client             (DNS 查詢)
  │   ├─ Microsoft-Windows-WinINet / WebIO        (HTTP activity)
  │   └─ [vendor-exclusive providers]
  │
  ├─ Inline Blocking  ←─── Kernel Callback 同步路徑
  │   適用：high-confidence hard rules（已知惡意 hash、LSASS wrong access mask）
  │   限制：無 correlation context，FP 代價是業務中斷
  │
  ├─ Detection Layer
  │   Raw Events → Sigma / YARA atomic rule match
  │   輸出：BehavioralIndicator { entity_id, tactic, technique,
  │                               score, tags[], anchor_events[] }
  │
  ├─ Incident Correlation Layer
  │   key:    lineage_id = hash(proc_guid ‖ parent_guid ‖ grandparent_guid)
  │   struct: CorrelationBucket { Deque<Detection>,
  │                               tag→[DetId] inverted index,
  │                               tactic refcount }
  │   window: session-based（idle_timeout=5min, max_duration=1h）
  │   輸出：Incident { tactic_coverage, severity, timeline, entity_ctx }
  │
  └─ Local SQLite  (WAL + batch write 每 100ms 或 50 筆)
      用途: events store / retry queue / cache 還原

───────────────────────────── CLOUD ────────────────────────────────

  Transport: HTTPS/2 + mTLS
  上傳優先順序: Incident > Detection > Raw events

  Elasticsearch   → 所有 raw events，threat hunting，timeline query
  PostgreSQL      → incident state machine，asset inventory，RBAC
  Redis (optional)→ cross-host lineage_id shared state，Campaign correlation

  Campaign Layer  → cross-host lateral movement pattern detection
  ML / TI         → anomaly scoring，IOC enrichment
  Rule Management → versioned package，agent 定期 poll
```

---

### 事件路由的三條分支

| 來源類型                  | 代表事件                                  | 信任度                 | 語意層次                       | 路由目標                      |
| ------------------------- | ----------------------------------------- | ---------------------- | ------------------------------ | ----------------------------- |
| Kernel Callbacks / ETW-TI | VirtualAllocEx, CreateProcess             | 高（kernel-side 記錄） | 低（行為原語，需 correlation） | Detection Layer               |
| 高語意 Windows Events     | 7045 service install, 4698 scheduled task | 中（lsass 中轉）       | 高（單筆即完整攻擊行為）       | 直接 Incident Layer           |
| 需聚合才有意義的 Events   | 4625 logon failure                        | 中                     | 低（單筆無意義）               | 計數器 → 超閾值才進 Detection |
| Inline blocking 路徑      | 已知惡意 hash image load                  | 高                     | 直接明確                       | Kernel Callback 同步阻擋      |

**核心判斷標準**：若單一事件本身的語意足以確認攻擊意圖，直接進 Incident Layer，不需要先經過 Detection Layer 累積分數。

---

### 不同場景下的設計取捨

| 決策維度           | 完整企業 EDR               | 資源受限 / 無 ELAM     | 大規模 Cloud                 | 研究 / Lab                | 紅隊評估               |
| ------------------ | -------------------------- | ---------------------- | ---------------------------- | ------------------------- | ---------------------- |
| ETW-TI             | 全面訂閱                   | **放棄（無 ELAM）**    | 全面，on-device 過濾         | 全部 keywords + callstack | 研究繞過方式           |
| Event Log 依賴     | 38 EventID                 | **提升依賴（補償）**   | 低（高量不上傳）             | 全量                      | 測試 Audit Policy 盲點 |
| Inline Blocking    | hard rules only            | hard rules only        | hard rules only              | **關閉（觀測為主）**      | 不適用                 |
| Correlation Window | idle=5min, max=1h          | idle=5min, max=1h      | **max=4h，超限 serialize**   | 無限制                    | 不適用                 |
| SIEM 上傳策略      | Incident > Detection > Raw | **WEF 集中代替 cloud** | **只傳 Indicator，不傳 raw** | 全量 raw                  | 不適用                 |

**資源受限場景的補償策略**：無 ETW-TI 時，加強 Kernel Callback 的欄位利用（`PsSetLoadImageNotifyRoutineEx` 的 extended info 包含 image hash 和簽章資訊），並確保 GPO 把 38 個 Security EventID 全部啟用——這是最低成本的補償措施。

**大規模 Cloud 場景**：ETW-TI 的 LOCAL variants 在大型環境每秒可產生數百萬事件。解法是 agent 端完成 Detection 運算後只上傳 BehavioralIndicator，raw events 只在 Indicator score 超過閾值時附帶。

---

### 開發者應銘記的設計原則

這七條原則不是規範，而是在設計每個元件時反覆會踩到的判斷點。

**信任來源，而非信任內容。** PEB 的 CommandLine、PPID、ImagePathName 全部可以從 userland 偽造，成本很低。唯一結構上難以偽造的是 kernel 在 callback 時給你的 `PEPROCESS` 結構內部欄位，以及 ETW-TI 在 kernel-side 記錄的操作參數。在寫 Sigma rule 或 correlation rule 時，每個欄位都應該知道自己在哪個信任層——依賴 PEB 的欄位就是依賴攻擊者可控的輸入。

**單一來源等於單一失敗點。** LSASS dump 偵測不能只靠 `ObRegisterCallbacks` 的 `OpenProcess` pre-callback，因為 callback table 可以被 unlink。同樣的行為至少要對應兩條獨立的觸發路徑：ETW-TI 的 `READVM_REMOTE` 事件是第二條，Minifilter 偵測到 minidump 格式的檔案被寫入磁碟是第三條。三條路徑各自對應不同的攻擊面，任何單一機制被繞過，其他兩條仍在。

**Inline Blocking 只做零歧義的判斷。** Kernel callback 的同步路徑沒有 correlation context，它在毫秒內必須做出決定。把複雜的行為分析邏輯放進去是危險的設計——FP 的代價是業務中斷，一個誤判就能讓正常的服務無法啟動。Inline Blocking 應該只處理「不需要 context 就能確定」的情況：已知惡意 hash 的 image load、LSASS 被以 `PROCESS_VM_READ | PROCESS_VM_WRITE` 打開。其他的都交給 Detection Layer 做異步判斷。

**效能預算要顯式標記。** Memory Scan 的成本是單一 Event 的 100 倍，File Scan 是 1000 倍，ETW-TI 的 LOCAL variants 量遠大於 REMOTE variants。如果對每個蒐集機制不標記成本，設計 pipeline 時就會不自覺地把昂貴操作放在高頻路徑上。正確的做法是設計明確的觸發條件：Memory Scan 只在特定高信心 tag 組合（`risk.rwx_private_memory` + `behavior.remote_write`）同時出現時才啟動，而不是對每一個 WriteVM 事件都觸發。

**SOC 體驗是架構目標之一，不是事後考量。** 偵測引擎設計得再精確，如果每天產生一萬個 noise alert，分析師最終會開始忽略所有 alert。「每個 attack chain 只產生一個 alert」是 SentinelOne Storyline 的核心設計哲學，而不是 UI 功能。Incident 的 tactic coverage、30 秒可用的 entity context、以及 alert 去重，這些都是在 Correlation Layer 設計時就要決定的事。

**Cloud 的角色是做 Agent 結構上做不到的事。** Agent 能看到同一台機器上的所有事件，但它永遠看不到其他主機的事件。APT 的橫向移動、Island Hopping、多階段 supply chain attack，本質上需要跨機資料關聯才能識別。Cloud 不應該重複 Agent 已經做好的事（single-host correlation），而應該專注在 Agent 無法完成的 Campaign-level correlation 和跨組織的 TI enrichment。

**偵測規則與 Driver Binary 必須能獨立更新。** 把規則邏輯硬編碼在 driver 裡是架構性的錯誤。Driver 更新需要重新簽章、QA、分發，週期以周計。當新 TTP 出現時，回應時間從幾小時變成幾周。正確的設計是 Driver 作為 interpreter，規則邏輯以 versioned package 從 Cloud 下推，agent 定期 poll，無需重啟或更新 binary 就能部署新偵測邏輯。CrowdStrike 的 `.cy` 動態設定機制是這個設計的商業實現——2024 年的 BSOD 事件暴露的不是這個設計思路的問題，而是 interpreter 本身缺乏對 pcode 格式的防禦性驗證。

---

### 實作優先順序

自行開發 EDR 時，建議按以下四個 Phase 推進，每個 Phase 都是可獨立運作的里程碑：

**Phase 1 — 基礎蒐集（最小可用系統）**

Kernel driver 實作三個核心 Notify Routines 和 `ObRegisterCallbacks`；userspace sensor 訂閱 `Microsoft-Windows-Kernel-Process`、`Microsoft-Windows-Security-Auditing`、PowerShell provider；kernel 到 userspace 的通道用 named pipe 或 IOCTL；事件格式預留 priority queue（HIGH_TRUST events 優先處理）。這個 Phase 不需要 ELAM，部署門檻最低。

**Phase 2 — Detection 與 Correlation**

Detection Layer 使用現有 Sigma rule engine（sigma-go 或自行實作），YARA memory scan 只在明確的 high-confidence 事件觸發。Incident Correlation Layer 建立 CorrelationBucket 結構（Deque + Inverted Index + tactic RefCount）和 session window 機制。本地 SQLite 以 WAL mode + batch write 運作，同時作為 event store、retry queue 和 correlation cache 的備援儲存。

**Phase 3 — Anti-Tamper 與 ELAM**

實作 callback self-check（定期驗證自己的 callback 仍在 table 中）；監控 ETW-TI `ProviderEnableInfo` 是否被清零；保護自己的 registry key。若通過 Microsoft 的安全審查取得 ELAM co-signing，則可以開啟 ETW-TI 訂閱，這是最顯著提升記憶體操作可見性的單一改進。

**Phase 4 — Cloud Backend**

Agent 到 Cloud 用 HTTPS/2 + mTLS；上傳優先順序為 Incident > Detection > Raw events。Cloud 端三個儲存各司其職：Elasticsearch 存所有 raw events 供 threat hunting；PostgreSQL 管 incident state machine 和 RBAC；Redis 做跨 host 的 lineage_id 共享（Campaign correlation）。Rule distribution 以 versioned package 下推。

---

### 已知邊界與失效條件

**ETW-TI 是非同步的**

ETW-TI 在操作完成後才產生事件，無法做同步阻擋。對勒索病毒這種快速批次加密的攻擊，等到 Incident 形成時損害可能已發生。緩解方向是強化 Minifilter 的同步路徑：在大量 file rename（副檔名替換）發生的前幾筆就觸發 blocking，這條路徑不依賴 ETW-TI。

**BYOVD 使 kernel 防線大範圍失效**

任何 kernel callback 的防禦，面對「以 signed 但有漏洞的 driver 取得 kernel write primitive」的攻擊都會喪失可見性。單靠 EDR 無法完整對抗 BYOVD，需要在系統層面配合 WDAC Vulnerable Driver Blocklist 和 HVCI——這超出了 EDR pipeline 本身的設計範疇。

**Alert fatigue 是持續的運營問題**

Correlation engine 可以降低 FP，但無法降至零。生產環境中需要持續調整 rule score threshold、tag weight 和 correlation window 參數。沒有 SOC 反饋 → rule tuning 的閉環，correlation engine 的參數會在部署後逐漸與實際環境脫節。

**跨平台覆蓋需要獨立的蒐集層**

Linux（eBPF + LSM + auditd）和 macOS（Endpoint Security Framework）的蒐集機制完全不同，需要各自設計。但 Detection Layer 和 Correlation Layer 可以共用——把各平台的事件正規化成統一 schema（ECS 或 OCSF）後，Sigma rules 和 correlation rules 可以做到 platform-agnostic。

**Security Event Log 依賴 Audit Policy 設定**

任何依賴 Windows Event Log 的偵測都存在靜默的部署陷阱：多個 EventID 預設未啟用，且 GPO 設定可能因 OU 繼承問題而不一致。解法是在 agent 啟動時主動稽核本機的 Audit Policy 狀態，若發現缺少關鍵設定，寫入告警並上報。

---

## 結語

這個架構的核心思想可以用一句話概括：**在正確的層次做正確的事**。

Kernel callback 負責不可繞過的行為原語；Tag + Sliding Window + Inverted Index 讓 agent 端的 correlation 在毫秒級完成；SQLite 提供本地的可靠性保證；Cloud 端的 Elasticsearch 和 PostgreSQL 各司其職，不試圖用單一資料庫解決所有問題。

最終，這套架構不以「還原完整 attack chain」為目標，而是讓任何一個攻擊環節都有機會被抓到，並且在抓到的當下就能給 SOC 足夠的 context 去做判斷。

---

## 參考資料

以下依章節順序排列，標注引用位置與用途。

---

### 官方文件與規格

**[1] [Microsoft — Attack Surface Reduction Rules（ASR Rules）](https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference)**

- 用途：第十三章 MDE 段落，ASR rules 模式（Audit / Warn / Block）與各 rule 定義

**[2] [Microsoft — Advanced Audit Policy Configuration](https://learn.microsoft.com/en-us/windows/security/threat-protection/auditing/advanced-security-audit-policy-settings)**

- 用途：第十二章、第十四章，Security Event Log 需要的 Audit Policy 設定清單

**[3] [Microsoft — Event Tracing for Windows（ETW）Architecture](https://learn.microsoft.com/en-us/windows/win32/etw/about-event-tracing)**

- 用途：第十二章 ETW-TI 與 ETW provider 四種類型說明

**[4] [Microsoft — Protected Processes（PPL）](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-)**

- 用途：第十二章 ETW-TI 訂閱的 PPL 要求說明

**[5] [Microsoft — Windows Driver Kit：Kernel-Mode Driver Architecture](https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/)**

- 用途：第十二章，PsSetCreateProcessNotifyRoutineEx 等 Notify Routine API

**[6] [Microsoft — Filter Manager Concepts（Minifilter Altitude）](https://learn.microsoft.com/en-us/windows-hardware/drivers/ifs/filter-manager-concepts)**

- 用途：第十二章，WdFilter Altitude 328010 的定義與 Filter Stack 說明

**[7] [Microsoft — Early Launch Antimalware（ELAM）](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/early-launch-antimalware)**

- 用途：第十二章 ETW-TI 的 ELAM 要求，第十四章 Phase 3

**[8] [Microsoft — Hypervisor-Protected Code Integrity（HVCI）](https://learn.microsoft.com/en-us/windows/security/hardware-security/enable-virtualization-based-protection-of-code-integrity)**

- 用途：第十四章，BYOVD 失效條件的緩解措施

---

### 逆向工程與安全研究

**[9] [FalconForce — MDEtect: Researching MDE's visibility](https://falconforce.nl/mdetect-researching-mdes-visibility/)**

- 用途：第十二章，MDE 的 65 個 ETW providers、500 registry paths、70,000 行 JSON 設定數據的來源

**[10] [FalconForce — SysWhispers is Dead, Long Live SysWhispers! （含 ETW-TI keyword bitmask 分析）](https://falconforce.nl/syswhispers-is-dead-long-live-syswhispers/)**

- 用途：第十二章 ETW-TI 的 keyword bitmask 清單（ALLOCVM_REMOTE = 0x4 等）

**[11] [Elastic Security Labs — Hunting for Suspicious Windows Libraries for Threat Detection and Forensics](https://www.elastic.co/security-labs/hunting-for-suspicious-windows-libraries-for-threat-detection-and-forensics)**

- 用途：第十二章，Elastic 工程師明確表示 usermode hook 不是安全邊界的立場

**[12] [Elastic Security Labs — Kernel ETW is dead, long live kernel ETW](https://www.elastic.co/security-labs/kernel-etw-is-dead-long-live-kernel-etw)**

- 用途：第十二章，Elastic 選擇 kernel ETW 取代 usermode hook 的技術決策說明

**[13] [EDRSandblast（GitHub: wavestone-cdt/EDRSandblast）](https://github.com/wavestone-cdt/EDRSandblast)**

- 用途：第十二章，WdFilter.sys callback 的具體 offset（PsCreateProcess 0x4fdc0 等）；第十章，Kernel Callback unlink 的攻擊手法

**[14] [RedEdr（GitHub: dobin/RedEdr）](https://github.com/dobin/RedEdr)**

- 用途：第十四章場景 C，自簽 ELAM driver 實現 ETW-TI 訂閱的研究工具

**[15] [TelemetrySourcerer（GitHub: jthuraisamy/TelemetrySourcerer）](https://github.com/jthuraisamy/TelemetrySourcerer)**

- 用途：第十四章場景 C，觀察 Kernel Callbacks 的研究工具

**[16] [ScyllaHide / ProcCallback](https://github.com/x64dbg/ScyllaHide)**

- 用途：第十四章場景 C，Kernel Callback 觀察工具

---

### 攻擊技術研究

**[17] [ESET Research — Who's Responsible for the FudModule Rootkit? （Lazarus / BlackCasino）](https://www.welivesecurity.com/2022/09/30/amazon-themed-campaigns-sidewinder-possible-targets-pakistan-china/)**

- 用途：第十二章 ETW-TI 的繞過，Lazarus APT FudModule rootkit 修改 EtwpActiveSystemLoggers 的 DKOM 技術
- 補充參考：[Lazarus and the Tale of Three Backdoors](https://blog.avast.com/lazarus-and-the-tale-of-three-backdoors)

**[18] [0xec — ETW Threat Intelligence Provider（詳細逆向分析）](https://undev.ninja/introduction-to-threat-intelligence-etw/)**

- 用途：第十二章 ETW-TI 的完整 event 清單（從 `x nt!EtwTiLog*` 逆向），keyword bitmask 定義

**[19] [CrowdStrike — Technical Analysis of the July 19 Incident（2024 BSOD RCA）](https://www.crowdstrike.com/blog/falcon-update-for-windows-hosts-technical-details/)**

- 用途：第十三章，`.cy` 動態設定機制與 2024 BSOD 事件的根因分析

---

### 業界公開資源

**[20] [Elastic — Detection Rules（GitHub: elastic/detection-rules）](https://github.com/elastic/detection-rules)**

- 用途：第十三章，EQL rule 範例與 Elastic rule 設計參考

**[21] [Elastic — Protections Artifacts（GitHub: elastic/protections-artifacts）](https://github.com/elastic/protections-artifacts)**

- 用途：第十三章，Elastic 的 YARA/prevention rule 公開資源

**[22] [Sigma Project（GitHub: SigmaHQ/sigma）](https://github.com/SigmaHQ/sigma)**

- 用途：第四、五章，Sigma rule 格式與 Detection Layer 的 rule 設計參考

**[23] [sigma-go（GitHub: bradleyjkemp/sigma-go）](https://github.com/bradleyjkemp/sigma-go)**

- 用途：第十四章 Phase 2，Go 語言 Sigma rule engine 實作參考

**[24] [SilkETW（GitHub: mandiant/SilkETW）](https://github.com/mandiant/SilkETW)**

- 用途：第十四章場景 C，ETW provider 蒐集的開源研究工具

**[25] [Atomic Red Team（GitHub: redcanaryco/atomic-red-team）](https://github.com/redcanaryco/atomic-red-team)**

- 用途：第十四章場景 D，用於建立 EDR coverage 基線測試的 TTPs 庫

**[26] [MITRE ATT&CK Framework](https://attack.mitre.org/)**

- 用途：全文，MITRE Tactic / Technique 命名規範（T1055 等），以及 correlation rule 的 tactic coverage 設計

---

### 資料格式與標準

**[27] [Elastic Common Schema（ECS）](https://www.elastic.co/guide/en/ecs/current/index.html)**

- 用途：第十四章，跨平台事件正規化的 schema 選項

**[28] [Open Cybersecurity Schema Framework（OCSF）](https://schema.ocsf.io/)**

- 用途：第十四章，跨平台事件正規化的 schema 選項

**[29] [Microsoft Bond（序列化框架）](https://github.com/microsoft/bond)**

- 用途：第十二章，MDE telemetry 的 Bond 序列化格式說明

---

### 補充工具與框架

**[30] [Velociraptor](https://www.velocidex.com/)**

- 用途：第十四章場景 C，ETW 蒐集與 digital forensics 開源框架

**[31] [Wazuh（開源 EDR / SIEM）](https://wazuh.com/)**

- 用途：第十四章場景 C，完整 pipeline 參考實作

**[32] [OpenEDR（Comodo/Xcitium）](https://github.com/ComodoSecurity/openedr)**

- 用途：第十四章場景 C，開源 EDR pipeline 參考實作
