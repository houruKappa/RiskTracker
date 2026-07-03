package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type ctxKey string

const (
	CtxUserID   ctxKey = "user_id"
	CtxUserRole ctxKey = "user_role"
)

func AuthRequired(authUC *usecase.AuthUsecase) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"error":"invalid authorization header format"}`, http.StatusUnauthorized)
				return
			}

			claims, err := authUC.ValidateToken(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), CtxUserID, claims.UserID)
			ctx = context.WithValue(ctx, CtxUserRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
