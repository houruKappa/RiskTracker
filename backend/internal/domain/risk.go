package domain

import (
	"context"
	"time"
)

type RiskLevel string

const (
	RiskLow     RiskLevel = "LOW"
	RiskMedium  RiskLevel = "MEDIUM"
	RiskHigh    RiskLevel = "HIGH"
	RiskCritical RiskLevel = "CRITICAL"
)

type RiskStatus string

const (
	StatusInProgress RiskStatus = "IN_PROGRESS"
	StatusCompleted  RiskStatus = "COMPLETED"
)

type RiskObjectType string

const (
	ObjectTypeITSystem RiskObjectType = "IT_SYSTEM"
	ObjectTypeProject  RiskObjectType = "PROJECT"
	ObjectTypeProcess  RiskObjectType = "PROCESS"
)

type RiskObject struct {
	ID          string         `json:"id" db:"id"`
	Name        string         `json:"name" db:"name"`
	ObjectType  RiskObjectType `json:"object_type" db:"object_type"`
	Description *string        `json:"description" db:"description"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at" db:"updated_at"`
}

type RiskCause struct {
	ID          string    `json:"id" db:"id"`
	RiskID      string    `json:"risk_id" db:"risk_id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description" db:"description"`
	Probability RiskLevel `json:"probability" db:"probability"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type RiskConsequence struct {
	ID          string    `json:"id" db:"id"`
	RiskID      string    `json:"risk_id" db:"risk_id"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description" db:"description"`
	Probability RiskLevel `json:"probability" db:"probability"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Risk struct {
	ID                         string             `json:"id" db:"id"`
	Status                     RiskStatus         `json:"status" db:"status"`
	Title                      string             `json:"title" db:"title"`
	TargetID                   string             `json:"target_id" db:"target_id"`
	OwnerID                    string             `json:"owner_id" db:"owner_id"`
	Probability                RiskLevel          `json:"probability" db:"probability"`
	Impact                     RiskLevel          `json:"impact" db:"impact"`
	FinancialLoss              *string            `json:"financial_loss" db:"financial_loss"`
	ReputationalLoss           *RiskLevel         `json:"reputational_loss" db:"reputational_loss"`
	LegalConsequences          *int               `json:"legal_consequences" db:"legal_consequences"`
	Comment                    *string            `json:"comment" db:"comment"`
	MaxCauseProbability        *RiskLevel         `json:"max_cause_probability" db:"max_cause_probability"`
	MaxConsequenceProbability  *RiskLevel         `json:"max_consequence_probability" db:"max_consequence_probability"`
	Causes                     []RiskCause        `json:"causes,omitempty"`
	Consequences               []RiskConsequence  `json:"consequences,omitempty"`
	CreatedAt                  time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt                  time.Time          `json:"updated_at" db:"updated_at"`
}

type PaginatedRisks struct {
	Items      []*Risk `json:"items"`
	TotalCount int     `json:"total_count"`
	Page       int     `json:"page"`
	Limit      int     `json:"limit"`
}

var riskLevelOrder = map[RiskLevel]int{
	RiskLow:     1,
	RiskMedium:  2,
	RiskHigh:    3,
	RiskCritical: 4,
}

func MaxRiskLevel(levels []RiskLevel) *RiskLevel {
	if len(levels) == 0 {
		return nil
	}
	max := levels[0]
	maxOrder := riskLevelOrder[max]
	for _, l := range levels[1:] {
		if o := riskLevelOrder[l]; o > maxOrder {
			max = l
			maxOrder = o
		}
	}
	return &max
}

type RiskRepository interface {
	Create(ctx context.Context, risk *Risk) error
	GetByID(ctx context.Context, id string, userID string, role string) (*Risk, error)
	List(ctx context.Context, filter RiskFilter) (*PaginatedRisks, error)
	Update(ctx context.Context, risk *Risk) error
	UpdateStatus(ctx context.Context, id string, status RiskStatus) error
	AddCause(ctx context.Context, cause *RiskCause) error
	AddConsequence(ctx context.Context, consequence *RiskConsequence) error
	DeleteCause(ctx context.Context, id string) error
	DeleteConsequence(ctx context.Context, id string) error
	UpdateMaxProbabilities(ctx context.Context, id string, maxCause, maxConsequence *RiskLevel) error
}

type RiskFilter struct {
	Page     int         `json:"page"`
	Limit    int         `json:"limit"`
	Status   *RiskStatus `json:"status"`
	TargetID *string     `json:"target_id"`
	OwnerID  string      `json:"-"`
	Role     string      `json:"-"`
	Search   *string     `json:"search,omitempty"`
}

type RiskObjectRepository interface {
	Create(ctx context.Context, obj *RiskObject) error
	GetByID(ctx context.Context, id string) (*RiskObject, error)
	List(ctx context.Context) ([]*RiskObject, error)
	Update(ctx context.Context, obj *RiskObject) error
	Delete(ctx context.Context, id string) error
}
