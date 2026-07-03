package v1

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type AuditLogHandler struct {
	uc *usecase.AuditLogUsecase
}

func NewAuditLogHandler(uc *usecase.AuditLogUsecase) *AuditLogHandler {
	return &AuditLogHandler{uc: uc}
}

func (h *AuditLogHandler) getUserID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.CtxUserID).(string)
	return id
}

func (h *AuditLogHandler) getUserRole(r *http.Request) string {
	role, _ := r.Context().Value(middleware.CtxUserRole).(string)
	return role
}

func (h *AuditLogHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserID(r)
	role := h.getUserRole(r)

	query := r.URL.Query()

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	var entityTypeFilter *string
	if t := query.Get("entity_type"); t != "" {
		entityTypeFilter = &t
	}

	var actionTypeFilter *domain.ActionType
	if a := query.Get("action_type"); a != "" {
		at := domain.ActionType(a)
		actionTypeFilter = &at
	}

	var userFilter *string
	if u := query.Get("user_id"); u != "" {
		userFilter = &u
	}

	var dateFromFilter *string
	if df := query.Get("date_from"); df != "" {
		dateFromFilter = &df
	}

	var dateToFilter *string
	if dt := query.Get("date_to"); dt != "" {
		dateToFilter = &dt
	}

	filter := domain.AuditLogFilter{
		Page:            page,
		Limit:           limit,
		EntityType:      entityTypeFilter,
		ActionType:      actionTypeFilter,
		ChangedByUserID: userFilter,
		DateFrom:        dateFromFilter,
		DateTo:          dateToFilter,
		UserID:          userID,
		Role:            role,
	}

	result, err := h.uc.List(r.Context(), filter)
	if err != nil {
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, result)
}