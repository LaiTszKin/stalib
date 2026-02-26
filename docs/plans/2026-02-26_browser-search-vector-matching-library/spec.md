# Spec： 瀏覽器網路搜索與向量匹配庫

- Date: 2026-02-26
- Feature: 瀏覽器網路搜索與向量匹配庫
- Owner: Yamiyorunoshura

## Goal

建立一個可在瀏覽器執行的 TypeScript 搜索庫：接收關鍵詞、呼叫 Web Search Provider，並用本地向量化與相似度演算法回傳排序結果。

## Scope

- In scope:
  - 定義可插拔的瀏覽器搜尋 Provider 介面（基於 `fetch`）。
  - 提供關鍵詞搜尋 API，支援傳入搜尋參數（limit、signal、timeout）。
  - 對搜尋結果（title/snippet/url）進行向量化（TF-IDF）與 cosine similarity 排序。
  - 回傳包含分數與匹配片段的結構化結果。
  - 補齊單元與整合測試。
- Out of scope:
  - 內建特定商用搜尋引擎 API key 管理流程。
  - 後端代理服務與資料庫持久化。
  - UI 元件、SSR 整合、或爬蟲能力。
  - 語義向量模型（LLM embedding）與向量資料庫。

## Functional Behaviors (BDD)

### Requirement 1： 關鍵詞搜尋請求與結果正規化

GIVEN 使用者建立瀏覽器搜尋 client 並注入 provider
AND 使用者提供有效關鍵詞與搜尋選項
WHEN 呼叫 `search(keyword, options)`
THEN client 會透過 provider 發送請求並取得原始搜尋結果
AND 會將資料正規化為統一欄位（id/title/snippet/url/source）

Requirements:

- [ ] R1.1 當 keyword 為有效非空字串時，必須呼叫 provider 一次並帶入對應 options。
- [ ] R1.2 原始結果缺少非必要欄位時，仍須回傳可用結果；缺少必要欄位（title/url）時需安全忽略。

### Requirement 2： 向量化與相似度排序

GIVEN provider 回傳至少一筆可用搜尋結果
AND client 的 ranking mode 為預設 TF-IDF + cosine similarity
WHEN client 執行向量化與匹配流程
THEN 回傳結果必須依相似度由高到低排序
AND 每筆結果都包含 `score`（0~1）與 `matchedTerms`

Requirements:

- [ ] R2.1 同一輸入下排序結果必須穩定可重現。
- [ ] R2.2 當分數相同時使用穩定 tie-break 規則（例如原始索引）確保輸出一致。

### Requirement 3： 錯誤處理與邊界行為

GIVEN 使用者輸入無效參數或 provider 發生錯誤
AND client 在瀏覽器環境執行
WHEN search 流程遇到邊界或異常
THEN client 應回傳可辨識錯誤類型或空結果
AND 不應拋出難以追蹤的未分類例外

Requirements:

- [ ] R3.1 keyword 為空白字串時，直接回傳驗證錯誤（不發送網路請求）。
- [ ] R3.2 網路失敗、逾時、abort 時，需提供可判斷錯誤碼（`NETWORK_ERROR` / `TIMEOUT` / `ABORTED`）。
- [ ] R3.3 provider 回傳空集合時，應回傳空結果且 metadata 清楚標示總數為 0。

## Error and Edge Cases

- [ ] 權限或角色邊界：provider 需要 API key 但未提供時，需回傳 `AUTH_REQUIRED` 類型錯誤。
- [ ] 資料邊界條件：title/snippet 含大量重複詞、非 ASCII 字元、極短文本時，分數計算仍需穩定。
- [ ] 失敗或例外處理：fetch 超時、abort、HTTP 非 2xx、JSON 結構不符時均需安全處理。

## Clarification Questions

- 搜尋資料來源預設要支援哪一個公開 API（例如 DuckDuckGo Instant Answer）？
- 是否需要在第一版就內建多語言斷詞策略（目前規劃為簡化 tokenization）？
- 錯誤處理偏好是「丟出 typed error」還是「永遠回傳 result + error 欄位」？
- 是否希望第一版同時提供 stream/分頁查詢能力？

## References

- 官方文件：
  - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
  - https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
  - https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
- 相關程式檔案：
  - /Users/tszkinlai/Coding/stalib/package.json
  - /Users/tszkinlai/Coding/stalib/tsconfig.json
  - /Users/tszkinlai/Coding/stalib/src/index.ts
  - /Users/tszkinlai/Coding/stalib/src/search-client.ts
  - /Users/tszkinlai/Coding/stalib/src/vector/tfidf.ts
  - /Users/tszkinlai/Coding/stalib/tests/search-client.test.ts
