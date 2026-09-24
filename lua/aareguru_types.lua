-- Typed models for the Aareguru SDK (LuaLS annotations).
--
-- GENERATED from the API model: main.kit.entity.<e>.fields{} and per-op
-- params (op.<name>.points[].g.params[]). Field/param types come from the
-- canonical type sentinels via @voxgig/sdkgen canonToType (source of truth:
-- @voxgig/apidef VALID_CANON). Annotations only — no runtime effect. Do not
-- edit by hand.

---@class Legacy

---@class LegacyLoadMatch
---@field app? string
---@field version? string

---@class Stuff

---@class StuffLoadMatch
---@field app? string
---@field line? number
---@field service string
---@field version? string

---@class V2018

---@class V2018LoadMatch
---@field app? string
---@field city string
---@field end string
---@field start string
---@field value? string
---@field version? string

local M = {}

return M
