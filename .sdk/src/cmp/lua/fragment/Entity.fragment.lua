-- ProjectName SDK EntityName entity

local json = require("dkjson")
local vs = require("utility.struct.struct")
local helpers = require("core.helpers")

local EntyClass = {}
EntyClass.__index = EntyClass


function EntyClass.new(client, entopts)
  entopts = entopts or {}
  if entopts["active"] == nil then
    entopts["active"] = true
  elseif entopts["active"] == false then
    -- keep false
  else
    entopts["active"] = true
  end

  local self = setmetatable({}, EntyClass)
  self._name = "entityname"
  self._client = client
  self._utility = client:get_utility()
  self._entopts = entopts
  self._data = {}
  self._deleted = false
  self._match = {}

  self._entctx = self._utility.make_context({
    entity = self,
    entopts = entopts,
  }, client:get_root_ctx())

  self._utility.feature_hook(self._entctx, "PostConstructEntity")

  return self
end


function EntyClass:get_name()
  return self._name
end


-- The entity serialises and prints as its data, as ts does: the instance
-- also holds the client, the utility and a match that can carry a query
-- credential.
function EntyClass:to_record()
  local rec = self._utility.clean(self._entctx, vs.clone(self._data or {}))
  rec["voxgig$entity"] = self._name
  return rec
end

EntyClass.__tostring = function(self)
  local rec = self:to_record()
  rec["voxgig$entity"] = nil
  return self._name .. " " .. json.encode(rec)
end

EntyClass.__tojson = function(self)
  return json.encode(self:to_record())
end


function EntyClass:make()
  local opts = {}
  for k, v in pairs(self._entopts) do
    opts[k] = v
  end
  return EntyClass.new(self._client, opts)
end


-- Every operation resolves to the entity; `remove` additionally marks
-- it. The instance KEEPS the data it held — a caller can still read what
-- was deleted — but it is no longer a live record. See AGENTS.md.
function EntyClass:mark_deleted()
  self._deleted = true
end


function EntyClass:deleted()
  return true == self._deleted
end


function EntyClass:data_set(args)
  if args ~= nil then
    self._data = helpers.to_map(vs.clone(args)) or {}
    self._utility.feature_hook(self._entctx, "SetData")
  end
end


function EntyClass:data_get()
  self._utility.feature_hook(self._entctx, "GetData")
  return vs.clone(self._data)
end


function EntyClass:match_set(args)
  if args ~= nil then
    self._match = helpers.to_map(vs.clone(args)) or {}
    self._utility.feature_hook(self._entctx, "SetMatch")
  end
end


function EntyClass:match_get()
  self._utility.feature_hook(self._entctx, "GetMatch")
  return vs.clone(self._match)
end


-- Feature #4: run `action` through the full pipeline and return a stateful
-- iterator over result items, so the `streaming` feature's incremental output
-- is reachable from a generated entity (a normal op call materialises the
-- whole result). Use it as `for item in ent:stream("list") do ... end`.
-- `callopts` parameterises the call:
--   - inbound (download): iterate items/chunks (from the streaming feature
--     when active, else the materialised items);
--   - outbound (upload): an iterable `body` in callopts is attached to the
--     request so the transport can stream the payload;
--   - `ctrl` (pipeline control) and `signal` (cancellation) honoured.
function EntyClass:stream(action, args, callopts)
  local utility = self._utility
  callopts = callopts or {}
  local signal = callopts["signal"]

  local ctrl = {}
  if type(callopts["ctrl"]) == "table" then
    for k, v in pairs(callopts["ctrl"]) do
      ctrl[k] = v
    end
  end
  ctrl["stream"] = callopts

  local ctxmap = {
    opname = action,
    ctrl = ctrl,
    match = self._match,
    data = self._data,
  }
  if type(args) == "table" then
    for k, v in pairs(args) do
      ctxmap[k] = v
    end
  end

  local ctx = utility.make_context(ctxmap, self._entctx)

  -- Outbound: expose the caller's iterable payload so the request builder /
  -- transport can stream it as the request body.
  local body = callopts["body"]
  if body ~= nil then
    ctx.reqdata = ctx.reqdata or {}
    ctx.reqdata["body$"] = body
    ctx.meta["stream_out"] = body
  end

  local function aborted()
    if signal == nil then
      return false
    end
    if type(signal) == "function" then
      return signal() and true or false
    end
    if type(signal) == "table" and signal.aborted ~= nil then
      return signal.aborted and true or false
    end
    return false
  end

  local co = coroutine.create(function()
    utility.feature_hook(ctx, "PrePoint")
    local point, err = utility.make_point(ctx)
    ctx.out["point"] = point
    if err ~= nil then
      return
    end

    utility.feature_hook(ctx, "PreSpec")
    local spec
    spec, err = utility.make_spec(ctx)
    ctx.out["spec"] = spec
    if err ~= nil then
      return
    end

    utility.feature_hook(ctx, "PreRequest")
    local resp
    resp, err = utility.make_request(ctx)
    ctx.out["request"] = resp
    if err ~= nil then
      return
    end

    utility.feature_hook(ctx, "PreResponse")
    local resp2
    resp2, err = utility.make_response(ctx)
    ctx.out["response"] = resp2
    if err ~= nil then
      return
    end

    utility.feature_hook(ctx, "PreResult")
    local result
    result, err = utility.make_result(ctx)
    ctx.out["result"] = result
    if err ~= nil then
      return
    end

    utility.feature_hook(ctx, "PreDone")

    result = ctx.result

    -- Inbound: prefer the streaming feature's incremental iterator; else fall
    -- back to the materialised items so stream always yields.
    local stream_fn = nil
    if result ~= nil then
      stream_fn = result.stream
    end
    if type(stream_fn) == "function" then
      -- done() does not run on this path, so its record is cleaned here.
      utility.clean_explain(ctx)
      for item in stream_fn() do
        if aborted() then
          return
        end
        coroutine.yield(item)
      end
    else
      local data = utility.done(ctx)
      local items
      if vs.islist(data) then
        items = data
      elseif data == nil then
        items = {}
      else
        items = { data }
      end
      for _, item in ipairs(items) do
        if aborted() then
          return
        end
        coroutine.yield(item)
      end
    end
  end)

  -- An error raised while the caller iterates leaves through the same catch
  -- path as an operation's. A step's error ends the stream silently, so the
  -- record is cleaned whenever the stream ends.
  return function()
    if coroutine.status(co) == "dead" then
      return nil
    end
    local ok, item = coroutine.resume(co)
    if ok then
      if coroutine.status(co) == "dead" then
        utility.clean_explain(ctx)
      end
      return item
    end
    local err = self:_unexpected(ctx, item)
    if err ~= nil then
      error(err, 0)
    end
    return nil
  end
