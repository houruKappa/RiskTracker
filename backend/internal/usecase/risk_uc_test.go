package usecase

import (
	"context"
	"testing"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestRiskCreate_Success(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := NewRiskUsecase(mockRepo, nil)

	risk := &domain.Risk{
		Title:    "Test Risk",
		TargetID: "target-1",
		OwnerID:  "owner-1",
		Causes: []domain.RiskCause{
			{Name: "Cause 1", Probability: domain.RiskHigh},
		},
		Consequences: []domain.RiskConsequence{
			{Name: "Conseq 1", Probability: domain.RiskMedium},
		},
	}

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	created, err := uc.Create(context.Background(), risk, "user-1")
	assert.NoError(t, err)
	assert.NotNil(t, created)
	assert.Equal(t, domain.StatusInProgress, created.Status)
	mockRepo.AssertExpectations(t)
}

func TestRiskCreate_Validation(t *testing.T) {
	uc := NewRiskUsecase(nil, nil)

	risk := &domain.Risk{Title: ""}
	_, err := uc.Create(context.Background(), risk, "user-1")
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestRiskUpdate_Forbidden(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := NewRiskUsecase(mockRepo, nil)

	existing := &domain.Risk{
		ID:       "risk-1",
		Title:    "Test Risk",
		TargetID: "target-1",
		OwnerID:  "other-user",
	}
	mockRepo.On("GetByID", mock.Anything, "risk-1", "user-1", "USER").Return(existing, nil)

	risk := &domain.Risk{
		ID:       "risk-1",
		Title:    "Test Risk",
		TargetID: "target-1",
		OwnerID:  "other-user",
	}

	_, err := uc.Update(context.Background(), risk, "user-1", "USER")
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}