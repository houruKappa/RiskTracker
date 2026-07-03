package v1

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type ReportHandler struct {
	uc *usecase.ReportUsecase
}

func NewReportHandler(uc *usecase.ReportUsecase) *ReportHandler {
	return &ReportHandler{uc: uc}
}

func (h *ReportHandler) getUserID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.CtxUserID).(string)
	return id
}

func (h *ReportHandler) getUserRole(r *http.Request) string {
	role, _ := r.Context().Value(middleware.CtxUserRole).(string)
	return role
}

func (h *ReportHandler) Summary(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserID(r)
	role := h.getUserRole(r)

	summary, err := h.uc.GetSummary(r.Context(), userID, role)
	if err != nil {
		log.Printf("reports/summary error: %v (userID=%s, role=%s)", err, userID, role)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

func (h *ReportHandler) Detail(w http.ResponseWriter, r *http.Request) {
	userID := h.getUserID(r)
	role := h.getUserRole(r)

	query := r.URL.Query()

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var targetFilter *string
	if t := query.Get("target_id"); t != "" {
		targetFilter = &t
	}

	var ownerFilter *string
	if o := query.Get("owner_id"); o != "" {
		ownerFilter = &o
	}

	var statusFilter *domain.RiskStatus
	if s := query.Get("status"); s != "" {
		st := domain.RiskStatus(s)
		statusFilter = &st
	}

	var dateFromFilter *string
	if df := query.Get("date_from"); df != "" {
		dateFromFilter = &df
	}

	var dateToFilter *string
	if dt := query.Get("date_to"); dt != "" {
		dateToFilter = &dt
	}

	filter := domain.ReportFilter{
		Page:      page,
		Limit:     limit,
		TargetID:  targetFilter,
		OwnerID:   ownerFilter,
		Status:    statusFilter,
		DateFrom:  dateFromFilter,
		DateTo:    dateToFilter,
		UserID:    userID,
		Role:      role,
	}

	result, err := h.uc.GetDetailed(r.Context(), filter)
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