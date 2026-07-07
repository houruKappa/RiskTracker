package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
)

type AuditService struct {
	repo domain.AuditLogRepository
}

func NewAuditService(repo domain.AuditLogRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(ctx context.Context, entityType, entityID, entityName string, actionType domain.ActionType, userID, changes string, oldState, newState interface{}) error {
	var oldJSON, newJSON json.RawMessage
	var err error

	if oldState != nil {
		oldJSON, err = json.Marshal(oldState)
		if err != nil {
			return err
		}
	}

	if newState != nil {
		newJSON, err = json.Marshal(newState)
		if err != nil {
			return err
		}
	}

	entry := &domain.AuditLog{
		EntityType:      entityType,
		EntityID:        entityID,
		EntityName:      entityName,
		ActionType:      actionType,
		ChangedByUserID: userID,
		Changes:         changes,
		OldState:        oldJSON,
		NewState:        newJSON,
	}

	if err := s.repo.LogAction(ctx, entry); err != nil {
		return err
	}
	return nil
}

// DiffChanges compares two structs field by field and returns a human-readable
// description of changed scalar fields in the form "field: old -> new".
// Pointers, slices, maps and nested structs are skipped to keep output readable.
func DiffChanges(old, new interface{}) string {
	ov := reflect.ValueOf(old)
	nv := reflect.ValueOf(new)
	if ov.Kind() == reflect.Ptr {
		ov = ov.Elem()
	}
	if nv.Kind() == reflect.Ptr {
		nv = nv.Elem()
	}
	if ov.Kind() != reflect.Struct || nv.Kind() != reflect.Struct {
		return ""
	}

	skip := map[string]bool{
		"id":           true,
		"created_at":   true,
		"updated_at":   true,
		"password_hash": true,
	}

	ot := ov.Type()
	var parts []string
	for i := 0; i < ot.NumField(); i++ {
		f := ot.Field(i)
		tag := f.Tag.Get("json")
		if tag == "" || tag == "-" {
			continue
		}
		name := strings.Split(tag, ",")[0]
		if skip[name] {
			continue
		}
		ofv := ov.Field(i)
		nfv := nv.Field(i)
		if !ofv.CanInterface() || !nfv.CanInterface() {
			continue
		}
		if isComplexKind(ofv.Kind()) || isComplexKind(nfv.Kind()) {
			continue
		}
		if !reflect.DeepEqual(ofv.Interface(), nfv.Interface()) {
			parts = append(parts, fmt.Sprintf("%s: %s -> %s", name, formatVal(ofv.Interface()), formatVal(nfv.Interface())))
		}
	}
	return strings.Join(parts, "; ")
}

func isComplexKind(k reflect.Kind) bool {
	switch k {
	case reflect.Slice, reflect.Map, reflect.Struct, reflect.Array, reflect.Func, reflect.Chan:
		return true
	default:
		return false
	}
}

func formatVal(v interface{}) string {
	if v == nil {
		return "—"
	}
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return "—"
		}
		return formatVal(rv.Elem().Interface())
	}
	switch val := v.(type) {
	case string:
		if val == "" {
			return "—"
		}
		return val
	case time.Time:
		return val.Format("2006-01-02 15:04")
	case fmt.Stringer:
		return val.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}
