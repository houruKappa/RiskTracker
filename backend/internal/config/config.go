package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port      string
	DBDSN     string
	JWTSecret string
	Env       string
}

func Load() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbDSN := os.Getenv("DB_DSN")
	if dbDSN == "" {
		return nil, fmt.Errorf("DB_DSN is required")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	env := os.Getenv("ENV")
	if env == "" {
		env = "dev"
	}

	return &Config{
		Port:      port,
		DBDSN:     dbDSN,
		JWTSecret: jwtSecret,
		Env:       env,
	}, nil
}
