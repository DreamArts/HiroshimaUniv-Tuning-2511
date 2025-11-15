import { test, expect } from "@playwright/test";
import sampleData from "./sampleData/expectedOrdersKeywordHits.json";
import expectedOrdersData from "./sampleData/expectedOrdersResults.json";

const sortFieldOrders = [
  "order_id",
  "name",
  "shipped_status",
  "created_at",
  "arrived_at",
];

test.describe("注文一覧機能", () => {
  // 注文一覧のページネーションが正しく動作することを確認
  test("注文一覧の2ページ目が正しい構造とデータで返される", async ({
    request,
  }) => {
    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    // 2ページ目のデータを取得
    const page2Response = await request.post("/api/v1/orders", {
      data: {
        search: "",
        page: 2,
        page_size: 20,
        sort_field: "",
        sort_order: "",
      },
    });

    expect(page2Response.status()).toBe(200);
    const page2Json = await page2Response.json();

    // 2ページ目のレスポンスがordersResults.jsonと完全に一致することを検証
    expect(page2Json).toEqual(expectedOrdersData);
  });

  // 注文一覧のページネーションで異なるページが異なるデータを返すことを確認
  test("注文一覧の異なるページが異なる内容を返す", async ({ request }) => {
    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    // ランダムに2つの異なるページ番号を選択
    let page1 = Math.floor(Math.random() * 25) + 1;
    let page2 = Math.floor(Math.random() * 25) + 26;

    // それぞれのページのデータを取得
    const page1Response = await request.post("/api/v1/orders", {
      data: {
        search: "",
        page: page1,
        page_size: 20,
        sort_field: "",
        sort_order: "",
      },
    });

    expect(page1Response.status()).toBe(200);
    const page1Json = await page1Response.json();

    const page2Response = await request.post("/api/v1/orders", {
      data: {
        search: "",
        page: page2,
        page_size: 20,
        sort_field: "",
        sort_order: "",
      },
    });

    expect(page2Response.status()).toBe(200);
    const page2Json = await page2Response.json();

    // 2つのページのデータが異なることを確認
    expect(page1Json).not.toEqual(page2Json);
  });

  // 注文一覧でキーワード部分一致検索とソートが正しく動作することを確認
  test("注文をキーワード部分一致検索して期待する件数と内容が返される", async ({
    request,
  }) => {
    // 偶数インデックス（0, 2, 4, 6, 8...）を生成
    const randomEvenIndex = Math.floor(Math.random() * 5) * 2;
    const testSampleData = sampleData[randomEvenIndex];

    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    const response = await request.post("/api/v1/orders", {
      data: {
        search: testSampleData.keyword,
        type: "partial",
        page: 1,
        page_size: 20,
        sort_field: sortFieldOrders[randomEvenIndex % sortFieldOrders.length],
        sort_order: "asc",
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // レスポンス構造の検証
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("total");
    expect(Array.isArray(json.data)).toBe(true);

    // 合計件数がordersKeywordsHitsCount.jsonの期待値と一致することを確認
    expect(json.total).toBe(testSampleData.total);

    // 返されたデータ件数が期待値と一致することを確認
    expect(json.data.length).toBe(testSampleData.data.length);

    // 実際の検索結果がordersKeywordsHitsCount.jsonのdataと一致することを確認
    expect(json.data).toEqual(testSampleData.data);
  });

  // 注文一覧でキーワード前方一致検索とソートが正しく動作することを確認
  test("注文をキーワード前方一致検索して期待する件数と内容が返される", async ({
    request,
  }) => {
    // 奇数インデックス（1, 3, 5, 7, 9...）を生成
    const randomOddIndex = Math.floor(Math.random() * 5) * 2 + 1;
    const testSampleData = sampleData[randomOddIndex];

    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    const response = await request.post("/api/v1/orders", {
      data: {
        search: testSampleData.keyword,
        type: "prefix",
        page: 1,
        page_size: 20,
        sort_field: sortFieldOrders[randomOddIndex % sortFieldOrders.length],
        sort_order: "desc",
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // レスポンス構造の検証
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("total");
    expect(Array.isArray(json.data)).toBe(true);

    // 合計件数がordersKeywordsHitsCount.jsonの期待値と一致することを確認
    expect(json.total).toBe(testSampleData.total);

    // 返されたデータ件数が期待値と一致することを確認
    expect(json.data.length).toBe(testSampleData.data.length);

    // 実際の検索結果がordersKeywordsHitsCount.jsonのdataと一致することを確認
    expect(json.data).toEqual(testSampleData.data);
  });
});
