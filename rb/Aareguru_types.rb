# frozen_string_literal: true

# Typed models for the Aareguru SDK.
#
# GENERATED from the API model: main.kit.entity.<e>.fields[] and per-op
# params (op.<name>.points[].args.params[]). Member types come from the
# canonical type sentinels via @voxgig/sdkgen canonToType (source of truth:
# @voxgig/apidef VALID_CANON). Ruby types are unenforced; these YARD
# annotations document the shapes. Do not edit by hand.

# Legacy entity data model.
class Legacy
end

# Request payload for Legacy#load.
#
# @!attribute [rw] app
#   @return [String, nil]
#
# @!attribute [rw] version
#   @return [String, nil]
LegacyLoadMatch = Struct.new(
  :app,
  :version,
  keyword_init: true
)

# Stuff entity data model.
class Stuff
end

# Request payload for Stuff#load.
#
# @!attribute [rw] app
#   @return [String, nil]
#
# @!attribute [rw] line
#   @return [Integer, nil]
#
# @!attribute [rw] service
#   @return [String]
#
# @!attribute [rw] version
#   @return [String, nil]
StuffLoadMatch = Struct.new(
  :app,
  :line,
  :service,
  :version,
  keyword_init: true
)

# V2018 entity data model.
class V2018
end

# Request payload for V2018#load.
#
# @!attribute [rw] app
#   @return [String, nil]
#
# @!attribute [rw] city
#   @return [String]
#
# @!attribute [rw] end
#   @return [String]
#
# @!attribute [rw] start
#   @return [String]
#
# @!attribute [rw] value
#   @return [String, nil]
#
# @!attribute [rw] version
#   @return [String, nil]
V2018LoadMatch = Struct.new(
  :app,
  :city,
  :end,
  :start,
  :value,
  :version,
  keyword_init: true
)

