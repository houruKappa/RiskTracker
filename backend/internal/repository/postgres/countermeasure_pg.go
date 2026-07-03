package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type CountermeasurePGRepo struct {
	db *sql.DB
}

func NewCountermeasureRepo(db *sql.DB) domain.CountermeasureRepository {
	return &CountermeasurePGRepo{db: db}
}

func scanCountermeasure(scanner interface {
	Scan(dest ...interface{}) error
}) (domain.Countermeasure, error) {
	var cm domain.Countermeasure
	err := scanner.Scan(
		&cm.ID, &cm.RiskID, &cm.TargetType, &cm.CauseID,
		&cm.ConsequenceID, &cm.Description, &cm.AssigneeID,
		&cm.Deadline, &cm.CreatedAt,
	)
	return cm, err
}

func (r *CountermeasurePGRepo) Create(ctx context.Context, cm *domain.Countermeasure) error {
	query := `
		INSERT INTO countermeasures (risk_id, target_type, cause_id, consequence_id, description, assignee_id, deadline)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	err := r.db.QueryRowContext(ctx, query,
		cm.RiskID, cm.TargetType, cm.CauseID, cm.ConsequenceID,
		cm.Description, cm.AssigneeID, cm.Deadline,
	).Scan(&cm.ID, &cm.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert countermeasure: %w", err)
	}
	return nil
}

func (r *CountermeasurePGRepo) GetByID(ctx context.Context, id string) (*domain.Countermeasure, error) {
	query := `
		SELECT id, risk_id, target_type, cause_id, consequence_id, description, assignee_id, deadline, created_at
		FROM countermeasures
		WHERE id = $1`

	var cm domain.Countermeasure
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&cm.ID, &cm.RiskID, &cm.TargetType, &cm.CauseID,
		&cm.ConsequenceID, &cm.Description, &cm.AssigneeID,
		&cm.Deadline, &cm.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select countermeasure by id: %w", err)
	}
	return &cm, nil
}

func (r *CountermeasurePGRepo) ListByRiskID(ctx context.Context, riskID string) ([]*domain.Countermeasure, error) {
	query := `
		SELECT id, risk_id, target_type, cause_id, consequence_id, description, assignee_id, deadline, created_at
		FROM countermeasures
		WHERE risk_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, riskID)
	if err != nil {
		return nil, fmt.Errorf("select countermeasures list: %w", err)
	}
	defer rows.Close()

	var cms []*domain.Countermeasure
	for rows.Next() {
		var cm domain.Countermeasure
		err := rows.Scan(
			&cm.ID, &cm.RiskID, &cm.TargetType, &cm.CauseID,
			&cm.ConsequenceID, &cm.Description, &cm.AssigneeID,
			&cm.Deadline, &cm.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan countermeasure: %w", err)
		}
		cms = append(cms, &cm)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return cms, nil
}

func (r *CountermeasurePGRepo) Update(ctx context.Context, cm *domain.Countermeasure) error {
	query := `
		UPDATE countermeasures
		SET description = $1, assignee_id = $2, deadline = $3
		WHERE id = $4
		RETURNING id, risk_id, target_type, cause_id, consequence_id, description, assignee_id, deadline, created_at`

	err := r.db.QueryRowContext(ctx, query,
		cm.Description, cm.AssigneeID, cm.Deadline, cm.ID,
	).Scan(
		&cm.ID, &cm.RiskID, &cm.TargetType, &cm.CauseID,
		&cm.ConsequenceID, &cm.Description, &cm.AssigneeID,
		&cm.Deadline, &cm.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.ErrNotFound
		}
		return fmt.Errorf("update countermeasure: %w", err)
	}
	return nil
}

func (r *CountermeasurePGRepo) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM countermeasures WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete countermeasure: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}