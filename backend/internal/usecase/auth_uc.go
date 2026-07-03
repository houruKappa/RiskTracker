package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/houruKappa/RiskTracker/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type AuthClaims struct {
	UserID string `json:"sub"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type AuthUsecase struct {
	userRepo  domain.UserRepository
	jwtSecret string
	tokenTTL  time.Duration
}

func NewAuthUsecase(userRepo domain.UserRepository, jwtSecret string, tokenTTL time.Duration) *AuthUsecase {
	if tokenTTL == 0 {
		tokenTTL = 24 * time.Hour
	}
	return &AuthUsecase{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		tokenTTL:  tokenTTL,
	}
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  *domain.User `json:"user"`
}

func (a *AuthUsecase) Login(ctx context.Context, email, password string) (*LoginResponse, error) {
	user, err := a.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, domain.ErrForbidden
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, domain.ErrForbidden
	}

	token, err := a.generateJWT(user.ID, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &LoginResponse{Token: token, User: user}, nil
}

func (a *AuthUsecase) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	return a.userRepo.GetByID(ctx, id)
}

func (a *AuthUsecase) generateJWT(userID, role string) (string, error) {
	now := time.Now()
	claims := AuthClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(a.tokenTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(a.jwtSecret))
}

func (a *AuthUsecase) ValidateToken(tokenString string) (*AuthClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(a.jwtSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
