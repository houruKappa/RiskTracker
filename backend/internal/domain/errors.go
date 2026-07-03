package domain

import "errors"

var (
	ErrNotFound        = errors.New("resource not found")
	ErrForbidden       = errors.New("access denied")
	ErrValidation      = errors.New("validation error")
	ErrDuplicateEmail  = errors.New("email already exists")
	ErrDuplicateName   = errors.New("name already exists")
	ErrInvalidStatus   = errors.New("invalid status transition")
	ErrInvalidDeadline = errors.New("deadline must be in the future")
)
