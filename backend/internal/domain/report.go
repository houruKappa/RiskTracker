package domain

import (
	"context"
)

type ReportRepository interface {
	GetSummary(ctx context.Context, userID string, role string) (*ReportSummary, error)
	GetDetailed(ctx context.Context, filter ReportFilter) (*PaginatedReport, error)
}

type ReportSummary struct {
	TotalRisks                int `json:"total_risks"`
	InProgressRisks           int `json:"in_progress_risks"`
	CompletedRisks            int `json:"completed_risks"`
	ExpiredCountermeasures    int `json:"expired_countermeasures"`
	ExpiringSoonCountermeasures int `json:"expiring_soon_countermeasures"`
}

type ReportFilter struct {
	Page      int         `json:"page"`
	Limit     int         `json:"limit"`
	TargetID  *string     `json:"target_id,omitempty"`
	OwnerID   *string     `json:"owner_id,omitempty"`
	Status    *RiskStatus `json:"status,omitempty"`
	DateFrom  *string     `json:"date_from,omitempty"`
	DateTo    *string     `json:"date_to,omitempty"`
	UserID    string      `json:"-"`
	Role      string      `json:"-"`
	Search    *string     `json:"search,omitempty"`
}

type PaginatedReport struct {
	Items      []*ReportItem `json:"items"`
	TotalCount int           `json:"total_count"`
	Page       int           `json:"page"`
	Limit      int           `json:"limit"`
}

type ReportItem struct {
	ID                  string                 `json:"id"`
	Title               string                 `json:"title"`
	TargetName          string                 `json:"target_name"`
	TargetType          RiskObjectType         `json:"target_type"`
	OwnerName           string                 `json:"owner_name"`
	Status              RiskStatus             `json:"status"`
	Probability         RiskLevel              `json:"probability"`
	Impact              RiskLevel              `json:"impact"`
	MaxCauseProbability *RiskLevel             `json:"max_cause_probability"`
	MaxConsequenceProbability *RiskLevel       `json:"max_consequence_probability"`
	Countermeasures     []CountermeasureReport `json:"countermeasures"`
	CreatedAt           string                 `json:"created_at"`
}

type CountermeasureReport struct {
	ID          string                `json:"id"`
	Description string                `json:"description"`
	AssigneeName string               `json:"assignee_name"`
	Deadline    string                `json:"deadline"`
	IsExpired   bool                  `json:"is_expired"`
	IsExpiringSoon bool               `json:"is_expiring_soon"`
	TargetType  CountermeasureTarget  `json:"target_type"`
}