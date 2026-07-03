package v1

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRiskRepo struct {
	mock.Mock
}

func (m *mockRiskRepo) Create(ctx context.Context, risk *domain.Risk) error {
	args := m.Called(ctx, risk)
	return args.Error(0)
}

func (m *mockRiskRepo) GetByID(ctx context.Context, id, userID, role string) (*domain.Risk, error) {
	args := m.Called(ctx, id, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Risk), args.Error(1)
}

func (m *mockRiskRepo) List(ctx context.Context, filter domain.RiskFilter) (*domain.PaginatedRisks, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.PaginatedRisks), args.Error(1)
}

func (m *mockRiskRepo) Update(ctx context.Context, risk *domain.Risk) error {
	args := m.Called(ctx, risk)
	return args.Error(0)
}

func (m *mockRiskRepo) UpdateStatus(ctx context.Context, id string, status domain.RiskStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *mockRiskRepo) AddCause(ctx context.Context, cause *domain.RiskCause) error {
	args := m.Called(ctx, cause)
	return args.Error(0)
}

func (m *mockRiskRepo) AddConsequence(ctx context.Context, consequence *domain.RiskConsequence) error {
	args := m.Called(ctx, consequence)
	return args.Error(0)
}

func (m *mockRiskRepo) DeleteCause(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRiskRepo) DeleteConsequence(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRiskRepo) UpdateMaxProbabilities(ctx context.Context, id string, maxCause, maxConsequence *domain.RiskLevel) error {
	args := m.Called(ctx, id, maxCause, maxConsequence)
	return args.Error(0)
}

func TestRiskCreate_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	body := bytes.NewBufferString(`{"title":"Test Risk","target_id":"target-1","owner_id":"owner-1","probability":"MEDIUM","impact":"HIGH"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/risks", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Create(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskCreate_InvalidJSON(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	body := bytes.NewBufferString(`{invalid}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/risks", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Create(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRiskList_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	result := &domain.PaginatedRisks{
		Items: []*domain.Risk{{ID: "risk-1"}},
		Page:  1, Limit: 10, TotalCount: 1,
	}

	mockRepo.On("List", mock.Anything, mock.Anything).Return(result, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/risks?page=1&limit=10", nil)
	w := httptest.NewRecorder()

	handler.List(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskGetByID_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	risk := &domain.Risk{ID: "risk-1", Title: "Test Risk", OwnerID: "user-1"}
	mockRepo.On("GetByID", mock.Anything, "risk-1", "user-1", "USER").Return(risk, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/risks/risk-1", nil).WithContext(ctx)
	req.SetPathValue("id", "risk-1")
	w := httptest.NewRecorder()

	handler.GetByID(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskUpdate_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	mockRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "ADMIN")

	body := bytes.NewBufferString(`{"title":"Updated","target_id":"target-1","owner_id":"owner-1"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/risks/risk-1", body).WithContext(ctx)
	req.SetPathValue("id", "risk-1")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Update(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskUpdateStatus_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	existing := &domain.Risk{ID: "risk-1", OwnerID: "user-1"}
	mockRepo.On("GetByID", mock.Anything, "risk-1", "user-1", "USER").Return(existing, nil)
	mockRepo.On("UpdateStatus", mock.Anything, "risk-1", domain.StatusCompleted).Return(nil)

	body := bytes.NewBufferString(`{"status":"COMPLETED"}`)
	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/risks/risk-1/status", body).WithContext(ctx)
	req.SetPathValue("id", "risk-1")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.UpdateStatus(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskAddCause_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	mockRepo.On("GetByID", mock.Anything, "risk-1", "user-1", "USER").Return(&domain.Risk{OwnerID: "user-1"}, nil)
	mockRepo.On("AddCause", mock.Anything, mock.Anything).Return(nil)
	mockRepo.On("GetByID", mock.Anything, "risk-1", "", "ADMIN").Return(&domain.Risk{OwnerID: "user-1", ID: "risk-1", Causes: []domain.RiskCause{{Probability: domain.RiskHigh}}}, nil)
	mockRepo.On("UpdateMaxProbabilities", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	body := bytes.NewBufferString(`{"name":"Cause 1","probability":"HIGH"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/risks/risk-1/causes", body).WithContext(ctx)
	req.SetPathValue("id", "risk-1")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.AddCause(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskAddConsequence_Handler(t *testing.T) {
	mockRepo := new(mockRiskRepo)
	uc := usecase.NewRiskUsecase(mockRepo)
	handler := NewRiskHandler(uc)

	mockRepo.On("GetByID", mock.Anything, "risk-1", "user-1", "USER").Return(&domain.Risk{OwnerID: "user-1"}, nil)
	mockRepo.On("AddConsequence", mock.Anything, mock.Anything).Return(nil)
	mockRepo.On("GetByID", mock.Anything, "risk-1", "", "ADMIN").Return(&domain.Risk{OwnerID: "user-1", ID: "risk-1", Consequences: []domain.RiskConsequence{{Probability: domain.RiskMedium}}}, nil)
	mockRepo.On("UpdateMaxProbabilities", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	body := bytes.NewBufferString(`{"name":"Conseq 1","probability":"MEDIUM"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/risks/risk-1/consequences", body).WithContext(ctx)
	req.SetPathValue("id", "risk-1")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.AddConsequence(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockRepo.AssertExpectations(t)
}