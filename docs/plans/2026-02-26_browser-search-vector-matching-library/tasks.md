# Tasks： 瀏覽器網路搜索與向量匹配庫

- Date: 2026-02-26
- Feature: 瀏覽器網路搜索與向量匹配庫

## **Task 1: 建立搜尋核心與 Provider 介面**

任務內容：對應 R1.1、R1.2、R3.1。核心目的為建立瀏覽器可用且可擴充的搜尋入口，先確保輸入驗證與資料正規化行為穩定。

- 1. [x] 建立型別與核心 API（`search()`）
  - 1.1 [x] 定義 `SearchProvider`、`SearchResultRaw`、`SearchResultNormalized` 型別。
  - 1.2 [x] 在 client 中實作 keyword 驗證與 provider 呼叫流程。
  - 1.3 [x] 補上結果正規化與必要欄位過濾邏輯。

## **Task 2: 實作向量化與匹配排序邏輯**

任務內容：對應 R2.1、R2.2。核心目的為將 query 與搜尋內容轉換為可比較向量，並輸出穩定排序結果與匹配資訊。

- 2. [x] 實作 TF-IDF 與 cosine similarity 排序模組
  - 2.1 [x] 建立 tokenization、term frequency、inverse document frequency 計算。
  - 2.2 [x] 實作 query/document 向量化與 cosine similarity。
  - 2.3 [x] 實作穩定 tie-break 與 `matchedTerms` 產出。

## **Task 3: 錯誤模型、測試與文件**

任務內容：對應 R3.2、R3.3。核心目的為保障失敗場景可觀測且可預期，並以測試固定行為，確保後續迭代不回歸。

- 3. [x] 定義錯誤類型並覆蓋網路例外
  - 3.1 [x] 建立 `NETWORK_ERROR`、`TIMEOUT`、`ABORTED`、`AUTH_REQUIRED` 等錯誤模型。
  - 3.2 [x] 補上單元測試（驗證、向量計算、排序穩定性）。
  - 3.3 [x] 補上整合測試（mock provider，覆蓋成功/失敗/空結果流程）與 README 使用範例。

## Notes

- 任務順序需反映實作先後。
- 每個主任務必須可對應回 `spec.md` 的 Requirements 編號。
- Agent 在任務完成後，必須依實際進度更新對應 checkbox（完成改 `[x]`，未完成維持 `[ ]`）。
