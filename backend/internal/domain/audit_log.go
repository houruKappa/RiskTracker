package domain

import (
	"context"
	"encoding/json"
	"time"
)

type ActionType string

const (
	ActionCreate ActionType = "CREATE"
	ActionUpdate ActionType = "UPDATE"
	ActionDelete ActionType = "DELETE"
)

type AuditLog struct {
	ID              int64           `json:"id" db:"id"`
	EntityType      string          `json:"entity_type" db:"entity_type"`
	EntityID        string          `json:"entity_id" db:"entity_id"`
	ActionType      ActionType      `json:"action_type" db:"action_type"`
	ChangedByUserID string          `json:"changed_by_user_id" db:"changed_by_user_id"`
	Timestamp       time.Time       `json:"timestamp" db:"timestamp"`
	OldState        json.RawMessage `json:"old_state,omitempty" db:"old_state"`
	NewState        json.RawMessage `json:"new_state,omitempty" db:"new_state"`
}

type AuditLogRepository interface {
	LogAction(ctx context.Context, entry *AuditLog) error
	List(ctx context.Context, filter AuditLogFilter) (*PaginatedAuditLogs, error)
}

type AuditLogFilter struct {
	Page             int
	Limit            int
	EntityType       *string
	EntityID         *string
	ActionType       *ActionType
	ChangedByUserID  *string
	DateFrom         *string
	DateTo           *string
	UserID           string
	Role             string
}

type PaginatedAuditLogs struct {
	Items      []*AuditLog `json:"items"`
	TotalCount int         `json:"total_count"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
}