package v1

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockCountermeasureUC struct {
	mock.Mock
}

func (m *mockCountermeasureUC) Create(ctx context.Context, cm *domain.Countermeasure, userID, role string) (*domain.Countermeasure, error) {
	args := m.Called(ctx, cm, userID, role)
	if cmArg := args.Get(0); cmArg != nil {
		return cmArg.(*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockCountermeasureUC) GetByID(ctx context.Context, id string) (*domain.Countermeasure, error) {
	args := m.Called(ctx, id)
	if cmArg := args.Get(0); cmArg != nil {
		return cmArg.(*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockCountermeasureUC) Update(ctx context.Context, cm *domain.Countermeasure, userID, role string) (*domain.Countermeasure, error) {
	args := m.Called(ctx, cm, userID, role)
	if cmArg := args.Get(0); cmArg != nil {
		return cmArg.(*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockCountermeasureUC) Delete(ctx context.Context, id, userID, role string) error {
	args := m.Called(ctx, id, userID, role)
	return args.Error(0)
}

func (m *mockCountermeasureUC) ListByRiskID(ctx context.Context, riskID, userID, role string) ([]*domain.Countermeasure, error) {
	args := m.Called(ctx, riskID, userID, role)
	if sliceArg := args.Get(0); sliceArg != nil {
		return sliceArg.([]*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

func TestCountermeasureCreate_Handler(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("Create", mock.Anything, mock.MatchedBy(func(cm *domain.Countermeasure) bool {
		return cm.Description == "Test countermeasure" && cm.RiskID == "risk123"
	}), "user123", "USER").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "Test countermeasure",
		AssigneeID: "user123",
	}, nil)

	body := bytes.NewBufferString(`{"risk_id":"risk123","target_type":"CAUSE","cause_id":"cause123","description":"Test countermeasure","assignee_id":"user123","deadline":"2026-12-31T23:59:59Z"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/countermeasures", body)
	req.Header.Set("Content-Type", "application/json")
	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req = req.WithContext(ctx)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/countermeasures", body).WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("id", "cm123") // This won't be used but prevents panic

	w := httptest.NewRecorder()
	handler.Create(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureCreate_InvalidJSON(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	body := bytes.NewBufferString(`{invalid}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/countermeasures", body)
	req.Header.Set("Content-Type", "application/json")
	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	handler.Create(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCountermeasureGetByID_Handler(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("GetByID", mock.Anything, "cm123").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "Test countermeasure",
		AssigneeID: "user123",
	}, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/countermeasures/cm123").WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("id", "cm123")

	w := httptest.NewRecorder()
	handler.GetByID(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureGetByID_NotFound(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("GetByID", mock.Anything, "nonexistent").Return(nil, domain.ErrNotFound)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/countermeasures/nonexistent").WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("id", "nonexistent")

	w := httptest.NewRecorder()
	handler.GetByID(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureUpdate_Handler(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("GetByID", mock.Anything, "cm123").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "Old description",
		AssigneeID: "user123",
		TargetType: domain.TargetCause,
		CauseID: strPtr("cause123"),
		CreatedAt: time.Now().Add(-24 * time.Hour),
	}, nil)

	mockUC.On("Update", mock.Anything, mock.MatchedBy(func(cm *domain.Countermeasure) bool {
		return cm.ID == "cm123" && cm.Description == "New description"
	}), "user123", "USER").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "New description",
		AssigneeID: "user123",
	}, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	body := bytes.NewBufferString(`{"description":"New description","assignee_id":"user123","deadline":"2027-12-31T23:59:59Z"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/countermeasures/cm123", body).WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", "cm123")

	w := httptest.NewRecorder()
	handler.Update(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureUpdate_Forbidden(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("GetByID", mock.Anything, "cm123").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "Old description",
		AssigneeID: "user456", // Different user
		TargetType: domain.TargetCause,
		CauseID: strPtr("cause123"),
		CreatedAt: time.Now().Add(-24 * time.Hour),
	}, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	body := bytes.NewBufferString(`{"description":"New description","assignee_id":"user123","deadline":"2027-12-31T23:59:59Z"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/countermeasures/cm123", body).WithContext(ctx)
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", "cm123")

	w := httptest.NewRecorder()
	handler.Update(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureDelete_Handler(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("Delete", "cm123", "user123", "USER").Return(nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/countermeasures/cm123").WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("id", "cm123")

	w := httptest.NewRecorder()
	handler.Delete(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureDelete_Forbidden(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("GetByID", mock.Anything, "cm123").Return(&domain.Countermeasure{
		ID: "cm123",
		RiskID: "risk123",
		Description: "Test countermeasure",
		AssigneeID: "user456", // Different user
		TargetType: domain.TargetCause,
		CauseID: strPtr("cause123"),
		CreatedAt: time.Now(),
	}, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/countermeasures/cm123").WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("id", "cm123")

	w := httptest.NewRecorder()
	handler.Delete(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	mockUC.AssertExpectations(t)
}

func TestCountermeasureListByRiskID_Handler(t *testing.T) {
	mockUC := new(mockCountermeasureUC)
	handler := NewCountermeasureHandler(mockUC)

	mockUC.On("ListByRiskID", "risk123", "user123", "USER").Return([]*domain.Countermeasure{
		{ID: "cm1", RiskID: "risk123", Description: "Countermeasure 1", AssigneeID: "user123"},
		{ID: "cm2", RiskID: "risk123", Description: "Countermeasure 2", AssigneeID: "user123"},
	}, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user123")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/risks/risk123/countermeasures").WithContext(ctx)
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserID, "user123"))
	req = req.WithContext(context.WithValue(req.Context(), middleware.CtxUserRole, "USER"))
	req.SetPathValue("risk_id", "risk123")

	w := httptest.NewRecorder()
	handler.ListByRiskID(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockUC.AssertExpectations(t)
}

func strPtr(s string) *string {
	return &s
}