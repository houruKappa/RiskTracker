package usecase

import (
	"context"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type RiskObjectUsecase struct {
	repo domain.RiskObjectRepository
}

func NewRiskObjectUsecase(repo domain.RiskObjectRepository) *RiskObjectUsecase {
	return &RiskObjectUsecase{repo: repo}
}

func (u *RiskObjectUsecase) List(ctx context.Context) ([]*domain.RiskObject, error) {
	return u.repo.List(ctx)
}

func (u *RiskObjectUsecase) Create(ctx context.Context, obj *domain.RiskObject) error {
	if obj.Name == "" {
		return domain.ErrValidation
	}
	if obj.ObjectType != domain.ObjectTypeITSystem &&
		obj.ObjectType != domain.ObjectTypeProject &&
		obj.ObjectType != domain.ObjectTypeProcess {
		return domain.ErrValidation
	}
	return u.repo.Create(ctx, obj)
}

func (u *RiskObjectUsecase) Update(ctx context.Context, obj *domain.RiskObject) error {
	if obj.Name == "" {
		return domain.ErrValidation
	}
	return u.repo.Update(ctx, obj)
}

func (u *RiskObjectUsecase) GetByID(ctx context.Context, id string) (*domain.RiskObject, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *RiskObjectUsecase) Delete(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}
