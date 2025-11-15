package service

import (
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service/utils"
	"context"
	"log"
)

type RobotService struct {
	store *repository.Store
}

func NewRobotService(store *repository.Store) *RobotService {
	return &RobotService{store: store}
}

// 注意：このメソッドは、現在、ordersテーブルのshipped_statusが"shipping"になっている注文"全件"を対象に配送計画を立てます。
// 注文の取得件数を制限した場合、ペナルティの対象になります。
func (s *RobotService) GenerateDeliveryPlan(ctx context.Context, robotID string, capacity int) (*model.DeliveryPlan, error) {
	var plan model.DeliveryPlan

	err := utils.WithTimeout(ctx, func(ctx context.Context) error {
		return s.store.ExecTx(ctx, func(txStore *repository.Store) error {
			orders, err := txStore.OrderRepo.GetShippingOrders(ctx)
			if err != nil {
				return err
			}
			plan, err = selectOrdersForDelivery(ctx, orders, robotID, capacity)
			if err != nil {
				return err
			}
			if len(plan.Orders) > 0 {
				orderIDs := make([]int64, len(plan.Orders))
				for i, order := range plan.Orders {
					orderIDs[i] = order.OrderID
				}

				if err := txStore.OrderRepo.UpdateStatuses(ctx, orderIDs, "delivering"); err != nil {
					return err
				}
				log.Printf("Updated status to 'delivering' for %d orders", len(orderIDs))
			}
			return nil
		})
	})
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (s *RobotService) UpdateOrderStatus(ctx context.Context, orderID int64, newStatus string) error {
	return utils.WithTimeout(ctx, func(ctx context.Context) error {
		return s.store.OrderRepo.UpdateStatuses(ctx, []int64{orderID}, newStatus)
	})
}

// selectOrdersForDelivery は動的計画法を使用してナップサック問題を解きます
// 計算量: O(n * capacity) - 以前のO(2^n)から大幅に高速化
func selectOrdersForDelivery(ctx context.Context, orders []model.Order, robotID string, robotCapacity int) (model.DeliveryPlan, error) {
	n := len(orders)
	if n == 0 {
		return model.DeliveryPlan{
			RobotID:     robotID,
			TotalWeight: 0,
			TotalValue:  0,
			Orders:      []model.Order{},
		}, nil
	}

	// コンテキストキャンセレーションチェック用
	checkEvery := 1000

	// dp[i][w] = i番目までの注文で、重量w以下での最大価値
	// 空間最適化のため、2つの行だけを保持
	dp := make([][]int, 2)
	dp[0] = make([]int, robotCapacity+1)
	dp[1] = make([]int, robotCapacity+1)
	
	// 復元用: choice[i][w] = i番目の注文まで見た時、重量wでi番目の注文を選んだかどうか
	choice := make([][]bool, n)
	for i := range choice {
		choice[i] = make([]bool, robotCapacity+1)
	}

	// 動的計画法のメインループ
	prev := 0
	curr := 1
	for i := 0; i < n; i++ {
		// 定期的にコンテキストキャンセレーションをチェック
		if i > 0 && i%checkEvery == 0 {
			select {
			case <-ctx.Done():
				return model.DeliveryPlan{}, ctx.Err()
			default:
			}
		}

		order := orders[i]
		weight := order.Weight
		value := order.Value

		// 前の状態をコピー
		copy(dp[curr], dp[prev])

		// 逆順にループすることで、同じ注文を2回選ばないようにする
		for w := robotCapacity; w >= weight; w-- {
			// 現在の注文を含めた場合の価値
			newValue := dp[prev][w-weight] + value
			if newValue > dp[curr][w] {
				dp[curr][w] = newValue
				choice[i][w] = true
			}
		}

		// 次の反復のためにprevとcurrを入れ替え
		prev, curr = curr, prev
	}

	// 最適解を復元
	bestValue := dp[prev][robotCapacity]
	bestSet := make([]model.Order, 0)
	
	// 逆順に復元
	w := robotCapacity
	for i := n - 1; i >= 0; i-- {
		if w < 0 {
			break
		}
		// この注文が選ばれているかチェック
		if w >= orders[i].Weight && choice[i][w] {
			bestSet = append(bestSet, orders[i])
			w -= orders[i].Weight
		}
	}

	// 順序を元に戻す（元のordersの順序に合わせる）
	for i := 0; i < len(bestSet)/2; i++ {
		bestSet[i], bestSet[len(bestSet)-1-i] = bestSet[len(bestSet)-1-i], bestSet[i]
	}

	var totalWeight int
	for _, o := range bestSet {
		totalWeight += o.Weight
	}

	return model.DeliveryPlan{
		RobotID:     robotID,
		TotalWeight: totalWeight,
		TotalValue:  bestValue,
		Orders:      bestSet,
	}, nil
}
