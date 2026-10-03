import { describe, expect, it, vi } from "vitest"

// --- 測項 1 & 2 所需的抽離邏輯 ---
interface BucketItem { id: string, weight: number, name: string }

function sortBucket(bucket: BucketItem[]) {
  return bucket.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    if (a.name && b.name) {
      const nameCmp = a.name.localeCompare(b.name)
      if (nameCmp !== 0) return nameCmp
    }
    return a.id.localeCompare(b.id)
  }).map(x => x.id)
}

function resolveStaticIsNews(sourceType: string, sourceColumn: string, overrideIsMainstreamMedia?: number) {
  if (sourceType === 'hottest' || sourceType === 'realtime') return false;
  let isNews = ['world', 'china', 'tech', 'finance'].includes(sourceColumn || 'world')
  if (overrideIsMainstreamMedia !== undefined && overrideIsMainstreamMedia !== -1) {
    isNews = overrideIsMainstreamMedia === 1
  }
  return isNews
}

// --- 測項 3 所需的單元化 Queue (模擬 admin.tsx 防抖與去重) ---
export class InlineEditQueue {
  private inFlight = false;
  private pendingPayload: any = null;
  private debounceTimer: any = null;

  constructor(private onSave: (payload: any) => Promise<void>) {}

  private async processQueue() {
    if (this.inFlight || !this.pendingPayload) return;
    this.inFlight = true;
    const payload = this.pendingPayload;
    this.pendingPayload = null;

    try {
      await this.onSave(payload);
    } finally {
      this.inFlight = false;
      if (this.pendingPayload) {
        this.processQueue();
      }
    }
  }

  public handleBlur(payload: any) {
    this.pendingPayload = payload;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, 400);
  }
}

// --- Tests ---
describe("phase 3.1 穩定性加固單元測試", () => {
  
  it("1. 驗證 priority_weight DESC -> name ASC -> id ASC 的排序穩定性", () => {
    const bucket: BucketItem[] = [
      { id: "src-c", name: "Apple", weight: 10 },
      { id: "src-a", name: "Zebra", weight: 20 }, // 權重最高，排第一
      { id: "src-b", name: "Apple", weight: 10 }, // 同權重，名字一樣，id 排在 src-c 前
      { id: "src-d", name: "Banana", weight: 10 }
    ];

    const sorted = sortBucket(bucket);
    expect(sorted).toEqual(["src-a", "src-b", "src-c", "src-d"]);
  });

  it("2. static override 三態邏輯對分類結果的影響", () => {
    // 預設為 true 的 column
    expect(resolveStaticIsNews("", "world", -1)).toBe(true);  // 跟隨預設
    expect(resolveStaticIsNews("", "world", 0)).toBe(false);  // 強制否
    expect(resolveStaticIsNews("", "world", 1)).toBe(true);   // 強制是

    // 預設為 false 的 column
    expect(resolveStaticIsNews("", "local", -1)).toBe(false); // 跟隨預設
    expect(resolveStaticIsNews("", "local", 1)).toBe(true);   // 強制是
  });

  it("3. admin 儲存防抖與同鍵去重 (In-flight Dedup)", async () => {
    const saveMock = vi.fn().mockImplementation(async () => {
      return new Promise(resolve => setTimeout(resolve, 50)); // 模擬 50ms 網路延遲
    });

    const queue = new InlineEditQueue(saveMock);

    // 大量快速發送
    queue.handleBlur({ val: 1 });
    queue.handleBlur({ val: 2 });
    queue.handleBlur({ val: 3 });

    // 等待 debounce 400ms + 50ms 保存時間
    await new Promise(r => setTimeout(r, 600));

    // 期間 3 次觸發，但因為 debounce，只有最後一次 (val: 3) 會被執行一次
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({ val: 3 });

    // 測試 in-flight queue: 正在儲存時再度觸發
    queue.handleBlur({ val: 4 });
    await new Promise(r => setTimeout(r, 410)); // 觸發 processQueue (開始 50ms 存檔)
    
    // 在存檔完成前再狂點
    queue.handleBlur({ val: 5 });
    queue.handleBlur({ val: 6 });

    // 等待第二次存檔完成並觸發 queued items
    await new Promise(r => setTimeout(r, 600));
    
    // 總共應該再被呼叫 2 次：
    // 一次是 val: 4，另一次是 debounce 後抓到的 val: 6，val: 5 被覆蓋忽略
    expect(saveMock).toHaveBeenCalledTimes(3); 
    expect(saveMock).toHaveBeenNthCalledWith(2, { val: 4 });
    expect(saveMock).toHaveBeenNthCalledWith(3, { val: 6 });
  });

});
