package usecase

import (
	"context"
	"encoding/json"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type AuditService struct {
	repo domain.AuditLogRepository
}

func NewAuditService(repo domain.AuditLogRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(ctx context.Context, entityType string, entityID string, actionType domain.ActionType, userID string, oldState, newState interface{}) error {
	var oldJSON, newJSON json.RawMessage
	var err error

	if oldState != nil {
		oldJSON, err = json.Marshal(oldState)
		if err != nil {
			return err
		}
	}

	if newState != nil {
		newJSON, err = json.Marshal(newState)
		if err != nil {
			return err
		}
	}

	entry := &domain.AuditLog{
		EntityType:      entityType,
		EntityID:        entityID,
		ActionType:      actionType,
		ChangedByUserID: userID,
		OldState:        oldJSON,
		NewState:        newJSON,
	}

	return s.repo.LogAction(ctx, entry)
}