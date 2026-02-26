# Checklist： 瀏覽器網路搜索與向量匹配庫

- Date: 2026-02-26
- Feature: 瀏覽器網路搜索與向量匹配庫

## Usage Notes

- 此清單已依目前需求風險調整；若實作中需求變動，需同步更新。
- 所有條目使用 `- [ ]`；完成後改為 `- [x]`。
- 測試結果使用：`PASS / FAIL / BLOCKED / NOT RUN / N/A`。

## Behavior-to-Test Checklist（可增刪）

- [x] CL-01 關鍵詞有效時能正確呼叫 provider 並回傳正規化結果
  - 需求對應：[R1.1, R1.2]
  - 實際測試案例：[UT-01, IT-01]
  - 測試層級：[Unit / Integration]
  - 測試結果：`PASS`
  - 備註（可選）：需覆蓋缺欄位資料過濾。

- [x] CL-02 向量排序能穩定產生可重現結果與 score
  - 需求對應：[R2.1, R2.2]
  - 實際測試案例：[UT-02, UT-03, PBT-01]
  - 測試層級：[Unit / Property-based]
  - 測試結果：`PASS`
  - 備註（可選）：Property-based 驗證排序一致性與分數範圍。

- [x] CL-03 空白 keyword 會被阻擋且不發送網路請求
  - 需求對應：[R3.1]
  - 實際測試案例：[UT-04]
  - 測試層級：[Unit]
  - 測試結果：`PASS`
  - 備註（可選）：需驗證 provider mock 未被呼叫。

- [x] CL-04 fetch 異常（timeout/abort/network）回傳可判斷錯誤碼
  - 需求對應：[R3.2]
  - 實際測試案例：[UT-05, IT-02]
  - 測試層級：[Unit / Integration]
  - 測試結果：`PASS`
  - 備註（可選）：整合測試以 provider stub 模擬錯誤。

- [x] CL-05 provider 回傳空集合時，輸出空結果與 metadata.total=0
  - 需求對應：[R3.3]
  - 實際測試案例：[UT-06, IT-03]
  - 測試層級：[Unit / Integration]
  - 測試結果：`PASS`
  - 備註（可選）：需確認不會拋出非預期例外。

## E2E Decision Record（擇一或自訂）

- [ ] 建立 E2E（案例：[N/A]；原因：[N/A]）
- [x] 不建立 E2E，改以整合測試覆蓋（替代案例：[IT-01, IT-02, IT-03]；原因：[此專案為函式庫，無 UI 端到端流程，整合測試可覆蓋核心跨模組風險]）
- [ ] 不需額外 E2E/整合強化（原因：[N/A]）

## Execution Summary（依實際填寫）

- [x] 單元測試：`PASS`
- [x] Property-based 測試：`PASS`
- [x] 整合測試：`PASS`
- [x] E2E 測試：`N/A`

## Completion Rule

- [x] Agent 已依實際情況更新 checkbox、測試結果與必要備註（含新增/刪減項目）。
