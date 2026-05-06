-- Aareguru SDK error

local AareguruError = {}
AareguruError.__index = AareguruError


function AareguruError.new(code, msg, ctx)
  local self = setmetatable({}, AareguruError)
  self.is_sdk_error = true
  self.sdk = "Aareguru"
  self.code = code or ""
  self.msg = msg or ""
  self.ctx = ctx
  self.result = nil
  self.spec = nil
  return self
end


function AareguruError:error()
  return self.msg
end


function AareguruError:__tostring()
  return self.msg
end


return AareguruError
