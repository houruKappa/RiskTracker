package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type CountermeasureUsecase struct {
	cmRepo    domain.CountermeasureRepository
	riskRepo  domain.RiskRepository
	userRepo  domain.UserRepository
	auditSvc  *AuditService
}

func NewCountermeasureUsecase(cmRepo domain.CountermeasureRepository, riskRepo domain.RiskRepository, userRepo domain.UserRepository, auditSvc *AuditService) *CountermeasureUsecase {
	return &CountermeasureUsecase{
		cmRepo:    cmRepo,
		riskRepo:  riskRepo,
		userRepo:  userRepo,
		auditSvc:  auditSvc,
	}
}

func (u *CountermeasureUsecase) validateCreate(ctx context.Context, cm *domain.Countermeasure) error {
	if cm.RiskID == "" || cm.Description == "" || cm.AssigneeID == "" {
		return domain.ErrValidation
	}

	if cm.Deadline.IsZero() || cm.Deadline.Before(time.Now()) {
		return domain.ErrValidation
	}

	if cm.TargetType != domain.TargetCause && cm.TargetType != domain.TargetConsequence {
		return domain.ErrValidation
	}

	if cm.TargetType == domain.TargetCause {
		if cm.CauseID == nil || *cm.CauseID == "" {
			return domain.ErrValidation
		}
		if cm.ConsequenceID != nil && *cm.ConsequenceID != "" {
			return domain.ErrValidation
		}
	} else {
		if cm.ConsequenceID == nil || *cm.ConsequenceID == "" {
			return domain.ErrValidation
		}
		if cm.CauseID != nil && *cm.CauseID != "" {
			return domain.ErrValidation
		}
	}

	// Check assignee exists
	_, err := u.userRepo.GetByID(ctx, cm.AssigneeID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrValidation
		}
		return err
	}

	// Check risk exists and is accessible
	risk, err := u.riskRepo.GetByID(ctx, cm.RiskID, "", "ADMIN")
	if err != nil {
		return err
	}

	// Validate target integrity
	if cm.TargetType == domain.TargetCause {
		found := false
		for _, cause := range risk.Causes {
			if cause.ID == *cm.CauseID {
				found = true
				break
			}
		}
		if !found {
			return domain.ErrValidation
		}
	} else {
		found := false
		for _, conseq := range risk.Consequences {
			if conseq.ID == *cm.ConsequenceID {
				found = true
				break
			}
		}
		if !found {
			return domain.ErrValidation
		}
	}

	return nil
}

func (u *CountermeasureUsecase) Create(ctx context.Context, cm *domain.Countermeasure, userID, role string) (*domain.Countermeasure, error) {
	// Validate
	if err := u.validateCreate(ctx, cm); err != nil {
		return nil, err
	}

	// Check permissions: USER can only create countermeasures for their own risks
	if role != "ADMIN" {
		risk, err := u.riskRepo.GetByID(ctx, cm.RiskID, userID, role)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return nil, domain.ErrForbidden
			}
			return nil, err
		}
		if risk.OwnerID != userID {
			return nil, domain.ErrForbidden
		}
	}

	if err := u.cmRepo.Create(ctx, cm); err != nil {
		return nil, err
	}

	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "COUNTERMEASURE", cm.ID, cm.Description, domain.ActionCreate, userID, "", nil, cm)
	}

	return cm, nil
}

func (u *CountermeasureUsecase) GetByID(ctx context.Context, id string) (*domain.Countermeasure, error) {
	return u.cmRepo.GetByID(ctx, id)
}

func (u *CountermeasureUsecase) Update(ctx context.Context, cm *domain.Countermeasure, userID, role string) (*domain.Countermeasure, error) {
	// Get existing to verify permissions and get immutable fields
	existing, err := u.cmRepo.GetByID(ctx, cm.ID)
	if err != nil {
		return nil, err
	}

	// Check permissions
	if role != "ADMIN" {
		risk, err := u.riskRepo.GetByID(ctx, existing.RiskID, userID, role)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return nil, domain.ErrForbidden
			}
			return nil, err
		}
		if risk.OwnerID != userID {
			return nil, domain.ErrForbidden
		}
	}

	// Preserve immutable fields
	cm.RiskID = existing.RiskID
	cm.TargetType = existing.TargetType
	cm.CauseID = existing.CauseID
	cm.ConsequenceID = existing.ConsequenceID
	cm.CreatedAt = existing.CreatedAt

	// A completed countermeasure is allowed to have a past deadline.
	if cm.Status != domain.CMStatusCompleted {
		if cm.Deadline.IsZero() || cm.Deadline.Before(time.Now()) {
			return nil, domain.ErrValidation
		}
	}

	// Validate
	if cm.Description == "" || cm.AssigneeID == "" {
		return nil, domain.ErrValidation
	}

	// Check assignee exists
	_, err = u.userRepo.GetByID(ctx, cm.AssigneeID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrValidation
		}
		return nil, err
	}

	if err := u.cmRepo.Update(ctx, cm); err != nil {
		return nil, err
	}

	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "COUNTERMEASURE", cm.ID, cm.Description, domain.ActionUpdate, userID, DiffChanges(existing, cm), existing, cm)
	}

	return cm, nil
}

func (u *CountermeasureUsecase) Delete(ctx context.Context, id, userID, role string) error {
	existing, err := u.cmRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Check permissions
	if role != "ADMIN" {
		risk, err := u.riskRepo.GetByID(ctx, existing.RiskID, userID, role)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return domain.ErrForbidden
			}
			return err
		}
		if risk.OwnerID != userID {
			return domain.ErrForbidden
		}
		// Cannot delete countermeasure for completed risk
		if risk.Status == domain.StatusCompleted {
			return domain.ErrValidation
		}
	}

	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "COUNTERMEASURE", id, existing.Description, domain.ActionDelete, userID, "", nil, nil)
	}

	return u.cmRepo.Delete(ctx, id)
}

func (u *CountermeasureUsecase) ListByRiskID(ctx context.Context, riskID, userID, role string) ([]*domain.Countermeasure, error) {
	// Check access to risk
	if role != "ADMIN" {
		risk, err := u.riskRepo.GetByID(ctx, riskID, userID, role)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return nil, domain.ErrForbidden
			}
			return nil, err
		}
		if risk.OwnerID != userID {
			return nil, domain.ErrForbidden
		}
	}

	return u.cmRepo.ListByRiskID(ctx, riskID)
}