package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type RiskObjectPGRepo struct {
	db *sql.DB
}

func NewRiskObjectRepo(db *sql.DB) domain.RiskObjectRepository {
	return &RiskObjectPGRepo{db: db}
}

func (r *RiskObjectPGRepo) Create(ctx context.Context, obj *domain.RiskObject) error {
	query := `
		INSERT INTO risk_objects (name, object_type, description)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		obj.Name,
		obj.ObjectType,
		obj.Description,
	).Scan(&obj.ID, &obj.CreatedAt, &obj.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrDuplicateName
		}
		return fmt.Errorf("insert risk_object: %w", err)
	}
	return nil
}

func (r *RiskObjectPGRepo) GetByID(ctx context.Context, id string) (*domain.RiskObject, error) {
	query := `
		SELECT id, name, object_type, description, created_at, updated_at
		FROM risk_objects
		WHERE id = $1`

	var obj domain.RiskObject
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&obj.ID,
		&obj.Name,
		&obj.ObjectType,
		&obj.Description,
		&obj.CreatedAt,
		&obj.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select risk_object by id: %w", err)
	}
	return &obj, nil
}

func (r *RiskObjectPGRepo) List(ctx context.Context) ([]*domain.RiskObject, error) {
	query := `
		SELECT id, name, object_type, description, created_at, updated_at
		FROM risk_objects
		ORDER BY name ASC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("select risk_objects list: %w", err)
	}
	defer rows.Close()

	var objects []*domain.RiskObject
	for rows.Next() {
		var obj domain.RiskObject
		err := rows.Scan(
			&obj.ID,
			&obj.Name,
			&obj.ObjectType,
			&obj.Description,
			&obj.CreatedAt,
			&obj.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan risk_object: %w", err)
		}
		objects = append(objects, &obj)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return objects, nil
}

func (r *RiskObjectPGRepo) Update(ctx context.Context, obj *domain.RiskObject) error {
	query := `
		UPDATE risk_objects
		SET name = $1, object_type = $2, description = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING updated_at`

	err := r.db.QueryRowContext(ctx, query,
		obj.Name,
		obj.ObjectType,
		obj.Description,
		obj.ID,
	).Scan(&obj.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.ErrNotFound
		}
		if isUniqueViolation(err) {
			return domain.ErrDuplicateName
		}
		return fmt.Errorf("update risk_object: %w", err)
	}
	return nil
}

func (r *RiskObjectPGRepo) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM risk_objects WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete risk_object: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}
