package usecase

import (
	"context"
	"errors"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type RiskUsecase struct {
	repo      domain.RiskRepository
	auditSvc  *AuditService
}

func NewRiskUsecase(repo domain.RiskRepository, auditSvc *AuditService) *RiskUsecase {
	return &RiskUsecase{repo: repo, auditSvc: auditSvc}
}

func (u *RiskUsecase) computeMaxProbabilities(causes []domain.RiskCause, consequences []domain.RiskConsequence) (*domain.RiskLevel, *domain.RiskLevel) {
	var causeLevels []domain.RiskLevel
	for _, c := range causes {
		causeLevels = append(causeLevels, c.Probability)
	}
	var conseqLevels []domain.RiskLevel
	for _, c := range consequences {
		conseqLevels = append(conseqLevels, c.Probability)
	}
	return domain.MaxRiskLevel(causeLevels), domain.MaxRiskLevel(conseqLevels)
}

func (u *RiskUsecase) Create(ctx context.Context, risk *domain.Risk, userID string) (*domain.Risk, error) {
	if risk.Title == "" || risk.TargetID == "" || risk.OwnerID == "" {
		return nil, domain.ErrValidation
	}
	risk.Status = domain.StatusInProgress
	maxCause, maxConseq := u.computeMaxProbabilities(risk.Causes, risk.Consequences)
	risk.MaxCauseProbability = maxCause
	risk.MaxConsequenceProbability = maxConseq

	if err := u.repo.Create(ctx, risk); err != nil {
		return nil, err
	}

	// Audit log
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK", risk.ID, risk.Title, domain.ActionCreate, userID, "", nil, risk)
	}

	return risk, nil
}

func (u *RiskUsecase) GetByID(ctx context.Context, id, userID, role string) (*domain.Risk, error) {
	return u.repo.GetByID(ctx, id, userID, role)
}

func (u *RiskUsecase) List(ctx context.Context, filter domain.RiskFilter) (*domain.PaginatedRisks, error) {
	return u.repo.List(ctx, filter)
}

func (u *RiskUsecase) Update(ctx context.Context, risk *domain.Risk, userID, role string) (*domain.Risk, error) {
	if risk.Title == "" || risk.TargetID == "" {
		return nil, domain.ErrValidation
	}

	existing, err := u.repo.GetByID(ctx, risk.ID, userID, role)
	if err != nil {
		return nil, err
	}

	if role != "ADMIN" && existing.OwnerID != userID {
		return nil, domain.ErrForbidden
	}

	risk.OwnerID = existing.OwnerID
	risk.CreatedAt = existing.CreatedAt

	maxCause, maxConseq := u.computeMaxProbabilities(risk.Causes, risk.Consequences)
	risk.MaxCauseProbability = maxCause
	risk.MaxConsequenceProbability = maxConseq

	if err := u.repo.Update(ctx, risk); err != nil {
		return nil, err
	}

	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK", risk.ID, risk.Title, domain.ActionUpdate, userID, DiffChanges(existing, risk), existing, risk)
	}

	return risk, nil
}

func (u *RiskUsecase) UpdateStatus(ctx context.Context, id, userID, role string, status domain.RiskStatus) error {
	risk, err := u.repo.GetByID(ctx, id, userID, role)
	if err != nil {
		return err
	}
	if role != "ADMIN" && risk.OwnerID != userID {
		return domain.ErrForbidden
	}
	oldStatus := risk.Status
	if oldStatus == status {
		return nil
	}
	if err := u.repo.UpdateStatus(ctx, id, status); err != nil {
		return err
	}
	if u.auditSvc != nil {
		changes := "status: " + string(oldStatus) + " -> " + string(status)
		_ = u.auditSvc.Log(ctx, "RISK", id, risk.Title, domain.ActionUpdate, userID, changes, nil, nil)
	}
	return nil
}

func (u *RiskUsecase) AddCause(ctx context.Context, cause *domain.RiskCause, userID, role string) error {
	if role != "ADMIN" {
		risk, err := u.repo.GetByID(ctx, cause.RiskID, userID, role)
		if err != nil {
			return err
		}
		if risk.OwnerID != userID {
			return domain.ErrForbidden
		}
	}
	if cause.Name == "" {
		return domain.ErrValidation
	}
	if err := u.repo.AddCause(ctx, cause); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_CAUSE", cause.ID, cause.Name, domain.ActionCreate, userID, "", nil, cause)
	}
	return u.recalcMaxProbabilities(ctx, cause.RiskID)
}

func (u *RiskUsecase) AddConsequence(ctx context.Context, consequence *domain.RiskConsequence, userID, role string) error {
	if role != "ADMIN" {
		risk, err := u.repo.GetByID(ctx, consequence.RiskID, userID, role)
		if err != nil {
			return err
		}
		if risk.OwnerID != userID {
			return domain.ErrForbidden
		}
	}
	if consequence.Name == "" {
		return domain.ErrValidation
	}
	if err := u.repo.AddConsequence(ctx, consequence); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_CONSEQUENCE", consequence.ID, consequence.Name, domain.ActionCreate, userID, "", nil, consequence)
	}
	return u.recalcMaxProbabilities(ctx, consequence.RiskID)
}

func (u *RiskUsecase) DeleteCause(ctx context.Context, causeID, riskID, userID, role string) error {
	if err := u.checkRiskAccess(ctx, riskID, userID, role); err != nil {
		return err
	}
	name := ""
	if risk, err := u.repo.GetByID(ctx, riskID, "", "ADMIN"); err == nil {
		for _, c := range risk.Causes {
			if c.ID == causeID {
				name = c.Name
				break
			}
		}
	}
	if err := u.repo.DeleteCause(ctx, causeID); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_CAUSE", causeID, name, domain.ActionDelete, userID, "", nil, nil)
	}
	return u.recalcMaxProbabilities(ctx, riskID)
}

func (u *RiskUsecase) DeleteConsequence(ctx context.Context, conseqID, riskID, userID, role string) error {
	if err := u.checkRiskAccess(ctx, riskID, userID, role); err != nil {
		return err
	}
	name := ""
	if risk, err := u.repo.GetByID(ctx, riskID, "", "ADMIN"); err == nil {
		for _, c := range risk.Consequences {
			if c.ID == conseqID {
				name = c.Name
				break
			}
		}
	}
	if err := u.repo.DeleteConsequence(ctx, conseqID); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_CONSEQUENCE", conseqID, name, domain.ActionDelete, userID, "", nil, nil)
	}
	return u.recalcMaxProbabilities(ctx, riskID)
}

func (u *RiskUsecase) checkRiskAccess(ctx context.Context, riskID, userID, role string) error {
	if role == "ADMIN" {
		return nil
	}
	risk, err := u.repo.GetByID(ctx, riskID, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrForbidden
		}
		return err
	}
	if risk.OwnerID != userID {
		return domain.ErrForbidden
	}
	return nil
}

func (u *RiskUsecase) recalcMaxProbabilities(ctx context.Context, riskID string) error {
	risk, err := u.repo.GetByID(ctx, riskID, "", "ADMIN")
	if err != nil {
		return err
	}
	maxCause, maxConseq := u.computeMaxProbabilities(risk.Causes, risk.Consequences)
	return u.repo.UpdateMaxProbabilities(ctx, riskID, maxCause, maxConseq)
}
