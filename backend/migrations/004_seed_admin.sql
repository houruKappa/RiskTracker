DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@risktracker.com') THEN
        INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
        VALUES (gen_random_uuid(), 'admin@risktracker.com', '$2a$10$977OCB1TTC83xo.76oqnN.GZtgec9w.bLz4J9kL5yASlxgrrN/FRi', 'Administrator', 'ADMIN', NOW(), NOW());
    END IF;
END
$$;
