package postgres

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/houruKappa/RiskTracker/internal/app"
	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/stretchr/testify/require"
)

func TestCountermeasureRepository(t *testing.T) {
	// Подключаемся к тестовой базе данных
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://risktracker:***@localhost:5432/risktracker?sslmode=disable"
	}

	db, err := app.NewPool(dsn)
	require.NoError(t, err, "failed to connect to db")
	defer db.Close()

	// Выполняем миграции
	ctx := context.Background()
	if err := app.RunMigrations(db, "migrations"); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	repo := NewCountermeasureRepo(db)
	userRepo := NewUserRepo(db)
	riskObjRepo := NewRiskObjectRepo(db)
	riskRepo := NewRiskRepo(db)

	// Очищаем тестовые данные перед тестами
	db.ExecContext(ctx, "DELETE FROM countermeasures WHERE risk_id IN (SELECT id FROM risks WHERE title LIKE 'Test Risk for CM%')")
	db.ExecContext(ctx, "DELETE FROM risk_causes WHERE risk_id IN (SELECT id FROM risks WHERE title LIKE 'Test Risk for CM%')")
	db.ExecContext(ctx, "DELETE FROM risk_consequences WHERE risk_id IN (SELECT id FROM risks WHERE title LIKE 'Test Risk for CM%')")
	db.ExecContext(ctx, "DELETE FROM risks WHERE title LIKE 'Test Risk for CM%'")
	db.ExecContext(ctx, "DELETE FROM risk_objects WHERE name LIKE 'Test Object CM%'")
	db.ExecContext(ctx, "DELETE FROM users WHERE email LIKE 'test_cm_%@test.com'")

	// Create a user for assignee
	user := &domain.User{
		Email:        "test_cm_" + time.Now().Format("150405") + "@test.com",
		PasswordHash: "$2a$10$hashedpassword",
		FullName:     "Test User",
		Role:         domain.RoleUser,
	}
	require.NoError(t, userRepo.Create(ctx, user))

	// Create a risk object
	riskObj := &domain.RiskObject{
		Name:        "Test Object CM",
		ObjectType:  domain.ObjectTypeITSystem,
		Description: strPtr("Test object for countermeasure tests"),
	}
	require.NoError(t, riskObjRepo.Create(ctx, riskObj))

	// Create a risk
	risk := &domain.Risk{
		Title:             "Test Risk for CM",
		TargetID:          riskObj.ID,
		OwnerID:           user.ID,
		Probability:       domain.RiskMedium,
		Impact:            domain.RiskHigh,
		FinancialLoss:     strPtr("100000"),
		ReputationalLoss:  riskLevelPtr(domain.RiskMedium),
		LegalConsequences: intPtr(3),
		Comment:           strPtr("Test comment"),
		Causes: []domain.RiskCause{
			{Name: "Cause 1", Description: strPtr("Desc 1"), Probability: domain.RiskHigh},
		},
		Consequences: []domain.RiskConsequence{
			{Name: "Consequence 1", Description: strPtr("Desc 1"), Probability: domain.RiskCritical},
		},
	}
	require.NoError(t, riskRepo.Create(ctx, risk))

	// Get the cause and consequence IDs
	cause := risk.Causes[0]
	consequence := risk.Consequences[0]

	t.Run("Create countermeasure for cause", func(t *testing.T) {
		cm := &domain.Countermeasure{
			RiskID:        risk.ID,
			TargetType:    domain.TargetCause,
			CauseID:       &cause.ID,
			Description:   "Update antivirus software",
			AssigneeID:    user.ID,
			Deadline:      time.Now().Add(7 * 24 * time.Hour),
		}

		err := repo.Create(ctx, cm)
		require.NoError(t, err)
		require.NotEmpty(t, cm.ID)
		require.NotZero(t, cm.CreatedAt)

		// Verify it exists
		fetched, err := repo.GetByID(ctx, cm.ID)
		require.NoError(t, err)
		require.Equal(t, cm.Description, fetched.Description)
		require.Equal(t, cm.AssigneeID, fetched.AssigneeID)
		require.Equal(t, domain.TargetCause, fetched.TargetType)
		require.NotNil(t, fetched.CauseID)
		require.Nil(t, fetched.ConsequenceID)
	})

	t.Run("Create countermeasure for consequence", func(t *testing.T) {
		cm := &domain.Countermeasure{
			RiskID:          risk.ID,
			TargetType:      domain.TargetConsequence,
			ConsequenceID:   &consequence.ID,
			Description:     "Backup recovery plan",
			AssigneeID:      user.ID,
			Deadline:        time.Now().Add(14 * 24 * time.Hour),
		}

		err := repo.Create(ctx, cm)
		require.NoError(t, err)
		require.NotEmpty(t, cm.ID)

		fetched, err := repo.GetByID(ctx, cm.ID)
		require.NoError(t, err)
		require.Equal(t, domain.TargetConsequence, fetched.TargetType)
		require.Nil(t, fetched.CauseID)
		require.NotNil(t, fetched.ConsequenceID)
	})

	t.Run("ListByRiskID returns countermeasures in descending order", func(t *testing.T) {
		cms, err := repo.ListByRiskID(ctx, risk.ID)
		require.NoError(t, err)
		require.Len(t, cms, 2)
		// Should be ordered by created_at DESC
		require.True(t, cms[0].CreatedAt.After(cms[1].CreatedAt) || cms[0].CreatedAt.Equal(cms[1].CreatedAt))
	})

	t.Run("Update countermeasure", func(t *testing.T) {
		cms, _ := repo.ListByRiskID(ctx, risk.ID)
		require.Len(t, cms, 2)

		originalCreatedAt := cms[0].CreatedAt
		cms[0].Description = "Updated description"
		cms[0].AssigneeID = user.ID
		cms[0].Deadline = time.Now().Add(21 * 24 * time.Hour)

		err := repo.Update(ctx, cms[0])
		require.NoError(t, err)

		fetched, err := repo.GetByID(ctx, cms[0].ID)
		require.NoError(t, err)
		require.Equal(t, "Updated description", fetched.Description)
		require.Equal(t, cms[0].Deadline, fetched.Deadline)
		// CreatedAt should not change
		require.Equal(t, originalCreatedAt, fetched.CreatedAt)
	})

	t.Run("Delete countermeasure", func(t *testing.T) {
		cms, _ := repo.ListByRiskID(ctx, risk.ID)
		require.Len(t, cms, 2)

		err := repo.Delete(ctx, cms[0].ID)
		require.NoError(t, err)

		cms, err = repo.ListByRiskID(ctx, risk.ID)
		require.NoError(t, err)
		require.Len(t, cms, 1)
	})

	t.Run("Delete non-existent returns ErrNotFound", func(t *testing.T) {
		err := repo.Delete(ctx, "00000000-0000-0000-0000-000000000000")
		require.ErrorIs(t, err, domain.ErrNotFound)
	})

	t.Run("GetByID non-existent returns ErrNotFound", func(t *testing.T) {
		_, err := repo.GetByID(ctx, "00000000-0000-0000-0000-000000000000")
		require.ErrorIs(t, err, domain.ErrNotFound)
	})

	t.Run("Update non-existent returns ErrNotFound", func(t *testing.T) {
		cm := &domain.Countermeasure{
			ID:          "00000000-0000-0000-0000-000000000000",
			RiskID:      risk.ID,
			TargetType:  domain.TargetCause,
			CauseID:     &cause.ID,
			Description: "test",
			AssigneeID:  user.ID,
			Deadline:    time.Now().Add(24 * time.Hour),
		}
		err := repo.Update(ctx, cm)
		require.ErrorIs(t, err, domain.ErrNotFound)
	})
}

func strPtr(s string) *string {
	return &s
}

func riskLevelPtr(r domain.RiskLevel) *domain.RiskLevel {
	return &r
}

func intPtr(i int) *int {
	return &i
}