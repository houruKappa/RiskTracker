package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/houruKappa/RiskTracker/internal/app"
	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/stretchr/testify/require"
)

func TestUserRepository(t *testing.T) {
	// Подключаемся к тестовой базе данных
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://risktracker:risktracker@localhost:5432/risktracker?sslmode=disable"
	}
	
	db, err := app.NewPool(dsn)
	require.NoError(t, err, "failed to connect to db")
	defer db.Close()
	
	// Выполняем миграции (если еще не выполнены)
	ctx := context.Background()
	if err := app.RunMigrations(db, "migrations"); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}
	
		// Очищаем тестовые данные перед тестами
	db.ExecContext(ctx, "DELETE FROM users WHERE email LIKE '%@example.com' OR email LIKE 'duplicate@example.com' OR email LIKE 'test@example.com'")
	
	repo := NewUserRepo(db)
	
	t.Run("Create user", func(t *testing.T) {
		user := &domain.User{
			Email:    "test@example.com",
			PasswordHash: "password123",
			FullName: "Test User",
			Role:     domain.RoleUser,
		}
		
		err := repo.Create(ctx, user)
		require.NoError(t, err, "Create should succeed")
		require.NotEmpty(t, user.ID, "User ID should be set")
		require.NotZero(t, user.CreatedAt, "CreatedAt should be set")
		require.NotZero(t, user.UpdatedAt, "UpdatedAt should be set")
		// Пароль должен быть захеширован
		require.NotEqual(t, "password123", user.PasswordHash, "Password should be hashed")
		require.Len(t, user.PasswordHash, 60, "BCrypt hash should be 60 chars")
	})
	
	t.Run("GetByID", func(t *testing.T) {
		// Сначала создаем пользователя
		user := &domain.User{
			Email:    "getbyid@example.com",
			PasswordHash: "password123",
			FullName: "GetByID User",
			Role:     domain.RoleUser,
		}
		
		err := repo.Create(ctx, user)
		require.NoError(t, err)
		
		// Получаем по ID
		found, err := repo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		require.NotNil(t, found)
		require.Equal(t, user.ID, found.ID)
		require.Equal(t, user.Email, found.Email)
		require.Equal(t, user.FullName, found.FullName)
		require.Equal(t, user.Role, found.Role)
		// Пароли должны совпадать (оба хешированные)
		require.Equal(t, user.PasswordHash, found.PasswordHash)
	})
	
	t.Run("GetByID_NotFound", func(t *testing.T) {
		found, err := repo.GetByID(ctx, "00000000-0000-0000-0000-000000000000")
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrNotFound)
		require.Nil(t, found)
	})
	
	t.Run("GetByEmail", func(t *testing.T) {
		// Сначала создаем пользователя
		user := &domain.User{
			Email:    "getbyemail@example.com",
			PasswordHash: "password123",
			FullName: "GetByEmail User",
			Role:     domain.RoleAdmin,
		}
		
		err := repo.Create(ctx, user)
		require.NoError(t, err)
		
		// Получаем по email
		found, err := repo.GetByEmail(ctx, user.Email)
		require.NoError(t, err)
		require.NotNil(t, found)
		require.Equal(t, user.ID, found.ID)
		require.Equal(t, user.Email, found.Email)
		require.Equal(t, user.FullName, found.FullName)
		require.Equal(t, user.Role, found.Role)
		require.Equal(t, user.PasswordHash, found.PasswordHash)
	})
	
	t.Run("GetByEmail_NotFound", func(t *testing.T) {
		found, err := repo.GetByEmail(ctx, "nonexistent@example.com")
		require.Error(t, err)
		require.ErrorIs(t, err, domain.ErrNotFound)
		require.Nil(t, found)
	})
	
	t.Run("List users", func(t *testing.T) {
		// Сначала очистим пользователей для чистоты теста
		// В реальном тесте лучше использовать транзакции, но для простоты просто удалим известные email
		db.ExecContext(ctx, "DELETE FROM users WHERE email IN ($1, $2, $3)", 
			"list1@example.com", "list2@example.com", "list3@example.com")
		
		// Создаем трех пользователей
		user1 := &domain.User{
			Email:    "list1@example.com",
			PasswordHash: "pass1",
			FullName: "List User 1",
			Role:     domain.RoleUser,
		}
		user2 := &domain.User{
			Email:    "list2@example.com",
			PasswordHash: "pass2",
			FullName: "List User 2",
			Role:     domain.RoleAdmin,
		}
		user3 := &domain.User{
			Email:    "list3@example.com",
			PasswordHash: "pass3",
			FullName: "List User 3",
			Role:     domain.RoleUser,
		}
		
		err := repo.Create(ctx, user1)
		require.NoError(t, err)
		err = repo.Create(ctx, user2)
		require.NoError(t, err)
		err = repo.Create(ctx, user3)
		require.NoError(t, err)
		
		// Получаем список
		users, err := repo.List(ctx)
		require.NoError(t, err)
		require.GreaterOrEqual(t, len(users), 3, "Should have at least 3 users")
		
		// Проверяем, что наши пользователи в списке
		found1 := false
		found2 := false
		found3 := false
		for _, u := range users {
			if u.Email == user1.Email {
				found1 = true
				require.Equal(t, user1.FullName, u.FullName)
				require.Equal(t, user1.Role, u.Role)
			}
			if u.Email == user2.Email {
				found2 = true
				require.Equal(t, user2.FullName, u.FullName)
				require.Equal(t, user2.Role, u.Role)
			}
			if u.Email == user3.Email {
				found3 = true
				require.Equal(t, user3.FullName, u.FullName)
				require.Equal(t, user3.Role, u.Role)
			}
		}
		require.True(t, found1, "User1 should be in list")
		require.True(t, found2, "User2 should be in list")
		require.True(t, found3, "User3 should be in list")
	})
	
	t.Run("UpdatePassword", func(t *testing.T) {
		// Сначала очистим этого пользователя
		db.ExecContext(ctx, "DELETE FROM users WHERE email = $1", "updatepw@example.com")
		
		// Создаем пользователя
		user := &domain.User{
			Email:    "updatepw@example.com",
			PasswordHash: "oldpassword",
			FullName: "Update PW User",
			Role:     domain.RoleUser,
		}
		
		err := repo.Create(ctx, user)
		require.NoError(t, err)
		oldHash := user.PasswordHash
		
		// Обновляем пароль
		newHash := "newpassword123"
		err = repo.UpdatePassword(ctx, user.ID, newHash)
		require.NoError(t, err)
		
		// Получаем пользователя и проверяем, что пароль изменился
		updated, err := repo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		require.NotEqual(t, oldHash, updated.PasswordHash, "Password hash should change")
		// Не проверяем точное значение нового хеша, так как оно будет bcrypt-хешем от newpasswordhash123
	})
	
	t.Run("UpdatePassword_NotFound", func(t *testing.T) {
		err := repo.UpdatePassword(ctx, "00000000-0000-0000-0000-000000000000", "newhash")
		require.ErrorIs(t, err, domain.ErrNotFound)
	})
	
	t.Run("Create_DuplicateEmail", func(t *testing.T) {
		// Сначала очистим этого пользователя
		db.ExecContext(ctx, "DELETE FROM users WHERE email = $1", "duplicate@example.com")
		
		// Создаем первого пользователя
		user1 := &domain.User{
			Email:    "duplicate@example.com",
			PasswordHash: "password1",
			FullName: "Duplicate User 1",
			Role:     domain.RoleUser,
		}
		
		err := repo.Create(ctx, user1)
		require.NoError(t, err)
		
		// Пытаемся создать второго с тем же email
		user2 := &domain.User{
			Email:    "duplicate@example.com", // тот же email
			PasswordHash: "password2",
			FullName: "Duplicate User 2",
			Role:     domain.RoleAdmin,
		}
		
		err = repo.Create(ctx, user2)
		require.Error(t, err)
	})
	
	t.Run("List empty", func(t *testing.T) {
		// Очищаем таблицу для этого теста
		db.ExecContext(ctx, "DELETE FROM users WHERE email LIKE '%@example.com'")
		
		users, err := repo.List(ctx)
		require.NoError(t, err)
		require.Empty(t, users, "List should be empty after cleanup")
	})
}