// tests/product.test.ts
import { test, expect } from "@playwright/test";
import productPaginationTestData from "./sampleData/expectedProductListPage2.json";
import productPartialSearchTestData from "./sampleData/expectedProductPartialSearchResults.json";

const sortFields = ["name", "value", "weight"];
const sortOrders = ["asc", "desc"];

test.describe("商品一覧機能", () => {
  // APIテスト 検索なし + ページネーション
  test("商品一覧のページネーションが正しく動作する", async ({ request }) => {
    // 期待値データを読み込み
    const expectedData = productPaginationTestData;

    // ログインしてから商品一覧APIを呼ぶ
    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    const response = await request.post("/api/v1/product", {
      data: {
        search: "",
        page: 2,
        page_size: 20,
        sort_field: "product_id",
        sort_order: "asc",
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // 表示する商品と、総件数が期待値と一致するかチェック
    expect(json.data).toEqual(expectedData.data);
    expect(json.total).toBe(expectedData.total);
  });

  // APIテスト 部分一致検索+ソート
  test("商品を部分一致検索して期待する結果が返される", async ({ request }) => {
    const iterator = Math.floor(Math.random() * 8);
    const expectedData = productPartialSearchTestData[iterator];
    const sortField = sortFields[iterator % sortFields.length];
    const sortOrder = sortOrders[iterator % sortOrders.length];

    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    const response = await request.post("/api/v1/product", {
      data: {
        search: expectedData.keyword,
        page: 1,
        page_size: 20,
        sort_field: sortField,
        sort_order: sortOrder,
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    // レスポンスデータと期待値を比較
    expect(json.data).toEqual(expectedData.data);
    expect(json.total).toBe(expectedData.total);
  });

  // APIテスト 注文送信＋注文一覧で確認
  test("商品10個を注文し、注文一覧で内容を比較する", async ({ request }) => {
    const orderProductIds: number[] = [];
    while (orderProductIds.length < 10) {
      const pid = Math.floor(Math.random() * 100000) + 1;
      if (!orderProductIds.includes(pid)) orderProductIds.push(pid);
    }

    // ログイン
    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });
    expect(loginResponse.status()).toBe(200);

    for (const pid of orderProductIds) {
      const orderResponse = await request.post("/api/v1/product/post", {
        data: {
          items: [{ product_id: pid, quantity: 1 }],
        },
      });
      expect(orderResponse.ok()).toBeTruthy();
      await orderResponse.json();
    }

    // 少し待機（DB反映待ち）
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 注文一覧APIで最新10件を取得
    const ordersResponse = await request.post("/api/v1/orders", {
      data: {
        page: 1,
        page_size: 10,
        sort_field: "order_id",
        sort_order: "desc",
      },
    });
    expect(ordersResponse.ok()).toBeTruthy();
    const ordersJson = await ordersResponse.json();

    // 取得した注文一覧のproduct_idを配列で取得
    const orderedIds = ordersJson.data.map((order: any) => order.product_id);

    // 商品10個すべてが含まれているか確認
    for (const pid of orderProductIds) {
      expect(orderedIds).toContain(pid);
    }
  });
});