end


-- #LoadOp

-- #ListOp

-- #CreateOp

-- #UpdateOp

-- #RemoveOp


-- A hook, fetcher or parser that raises never reaches make_error: its error
-- leaves cleaned, and so does the explain record it interrupted.
function EntyClass:_run_op(ctx, post_done)
  local ok, out, err = pcall(self._run_steps, self, ctx, post_done)
  if ok then
    return out, err
  end
  return nil, self:_unexpected(ctx, out)
end


-- The raised error, cleaned; nil when the caller switched throwing off.
function EntyClass:_unexpected(ctx, raised)
  local clean = self._utility.clean
  local cleanerr = clean(ctx, raised)
  ctx.ctrl.err = cleanerr

  local explain = ctx.ctrl.explain
  if type(explain) == "table" then
    self._utility.clean_explain(ctx)
    if explain.err == nil then
      explain.err = { message = type(cleanerr) == "table" and cleanerr.msg or tostring(cleanerr) }
    end
  end

  if ctx.ctrl.throw_err == false then
    return nil
  end
  return cleanerr
end


function EntyClass:_run_steps(ctx, post_done)
  local utility = self._utility

  -- #PrePoint-Hook

  local point, err = utility.make_point(ctx)
  ctx.out["point"] = point
  if err ~= nil then
    return utility.make_error(ctx, err)
  end

  -- #PreSpec-Hook

  local spec
  spec, err = utility.make_spec(ctx)
  ctx.out["spec"] = spec
  if err ~= nil then
    return utility.make_error(ctx, err)
  end

  -- #PreRequest-Hook

  local resp
  resp, err = utility.make_request(ctx)
  ctx.out["request"] = resp
  if err ~= nil then
    return utility.make_error(ctx, err)
  end

  -- #PreResponse-Hook

  local resp2
  resp2, err = utility.make_response(ctx)
  ctx.out["response"] = resp2
  if err ~= nil then
    return utility.make_error(ctx, err)
  end

  -- #PreResult-Hook

  local result
  result, err = utility.make_result(ctx)
  ctx.out["result"] = result
  if err ~= nil then
    return utility.make_error(ctx, err)
  end

  -- #PreDone-Hook

  post_done()

  local out, done_err = utility.done(ctx)
  if done_err ~= nil then
    return out, done_err
  end

  -- An operation resolves to the ENTITY, not the raw data. Entities are
  -- stateful: post_done has just absorbed resdata/resmatch into this
  -- instance, and the caller reaches the record through data(). Two
  -- structural exceptions: `list` resolves to the ARRAY of entity
  -- instances make_result built, and a failed op with throwing disabled
  -- hands back the error payload unchanged. `remove` additionally marks
  -- the entity deleted; it KEEPS its data, so a caller can still read
  -- what was removed. See AGENTS.md "Entity operations return ENTITIES".
  local opname = ctx.op ~= nil and ctx.op.name or nil

  if ctx.result ~= nil and ctx.result.ok and opname ~= "list" then
    if opname == "remove" then
      self:mark_deleted()
    end
    return self, nil
  end

  return out, nil
end


return EntyClass
