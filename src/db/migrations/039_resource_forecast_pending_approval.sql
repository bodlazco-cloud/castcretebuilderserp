-- resourceForecasts.status uses forecast_status enum
-- Add 2-tier approval statuses for Planning Manager → BOD flow
ALTER TYPE forecast_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'PENDING_PR';
ALTER TYPE forecast_status ADD VALUE IF NOT EXISTS 'PENDING_BOD_APPROVAL' BEFORE 'PENDING_PR';
