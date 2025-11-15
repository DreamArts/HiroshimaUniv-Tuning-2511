package repository

import (
	"backend/internal/model"
	"context"
	"strings"
)

type ProductRepository struct {
	db DBTX
}

func NewProductRepository(db DBTX) *ProductRepository {
	return &ProductRepository{db: db}
}

// 商品一覧を全件取得し、アプリケーション側でページング処理を行う
func (r *ProductRepository) ListProducts(ctx context.Context, userID int, req model.ListRequest) ([]model.Product, int, error) {
	// Build WHERE clause and args
	where := ""
	args := []interface{}{}
	if req.Search != "" {
		// support prefix or partial search depending on req.Type
		if req.Type == "prefix" {
			where = " WHERE (name LIKE ? OR description LIKE ?)"
			pattern := req.Search + "%"
			args = append(args, pattern, pattern)
		} else {
			where = " WHERE (name LIKE ? OR description LIKE ?)"
			pattern := "%" + req.Search + "%"
			args = append(args, pattern, pattern)
		}
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM products" + where
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	// Whitelist mapping for sortable fields to avoid SQL injection
	sortFieldMap := map[string]string{
		"product_name": "name",
		"name":         "name",
		"value":        "value",
		"weight":       "weight",
		"product_id":   "product_id",
	}
	sortCol, ok := sortFieldMap[req.SortField]
	if !ok {
		sortCol = "product_id"
	}
	sortOrder := "ASC"
	if strings.ToUpper(req.SortOrder) == "DESC" {
		sortOrder = "DESC"
	}

	// Final select with LIMIT/OFFSET for paging
	selectQuery := "SELECT product_id, name, value, weight, image, description FROM products" + where
	selectQuery += " ORDER BY " + sortCol + " " + sortOrder + ", product_id ASC"
	// Default page size if not provided
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	selectQuery += " LIMIT ? OFFSET ?"

	// Append paging args
	argsWithPaging := append([]interface{}{}, args...)
	argsWithPaging = append(argsWithPaging, pageSize, req.Offset)

	var products []model.Product
	if err := r.db.SelectContext(ctx, &products, selectQuery, argsWithPaging...); err != nil {
		return nil, 0, err
	}

	return products, total, nil
}
