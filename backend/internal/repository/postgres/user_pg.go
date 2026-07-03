package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/houruKappa/RiskTracker/internal/domain"
	"github.com/lib/pq"
)

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	return false
}

var _ domain.UserRepository = (*UserPGRepo)(nil)

type UserPGRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) domain.UserRepository {
	return &UserPGRepo{db: db}
}

func (r *UserPGRepo) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (email, password_hash, full_name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Role,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrDuplicateEmail
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *UserPGRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, created_at, updated_at
		FROM users
		WHERE id = $1`

	var u domain.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.FullName,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select user by id: %w", err)
	}
	return &u, nil
}

func (r *UserPGRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, created_at, updated_at
		FROM users
		WHERE email = $1`

	var u domain.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.FullName,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select user by email: %w", err)
	}
	return &u, nil
}

func (r *UserPGRepo) List(ctx context.Context) ([]*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, created_at, updated_at
		FROM users
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("select users list: %w", err)
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		var u domain.User
		err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.PasswordHash,
			&u.FullName,
			&u.Role,
			&u.CreatedAt,
			&u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, &u)
	}
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}
	return users, nil
}

func (r *UserPGRepo) UpdatePassword(ctx context.Context, id string, hash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, hash, id)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *UserPGRepo) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users
		SET email = $1, full_name = $2, role = $3, updated_at = NOW()
		WHERE id = $4`

	result, err := r.db.ExecContext(ctx, query,
		user.Email,
		user.FullName,
		user.Role,
		user.ID,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.ErrDuplicateEmail
		}
		return fmt.Errorf("update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}