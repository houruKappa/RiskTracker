package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// Mock implementations for testing
type mockCountermeasureRepo struct {
	mock.Mock
}

func (m *mockCountermeasureRepo) Create(ctx context.Context, cm *domain.Countermeasure) error {
	args := m.Called(ctx, cm)
	return args.Error(0)
}

func (m *mockCountermeasureRepo) GetByID(ctx context.Context, id string) (*domain.Countermeasure, error) {
	args := m.Called(ctx, id)
	if cmArg := args.Get(0); cmArg != nil {
		return cmArg.(*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockCountermeasureRepo) Update(ctx context.Context, cm *domain.Countermeasure) error {
	args := m.Called(ctx, cm)
	return args.Error(0)
}

func (m *mockCountermeasureRepo) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockCountermeasureRepo) ListByRiskID(ctx context.Context, riskID string) ([]*domain.Countermeasure, error) {
	args := m.Called(ctx, riskID)
	if sliceArg := args.Get(0); sliceArg != nil {
		return sliceArg.([]*domain.Countermeasure), args.Error(1)
	}
	return nil, args.Error(1)
}

type mockRiskRepo struct {
	mock.Mock
}

func (m *mockRiskRepo) Create(ctx context.Context, risk *domain.Risk) error {
	args := m.Called(ctx, risk)
	return args.Error(0)
}

func (m *mockRiskRepo) GetByID(ctx context.Context, id string, userID string, role string) (*domain.Risk, error) {
	args := m.Called(ctx, id, userID, role)
	if riskArg := args.Get(0); riskArg != nil {
		return riskArg.(*domain.Risk), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockRiskRepo) List(ctx context.Context, filter domain.RiskFilter) (*domain.PaginatedRisks, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(*domain.PaginatedRisks), args.Error(1)
}

func (m *mockRiskRepo) Update(ctx context.Context, risk *domain.Risk) error {
	args := m.Called(ctx, risk)
	return args.Error(0)
}

func (m *mockRiskRepo) UpdateStatus(ctx context.Context, id string, status domain.RiskStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *mockRiskRepo) AddCause(ctx context.Context, cause *domain.RiskCause) error {
	args := m.Called(ctx, cause)
	return args.Error(0)
}

func (m *mockRiskRepo) AddConsequence(ctx context.Context, consequence *domain.RiskConsequence) error {
	args := m.Called(ctx, consequence)
	return args.Error(0)
}

func (m *mockRiskRepo) DeleteCause(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRiskRepo) DeleteConsequence(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *mockRiskRepo) UpdateMaxProbabilities(ctx context.Context, id string, maxCause, maxConsequence *domain.RiskLevel) error {
	args := m.Called(ctx, id, maxCause, maxConsequence)
	return args.Error(0)
}

type mockUserRepo struct {
	mock.Mock
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	args := m.Called(ctx, id)
	if userArg := args.Get(0); userArg != nil {
		return userArg.(*domain.User), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if userArg := args.Get(0); userArg != nil {
		return userArg.(*domain.User), args.Error(1)
	}
	return nil, args.Error(1)
}

func (m *mockUserRepo) List(ctx context.Context) ([]*domain.User, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*domain.User), args.Error(1)
}

func (m *mockUserRepo) Update(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *mockUserRepo) UpdatePassword(ctx context.Context, id string, hash string) error {
	args := m.Called(ctx, id, hash)
	return args.Error(0)
}

func TestCountermeasureUsecase_Create(t *testing.T) {
	t.Parallel()

	cmRepo := new(mockCountermeasureRepo)
	riskRepo := new(mockRiskRepo)
	userRepo := new(mockUserRepo)
	uc := NewCountermeasureUsecase(cmRepo, riskRepo, userRepo)

	ctx := context.Background()
	userID := "user123"
	riskID := "risk123"
	causeID := "cause123"

	// Setup test data
	cm := &domain.Countermeasure{
		ID:           "cm123",
		RiskID:       riskID,
		TargetType:   domain.TargetCause,
		CauseID:      &causeID,
		Description:  "Test countermeasure",
		AssigneeID:   userID,
		Deadline:     time.Now().Add(24 * time.Hour),
		CreatedAt:    time.Now(),
	}

	risk := &domain.Risk{
		ID:          riskID,
		OwnerID:     userID,
		Status:      domain.StatusInProgress,
		Causes: []domain.RiskCause{
			{ID: causeID, RiskID: riskID, Name: "Test Cause"},
		},
	}

	user := &domain.User{
		ID:       userID,
		Email:    "test@example.com",
		FullName: "Test User",
		Role:     domain.RoleUser,
	}

	// Test case: Admin can create countermeasure for any risk
	t.Run("Admin can create countermeasure", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		riskRepo.On("GetByID", ctx, riskID, "", string(domain.RoleAdmin)).Return(risk, nil)
		cmRepo.On("Create", mock.Anything, mock.MatchedBy(func(c *domain.Countermeasure) bool {
			return c.Description == cm.Description && c.RiskID == cm.RiskID
		})).Return(nil)

		// Execute
		result, err := uc.Create(ctx, cm, userID, string(domain.RoleAdmin))

		// Verify
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Equal(t, cm.ID, result.ID)
		require.Equal(t, cm.Description, result.Description)
	})

	// Test case: Regular user can create countermeasure for own risk
	t.Run("User can create countermeasure for own risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(risk, nil)
		cmRepo.On("Create", mock.Anything, mock.MatchedBy(func(c *domain.Countermeasure) bool {
			return c.Description == cm.Description && c.RiskID == cm.RiskID
		})).Return(nil)

		// Execute
		result, err := uc.Create(ctx, cm, userID, string(domain.RoleUser))

		// Verify
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Equal(t, cm.ID, result.ID)
	})

	// Test case: Validation fails for empty description
	t.Run("Validation: empty description fails", func(t *testing.T) {
		cm.Description = ""
		result, err := uc.Create(ctx, cm, userID, string(domain.RoleUser))
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrValidation)
		require.Nil(t, result)
	})

	// Test case: Validation fails for past deadline
	t.Run("Validation: past deadline fails", func(t *testing.T) {
		cm.Description = "Valid description"
		cm.Deadline = time.Now().Add(-1 * time.Hour)
		result, err := uc.Create(ctx, cm, userID, string(domain.RoleUser))
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrValidation)
		require.Nil(t, result)
	})

	// Test case: User cannot create countermeasure for other user's risk
	t.Run("User cannot create countermeasure for other's risk", func(t *testing.T) {
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(nil, domain.ErrNotFound)

		result, err := uc.Create(ctx, cm, userID, string(domain.RoleUser))
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrForbidden)
		require.Nil(t, result)
	})
}

