package v1

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type CountermeasureHandler struct {
	cmUC *usecase.CountermeasureUsecase
}

func NewCountermeasureHandler(cmUC *usecase.CountermeasureUsecase) *CountermeasureHandler {
	return &CountermeasureHandler{cmUC: cmUC}
}

type createCountermeasureRequest struct {
	RiskID          string                  `json:"risk_id"`
	TargetType      domain.CountermeasureTarget `json:"target_type"`
	CauseID         *string                 `json:"cause_id,omitempty"`
	ConsequenceID   *string                 `json:"consequence_id,omitempty"`
	Description     string                  `json:"description"`
	AssigneeID      string                  `json:"assignee_id"`
	Deadline        time.Time               `json:"deadline"`
}

type updateCountermeasureRequest struct {
	Description string `json:""`
	ID string `json:"-"`
}

func (h *CountermeasureHandler) getUserID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.CtxUserID).(string)
	return id
}

func (h *CountermeasureHandler) getUserRole(r *http.Request) string {
	role, _ := r.Context().Value(middleware.CtxUserRole).(string)
	return role
}

func (h *CountermeasureHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createCountermeasureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	cm := &domain.Countermeasure{
		RiskID:        req.RiskID,
		TargetType:    req.TargetType,
		CauseID:       req.CauseID,
		ConsequenceID: req.ConsequenceID,
		Description:   req.Description,
		AssigneeID:    req.AssigneeID,
		Deadline:      req.Deadline,
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	created, err := h.cmUC.Create(r.Context(), cm, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request data: check required fields, deadline > now, valid assignee, target integrity"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied: not owner of this risk"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func (h *CountermeasureHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	cm, err := h.cmUC.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "countermeasure not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, cm)
}

func (h *CountermeasureHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req struct {
		Description string    `json:"description"`
		AssigneeID  string    `json:"assignee_id"`
		Deadline    time.Time `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	// Get existing countermeasure
	existing, err := h.cmUC.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "countermeasure not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	cm := &domain.Countermeasure{
		ID:            existing.ID,
		RiskID:        existing.RiskID,
		TargetType:    existing.TargetType,
		CauseID:       existing.CauseID,
		ConsequenceID: existing.ConsequenceID,
		Description:   req.Description,
		AssigneeID:    req.AssigneeID,
		Deadline:      req.Deadline,
		CreatedAt:     existing.CreatedAt,
	}

	updated, err := h.cmUC.Update(r.Context(), cm, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request data"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "countermeasure not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *CountermeasureHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	err := h.cmUC.Delete(r.Context(), id, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot delete countermeasure for completed risk"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "countermeasure not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}

func (h *CountermeasureHandler) ListByRiskID(w http.ResponseWriter, r *http.Request) {
	riskID := r.PathValue("risk_id")
	if riskID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "risk_id is required"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	cms, err := h.cmUC.ListByRiskID(r.Context(), riskID, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, cms)
}