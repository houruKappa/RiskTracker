package usecase

import (
	"context"
	"testing"

	"github.com/houruKappa/RiskTracker/internal/domain"
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

func (m *mockRiskObjectRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func TestRiskObjectCreate_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := NewRiskObjectUsecase(mockRepo)

	obj := &domain.RiskObject{
		Name:       "ERP-система",
		ObjectType: domain.ObjectTypeITSystem,
	}

	mockRepo.On("Create", mock.Anything, obj).Return(nil)

	err := uc.Create(context.Background(), obj)
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectCreate_EmptyName(t *testing.T) {
	uc := NewRiskObjectUsecase(nil)

	err := uc.Create(context.Background(), &domain.RiskObject{
		Name:       "",
		ObjectType: domain.ObjectTypeITSystem,
	})
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestRiskObjectCreate_InvalidType(t *testing.T) {
	uc := NewRiskObjectUsecase(nil)

	err := uc.Create(context.Background(), &domain.RiskObject{
		Name:       "Test",
		ObjectType: "INVALID",
	})
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestRiskObjectCreate_DuplicateName(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := NewRiskObjectUsecase(mockRepo)

	obj := &domain.RiskObject{
		Name:       "ERP-система",
		ObjectType: domain.ObjectTypeITSystem,
	}

	mockRepo.On("Create", mock.Anything, obj).Return(domain.ErrDuplicateName)

	err := uc.Create(context.Background(), obj)
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrDuplicateName)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectList_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := NewRiskObjectUsecase(mockRepo)

	objects := []*domain.RiskObject{
		{Name: "ERP", ObjectType: domain.ObjectTypeITSystem},
		{Name: "Project A", ObjectType: domain.ObjectTypeProject},
	}

	mockRepo.On("List", mock.Anything).Return(objects, nil)

	result, err := uc.List(context.Background())
	assert.NoError(t, err)
	assert.Len(t, result, 2)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectUpdate_Success(t *testing.T) {
	mockRepo := new(mockRiskObjectRepo)
	uc := NewRiskObjectUsecase(mockRepo)

	obj := &domain.RiskObject{
		ID:   "obj-1",
		Name: "Updated ERP",
	}

	mockRepo.On("Update", mock.Anything, obj).Return(nil)

	err := uc.Update(context.Background(), obj)
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestRiskObjectUpdate_EmptyName(t *testing.T) {
	uc := NewRiskObjectUsecase(nil)

	err := uc.Update(context.Background(), &domain.RiskObject{
		ID:   "obj-1",
		Name: "",
	})
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
}
