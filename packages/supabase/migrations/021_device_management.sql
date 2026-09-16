-- Migration: 021_device_management.sql
-- Description: Add device banning controls to devices table for admin management

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS banned_at timestamp with time zone;

COMMENT ON COLUMN public.devices.is_banned IS 'Indicates whether this device has been banned by an administrator';
COMMENT ON COLUMN public.devices.banned_at IS 'Timestamp when the device was banned by an administrator';
