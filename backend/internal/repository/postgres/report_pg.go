package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type ReportPGRepo struct {
	db *sql.DB
}

func NewReportRepo(db *sql.DB) domain.ReportRepository {
	return &ReportPGRepo{db: db}
}

func (r *ReportPGRepo) GetSummary(ctx context.Context, userID string, role string) (*domain.ReportSummary, error) {
	var whereClause string
	var args []interface{}
	
	if role != "ADMIN" {
		whereClause = `WHERE r.owner_id = $1 OR r.id IN (SELECT risk_id FROM countermeasures WHERE assignee_id = $1)`
		args = append(args, userID)
	}

	statusWhere := "WHERE"
	if whereClause != "" {
		statusWhere = "AND"
	}

	// Total risks
	var totalRisks int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM risks r %s", whereClause)
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalRisks)
	if err != nil {
		return nil, fmt.Errorf("count total risks: %w", err)
	}

	// In progress risks
	var inProgressRisks int
	inProgressQuery := fmt.Sprintf("SELECT COUNT(*) FROM risks r %s %s r.status = 'IN_PROGRESS'", whereClause, statusWhere)
	err = r.db.QueryRowContext(ctx, inProgressQuery, args...).Scan(&inProgressRisks)
	if err != nil {
		return nil, fmt.Errorf("count in progress risks: %w", err)
	}

	// Completed risks
	var completedRisks int
	completedQuery := fmt.Sprintf("SELECT COUNT(*) FROM risks r %s %s r.status = 'COMPLETED'", whereClause, statusWhere)
	err = r.db.QueryRowContext(ctx, completedQuery, args...).Scan(&completedRisks)
	if err != nil {
		return nil, fmt.Errorf("count completed risks: %w", err)
	}

	// Expired countermeasures
	var expiredCountermeasures int
	expiredQuery := `SELECT COUNT(*) FROM countermeasures c WHERE c.deadline < $1`
	var expiredArgs []interface{} = []interface{}{time.Now()}
	if role != "ADMIN" {
		expiredQuery = `SELECT COUNT(*) FROM countermeasures c WHERE c.deadline < $1 AND (c.risk_id IN (SELECT id FROM risks WHERE owner_id = $2) OR c.assignee_id = $2)`
		expiredArgs = []interface{}{time.Now(), userID}
	}
	err = r.db.QueryRowContext(ctx, expiredQuery, expiredArgs...).Scan(&expiredCountermeasures)
	if err != nil {
		return nil, fmt.Errorf("count expired countermeasures: %w", err)
	}

	// Expiring soon countermeasures (within 7 days)
	var expiringSoonCountermeasures int
	expiringQuery := `SELECT COUNT(*) FROM countermeasures c WHERE c.deadline >= $1 AND c.deadline <= $2`
	var expiringArgs []interface{} = []interface{}{time.Now(), time.Now().Add(7 * 24 * time.Hour)}
	if role != "ADMIN" {
		expiringQuery = `SELECT COUNT(*) FROM countermeasures c WHERE c.deadline >= $1 AND c.deadline <= $2 AND (c.risk_id IN (SELECT id FROM risks WHERE owner_id = $3) OR c.assignee_id = $3)`
		expiringArgs = []interface{}{time.Now(), time.Now().Add(7 * 24 * time.Hour), userID}
	}
	err = r.db.QueryRowContext(ctx, expiringQuery, expiringArgs...).Scan(&expiringSoonCountermeasures)
	if err != nil {
		return nil, fmt.Errorf("count expiring soon countermeasures: %w", err)
	}

	return &domain.ReportSummary{
		TotalRisks:                 totalRisks,
		InProgressRisks:            inProgressRisks,
		CompletedRisks:             completedRisks,
		ExpiredCountermeasures:     expiredCountermeasures,
		ExpiringSoonCountermeasures: expiringSoonCountermeasures,
	}, nil
}

