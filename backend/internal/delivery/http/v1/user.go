package v1

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userRepo domain.UserRepository
	auditSvc *usecase.AuditService
}

func NewUserHandler(userRepo domain.UserRepository, auditSvc *usecase.AuditService) *UserHandler {
	return &UserHandler{userRepo: userRepo, auditSvc: auditSvc}
}

func (h *UserHandler) getUserID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.CtxUserID).(string)
	return id
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	type safeUser struct {
		ID        string `json:"id"`
		Email     string `json:"email"`
		FullName  string `json:"full_name"`
		Role      string `json:"role"`
		CreatedAt string `json:"created_at"`
		UpdatedAt string `json:"updated_at"`
	}

	result := make([]safeUser, 0, len(users))
	for _, u := range users {
		result = append(result, safeUser{
			ID:        u.ID,
			Email:     u.Email,
			FullName:  u.FullName,
			Role:      string(u.Role),
			CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt: u.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	writeJSON(w, http.StatusOK, result)
}

type createUserRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Email == "" || req.FullName == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email, full_name and password are required"})
		return
	}

	role := domain.UserRole(req.Role)
	if role == "" {
		role = domain.RoleUser
	}
	if role != domain.RoleUser && role != domain.RoleAdmin {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "role must be USER or ADMIN"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	user := &domain.User{
		Email:        req.Email,
		FullName:     req.FullName,
		PasswordHash: string(hashedPassword),
		Role:         role,
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrDuplicateEmail) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	if h.auditSvc != nil {
		_ = h.auditSvc.Log(r.Context(), "USER", user.ID, user.Email, domain.ActionCreate, h.getUserID(r), "", nil, nil)
	}

	writeJSON(w, http.StatusCreated, user)
}

type updateUserRequest struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Email == "" || req.FullName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and full_name are required"})
		return
	}

	role := domain.UserRole(req.Role)
	if role != domain.RoleUser && role != domain.RoleAdmin {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "role must be USER or ADMIN"})
		return
	}

	user := &domain.User{
		ID:       id,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     role,
	}

	if err := h.userRepo.Update(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
		if errors.Is(err, domain.ErrDuplicateEmail) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "email already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

type resetPasswordRequest struct {
	Password string `json:"password"`
}

func (h *UserHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password is required"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	if err := h.userRepo.UpdatePassword(r.Context(), id, string(hashedPassword)); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated"})
}
