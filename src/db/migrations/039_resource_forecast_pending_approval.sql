-- Add PENDING_APPROVAL status to resource_forecast_status enum
-- Forecasts now start as PENDING_APPROVAL (Planning must approve before PR can be raised)
ALTER TYPE resource_forecast_status ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'PENDING_PR';
