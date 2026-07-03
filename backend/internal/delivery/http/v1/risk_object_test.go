package v1

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockRiskObjectRepo struct {
	mock.Mock
}

func (m *mockRiskObjectRepo) Create(ctx context.Context, obj *domain.RiskObject) error {
	args := m.Called(ctx, obj)
	return args.Error(0)
}

func (m *mockRiskObjectRepo) GetByID(ctx context.Context, id string) (*domain.RiskObject, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.RiskObject), args.Error(1)
}

func (m *mockRiskObjectRepo) List(ctx context.Context) ([]*domain.RiskObject, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.RiskObject), args.Error(1)
}

func (m *mockRiskObjectRepo) Update(ctx context.Context, obj *domain.RiskObject) error {
	args := m.Called(ctx, obj)
	return args.Error(0)
}

func TestRiskObjectList_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	objects := []*domain.RiskObject{
		{Name: "ERP", ObjectType: domain.ObjectTypeITSystem},
	}

	mockRepo.On("List", mock.Anything).Return(objects, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/objects", nil)
	w := httptest.NewRecorder()
	handler.List(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp []domain.RiskObject
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp, 1)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectCreate_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(obj *domain.RiskObject) bool {
		return obj.Name == "ERP-система" && obj.ObjectType == domain.ObjectTypeITSystem
	})).Return(nil)

	body := bytes.NewBufferString(`{"name":"ERP-система","object_type":"IT_SYSTEM"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/objects", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Create(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp domain.RiskObject
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "ERP-система", resp.Name)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectCreate_DuplicateName(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	mockRepo.On("Create", mock.Anything, mock.Anything).Return(domain.ErrDuplicateName)

	body := bytes.NewBufferString(`{"name":"ERP-система","object_type":"IT_SYSTEM"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/objects", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Create(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Contains(t, resp["error"], "already exists")
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectCreate_InvalidBody(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	body := bytes.NewBufferString(`{"name":"","object_type":"INVALID"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/objects", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Create(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRiskObjectUpdate_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	mockRepo.On("Update", mock.Anything, mock.MatchedBy(func(obj *domain.RiskObject) bool {
		return obj.ID == "obj-1" && obj.Name == "Updated ERP"
	})).Return(nil)

	body := bytes.NewBufferString(`{"name":"Updated ERP","object_type":"IT_SYSTEM"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/objects/obj-1", body)
	req.SetPathValue("id", "obj-1")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Update(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectUpdate_NotFound(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := usecase.NewRiskObjectUsecase(mockRepo)
	handler := NewRiskObjectHandler(uc)

	mockRepo.On("Update", mock.Anything, mock.Anything).Return(domain.ErrNotFound)

	body := bytes.NewBufferString(`{"name":"Nonexistent","object_type":"IT_SYSTEM"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/objects/nonexistent-id", body)
	req.SetPathValue("id", "nonexistent-id")
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Update(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	mockRepo.AssertExpectations(t)
}
