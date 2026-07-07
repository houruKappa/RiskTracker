package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/houruKappa/RiskTracker/internal/app"
	"github.com/houruKappa/RiskTracker/internal/config"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/middleware"
	"github.com/houruKappa/RiskTracker/internal/delivery/http/v1"
	"github.com/houruKappa/RiskTracker/internal/repository/postgres"
	"github.com/houruKappa/RiskTracker/internal/swagger"
	"github.com/houruKappa/RiskTracker/internal/usecase"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := app.NewPool(cfg.DBDSN)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer db.Close()
	log.Println("connected to database")

	if err := app.RunMigrations(db, "migrations"); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	log.Println("migrations applied successfully")

	auditLogRepo := postgres.NewAuditLogRepo(db)
	auditSvc := usecase.NewAuditService(auditLogRepo)
	auditLogUC := usecase.NewAuditLogUsecase(auditLogRepo)
	auditLogHandler := v1.NewAuditLogHandler(auditLogUC)

	userRepo := postgres.NewUserRepo(db)
	authUC := usecase.NewAuthUsecase(userRepo, cfg.JWTSecret, 24*time.Hour)
	authHandler := v1.NewAuthHandler(authUC)
	userHandler := v1.NewUserHandler(userRepo, auditSvc)

	riskObjectRepo := postgres.NewRiskObjectRepo(db)
	riskObjectUC := usecase.NewRiskObjectUsecase(riskObjectRepo, auditSvc)
	riskObjectHandler := v1.NewRiskObjectHandler(riskObjectUC)

	riskRepo := postgres.NewRiskRepo(db)
	riskUC := usecase.NewRiskUsecase(riskRepo, auditSvc)
	riskHandler := v1.NewRiskHandler(riskUC)

	cmRepo := postgres.NewCountermeasureRepo(db)
	cmUC := usecase.NewCountermeasureUsecase(cmRepo, riskRepo, userRepo, auditSvc)
	cmHandler := v1.NewCountermeasureHandler(cmUC)

	reportRepo := postgres.NewReportRepo(db)
	reportUC := usecase.NewReportUsecase(reportRepo)
	reportHandler := v1.NewReportHandler(reportUC)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /api/v1/auth/login", authHandler.Login)
	mux.Handle("POST /api/v1/auth/logout", middleware.AuthRequired(authUC)(http.HandlerFunc(authHandler.Logout)))
	mux.Handle("GET /api/v1/users/me", middleware.AuthRequired(authUC)(http.HandlerFunc(authHandler.Me)))

	// User routes (read-only for any authenticated user)
	mux.Handle("GET /api/v1/users", middleware.AuthRequired(authUC)(http.HandlerFunc(userHandler.List)))

	// Admin user management routes
	mux.Handle("GET /api/v1/admin/users", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(userHandler.List))))
	mux.Handle("POST /api/v1/admin/users", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(userHandler.Create))))
	mux.Handle("PUT /api/v1/admin/users/{id}", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(userHandler.Update))))
	mux.Handle("PUT /api/v1/admin/users/{id}/password", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(userHandler.ResetPassword))))

	mux.Handle("GET /api/v1/objects", middleware.AuthRequired(authUC)(http.HandlerFunc(riskObjectHandler.List)))
	mux.Handle("POST /api/v1/admin/objects", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(riskObjectHandler.Create))))
	mux.Handle("PUT /api/v1/admin/objects/{id}", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(riskObjectHandler.Update))))
	mux.Handle("DELETE /api/v1/admin/objects/{id}", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(riskObjectHandler.Delete))))

	mux.Handle("POST /api/v1/risks", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.Create)))
	mux.Handle("GET /api/v1/risks", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.List)))
	mux.Handle("GET /api/v1/risks/{id}", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.GetByID)))
	mux.Handle("PUT /api/v1/risks/{id}", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.Update)))
	mux.Handle("PATCH /api/v1/risks/{id}/status", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.UpdateStatus)))
	mux.Handle("POST /api/v1/risks/{id}/causes", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.AddCause)))
	mux.Handle("POST /api/v1/risks/{id}/consequences", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.AddConsequence)))
	mux.Handle("DELETE /api/v1/risks/{id}/causes/{cause_id}", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.DeleteCause)))
	mux.Handle("DELETE /api/v1/risks/{id}/consequences/{consequence_id}", middleware.AuthRequired(authUC)(http.HandlerFunc(riskHandler.DeleteConsequence)))

	// Countermeasure routes
	mux.Handle("POST /api/v1/countermeasures", middleware.AuthRequired(authUC)(http.HandlerFunc(cmHandler.Create)))
	mux.Handle("GET /api/v1/countermeasures/{id}", middleware.AuthRequired(authUC)(http.HandlerFunc(cmHandler.GetByID)))
	mux.Handle("PUT /api/v1/countermeasures/{id}", middleware.AuthRequired(authUC)(http.HandlerFunc(cmHandler.Update)))
	mux.Handle("DELETE /api/v1/countermeasures/{id}", middleware.AuthRequired(authUC)(http.HandlerFunc(cmHandler.Delete)))
	mux.Handle("GET /api/v1/risks/{risk_id}/countermeasures", middleware.AuthRequired(authUC)(http.HandlerFunc(cmHandler.ListByRiskID)))

	// Report routes
	mux.Handle("GET /api/v1/reports/summary", middleware.AuthRequired(authUC)(http.HandlerFunc(reportHandler.Summary)))
	mux.Handle("GET /api/v1/reports/detail", middleware.AuthRequired(authUC)(http.HandlerFunc(reportHandler.Detail)))

	// Audit log routes
	mux.Handle("GET /api/v1/logs", middleware.AuthRequired(authUC)(middleware.AdminRequired(http.HandlerFunc(auditLogHandler.List))))

	// Swagger routes
	mux.Handle("GET /swagger/", swagger.Handler())

	handler := middleware.CORS(mux)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped")
}