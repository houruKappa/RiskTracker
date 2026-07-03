package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash)
}

func TestLogin_Success(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	hashedPW := hashPassword("password123")
	user := &domain.User{
		ID:           "user-1",
		Email:        "test@example.com",
		PasswordHash: hashedPW,
		FullName:     "Test User",
		Role:         domain.RoleUser,
	}

	mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(user, nil)

	resp, err := authUC.Login(context.Background(), "test@example.com", "password123")
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, user.Email, resp.User.Email)
	assert.Equal(t, user.FullName, resp.User.FullName)
	mockRepo.AssertExpectations(t)
}

func TestLogin_WrongPassword(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	hashedPW := hashPassword("password123")
	user := &domain.User{
		ID:           "user-1",
		Email:        "test@example.com",
		PasswordHash: hashedPW,
		FullName:     "Test User",
		Role:         domain.RoleUser,
	}

	mockRepo.On("GetByEmail", mock.Anything, "test@example.com").Return(user, nil)

	resp, err := authUC.Login(context.Background(), "test@example.com", "wrong-password")
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrForbidden)
	assert.Nil(t, resp)
	mockRepo.AssertExpectations(t)
}

func TestLogin_UserNotFound(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	mockRepo.On("GetByEmail", mock.Anything, "unknown@example.com").Return(nil, domain.ErrNotFound)

	resp, err := authUC.Login(context.Background(), "unknown@example.com", "password123")
	assert.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrForbidden)
	assert.Nil(t, resp)
	mockRepo.AssertExpectations(t)
}

func TestValidateToken_Valid(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", time.Hour)

	token, err := authUC.generateJWT("user-1", "USER")
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := authUC.ValidateToken(token)
	assert.NoError(t, err)
	assert.NotNil(t, claims)
	assert.Equal(t, "user-1", claims.UserID)
	assert.Equal(t, "USER", claims.Role)
}

func TestValidateToken_Expired(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", -time.Hour)

	token, err := authUC.generateJWT("user-1", "USER")
	assert.NoError(t, err)

	claims, err := authUC.ValidateToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	mockRepo := new(mockUserRepo)
	authUC := NewAuthUsecase(mockRepo, "test-secret", time.Hour)
	authUC2 := NewAuthUsecase(mockRepo, "different-secret", time.Hour)

	token, err := authUC.generateJWT("user-1", "USER")
	assert.NoError(t, err)

	claims, err := authUC2.ValidateToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
}