func (r *ReportPGRepo) GetDetailed(ctx context.Context, filter domain.ReportFilter) (*domain.PaginatedReport, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 10
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	// Base query with joins
	baseQuery := `
		SELECT 
			r.id, r.title, r.probability, r.impact, r.status,
			r.max_cause_probability, r.max_consequence_probability,
			r.created_at,
			ro.name as target_name, ro.object_type as target_type,
			u.full_name as owner_name
		FROM risks r
		JOIN risk_objects ro ON r.target_id = ro.id
		JOIN users u ON r.owner_id = u.id
	`

	if filter.Role != "ADMIN" {
		conditions = append(conditions, fmt.Sprintf("(r.owner_id = $%d OR r.id IN (SELECT risk_id FROM countermeasures WHERE assignee_id = $%d))", argIdx, argIdx))
		args = append(args, filter.UserID)
		argIdx++
	}

	if filter.TargetID != nil {
		conditions = append(conditions, fmt.Sprintf("r.target_id = $%d", argIdx))
		args = append(args, *filter.TargetID)
		argIdx++
	}
	if filter.OwnerID != nil {
		conditions = append(conditions, fmt.Sprintf("r.owner_id = $%d", argIdx))
		args = append(args, *filter.OwnerID)
		argIdx++
	}
	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("r.status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.DateFrom != nil {
		conditions = append(conditions, fmt.Sprintf("r.created_at >= $%d", argIdx))
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil {
		conditions = append(conditions, fmt.Sprintf("r.created_at <= $%d", argIdx))
		args = append(args, *filter.DateTo)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM risks r " + whereClause
	var totalCount int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("count risks: %w", err)
	}

	// Main query with pagination
	offset := (filter.Page - 1) * filter.Limit
	args = append(args, filter.Limit, offset)

	query := fmt.Sprintf(`
		%s
		%s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d
	`, baseQuery, whereClause, argIdx, argIdx+1)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select risks: %w", err)
	}
	defer rows.Close()

	var items []*domain.ReportItem
	for rows.Next() {
		var item domain.ReportItem
		var createdAt time.Time
		err := rows.Scan(
			&item.ID, &item.Title, &item.Probability, &item.Impact, &item.Status,
			&item.MaxCauseProbability, &item.MaxConsequenceProbability,
			&createdAt,
			&item.TargetName, &item.TargetType, &item.OwnerName,
		)
		if err != nil {
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, &item)
	}

	// Fetch countermeasures for each risk
	for _, item := range items {
		cms, err := r.getCountermeasuresForRisk(ctx, item.ID)
		if err != nil {
			return nil, fmt.Errorf("get countermeasures: %w", err)
		}
		item.Countermeasures = cms
	}

	return &domain.PaginatedReport{
		Items:      items,
		TotalCount: totalCount,
		Page:       filter.Page,
		Limit:      filter.Limit,
	}, nil
}

func (r *ReportPGRepo) getCountermeasuresForRisk(ctx context.Context, riskID string) ([]domain.CountermeasureReport, error) {
	query := `
		SELECT c.id, c.description, u.full_name, c.deadline, c.target_type
		FROM countermeasures c
		JOIN users u ON c.assignee_id = u.id
		WHERE c.risk_id = $1
		ORDER BY c.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, riskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cms []domain.CountermeasureReport
	now := time.Now()
	soon := now.Add(7 * 24 * time.Hour)

	for rows.Next() {
		var cm domain.CountermeasureReport
		var deadline time.Time
		err := rows.Scan(&cm.ID, &cm.Description, &cm.AssigneeName, &deadline, &cm.TargetType)
		if err != nil {
			return nil, err
		}
		cm.Deadline = deadline.Format(time.RFC3339)
		cm.IsExpired = deadline.Before(now)
		cm.IsExpiringSoon = deadline.After(now) && deadline.Before(soon)
		cms = append(cms, cm)
	}
	return cms, rows.Err()
}