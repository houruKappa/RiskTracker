package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type RiskPGRepo struct {
	db *sql.DB
}

func NewRiskRepo(db *sql.DB) *RiskPGRepo {
	return &RiskPGRepo{db: db}
}

func scanRisk(scanner interface {
	Scan(dest ...interface{}) error
}) (domain.Risk, error) {
	var r domain.Risk
	err := scanner.Scan(
		&r.ID, &r.Status, &r.Title, &r.TargetID, &r.OwnerID,
		&r.Probability, &r.Impact, &r.FinancialLoss,
		&r.ReputationalLoss, &r.LegalConsequences, &r.Comment,
		&r.MaxCauseProbability, &r.MaxConsequenceProbability,
		&r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func scanCause(scanner interface {
	Scan(dest ...interface{}) error
}) (domain.RiskCause, error) {
	var c domain.RiskCause
	err := scanner.Scan(&c.ID, &c.RiskID, &c.Name, &c.Description, &c.Probability, &c.CreatedAt)
	return c, err
}

func scanConsequence(scanner interface {
	Scan(dest ...interface{}) error
}) (domain.RiskConsequence, error) {
	var c domain.RiskConsequence
	err := scanner.Scan(&c.ID, &c.RiskID, &c.Name, &c.Description, &c.Probability, &c.CreatedAt)
	return c, err
}

func (r *RiskPGRepo) Create(ctx context.Context, risk *domain.Risk) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	riskQuery := `
		INSERT INTO risks (title, target_id, owner_id, probability, impact,
			financial_loss, reputational_loss, legal_consequences, comment,
			max_cause_probability, max_consequence_probability)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, status, created_at, updated_at`

	err = tx.QueryRowContext(ctx, riskQuery,
		risk.Title, risk.TargetID, risk.OwnerID,
		risk.Probability, risk.Impact, risk.FinancialLoss,
		risk.ReputationalLoss, risk.LegalConsequences, risk.Comment,
		risk.MaxCauseProbability, risk.MaxConsequenceProbability,
	).Scan(&risk.ID, &risk.Status, &risk.CreatedAt, &risk.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert risk: %w", err)
	}

	for i := range risk.Causes {
		risk.Causes[i].RiskID = risk.ID
		err = tx.QueryRowContext(ctx, `
			INSERT INTO risk_causes (risk_id, name, description, probability)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at`,
			risk.Causes[i].RiskID, risk.Causes[i].Name,
			risk.Causes[i].Description, risk.Causes[i].Probability,
		).Scan(&risk.Causes[i].ID, &risk.Causes[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("insert cause: %w", err)
		}
	}

	for i := range risk.Consequences {
		risk.Consequences[i].RiskID = risk.ID
		err = tx.QueryRowContext(ctx, `
			INSERT INTO risk_consequences (risk_id, name, description, probability)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at`,
			risk.Consequences[i].RiskID, risk.Consequences[i].Name,
			risk.Consequences[i].Description, risk.Consequences[i].Probability,
		).Scan(&risk.Consequences[i].ID, &risk.Consequences[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("insert consequence: %w", err)
		}
	}

	return tx.Commit()
}

func (r *RiskPGRepo) GetByID(ctx context.Context, id string, userID string, role string) (*domain.Risk, error) {
	where := "WHERE r.id = $1"
	args := []interface{}{id}
	if role != "ADMIN" {
		where = fmt.Sprintf(`WHERE r.id = $1 AND (r.owner_id = $2 OR r.id IN (
			SELECT risk_id FROM countermeasures WHERE assignee_id = $2
		))`)
		args = append(args, userID)
	}

	query := fmt.Sprintf(`
		SELECT r.id, r.status, r.title, r.target_id, r.owner_id,
			r.probability, r.impact, r.financial_loss,
			r.reputational_loss, r.legal_consequences, r.comment,
			r.max_cause_probability, r.max_consequence_probability,
			r.created_at, r.updated_at
		FROM risks r
		%s`, where)

	risk, err := scanRisk(r.db.QueryRowContext(ctx, query, args...))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select risk: %w", err)
	}

	causeRows, err := r.db.QueryContext(ctx,
		`SELECT id, risk_id, name, description, probability, created_at
		 FROM risk_causes WHERE risk_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return nil, fmt.Errorf("select causes: %w", err)
	}
	defer causeRows.Close()

	for causeRows.Next() {
		c, err := scanCause(causeRows)
		if err != nil {
			return nil, fmt.Errorf("scan cause: %w", err)
		}
		risk.Causes = append(risk.Causes, c)
	}

	conseqRows, err := r.db.QueryContext(ctx,
		`SELECT id, risk_id, name, description, probability, created_at
		 FROM risk_consequences WHERE risk_id = $1 ORDER BY created_at`, id)
	if err != nil {
		return nil, fmt.Errorf("select consequences: %w", err)
	}
	defer conseqRows.Close()

	for conseqRows.Next() {
		c, err := scanConsequence(conseqRows)
		if err != nil {
			return nil, fmt.Errorf("scan consequence: %w", err)
		}
		risk.Consequences = append(risk.Consequences, c)
	}

	return &risk, nil
}

func (r *RiskPGRepo) List(ctx context.Context, filter domain.RiskFilter) (*domain.PaginatedRisks, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 10
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("r.status = $%d", argIdx))
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.TargetID != nil {
		conditions = append(conditions, fmt.Sprintf("r.target_id = $%d", argIdx))
		args = append(args, *filter.TargetID)
		argIdx++
	}
	if filter.Role != "ADMIN" {
		conditions = append(conditions, fmt.Sprintf(
			"(r.owner_id = $%d OR r.id IN (SELECT risk_id FROM countermeasures WHERE assignee_id = $%d))",
			argIdx, argIdx,
		))
		args = append(args, filter.OwnerID)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM risks r %s", where)
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("count risks: %w", err)
	}

	offset := (filter.Page - 1) * filter.Limit
	args = append(args, filter.Limit, offset)

	query := fmt.Sprintf(`
		SELECT r.id, r.status, r.title, r.target_id, r.owner_id,
			r.probability, r.impact, r.financial_loss,
			r.reputational_loss, r.legal_consequences, r.comment,
			r.max_cause_probability, r.max_consequence_probability,
			r.created_at, r.updated_at
		FROM risks r
		%s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select risks list: %w", err)
	}
	defer rows.Close()

	var risks []*domain.Risk
	for rows.Next() {
		risk, err := scanRisk(rows)
		if err != nil {
			return nil, fmt.Errorf("scan risk: %w", err)
		}
		risks = append(risks, &risk)
	}

	return &domain.PaginatedRisks{
		Items:      risks,
		TotalCount: total,
		Page:       filter.Page,
		Limit:      filter.Limit,
	}, nil
}

func (r *RiskPGRepo) Update(ctx context.Context, risk *domain.Risk) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	query := `
		UPDATE risks
		SET title = $1, target_id = $2, owner_id = $3,
			probability = $4, impact = $5,
			financial_loss = $6, reputational_loss = $7,
			legal_consequences = $8, comment = $9,
			max_cause_probability = $10, max_consequence_probability = $11,
			updated_at = NOW()
		WHERE id = $12
		RETURNING updated_at`

	err = tx.QueryRowContext(ctx, query,
		risk.Title, risk.TargetID, risk.OwnerID,
		risk.Probability, risk.Impact,
		risk.FinancialLoss, risk.ReputationalLoss,
		risk.LegalConsequences, risk.Comment,
		risk.MaxCauseProbability, risk.MaxConsequenceProbability,
		risk.ID,
	).Scan(&risk.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.ErrNotFound
		}
		return fmt.Errorf("update risk: %w", err)
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM risk_causes WHERE risk_id = $1`, risk.ID)
	if err != nil {
		return fmt.Errorf("delete old causes: %w", err)
	}

	for i := range risk.Causes {
		risk.Causes[i].RiskID = risk.ID
		err = tx.QueryRowContext(ctx, `
			INSERT INTO risk_causes (risk_id, name, description, probability)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at`,
			risk.Causes[i].RiskID, risk.Causes[i].Name,
			risk.Causes[i].Description, risk.Causes[i].Probability,
		).Scan(&risk.Causes[i].ID, &risk.Causes[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("insert cause: %w", err)
		}
	}

	_, err = tx.ExecContext(ctx, `DELETE FROM risk_consequences WHERE risk_id = $1`, risk.ID)
	if err != nil {
		return fmt.Errorf("delete old consequences: %w", err)
	}

	for i := range risk.Consequences {
		risk.Consequences[i].RiskID = risk.ID
		err = tx.QueryRowContext(ctx, `
			INSERT INTO risk_consequences (risk_id, name, description, probability)
			VALUES ($1, $2, $3, $4)
			RETURNING id, created_at`,
			risk.Consequences[i].RiskID, risk.Consequences[i].Name,
			risk.Consequences[i].Description, risk.Consequences[i].Probability,
		).Scan(&risk.Consequences[i].ID, &risk.Consequences[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("insert consequence: %w", err)
		}
	}

	return tx.Commit()
}

func (r *RiskPGRepo) UpdateStatus(ctx context.Context, id string, status domain.RiskStatus) error {
	query := `UPDATE risks SET status = $1, updated_at = NOW() WHERE id = $2`
	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RiskPGRepo) AddCause(ctx context.Context, cause *domain.RiskCause) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO risk_causes (risk_id, name, description, probability)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`,
		cause.RiskID, cause.Name, cause.Description, cause.Probability,
	).Scan(&cause.ID, &cause.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert cause: %w", err)
	}
	return nil
}

func (r *RiskPGRepo) AddConsequence(ctx context.Context, consequence *domain.RiskConsequence) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO risk_consequences (risk_id, name, description, probability)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`,
		consequence.RiskID, consequence.Name, consequence.Description, consequence.Probability,
	).Scan(&consequence.ID, &consequence.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert consequence: %w", err)
	}
	return nil
}

func (r *RiskPGRepo) DeleteCause(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM risk_causes WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete cause: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RiskPGRepo) DeleteConsequence(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM risk_consequences WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete consequence: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *RiskPGRepo) UpdateMaxProbabilities(ctx context.Context, id string, maxCause, maxConsequence *domain.RiskLevel) error {
	query := `UPDATE risks SET max_cause_probability = $1, max_consequence_probability = $2, updated_at = NOW() WHERE id = $3`
	result, err := r.db.ExecContext(ctx, query, maxCause, maxConsequence, id)
	if err != nil {
		return fmt.Errorf("update max probabilities: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return domain.ErrNotFound
	}
	return nil
}
