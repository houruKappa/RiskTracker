.PHONY: up down build migrate logs test clean swagger

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

rebuild:
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

migrate:
	docker compose exec backend go run ./cmd/migrate/

test:
	cd backend && go test ./...
	cd frontend && npm test

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm test

clean:
	docker compose down -v
	rm -rf backend/tmp frontend/.next frontend/node_modules

swagger:
	@echo "Swagger UI available at http://localhost:8080/swagger/"

status:
	docker compose ps
