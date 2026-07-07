package usecase

import (
	"context"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type RiskObjectUsecase struct {
	repo     domain.RiskObjectRepository
	auditSvc *AuditService
}

func NewRiskObjectUsecase(repo domain.RiskObjectRepository, auditSvc *AuditService) *RiskObjectUsecase {
	return &RiskObjectUsecase{repo: repo, auditSvc: auditSvc}
}

func (u *RiskObjectUsecase) List(ctx context.Context) ([]*domain.RiskObject, error) {
	return u.repo.List(ctx)
}

func (u *RiskObjectUsecase) Create(ctx context.Context, obj *domain.RiskObject, userID string) error {
	if obj.Name == "" {
		return domain.ErrValidation
	}
	if obj.ObjectType != domain.ObjectTypeITSystem &&
		obj.ObjectType != domain.ObjectTypeProject &&
		obj.ObjectType != domain.ObjectTypeProcess {
		return domain.ErrValidation
	}
	if err := u.repo.Create(ctx, obj); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_OBJECT", obj.ID, obj.Name, domain.ActionCreate, userID, "", nil, obj)
	}
	return nil
}

func (u *RiskObjectUsecase) Update(ctx context.Context, obj *domain.RiskObject, userID string) error {
	if obj.Name == "" {
		return domain.ErrValidation
	}
	if err := u.repo.Update(ctx, obj); err != nil {
		return err
	}
	if u.auditSvc != nil {
		_ = u.auditSvc.Log(ctx, "RISK_OBJECT", obj.ID, obj.Name, domain.ActionUpdate, userID, "", nil, obj)
	}
	return nil
}

func (u *RiskObjectUsecase) GetByID(ctx context.Context, id string) (*domain.RiskObject, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *RiskObjectUsecase) Delete(ctx context.Context, id, userID string) error {
	if u.auditSvc != nil {
		if obj, err := u.repo.GetByID(ctx, id); err == nil {
			_ = u.auditSvc.Log(ctx, "RISK_OBJECT", id, obj.Name, domain.ActionDelete, userID, "", nil, nil)
		}
	}
	return u.repo.Delete(ctx, id)
}
