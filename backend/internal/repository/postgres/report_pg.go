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

	// Countermeasure stats (over accessible risks)
	cmWhere := ""
	var cmArgs []interface{}
	if role != "ADMIN" {
		cmWhere = `WHERE c.risk_id IN (SELECT id FROM risks WHERE owner_id = $1) OR c.assignee_id = $1`
		cmArgs = []interface{}{userID}
	}

	var totalCM, completedCM, pendingCM, overdueCM int
	countCM := fmt.Sprintf("SELECT COUNT(*) FROM countermeasures c %s", cmWhere)
	if err := r.db.QueryRowContext(ctx, countCM, cmArgs...).Scan(&totalCM); err != nil {
		return nil, fmt.Errorf("count countermeasures: %w", err)
	}
	completedCMQ := fmt.Sprintf("SELECT COUNT(*) FROM countermeasures c %s %s c.status = 'COMPLETED'", cmWhere, statusWhere)
	if err := r.db.QueryRowContext(ctx, completedCMQ, cmArgs...).Scan(&completedCM); err != nil {
		return nil, fmt.Errorf("count completed countermeasures: %w", err)
	}
	pendingCMQ := fmt.Sprintf("SELECT COUNT(*) FROM countermeasures c %s %s c.status = 'PENDING'", cmWhere, statusWhere)
	if err := r.db.QueryRowContext(ctx, pendingCMQ, cmArgs...).Scan(&pendingCM); err != nil {
		return nil, fmt.Errorf("count pending countermeasures: %w", err)
	}
	overdueCMQ := fmt.Sprintf("SELECT COUNT(*) FROM countermeasures c %s %s c.status = 'PENDING' AND c.deadline < $%d", cmWhere, statusWhere, len(cmArgs)+1)
	overdueArgs := append(append([]interface{}{}, cmArgs...), time.Now())
	if err := r.db.QueryRowContext(ctx, overdueCMQ, overdueArgs...).Scan(&overdueCM); err != nil {
		return nil, fmt.Errorf("count overdue countermeasures: %w", err)
	}

	// Expired countermeasures (legacy, deadline passed, any status)
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
		TotalCountermeasures:       totalCM,
		CompletedCountermeasures:   completedCM,
		PendingCountermeasures:     pendingCM,
		OverdueCountermeasures:     overdueCM,
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

	baseSelect := `
		SELECT
			r.id, r.title, r.probability, r.impact, r.status,
			r.max_cause_probability, r.max_consequence_probability,
			r.created_at,
			ro.name as target_name, ro.object_type as target_type,
			u.full_name as owner_name, u.id as owner_id
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
	if filter.AssigneeID != nil {
		conditions = append(conditions, fmt.Sprintf("r.id IN (SELECT risk_id FROM countermeasures WHERE assignee_id = $%d)", argIdx))
		args = append(args, *filter.AssigneeID)
		argIdx++
	}
	if len(filter.RiskIDs) > 0 {
		placeholders := make([]string, 0, len(filter.RiskIDs))
		for _, id := range filter.RiskIDs {
			placeholders = append(placeholders, fmt.Sprintf("$%d", argIdx))
			args = append(args, id)
			argIdx++
		}
		conditions = append(conditions, fmt.Sprintf("r.id IN (%s)", strings.Join(placeholders, ",")))
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
	if filter.Search != nil && *filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(r.title ILIKE $%d OR r.id::text ILIKE $%d OR u.full_name ILIKE $%d)",
			argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+*filter.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Determine report scope (for whom the report is generated)
	reportForType := "ALL"
	reportForName := ""
	switch {
	case filter.OwnerID != nil:
		reportForType = "OWNER"
		reportForName = r.userName(ctx, *filter.OwnerID)
	case filter.AssigneeID != nil:
		reportForType = "ASSIGNEE"
		reportForName = r.userName(ctx, *filter.AssigneeID)
	case len(filter.RiskIDs) > 0:
		reportForType = "SELECTION"
		reportForName = fmt.Sprintf("%d рисков", len(filter.RiskIDs))
	}

	// Fetch ALL matching risks (statistics + pagination both need the full set)
	allQuery := fmt.Sprintf(`%s %s ORDER BY r.created_at DESC`, baseSelect, whereClause)
	rows, err := r.db.QueryContext(ctx, allQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("select risks: %w", err)
	}

	var allItems []*domain.ReportItem
	riskByID := make(map[string]*domain.ReportItem)
	for rows.Next() {
		item, createdAt, err := scanReportItem(rows)
		if err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		item.CreatedAt = createdAt
		allItems = append(allItems, item)
		riskByID[item.ID] = item
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	rows.Close()

	// Fetch all countermeasures for the matched risks in one query
	riskIDs := make([]string, 0, len(allItems))
	for _, it := range allItems {
		riskIDs = append(riskIDs, it.ID)
	}
	cms, err := r.getAllCountermeasuresForRisks(ctx, riskIDs)
	if err != nil {
		return nil, err
	}
	for _, cm := range cms {
		if it, ok := riskByID[cm.RiskID]; ok {
			it.Countermeasures = append(it.Countermeasures, cm.CountermeasureReport)
		}
	}

	// Compute statistics over the full filtered set
	stats := computeStatistics(allItems, cms)

	totalCount := len(allItems)
	offset := (filter.Page - 1) * filter.Limit
	if offset > totalCount {
		offset = totalCount
	}
	end := offset + filter.Limit
	if end > totalCount {
		end = totalCount
	}
	pageItems := allItems[offset:end]

	return &domain.PaginatedReport{
		Items:         pageItems,
		TotalCount:    totalCount,
		Page:          filter.Page,
		Limit:         filter.Limit,
		Statistics:    stats,
		ReportForType: reportForType,
		ReportForName: reportForName,
	}, nil
}

func (r *ReportPGRepo) userName(ctx context.Context, id string) string {
	var name string
	err := r.db.QueryRowContext(ctx, `SELECT full_name FROM users WHERE id = $1`, id).Scan(&name)
	if err != nil {
		return id
	}
	return name
}

type cmRow struct {
	domain.CountermeasureReport
	RiskID string
}

func (r *ReportPGRepo) getAllCountermeasuresForRisks(ctx context.Context, riskIDs []string) ([]cmRow, error) {
	if len(riskIDs) == 0 {
		return nil, nil
	}
	placeholders := make([]string, 0, len(riskIDs))
	args := make([]interface{}, 0, len(riskIDs))
	for i, id := range riskIDs {
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
		args = append(args, id)
	}
	query := fmt.Sprintf(`
		SELECT c.risk_id, c.id, c.description, u.full_name, u.id, c.deadline, c.status, c.target_type
		FROM countermeasures c
		JOIN users u ON c.assignee_id = u.id
		WHERE c.risk_id IN (%s)
		ORDER BY c.created_at DESC
	`, strings.Join(placeholders, ","))

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select countermeasures: %w", err)
	}
	defer rows.Close()

	now := time.Now()
	soon := now.Add(7 * 24 * time.Hour)
	var result []cmRow
	for rows.Next() {
		var cm domain.CountermeasureReport
		var riskID, assigneeID string
		var deadline time.Time
		if err := rows.Scan(&riskID, &cm.ID, &cm.Description, &cm.AssigneeName, &assigneeID, &deadline, &cm.Status, &cm.TargetType); err != nil {
			return nil, fmt.Errorf("scan countermeasure: %w", err)
		}
		cm.AssigneeID = assigneeID
		cm.Deadline = deadline.Format(time.RFC3339)
		cm.IsExpired = deadline.Before(now)
		cm.IsExpiringSoon = deadline.After(now) && deadline.Before(soon)
		result = append(result, cmRow{CountermeasureReport: cm, RiskID: riskID})
	}
	return result, rows.Err()
}

func scanReportItem(rows *sql.Rows) (*domain.ReportItem, string, error) {
	var item domain.ReportItem
	var createdAt time.Time
	err := rows.Scan(
		&item.ID, &item.Title, &item.Probability, &item.Impact, &item.Status,
		&item.MaxCauseProbability, &item.MaxConsequenceProbability,
		&createdAt,
		&item.TargetName, &item.TargetType, &item.OwnerName, &item.OwnerID,
	)
	if err != nil {
		return nil, "", err
	}
	return &item, createdAt.Format(time.RFC3339), nil
}

func computeStatistics(items []*domain.ReportItem, cms []cmRow) *domain.ReportStatistics {
	stats := &domain.ReportStatistics{}
	for _, it := range items {
		switch it.Status {
		case domain.StatusInProgress:
			stats.RisksInProgress++
		case domain.StatusCompleted:
			stats.RisksCompleted++
		}
	}
	stats.RisksTotal = len(items)

	for _, row := range cms {
		stats.CountermeasuresTotal++
		switch row.Status {
		case domain.CMStatusCompleted:
			stats.CountermeasuresCompleted++
		case domain.CMStatusPending:
			stats.CountermeasuresPending++
			deadline, err := time.Parse(time.RFC3339, row.Deadline)
			if err == nil && deadline.Before(time.Now()) {
				stats.CountermeasuresOverdue++
				riskTitle := ""
				if it, ok := riskByIDLookup(items, row.RiskID); ok {
					riskTitle = it.Title
				}
				stats.OverdueDetails = append(stats.OverdueDetails, domain.OverdueCountermeasure{
					RiskID:          row.RiskID,
					RiskTitle:       riskTitle,
					CountermeasureID: row.ID,
					Description:     row.Description,
					AssigneeName:    row.AssigneeName,
					AssigneeID:      row.AssigneeID,
					Deadline:        row.Deadline,
				})
			}
		}
	}
	return stats
}

func riskByIDLookup(items []*domain.ReportItem, id string) (*domain.ReportItem, bool) {
	for _, it := range items {
		if it.ID == id {
			return it, true
		}
	}
	return nil, false
}
