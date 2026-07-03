package v1

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

type RiskObjectHandler struct {
	uc *usecase.RiskObjectUsecase
}

func NewRiskObjectHandler(uc *usecase.RiskObjectUsecase) *RiskObjectHandler {
	return &RiskObjectHandler{uc: uc}
}

type createObjectRequest struct {
	Name        string              `json:"name"`
	ObjectType  domain.RiskObjectType `json:"object_type"`
	Description *string             `json:"description"`
}

type updateObjectRequest struct {
	Name        string              `json:"name"`
	ObjectType  domain.RiskObjectType `json:"object_type"`
	Description *string             `json:"description"`
}

func (h *RiskObjectHandler) List(w http.ResponseWriter, r *http.Request) {
	objects, err := h.uc.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}
	writeJSON(w, http.StatusOK, objects)
}

func (h *RiskObjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createObjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	obj := &domain.RiskObject{
		Name:        req.Name,
		ObjectType:  req.ObjectType,
		Description: req.Description,
	}

	if err := h.uc.Create(r.Context(), obj); err != nil {
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name and valid object_type are required"})
			return
		}
		if errors.Is(err, domain.ErrDuplicateName) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "object with this name already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusCreated, obj)
}

func (h *RiskObjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	var req updateObjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	obj := &domain.RiskObject{
		ID:          id,
		Name:        req.Name,
		ObjectType:  req.ObjectType,
		Description: req.Description,
	}

	if err := h.uc.Update(r.Context(), obj); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "object not found"})
			return
		}
		if errors.Is(err, domain.ErrValidation) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
			return
		}
		if errors.Is(err, domain.ErrDuplicateName) {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "object with this name already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusOK, obj)
}

func (h *RiskObjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}

	if err := h.uc.Delete(r.Context(), id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "object not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}
