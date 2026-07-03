package usecase

import (
	"context"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type AuditLogUsecase struct {
	repo domain.AuditLogRepository
}

func NewAuditLogUsecase(repo domain.AuditLogRepository) *AuditLogUsecase {
	return &AuditLogUsecase{repo: repo}
}

func (u *AuditLogUsecase) List(ctx context.Context, filter domain.AuditLogFilter) (*domain.PaginatedAuditLogs, error) {
	return u.repo.List(ctx, filter)
}