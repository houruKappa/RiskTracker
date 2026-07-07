package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type AuditLogPGRepo struct {
	db *sql.DB
}

func NewAuditLogRepo(db *sql.DB) domain.AuditLogRepository {
	return &AuditLogPGRepo{db: db}
}

func (r *AuditLogPGRepo) LogAction(ctx context.Context, entry *domain.AuditLog) error {
	query := `
		INSERT INTO entity_audit_logs (entity_type, entity_id, entity_name, action_type, changed_by_user_id, changes, old_state, new_state)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, timestamp`

	oldState := sql.NullString{}
	if len(entry.OldState) > 0 {
		oldState = sql.NullString{String: string(entry.OldState), Valid: true}
	}
	newState := sql.NullString{}
	if len(entry.NewState) > 0 {
		newState = sql.NullString{String: string(entry.NewState), Valid: true}
	}

	err := r.db.QueryRowContext(ctx, query,
		entry.EntityType,
		entry.EntityID,
		entry.EntityName,
		entry.ActionType,
		entry.ChangedByUserID,
		entry.Changes,
		oldState,
		newState,
	).Scan(&entry.ID, &entry.Timestamp)
	if err != nil {
		return fmt.Errorf("insert audit log: %w", err)
	}
	return nil
}

func (r *AuditLogPGRepo) List(ctx context.Context, filter domain.AuditLogFilter) (*domain.PaginatedAuditLogs, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 50
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.EntityType != nil {
		conditions = append(conditions, fmt.Sprintf("l.entity_type = $%d", argIdx))
		args = append(args, *filter.EntityType)
		argIdx++
	}
	if filter.EntityID != nil {
		conditions = append(conditions, fmt.Sprintf("l.entity_id = $%d", argIdx))
		args = append(args, *filter.EntityID)
		argIdx++
	}
	if filter.ActionType != nil {
		conditions = append(conditions, fmt.Sprintf("l.action_type = $%d", argIdx))
		args = append(args, *filter.ActionType)
		argIdx++
	}
	if filter.ChangedByUserID != nil {
		conditions = append(conditions, fmt.Sprintf("l.changed_by_user_id = $%d", argIdx))
		args = append(args, *filter.ChangedByUserID)
		argIdx++
	}
	if filter.UserEmail != nil {
		conditions = append(conditions, fmt.Sprintf("u.email ILIKE $%d", argIdx))
		args = append(args, "%"+*filter.UserEmail+"%")
		argIdx++
	}
	if filter.Search != nil && *filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(l.entity_name ILIKE $%d OR l.entity_id::text ILIKE $%d)",
			argIdx, argIdx,
		))
		args = append(args, "%"+*filter.Search+"%")
		argIdx++
	}
	if filter.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("l.timestamp >= $%d", argIdx))
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("l.timestamp <= $%d", argIdx))
		args = append(args, *filter.DateTo)
		argIdx++
	}

	// Permission check - users can only see logs for their own risks
	if filter.Role != "ADMIN" {
		conditions = append(conditions, fmt.Sprintf(`
			(l.entity_type = 'RISK' AND l.entity_id IN (
				SELECT id FROM risks WHERE owner_id = $%d OR id IN (
					SELECT risk_id FROM countermeasures WHERE assignee_id = $%d
				)
			)) OR l.entity_type = 'COUNTERMEASURE' AND l.entity_id IN (
				SELECT id FROM countermeasures WHERE assignee_id = $%d
			)
		`, argIdx, argIdx, argIdx))
		args = append(args, filter.UserID)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM entity_audit_logs l
		LEFT JOIN users u ON u.id = l.changed_by_user_id
		%s`, whereClause)
	var totalCount int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("count audit logs: %w", err)
	}

	// Main query with pagination
	offset := (filter.Page - 1) * filter.Limit
	args = append(args, filter.Limit, offset)

	query := fmt.Sprintf(`
		SELECT l.id, l.entity_type, l.entity_id, l.entity_name, l.action_type,
			l.changed_by_user_id, u.email, l.changes, l.timestamp, l.old_state, l.new_state
		FROM entity_audit_logs l
		LEFT JOIN users u ON u.id = l.changed_by_user_id
		%s
		ORDER BY l.timestamp DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select audit logs: %w", err)
	}
	defer rows.Close()

	var items []*domain.AuditLog
	for rows.Next() {
		var l domain.AuditLog
		var email, entityName, changes, oldState, newState sql.NullString
		err := rows.Scan(
			&l.ID, &l.EntityType, &l.EntityID, &entityName, &l.ActionType,
			&l.ChangedByUserID, &email, &changes, &l.Timestamp, &oldState, &newState,
		)
		if err != nil {
			return nil, fmt.Errorf("scan audit log: %w", err)
		}
		l.ChangedByEmail = email.String
		l.EntityName = entityName.String
		l.Changes = changes.String
		if oldState.Valid {
			l.OldState = json.RawMessage(oldState.String)
		}
		if newState.Valid {
			l.NewState = json.RawMessage(newState.String)
		}
		items = append(items, &l)
	}

	return &domain.PaginatedAuditLogs{
		Items:      items,
		TotalCount: totalCount,
		Page:       filter.Page,
		Limit:      filter.Limit,
	}, nil
}
