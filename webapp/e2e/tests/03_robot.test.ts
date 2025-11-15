import { test, expect } from "@playwright/test";
import knapsackResults from "./sampleData/expectedRobotDeliveryPlan.json";

type Orders = {
  order_id: number;
  user_id: number;
  product_id: number;
  product_name: string;
  shipped_status: string;
  weight: number;
  value: number;
  created_at: string;
  arrived_at: {
    Time: string;
    Valid: boolean;
  };
};

const ROBOT_API_KEY = "test-robot-key";

test.describe("ロボット配送最適化機能", () => {
  test("ロボットが容量制限内で最適な配送プランを生成する", async ({
    request,
  }: any) => {
    const capacity = 50;

    // Robot APIを呼び出し
    const response = await request.get(
      `/api/robot/delivery-plan?capacity=${capacity}`,
      {
        headers: {
          "X-API-KEY": ROBOT_API_KEY,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    // レスポンスの基本構造を確認
    expect(responseData).toHaveProperty("robot_id");
    expect(responseData).toHaveProperty("total_weight");
    expect(responseData).toHaveProperty("total_value");
    expect(responseData).toHaveProperty("orders");
    expect(Array.isArray(responseData.orders)).toBeTruthy();

    // 期待される結果（0番目のデータセット）を使用
    const expectedResult = knapsackResults[0];
    expect(responseData.robot_id).toBe(expectedResult.robot_id);
    expect(responseData.total_weight).toBe(expectedResult.total_weight);
    expect(responseData.total_value).toBe(expectedResult.total_value);
    expect(responseData.orders.length).toBe(expectedResult.orders.length);

    // 注文データをorder_idでソート（API結果と期待結果の両方）
    const actualOrders = responseData.orders.sort(
      (a: Orders, b: Orders) => a.order_id - b.order_id
    );
    const expectedOrders = expectedResult.orders.sort(
      (a, b) => a.order_id - b.order_id
    );

    // 各注文データが一致することを確認
    for (let i = 0; i < expectedOrders.length; i++) {
      const actual = actualOrders[i];
      const expected = expectedOrders[i];

      expect(actual.order_id).toBe(expected.order_id);
      expect(actual.weight).toBe(expected.weight);
      expect(actual.value).toBe(expected.value);

      // 期待されるデータでは他のフィールドが空やデフォルト値なので、
      // 実際のAPIではより詳細なデータが返される可能性があることを考慮
      // 重要なフィールド（order_id, weight, value）の検証に集中
    }

    // 合計重量がキャパシティ以下であることを確認
    expect(responseData.total_weight).toBeLessThanOrEqual(capacity);

    // 実際の重量の合計が報告された合計重量と一致することを確認
    const calculatedWeight = actualOrders.reduce(
      (sum: number, order: Orders) => sum + order.weight,
      0
    );
    expect(calculatedWeight).toBe(responseData.total_weight);

    // 実際の価値の合計が報告された合計価値と一致することを確認
    const calculatedValue = actualOrders.reduce(
      (sum: number, order: Orders) => sum + order.value,
      0
    );
    expect(calculatedValue).toBe(responseData.total_value);
  });

  // ダミーデータのやつに書き換える
  test("複数の商品を注文後にロボットが適切な配送プランを作成する", async ({
    request,
  }: any) => {
    // まずログイン
    const loginResponse = await request.post("/api/login", {
      data: {
        user_name: "user001",
        password: "password",
      },
    });

    expect(loginResponse.status()).toBe(200);

    // 注文を作成
    const orderResponse = await request.post("/api/v1/product/post", {
      data: {
        items: [{ product_id: 101942, quantity: 1 }],
      },
    });
    expect(orderResponse.ok()).toBeTruthy();
    await orderResponse.json();

    // 少し待機してからdelivery planを取得
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const capacity = 50;
    const response = await request.get(
      `/api/robot/delivery-plan?capacity=${capacity}`,
      {
        headers: {
          "X-API-KEY": ROBOT_API_KEY,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    // レスポンスの基本構造を確認
    expect(responseData).toHaveProperty("robot_id");
    expect(responseData).toHaveProperty("total_weight");
    expect(responseData).toHaveProperty("total_value");
    expect(responseData).toHaveProperty("orders");
    expect(Array.isArray(responseData.orders)).toBeTruthy();

    const expectedResult = knapsackResults[1];
    expect(responseData.robot_id).toBe(expectedResult.robot_id);
    expect(responseData.total_weight).toBe(expectedResult.total_weight);
    expect(responseData.total_value).toBe(expectedResult.total_value);
    expect(responseData.orders.length).toBe(expectedResult.orders.length);

    // 注文データが1件のみなのでそのまま比較
    const actual = responseData.orders[0];
    const expected = expectedResult.orders[0];
    expect(actual.order_id).toBe(expected.order_id);
    expect(actual.weight).toBe(expected.weight);
    expect(actual.value).toBe(expected.value);
  });
});
