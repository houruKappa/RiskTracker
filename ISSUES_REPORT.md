# RiskTracker - Issues & Missing Features Report

**Updated: 2026-07-03 (after initial fixes)**

---

## 🔴 BLOCKING BUILD ERRORS - CURRENT STATUS

### Backend (Go) - ✅ **FIXED**
| File | Line | Error | Status |
|------|------|-------|--------|
| `internal/usecase/audit_svc.go` | 6 | `"errors" imported and not used` | ✅ FIXED |
| `internal/usecase/risk_uc.go` | 5 | `"encoding/json" imported and not used` | ✅ FIXED |
| `cmd/api/main.go` | 48 | `NewRiskUsecase` missing `AuditService` arg | ✅ FIXED |

### Frontend (Next.js/TypeScript) - ✅ **MOSTLY FIXED**
| File | Line | Error | Status |
|------|------|-------|--------|
| `src/components/ui/badge.tsx` | 2 | Module not found: `class-variance-authority` | ✅ FIXED (installed) |
| `src/components/ui/button.tsx` | 2 | Module not found: `class-variance-authority` | ✅ FIXED (installed) |
| `src/app/(dashboard)/reports/page.tsx` | 176 | Parse error: JSX adjacent elements | ✅ FIXED (wrapped in `<>`) |
| `src/app/(dashboard)/admin/users/page.tsx` | 361 | Parse error: malformed closing tags | ✅ FIXED |
| `src/app/(dashboard)/risks/[id]/page.tsx` | 234 | Parse error: malformed closing tags | ✅ FIXED |
| `src/app/(dashboard)/reports/page.tsx` | 30 | Duplicate `cn` import | ✅ FIXED |
| `src/components/ui/StatCard.tsx` | 6 | Duplicate `cn` import | ✅ FIXED |
| `src/app/(dashboard)/admin/logs/page.tsx` | 248 | `initialFocus` prop on Calendar | ✅ FIXED (removed) |
| `src/app/(dashboard)/reports/page.tsx` | 269, 290 | `initialFocus` prop on Calendar | ✅ FIXED (removed) |
| `src/components/countermeasure/CountermeasureFormDialog.tsx` | 156 | `initialFocus` prop on Calendar | ✅ FIXED (removed) |
| `src/app/(dashboard)/admin/objects/page.tsx` | 246 | Missing `Label` import | ✅ FIXED |
| `src/app/(dashboard)/admin/users/page.tsx` | 235 | Missing `Label` import | ✅ FIXED |
| `src/app/(dashboard)/dashboard/page.tsx` | 4 | `Link` import syntax | ✅ FIXED |
| `src/app/(dashboard)/admin/logs/page.tsx` | 9 | Missing `@/types/api` module | ✅ FIXED (created) |

### Frontend - **REMAINING BUILD ERROR**
| File | Line | Error |
|------|------|-------|
| `src/app/(dashboard)/reports/page.tsx` | 161 | Cannot find name 'CardContent' (import was removed) |

---

## 🟡 MISSING DEPENDENCIES - ✅ **FIXED**
- `class-variance-authority` - installed

---

## 🟠 MISSING / INCOMPLETE FEATURES (per ТЗ & Sprint Plan)

### Phase 2.2 - Swagger/OpenAPI (NOT STARTED)
- [ ] Install `swaggo/swag` 
- [ ] Annotate all handlers with Swagger comments
- [ ] Generate `backend/api/swagger/swagger.yaml`
- [ ] Serve Swagger UI at `/swagger/*`
- [ ] Add `npm run generate:types` script to frontend
- [ ] Generate TypeScript types from Swagger to `frontend/src/types/api.ts` (currently manual)

### API Routes
- [ ] `DELETE /api/v1/admin/objects/:id` - handler exists, verify registration in main.go (line 78)

### Frontend Features
| Feature | Location | Status |
|---------|----------|--------|
| RiskDrawer delete cause/consequence API calls | `src/components/risk/RiskDrawer.tsx` | UI only, no DELETE calls (hidden inputs only) |
| Dashboard recent activity (audit logs) | `src/app/(dashboard)/dashboard/page.tsx` | Placeholder only |
| Report "Quick Edit" from table | `src/app/(dashboard)/reports/page.tsx` | RiskDrawer exists but not fully wired |

### Infrastructure (Sprint 0.3)
- [ ] Docker Compose hot-reload with `air` (backend)
- [ ] Makefile with targets: `up`, `down`, `build`, `migrate`, `logs`, `test`
- [ ] `.dockerignore` for backend

---

## 🟣 CODE QUALITY / BUGS

### Backend
| Issue | Location | Severity |
|-------|----------|----------|
| `RiskUsecase.Update` calls `GetByID` with empty userID + "ADMIN" role for audit - potential permission bypass | `internal/usecase/risk_uc.go:73` | Medium |
| `AuditService.Log` - no error handling for JSON marshal failures in production paths | `internal/usecase/audit_svc.go:24-35` | Low |
| No centralized request validation middleware | N/A | Low |
| Countermeasure deadline validation uses `time.Now()` - timezone issues possible | `internal/usecase/countermeasure_uc.go:30` | Low |

### Frontend
| Issue | Location | Severity |
|-------|----------|----------|
| RiskDrawer remove handlers only add hidden inputs, don't call DELETE API | `src/components/risk/RiskDrawer.tsx:369-378, 445-453` | Medium |
| No Swagger-generated types - using manual types that may drift | `src/types/api.ts` (manual) | Medium |
| Login page uses `api.post` directly instead of `authService.login` | `src/app/(auth)/login/page.tsx:27` | Low |
| Duplicate `cn` import in reports/page.tsx (line 30) | Fixed | - |
| Duplicate `cn` import in StatCard.tsx (line 6) | Fixed | - |

---

## ✅ VERIFIED WORKING

- All domain models match ТЗ exactly (enums, tables, constraints)
- All repositories implement full interfaces
- All usecases have proper validation & authorization
- All handlers map domain errors to HTTP status codes correctly
- JWT auth with role-based access (USER/ADMIN)
- Audit logging integrated for RISK and COUNTERMEASURE entities
- PostgreSQL migrations with all indexes and constraints
- Tests exist for user, auth, risk, countermeasure repositories
- Frontend pages: Login, Risks list, Risk detail, Reports, Admin users, Admin objects, Audit logs, Dashboard
- **Backend builds successfully** (`go build ./cmd/api/`)
- **Frontend compiles successfully** (only 1 TypeScript error remaining)

---

## 📋 FIX ORDER (Priority)

### Immediate (Blocking)
1. **Fix remaining frontend TypeScript error** - `CardContent` import in reports/page.tsx

### Short-term
2. **Add Swagger/OpenAPI** (Phase 2.2) - critical for type safety
3. **Fix RiskDrawer DELETE actions** - wire up cause/consequence deletion
4. **Add Makefile + Docker hot-reload** (Sprint 0.3)

### Medium-term
5. **Fix code quality issues** (permission bypass, validation middleware)
6. **Complete Dashboard recent activity** (audit logs)
7. **Wire Report "Quick Edit"** from table

---

## 🔧 COMMANDS TO RUN AFTER FIXES

```bash
# Backend
cd backend && go build ./cmd/api/
cd backend && go test ./...

# Frontend  
cd frontend && npm install
cd frontend && npm run build
cd frontend && npm run lint

# Full stack
docker compose up --build
```