package v1

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type RiskHandler struct {
	uc *usecase.RiskUsecase
}

func NewRiskHandler(uc *usecase.RiskUsecase) *RiskHandler {
	return &RiskHandler{uc: uc}
}

type createRiskRequest struct {
	Title              string                   `json:"title"`
	TargetID           string                   `json:"target_id"`
	OwnerID            string                   `json:"owner_id"`
	Probability        domain.RiskLevel         `json:"probability"`
	Impact             domain.RiskLevel         `json:"impact"`
	FinancialLoss      *string                  `json:"financial_loss"`
	ReputationalLoss   *domain.RiskLevel        `json:"reputational_loss"`
	LegalConsequences  *int                     `json:"legal_consequences"`
	Comment            *string                  `json:"comment"`
	Causes             []createCauseRequest     `json:"causes"`
	Consequences       []createConsequenceRequest `json:"consequences"`
}

type createCauseRequest struct {
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Probability domain.RiskLevel  `json:"probability"`
}

type createConsequenceRequest struct {
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Probability domain.RiskLevel  `json:"probability"`
}

type updateRiskRequest struct {
	Title              string                     `json:"title"`
	TargetID           string                     `json:"target_id"`
	OwnerID            string                     `json:"owner_id"`
	Probability        domain.RiskLevel           `json:"probability"`
	Impact             domain.RiskLevel           `json:"impact"`
	FinancialLoss      *string                    `json:"financial_loss"`
	ReputationalLoss   *domain.RiskLevel          `json:"reputational_loss"`
	LegalConsequences  *int                       `json:"legal_consequences"`
	Comment            *string                    `json:"comment"`
	Causes             []createCauseRequest       `json:"causes"`
	Consequences       []createConsequenceRequest `json:"consequences"`
}

type updateStatusRequest struct {
	Status domain.RiskStatus `json:"status"`
}

func (h *RiskHandler) getUserID(r *http.Request) string {
	id, _ := r.Context().Value(middleware.CtxUserID).(string)
	return id
}

func (h *RiskHandler) getUserRole(r *http.Request) string {
	role, _ := r.Context().Value(middleware.CtxUserRole).(string)
	return role
}

func (h *RiskHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	causes := make([]domain.RiskCause, len(req.Causes))
	for i, c := range req.Causes {
		causes[i] = domain.RiskCause{
			Name: c.Name, Description: c.Description, Probability: c.Probability,
		}
	}

	consequences := make([]domain.RiskConsequence, len(req.Consequences))
	for i, c := range req.Consequences {
		consequences[i] = domain.RiskConsequence{
			Name: c.Name, Description: c.Description, Probability: c.Probability,
		}
	}

	risk := &domain.Risk{
		Title:             req.Title,
		TargetID:          req.TargetID,
		OwnerID:           req.OwnerID,
		Probability:       req.Probability,
		Impact:            req.Impact,
		FinancialLoss:     req.FinancialLoss,
		ReputationalLoss:  req.ReputationalLoss,
		LegalConsequences: req.LegalConsequences,
		Comment:           req.Comment,
		Causes:            causes,
		Consequences:      consequences,
	}

	userID := h.getUserID(r)

	created, err := h.uc.Create(r.Context(), risk, userID)
	if err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title, target_id and owner_id are required"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func (h *RiskHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	risk, err := h.uc.GetByID(r.Context(), id, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "risk not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, risk)
}

func (h *RiskHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	var statusFilter *domain.RiskStatus
	if s := query.Get("status"); s != "" {
		st := domain.RiskStatus(s)
		statusFilter = &st
	}

	var targetFilter *string
	if t := query.Get("target_id"); t != "" {
		targetFilter = &t
	}

	var searchFilter *string
	if s := query.Get("search"); s != "" {
		searchFilter = &s
	}

	filter := domain.RiskFilter{
		Page:     page,
		Limit:    limit,
		Status:   statusFilter,
		TargetID: targetFilter,
		OwnerID:  h.getUserID(r),
		Role:     h.getUserRole(r),
		Search:   searchFilter,
	}

	result, err := h.uc.List(r.Context(), filter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *RiskHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req updateRiskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	causes := make([]domain.RiskCause, len(req.Causes))
	for i, c := range req.Causes {
		causes[i] = domain.RiskCause{
			Name: c.Name, Description: c.Description, Probability: c.Probability,
		}
	}
	consequences := make([]domain.RiskConsequence, len(req.Consequences))
	for i, c := range req.Consequences {
		consequences[i] = domain.RiskConsequence{
			Name: c.Name, Description: c.Description, Probability: c.Probability,
		}
	}

	risk := &domain.Risk{
		ID:                id,
		Title:             req.Title,
		TargetID:          req.TargetID,
		OwnerID:           req.OwnerID,
		Probability:       req.Probability,
		Impact:            req.Impact,
		FinancialLoss:     req.FinancialLoss,
		ReputationalLoss:  req.ReputationalLoss,
		LegalConsequences: req.LegalConsequences,
		Comment:           req.Comment,
		Causes:            causes,
		Consequences:      consequences,
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	updated, err := h.uc.Update(r.Context(), risk, userID, role)
	if err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title and target_id are required"})
			return
		}
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "risk not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "you can only edit your own risks"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *RiskHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req updateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Status != domain.StatusInProgress && req.Status != domain.StatusCompleted {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status must be IN_PROGRESS or COMPLETED"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	if err := h.uc.UpdateStatus(r.Context(), id, userID, role, req.Status); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "risk not found"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "you can only change status of your own risks"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": string(req.Status)})
}

func (h *RiskHandler) AddCause(w http.ResponseWriter, r *http.Request) {
	riskID := r.PathValue("id")
	if riskID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "risk id is required"})
		return
	}

	var req createCauseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	cause := &domain.RiskCause{
		RiskID: riskID, Name: req.Name,
		Description: req.Description, Probability: req.Probability,
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	if err := h.uc.AddCause(r.Context(), cause, userID, role); err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cause name is required"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusCreated, cause)
}

func (h *RiskHandler) AddConsequence(w http.ResponseWriter, r *http.Request) {
	riskID := r.PathValue("id")
	if riskID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "risk id is required"})
		return
	}

	var req createConsequenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	consequence := &domain.RiskConsequence{
		RiskID: riskID, Name: req.Name,
		Description: req.Description, Probability: req.Probability,
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	if err := h.uc.AddConsequence(r.Context(), consequence, userID, role); err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "consequence name is required"})
			return
		}
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusCreated, consequence)
}

func (h *RiskHandler) DeleteCause(w http.ResponseWriter, r *http.Request) {
	riskID := r.PathValue("id")
	causeID := r.PathValue("cause_id")
	if riskID == "" || causeID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "risk id and cause id are required"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	if err := h.uc.DeleteCause(r.Context(), causeID, riskID, userID, role); err != nil {
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *RiskHandler) DeleteConsequence(w http.ResponseWriter, r *http.Request) {
	riskID := r.PathValue("id")
	conseqID := r.PathValue("consequence_id")
	if riskID == "" || conseqID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "risk id and consequence id are required"})
		return
	}

	userID := h.getUserID(r)
	role := h.getUserRole(r)

	if err := h.uc.DeleteConsequence(r.Context(), conseqID, riskID, userID, role); err != nil {
		if errors.Is(err, domain.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "access denied"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
