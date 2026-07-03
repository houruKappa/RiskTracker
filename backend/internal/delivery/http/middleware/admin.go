package middleware

import (
	"net/http"
)

func AdminRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := r.Context().Value(CtxUserRole)
		if role != "ADMIN" {
			http.Error(w, `{"error":"admin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
