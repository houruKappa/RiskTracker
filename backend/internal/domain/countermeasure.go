package domain

import (
	"context"
	"time"
)

type CountermeasureTarget string

const (
	TargetCause        CountermeasureTarget = "CAUSE"
	TargetConsequence  CountermeasureTarget = "CONSEQUENCE"
)

type CountermeasureStatus string

const (
	CMStatusPending   CountermeasureStatus = "PENDING"
	CMStatusCompleted CountermeasureStatus = "COMPLETED"
)

// IsOverdue returns true when the countermeasure is not completed and its deadline has passed.
func (c *Countermeasure) IsOverdue() bool {
	return c.Status != CMStatusCompleted && c.Deadline.Before(time.Now())
}

type Countermeasure struct {
	ID            string                `json:"id" db:"id"`
	RiskID        string                `json:"risk_id" db:"risk_id"`
	TargetType    CountermeasureTarget  `json:"target_type" db:"target_type"`
	CauseID       *string              `json:"cause_id,omitempty" db:"cause_id"`
	ConsequenceID *string              `json:"consequence_id,omitempty" db:"consequence_id"`
	Description   string                `json:"description" db:"description"`
	AssigneeID    string                `json:"assignee_id" db:"assignee_id"`
	Status        CountermeasureStatus  `json:"status" db:"status"`
	Deadline      time.Time             `json:"deadline" db:"deadline"`
	CreatedAt     time.Time             `json:"created_at" db:"created_at"`
}

type CountermeasureRepository interface {
	Create(ctx context.Context, cm *Countermeasure) error
	GetByID(ctx context.Context, id string) (*Countermeasure, error)
	Update(ctx context.Context, cm *Countermeasure) error
	Delete(ctx context.Context, id string) error
	ListByRiskID(ctx context.Context, riskID string) ([]*Countermeasure, error)
}
