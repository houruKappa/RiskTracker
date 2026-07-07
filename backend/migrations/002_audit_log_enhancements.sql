-- Расширение журнала аудита: название сущности и описание изменений
ALTER TABLE entity_audit_logs ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE entity_audit_logs ADD COLUMN IF NOT EXISTS changes TEXT;