func TestCountermeasureUsecase_Update(t *testing.T) {
	t.Parallel()

	cmRepo := new(mockCountermeasureRepo)
	riskRepo := new(mockRiskRepo)
	userRepo := new(mockUserRepo)
	uc := new(CountermeasureUsecase)
	uc.cmRepo = cmRepo
	uc.riskRepo = riskRepo
	uc.userRepo = userRepo

	ctx := context.Background()
	userID := "user123"
	riskID := "risk123"
	causeID := "cause123"

	// Setup existing countermeasure
	existing := &domain.Countermeasure{
		ID:           "cm123",
		RiskID:       riskID,
		TargetType:   domain.TargetCause,
		CauseID:      &causeID,
		Description:  "Old description",
		AssigneeID:   userID,
		Deadline:     time.Now().Add(24 * time.Hour),
		CreatedAt:    time.Now().Add(-24 * time.Hour),
	}

	risk := &domain.Risk{
		ID:          riskID,
		OwnerID:     userID,
		Status:      domain.StatusInProgress,
		Causes: []domain.RiskCause{
			{ID: causeID, RiskID: riskID, Name: "Test Cause"},
		},
	}

	user := &domain.User{
		ID:       userID,
		Email:    "test@example.com",
		FullName: "Test User",
		Role:     domain.RoleUser,
	}

	// Test case: User can update own countermeasure
	t.Run("User can update own countermeasure", func(t *testing.T) {
		update := &domain.Countermeasure{
			ID:          "cm123",
			RiskID:      riskID,
			TargetType:  domain.TargetCause,
			CauseID:     &causeID,
			Description: "New description",
			AssigneeID:  userID,
			Deadline:    time.Now().Add(48 * time.Hour),
		}

		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(risk, nil)
		cmRepo.On("Update", mock.Anything, mock.MatchedBy(func(c *domain.Countermeasure) bool {
			return c.Description == update.Description && c.ID == update.ID
		})).Return(nil)

		// Execute
		result, err := uc.Update(ctx, update, userID, string(domain.RoleUser))

		// Verify
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Equal(t, "New description", result.Description)
		require.Equal(t, update.Deadline, result.Deadline)
		// CreatedAt should remain unchanged
		require.Equal(t, existing.CreatedAt, result.CreatedAt)
	})

	// Test case: Cannot change immutable fields
	t.Run("Cannot change immutable fields", func(t *testing.T) {
		update := &domain.Countermeasure{
			ID:          "cm123",
			RiskID:      "different-risk", // Trying to change RiskID
			TargetType:  domain.TargetCause,
			CauseID:     &causeID,
			Description: "New description",
			AssigneeID:  userID,
			Deadline:    time.Now().Add(48 * time.Hour),
		}

		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(risk, nil)

		result, err := uc.Update(ctx, update, userID, string(domain.RoleUser))
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrValidation)
		require.Nil(t, result)
	})

	// Test case: Validation fails for empty description
	t.Run("Validation: empty description fails", func(t *testing.T) {
		update := &domain.Countermeasure{
			ID:          "cm123",
			RiskID:      riskID,
			TargetType:  domain.TargetCause,
			CauseID:     &causeID,
			Description: "",
			AssigneeID:  userID,
			Deadline:    time.Now().Add(24 * time.Hour),
		}

		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(risk, nil)

		result, err := uc.Update(ctx, update, userID, string(domain.RoleUser))
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrValidation)
		require.Nil(t, result)
	})
}

