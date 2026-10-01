-- Aareguru SDK error

local json = require("dkjson")

local AareguruError = {}
AareguruError.__index = AareguruError

-- Reachable for a debugger, absent from the table itself: the context holds
-- the live spec and options, and an error is what gets dumped or encoded.
local CONTEXT = setmetatable({}, { __mode = "k" })


function AareguruError.new(code, msg, ctx)
  local self = setmetatable({}, AareguruError)
  self.is_sdk_error = true
  self.sdk = "Aareguru"
  self.code = code or ""
  self.msg = msg or ""
  self.result = nil
  self.spec = nil
  CONTEXT[self] = ctx
  return self
end


function AareguruError:context()
  return CONTEXT[self]
end


function AareguruError:error()
  return self.msg
end


-- What make_error attached is already cleaned; the context is not part of
-- the record.
function AareguruError:to_table()
  return {
    sdk = self.sdk,
    code = self.code,
    msg = self.msg,
    status = self.status,
    result = self.result,
    spec = self.spec,
  }
end


function AareguruError:to_json()
  return json.encode(self:to_table())
end


function AareguruError:__tostring()
  return self.msg
end


function AareguruError.__tojson(self)
  return self:to_json()
end


return AareguruError
