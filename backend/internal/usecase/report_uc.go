package usecase

import (
	"context"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type ReportUsecase struct {
	repo domain.ReportRepository
}

func NewReportUsecase(repo domain.ReportRepository) *ReportUsecase {
	return &ReportUsecase{repo: repo}
}

func (u *ReportUsecase) GetSummary(ctx context.Context, userID, role string) (*domain.ReportSummary, error) {
	return u.repo.GetSummary(ctx, userID, role)
}

func (u *ReportUsecase) GetDetailed(ctx context.Context, filter domain.ReportFilter) (*domain.PaginatedReport, error) {
	return u.repo.GetDetailed(ctx, filter)
}