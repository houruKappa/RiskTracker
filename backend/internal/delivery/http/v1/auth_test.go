package v1

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

type mockUserRepo struct {
	mock.Mock
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *mockUserRepo) List(ctx context.Context) ([]*domain.User, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.User), args.Error(1)
}

func (m *mockUserRepo) UpdatePassword(ctx context.Context, id string, hash string) error {
	args := m.Called(ctx, id, hash)
	return args.Error(0)
}

func (m *mockUserRepo) Update(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func hashPassword(password string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash)
}

func makeUser() *domain.User {
	hashedPW := hashPassword("password123")
	return &domain.User{
		ID:           "user-1",
		Email:        "test@example.com",
		PasswordHash: hashedPW,
		FullName:     "Test User",
		Role:         domain.RoleUser,
	}
}

func TestLoginHandler_Success(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	handler := NewAuthHandler(authUC)

	user := makeUser()
	mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(user, nil)

	body := bytes.NewBufferString(`{"email":"test@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Login(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Contains(t, resp, "token")
	assert.Contains(t, resp, "user")
	mockRepo.AssertExpectations(t)
}

func TestLoginHandler_WrongPassword(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	handler := NewAuthHandler(authUC)

	user := makeUser()
	mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(user, nil)

	body := bytes.NewBufferString(`{"email":"test@example.com","password":"wrong"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Login(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Contains(t, resp["error"], "invalid")
	mockRepo.AssertExpectations(t)
}

func TestLoginHandler_UnknownEmail(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	handler := NewAuthHandler(authUC)

	mockRepo.On("GetByEmail", mock.Anything, "unknown@example.com").Return(nil, domain.ErrNotFound)

	body := bytes.NewBufferString(`{"email":"unknown@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Login(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestMeHandler_WithoutToken(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	handler := NewAuthHandler(authUC)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil)
	w := httptest.NewRecorder()

	handler.Me(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestMeHandler_WithToken(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	handler := NewAuthHandler(authUC)

	user := makeUser()

	mockRepo.On("GetByID", mock.Anything, "user-1").Return(user, nil)

	ctx := context.WithValue(context.Background(), middleware.CtxUserID, "user-1")
	ctx = context.WithValue(ctx, middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/me", nil).WithContext(ctx)
	w := httptest.NewRecorder()

	handler.Me(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp domain.User
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "test@example.com", resp.Email)
	assert.Equal(t, "Test User", resp.FullName)
	mockRepo.AssertExpectations(t)
}

func TestAuthMiddleware_WithoutToken(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.AuthRequired(authUC)(next)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/protected", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_WithValidToken(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := usecase.NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	user := makeUser()
	mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(user, nil)

	loginResp, err := authUC.Login(context.Background(), "test@example.com", "password123")
	assert.NoError(t, err)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(middleware.CtxUserID)
		role := r.Context().Value(middleware.CtxUserRole)
		assert.Equal(t, "user-1", userID)
		assert.Equal(t, "USER", role)
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.AuthRequired(authUC)(next)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/protected", nil)
	req.Header.Set("Authorization", "Bearer "+loginResp.Token)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAdminMiddleware_GrantsAdmin(t *testing.T) {
	ctx := context.WithValue(context.Background(), middleware.CtxUserRole, "ADMIN")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin", nil).WithContext(ctx)
	w := httptest.NewRecorder()

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware.AdminRequired(next).ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminMiddleware_DeniesUser(t *testing.T) {
	ctx := context.WithValue(context.Background(), middleware.CtxUserRole, "USER")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin", nil).WithContext(ctx)
	w := httptest.NewRecorder()

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware.AdminRequired(next).ServeHTTP(w, req)
	assert.Equal(t, http.StatusForbidden, w.Code)
}
