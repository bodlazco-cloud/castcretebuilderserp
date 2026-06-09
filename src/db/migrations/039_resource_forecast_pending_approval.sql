-- resourceForecasts.status uses the forecast_status enum (not resource_forecast_status)
-- Add PENDING_APPROVAL so Planning must approve before a PR can be raised
ALTER TYPE forecast_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'PENDING_PR';