func TestCountermeasureUsecase_Delete(t *testing.T) {
	t.Parallel()

	cmRepo := new(mockCountermeasureRepo)
	riskRepo := new(mockRiskRepo)
	userRepo := new(mockUserRepo)
	uc := new(CountermeasureUsecase)
	uc.cmRepo = cmRepo
	uc.riskRepo = riskRepo
	uc.userRepo = userRepo

	ctx := context.Background()
	userID := "user123"
	riskID := "risk123"

	// Setup existing countermeasure for in-progress risk
	existing := &domain.Countermeasure{
		ID:           "cm123",
		RiskID:       riskID,
		TargetType:   domain.TargetCause,
		CauseID:      &riskID, // dummy
		Description:  "Test countermeasure",
		AssigneeID:   userID,
		Deadline:     time.Now().Add(24 * time.Hour),
		CreatedAt:    time.Now(),
	}

	riskInProgress := &domain.Risk{
		ID:          riskID,
		OwnerID:     userID,
		Status:      domain.StatusInProgress,
	}

	riskCompleted := &domain.Risk{
		ID:          riskID,
		OwnerID:     userID,
		Status:      domain.StatusCompleted,
	}

	user := &domain.User{
		ID:       userID,
		Email:    "test@example.com",
		FullName: "Test User",
		Role:     domain.RoleUser,
	}

	// Test case: Can delete countermeasure for in-progress risk
	t.Run("Can delete countermeasure for in-progress risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(riskInProgress, nil)
		cmRepo.On("Delete", ctx, "cm123").Return(nil)

		// Execute
		err := uc.Delete(ctx, "cm123", userID, string(domain.RoleUser))

		// Verify
		require.NoError(t, err)
	})

	// Test case: Cannot delete countermeasure for completed risk
	t.Run("Cannot delete countermeasure for completed risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(riskCompleted, nil)

		// Execute
		err := uc.Delete(ctx, "cm123", userID, string(domain.RoleUser))

		// Verify
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrValidation)
	})

	// Test case: Cannot delete countermeasure for other user's risk
	t.Run("Cannot delete countermeasure for other user's risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "cm123").Return(existing, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(nil, domain.ErrNotFound)

		// Execute
		err := uc.Delete(ctx, "cm123", userID, string(domain.RoleUser))

		// Verify
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrForbidden)
	})

	// Test case: Non-existent countermeasure
	t.Run("Delete non-existent countermeasure", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		cmRepo.On("GetByID", ctx, "nonexistent").Return(nil, domain.ErrNotFound)

		// Execute
		err := uc.Delete(ctx, "nonexistent", userID, string(domain.RoleUser))

		// Verify
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrNotFound)
	})
}

func TestCountermeasureUsecase_ListByRiskID(t *testing.T) {
	t.Parallel()

	cmRepo := new(mockCountermeasureRepo)
	riskRepo := new(mockRiskRepo)
	userRepo := new(mockUserRepo)
	uc := new(CountermeasureUsecase)
	uc.cmRepo = cmRepo
	uc.riskRepo = riskRepo
	uc.userRepo = userRepo

	ctx := context.Background()
	userID := "user123"
	riskID := "risk123"

	risk := &domain.Risk{
		ID:          riskID,
		OwnerID:     userID,
	}

	user := &domain.User{
		ID:       userID,
		Email:    "test@example.com",
		FullName: "Test User",
		Role:     domain.RoleUser,
	}

	cms := []*domain.Countermeasure{
		{ID: "cm1", RiskID: riskID, Description: "CM 1", AssigneeID: userID, Deadline: time.Now().Add(24 * time.Hour)},
		{ID: "cm2", RiskID: riskID, Description: "CM 2", AssigneeID: userID, Deadline: time.Now().Add(48 * time.Hour)},
	}

	// Test case: Can list countermeasures for own risk
	t.Run("Can list countermeasures for own risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(risk, nil)
		cmRepo.On("ListByRiskID", ctx, riskID).Return(cms, nil)

		// Execute
		result, err := uc.ListByRiskID(ctx, riskID, userID, string(domain.RoleUser))

		// Verify
		require.NoError(t, err)
		require.NotNil(t, result)
		require.Len(t, result, 2)
		require.Equal(t, "cm1", result[0].ID)
		require.Equal(t, "cm2", result[1].ID)
	})

	// Test case: Cannot list countermeasures for other user's risk
	t.Run("Cannot list countermeasures for other user's risk", func(t *testing.T) {
		// Setup mocks
		userRepo.On("GetByID", ctx, userID).Return(user, nil)
		riskRepo.On("GetByID", ctx, riskID, userID, string(domain.RoleUser)).Return(nil, domain.ErrNotFound)

		// Execute
		result, err := uc.ListByRiskID(ctx, riskID, userID, string(domain.RoleUser))

		// Verify
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrForbidden)
		require.Nil(t, result)
	})
}