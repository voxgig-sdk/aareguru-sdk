import {
  cmp,
  File,
  Content,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
} from '@voxgig/sdkgen'


// The canary sweep, the lua port of TestClean_ts.ts: see that component.
const TestClean = cmp(function TestClean(props: any) {
  const { model } = props.ctx$
  const { target } = props

  const auth = {
    suppressed: isAuthSuppressed(model),
    where: resolveAuthIn(model),
    name: 'header' === resolveAuthIn(model)
      ? resolveAuthName(model).toLowerCase() : resolveAuthName(model),
    basic: isHttpBasicAuth(model),
  }

  File({ name: 'clean_test.' + target.ext }, () => Content(render(model, auth)))
})


function luabool(b: boolean): string {
  return b ? 'true' : 'false'
}


function luastr(s: string): string {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}


function render(model: any, auth: {
  suppressed: boolean, where: string, name: string, basic: boolean
}): string {
  return `-- ${model.const.Name} SDK clean test
--
-- The canary sweep: every credential slot holds a distinctive value, every
-- diagnostic feature this SDK ships is switched on with a capturing sink, a
-- real operation runs through every outcome, and every string that leaves
-- the SDK is searched for the canaries and their encoded forms. It also
-- proves its own sensitivity: with clean switched off the canary MUST show.

local json = require("dkjson")
local sdk = require("${model.name}_sdk")
local BaseFeature = require("feature.base_feature")


-- Generated: the credential's wire placement is fixed when the SDK is built.
local AUTH = {
  suppressed = ${luabool(auth.suppressed)},
  where = ${luastr(auth.where)},
  name = ${luastr(auth.name)},
  basic = ${luabool(auth.basic)},
}

local CANARY = {
  apikey = "CANARY-APIKEY-k9x2m7q4p1",
  secret = "CANARY-SECRET-w3e8r5t2y6",
  header = "CANARY-HEADER-z1x4c7v0b3",
  value = "CANARY-VALUE-n5m8b2v9c4",
}

local MASK = "[redacted]"


local B64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

local function base64(text)
  local out = {}
  local size = #text
  local index = 1
  while index <= size do
    local rest = size - index + 1
    local a = string.byte(text, index)
    local b = string.byte(text, index + 1) or 0
    local c = string.byte(text, index + 2) or 0
    local word = (a << 16) | (b << 8) | c
    local chunk = {}
    for shift = 18, 0, -6 do
      local at = (word >> shift) & 0x3f
      chunk[#chunk + 1] = string.sub(B64_ALPHABET, at + 1, at + 1)
    end
    if rest == 1 then
      chunk[3] = "="
      chunk[4] = "="
    elseif rest == 2 then
      chunk[4] = "="
    end
    out[#out + 1] = table.concat(chunk)
    index = index + 3
  end
  return table.concat(out)
end


local function percent(text)
  return (string.gsub(text, "[^%w%-_%.~!%*'%(%)]", function(c)
    return string.format("%%%02X", string.byte(c))
  end))
end


-- Every form a canary can travel in.
local FORMS = {}
for _, v in ipairs({ CANARY.apikey, CANARY.secret, CANARY.header, CANARY.value }) do
  FORMS[#FORMS + 1] = v
  FORMS[#FORMS + 1] = base64(v)
  FORMS[#FORMS + 1] = percent(v)
end
FORMS[#FORMS + 1] = base64(CANARY.apikey .. ":" .. CANARY.secret)


-- Header tables keep the caller's spelling; the assertion should not care.
local function header(map, name)
  for k, v in pairs(map or {}) do
    if type(k) == "string" and string.lower(k) == string.lower(name) then
      return v
    end
  end
  return nil
end


local function leaks(text)
  local found = {}
  for _, f in ipairs(FORMS) do
    if string.find(text, f, 1, true) ~= nil then
      found[#found + 1] = f
    end
  end
  return found
end


local function tojson(val)
  local ok, text = pcall(json.encode, val, {
    exception = function() return "null" end,
  })
  if ok and type(text) == "string" then
    return text
  end
  return "<json failed: " .. tostring(text) .. ">"
end


-- A generic table dump, the way a REPL or a logger prints a value: it
-- honours __tostring, as print does, and otherwise walks every field.
local function dump(val, depth, seen)
  depth = depth or 0
  seen = seen or {}
  if type(val) == "string" then
    return string.format("%q", val)
  end
  if type(val) ~= "table" then
    return tostring(val)
  end
  local mt = getmetatable(val)
  if type(mt) == "table" and mt.__tostring ~= nil then
    return tostring(val)
  end
  if seen[val] or depth > 8 then
    return "{...}"
  end
  seen[val] = true
  local parts = {}
  for k, v in pairs(val) do
    parts[#parts + 1] = tostring(k) .. "=" .. dump(v, depth + 1, seen)
  end
  seen[val] = nil
  return "{" .. table.concat(parts, ", ") .. "}"
end


local function copy(tbl)
  local out = {}
  for k, v in pairs(tbl) do
    out[k] = v
  end
  return out
end


local function append(sinks, more)
  for _, s in ipairs(more) do
    sinks[#sinks + 1] = s
  end
end


-- Every default form a value leaves in: the SDK's JSON encoding, tostring,
-- a table dump, and an error's own fields.
local function surfaces(name, val)
  local out = {}
  local function push(kind, fn)
    local ok, text = pcall(fn)
    if ok and text ~= nil then
      out[#out + 1] = { name = name .. ":" .. kind, text = tostring(text) }
    end
  end
  push("json", function() return tojson(val) end)
  push("string", function() return tostring(val) end)
  push("dump", function() return dump(val) end)
  if type(val) == "table" then
    if type(val.to_json) == "function" then
      push("tojson", function() return val:to_json() end)
    end
    if val.is_sdk_error == true then
      push("msg", function() return val.msg end)
      push("result", function() return dump(val.result) end)
      push("spec", function() return dump(val.spec) end)
    end
  end
  return out
end


-- Captures the serialised context from inside the pipeline: what a hook
-- author would hand to a logger.
local CaptureFeature = {}
CaptureFeature.__index = CaptureFeature
setmetatable(CaptureFeature, { __index = BaseFeature })

function CaptureFeature.new(sinks)
  local self = setmetatable(BaseFeature.new(), CaptureFeature)
  self.name = "capture"
  self.version = "0.0.1"
  self.active = true
  self.sinks = sinks
  return self
end

function CaptureFeature:init(_ctx, _options) end
function CaptureFeature:PreRequest(ctx) append(self.sinks, surfaces("ctx@PreRequest", ctx)) end
function CaptureFeature:PreResponse(ctx) append(self.sinks, surfaces("ctx@PreResponse", ctx)) end
function CaptureFeature:PreUnexpected(ctx) append(self.sinks, surfaces("ctx@PreUnexpected", ctx)) end


-- A feature that raises from inside the pipeline, quoting the request it
-- saw: an error make_error never handled. The unexpected variant raises
-- from PreUnexpected instead, which fires inside make_error.
local ThrowFeature = {}
ThrowFeature.__index = ThrowFeature
setmetatable(ThrowFeature, { __index = BaseFeature })

function ThrowFeature.new(unexpected)
  local self = setmetatable(BaseFeature.new(), ThrowFeature)
  self.name = "throwhook"
  self.version = "0.0.1"
  self.active = true
  self.unexpected = unexpected == true
  return self
end

function ThrowFeature:init(_ctx, _options) end
function ThrowFeature:PreResponse(ctx)
  if not self.unexpected then error("hook saw " .. tojson(ctx.spec)) end
end
function ThrowFeature:PreUnexpected(ctx)
  if self.unexpected then error("hook saw " .. tojson(ctx.spec)) end
end


-- A feature that refuses the operation with the SDK's own error, as rbac
-- does, whose code quotes a registered value.
local DenyFeature = {}
DenyFeature.__index = DenyFeature
setmetatable(DenyFeature, { __index = BaseFeature })

function DenyFeature.new()
  local self = setmetatable(BaseFeature.new(), DenyFeature)
  self.name = "denyhook"
  self.version = "0.0.1"
  self.active = true
  return self
end

function DenyFeature:init(_ctx, _options) end
function DenyFeature:PrePoint(ctx)
  ctx.out["point"] = ctx:make_error("denied:" .. CANARY.value, "denied")
end


-- A stream that fails while the caller iterates it, quoting a credential.
local StreamThrowFeature = {}
StreamThrowFeature.__index = StreamThrowFeature
setmetatable(StreamThrowFeature, { __index = BaseFeature })

function StreamThrowFeature.new()
  local self = setmetatable(BaseFeature.new(), StreamThrowFeature)
  self.name = "streamthrow"
  self.version = "0.0.1"
  self.active = true
  return self
end

function StreamThrowFeature:init(_ctx, _options) end
function StreamThrowFeature:PreDone(ctx)
  ctx.result.stream = function()
    return function() error("stream saw " .. CANARY.apikey) end
  end
end


-- A stream that succeeds, so the pipeline's terminal step never runs.
local StreamOkFeature = {}
StreamOkFeature.__index = StreamOkFeature
setmetatable(StreamOkFeature, { __index = BaseFeature })

function StreamOkFeature.new()
  local self = setmetatable(BaseFeature.new(), StreamOkFeature)
  self.name = "streamok"
  self.version = "0.0.1"
  self.active = true
  return self
end

function StreamOkFeature:init(_ctx, _options) end
function StreamOkFeature:PreDone(ctx)
  local items = { ctx.result.resdata or {} }
  ctx.result.stream = function()
    local i = 0
    return function()
      i = i + 1
      return items[i]
    end
  end
end


-- Drops the result once the record holds it, so a later step fails.
local StepFailFeature = {}
StepFailFeature.__index = StepFailFeature
setmetatable(StepFailFeature, { __index = BaseFeature })

function StepFailFeature.new()
  local self = setmetatable(BaseFeature.new(), StepFailFeature)
  self.name = "stepfail"
  self.version = "0.0.1"
  self.active = true
  return self
end

function StepFailFeature:init(_ctx, _options) end
function StepFailFeature:PreResult(ctx) ctx.result = nil end


local function response(status, data, headers)
  local h = { ["content-type"] = "application/json" }
  for k, v in pairs(headers or {}) do
    h[string.lower(k)] = v
  end
  return {
    status = status,
    statusText = status < 400 and "OK" or "ERR",
    headers = h,
    json = function() return data end,
    body = tojson(data),
  }, nil
end


local SCENARIOS = {
  { name = "ok", respond = function()
    return response(200, { id = "i1", name = "n1" },
      { ["x-session-token"] = "RESP-TOKEN-a1b2c3d4e5" })
  end },
  { name = "notfound", respond = function()
    return response(404, { error = "no such record" })
  end },
  { name = "server", respond = function()
    return response(500, { error = "boom" })
  end },
  { name = "transport", respond = function(url)
    return nil, 'socket hang up (URL was: "' .. url .. '")'
  end },
  { name = "notjson", respond = function()
    return {
      status = 200,
      statusText = "OK",
      headers = {},
      json = function() error("Unexpected token < in JSON") end,
      body = "<html>",
    }, nil
  end },
}


-- True when this SDK was generated with the named feature.
local function has_feature(name)
  local ok, features = pcall(require, "features")
  return ok and type(features) == "table" and features[name] ~= nil
end


-- Offline, as every generated suite is: the test OPTION resolves a required
-- server variable to test-<name>, and installs no transport.
local function offline(opts)
  local out = {}
  for k, v in pairs(opts) do
    out[k] = v
  end
  out.test = { active = true }
  return out
end


-- A client the sweep cannot build leaves nothing swept: a harness error, not
-- a leak.
local function construct(opts)
  local ok, client = pcall(sdk.new, offline(opts))
  if not ok then
    error("clean harness: the client could not be constructed, so nothing was swept: " ..
      tostring(client), 0)
  end
  return client
end


local function make_sdk(scenario, sinks, cleanopts, extra, auth)
  local function capture(name)
    return function(rec) append(sinks, surfaces(name, rec)) end
  end

  local feature = {}
  if has_feature("log") then
    local logger = {}
    for _, level in ipairs({ "trace", "debug", "info", "warn", "error", "fatal" }) do
      logger[level] = function(_, msg) append(sinks, surfaces("log." .. level, msg)) end
    end
    feature.log = { active = true, logger = logger }
  end
  if has_feature("debug") then
    feature.debug = { active = true, onEntry = capture("debug") }
  end
  if has_feature("audit") then
    feature.audit = { active = true, sink = capture("audit") }
  end
  if has_feature("telemetry") then
    feature.telemetry = { active = true, exporter = capture("telemetry") }
  end
  if has_feature("cost") then
    feature.cost = { active = true, sink = capture("cost") }
  end
  if has_feature("metrics") then
    feature.metrics = { active = true }
  end
  if has_feature("clienttrack") then
    feature.clienttrack = { active = true }
  end

  local clean = { values = CANARY.value }
  for k, v in pairs(cleanopts or {}) do
    clean[k] = v
  end

  local extend = { CaptureFeature.new(sinks) }
  for _, f in ipairs(extra or {}) do
    extend[#extend + 1] = f
  end

  return construct({
    apikey = CANARY.apikey,
    secret = CANARY.secret,
    headers = { ["X-Custom-Token"] = CANARY.header },
    clean = clean,
    feature = feature,
    extend = extend,
    utility = {
      fetcher = function(_ctx, url, fetchdef) return scenario.respond(url, fetchdef) end,
    },
    auth = auth,
  })
end


-- The first operation that completes against a plain 200: with no
-- arguments, else with every path parameter its points declare filled in.
local function usable_op()
  local plain = construct({
    apikey = CANARY.apikey,
    utility = { fetcher = function() return response(200, { id = "i1" }) end },
  })
  local config = require("config_shared")()
  local entities = type(config.entity) == "table" and config.entity or {}

  local accessors = {}
  for k, v in pairs(getmetatable(plain)) do
    if type(k) == "string" and string.match(k, "^%u") and type(v) == "function" then
      accessors[#accessors + 1] = k
    end
  end
  table.sort(accessors)

  local rank = { list = 0, load = 1 }
  for _, accessor in ipairs(accessors) do
    local ok, inst = pcall(plain[accessor], plain)
    if ok and type(inst) == "table" and type(inst.get_name) == "function"
      and type(entities[inst:get_name()]) == "table"
    then
      local ops = {}
      for op in pairs(entities[inst:get_name()].op or {}) do
        ops[#ops + 1] = op
      end
      table.sort(ops, function(a, b)
        return (rank[a] or 2) < (rank[b] or 2) or ((rank[a] or 2) == (rank[b] or 2) and a < b)
      end)
      for _, op in ipairs(ops) do
        if type(inst[op]) == "function" then
          local filled = {}
          local opdef = entities[inst:get_name()].op[op]
          local points = type(opdef) == "table" and opdef.points or nil
          for _, point in ipairs(type(points) == "table" and points or {}) do
            local params = type(point) == "table" and type(point.args) == "table"
              and point.args.params or nil
            for _, p in ipairs(type(params) == "table" and params or {}) do
              if type(p) == "table" and type(p.name) == "string" then
                filled[p.name] = "p1"
              end
            end
          end
          for _, match in ipairs({ {}, filled }) do
            local cok, out, err = pcall(inst[op], plain[accessor](plain), copy(match), {})
            if cok and err == nil and out ~= nil then
              return { accessor = accessor, op = op, match = match }
            end
          end
        end
      end
    end
  end
  return nil
end


local function drive(client, target, ctrl, sinks)
  -- A caller may keep the record it passed rather than read ctrl.explain.
  local held = ctrl.explain
  local ent = client[target.accessor](client)
  local ok, out, err = pcall(ent[target.op], ent, copy(target.match), ctrl)
  if not ok then
    err = out
    out = nil
  end
  if err ~= nil then
    append(sinks, surfaces("error", err))
  end
  if out ~= nil then
    append(sinks, surfaces("result", out))
  end
  -- Raw, as a caller copying the match into another query reads it.
  append(sinks, surfaces("match", ent:match_get()))
  if ctrl.explain ~= nil then
    append(sinks, surfaces("explain", ctrl.explain))
  end
  if held ~= nil and held ~= ctrl.explain then
    append(sinks, surfaces("explain:held", held))
  end
  return err
end


describe("clean", function()

  it("no credential leaves the SDK in any form", function()
    local target = usable_op()
    if target == nil then
      pending("no operation of this SDK completes against a plain 200; nothing to sweep")
      return
    end

    local sinks = {}
    local errors = {}
    local explains = {}

    for _, scenario in ipairs(SCENARIOS) do
      for _, variant in ipairs({
        { name = "throw", ctrl = function() return {} end },
        { name = "explain", ctrl = function() return { explain = {} } end },
        { name = "nothrow", ctrl = function() return { throw = false, explain = {} } end },
      }) do
        local client = make_sdk(scenario, sinks)
        local ctrl = variant.ctrl()
        local err = drive(client, target, ctrl, sinks)
        local key = scenario.name .. "/" .. variant.name
        if err ~= nil then
          errors[key] = err
        end
        if ctrl.explain ~= nil then
          explains[key] = ctrl.explain
        end
        append(sinks, surfaces("sdk", client))
      end
    end

    -- A name given at run time replaces the declared one: the match leaves
    -- out whichever name prepare_auth placed.
    drive(make_sdk(SCENARIOS[1], sinks, nil, nil, { name = "zzcred" }), target, {}, sinks)

    -- A credential mistyped as a table is rejected by validation, whose
    -- message quotes the value it rejected.
    local built, rejected = pcall(sdk.new, offline({
      apikey = { value = CANARY.apikey },
      clean = { values = CANARY.value },
    }))
    assert.is_false(built, "a credential mistyped as a table should be rejected")
    append(sinks, surfaces("rejected", rejected))

    -- An error a feature hook raises, quoting the request, skips make_error.
    -- PreUnexpected fires only inside make_error, so its variant needs a
    -- failing response to reach it.
    local hooked = make_sdk(SCENARIOS[1], sinks, nil, { ThrowFeature.new() })
    local unexpected = make_sdk(SCENARIOS[2], sinks, nil, { ThrowFeature.new(true) })
    for _, client in ipairs({ hooked, unexpected }) do
      local hookerr = drive(client, target, { explain = {} }, sinks)
      assert.is_truthy(string.find(tostring(hookerr), "hook saw", 1, true),
        "the throwing hook should fail the operation")
    end

    -- A step's own error reaches make_error without passing through done().
    local stepped = drive(make_sdk(SCENARIOS[1], sinks, nil, { StepFailFeature.new() }),
      target, { explain = {} }, sinks)
    assert.is_not_nil(stepped, "the failing step should fail the operation")

    -- A feature's own error keeps its code, which is cleaned like the message.
    local denied = drive(make_sdk(SCENARIOS[1], sinks, nil, { DenyFeature.new() }), target, {}, sinks)
    assert.is_not_nil(denied, "the refusing hook should fail the operation")

    -- Iterating a stream runs inside the same catch path as the operation,
    -- and the explain record the caller passed is cleaned however it ends.
    -- A step's error raises from the stream, as it fails the operation. The
    -- caller stops at the first item, leaving the stream open.
    for _, case in ipairs({
      { name = "stream", extra = { StreamThrowFeature.new() }, raises = true },
      { name = "stream-ok", extra = { StreamOkFeature.new() } },
      { name = "stream-plain", extra = {} },
      { name = "stream-step", extra = { StepFailFeature.new() }, raises = true },
    }) do
      local streamed = make_sdk(SCENARIOS[1], sinks, nil, case.extra)
      local sent = streamed[target.accessor](streamed)
      local explain = {}
      local sok, streamerr = pcall(function()
        for _ in sent:stream(target.op, { reqmatch = copy(target.match) },
          { ctrl = { explain = explain } }) do break end
      end)
      assert.are.equal(case.raises == true, not sok, case.name .. ": only the failing stream throws")
      if not sok then
        append(sinks, surfaces(case.name, streamerr))
      end
      assert.is_not_nil(next(explain), case.name .. ": the explain record was not filled")
      append(sinks, surfaces(case.name .. ":explain", explain))
    end

    -- A client given no clean block at all masks by the schema defaults.
    local bare = construct({
      apikey = CANARY.apikey,
      secret = CANARY.secret,
      headers = { ["X-Custom-Token"] = CANARY.header },
      utility = {
        fetcher = function(_ctx, url, fetchdef) return SCENARIOS[2].respond(url, fetchdef) end,
      },
    })
    local barerr = drive(bare, target, {}, sinks)
    assert.is_not_nil(barerr, "the 404 scenario must fail without a clean block")

    -- The raw path returns its failure rather than raising it.
    local direct = make_sdk(SCENARIOS[4], sinks):direct({ path = "raw" })
    assert.is_false(direct.ok, "a transport failure should fail direct()")
    append(sinks, surfaces("direct", direct.err))

    -- A registered value used as a property name is masked; names that
    -- mask alike are all kept.
    local named = hooked:get_utility().clean(hooked:get_root_ctx(),
      { [CANARY.header] = 1, [CANARY.value] = 2, plain = 3 })
    assert.are.same({ [MASK] = 1, [MASK .. "#1"] = 2, plain = 3 }, named)
    append(sinks, surfaces("named", named))

    local leaked = {}
    for _, s in ipairs(sinks) do
      local found = leaks(s.text)
      if 0 < #found then
        leaked[#leaked + 1] = s.name .. " [" .. table.concat(found, ", ") .. "]"
      end
    end

    print("clean: swept " .. #sinks .. " surface(s), " .. #leaked .. " leak(s)")

    assert.are.equal(0, #leaked, "credential leaked through: " .. table.concat(leaked, "; "))

    -- The positive half: the slot the credential travelled in is masked,
    -- and an unregistered token in a response header is masked by name.
    local notfound = errors["notfound/throw"]
    assert.is_not_nil(notfound, "the 404 scenario must fail")
    assert.are.equal(404, notfound.status)
    local spec = notfound.spec or {}
    if not AUTH.suppressed then
      if AUTH.where == "query" then
        assert.are.equal(MASK, header(spec.query, AUTH.name))
      elseif AUTH.where == "cookie" then
        local cookie = tostring(header(spec.headers, "cookie"))
        assert.is_truthy(string.find(cookie, MASK, 1, true), "cookie: " .. cookie)
      else
        local cred = tostring(header(spec.headers, AUTH.name))
        assert.is_truthy(string.sub(cred, -#MASK) == MASK, AUTH.name .. ": " .. cred)
      end
    end
    assert.are.equal(MASK, header(spec.headers, "x-custom-token"))
    assert.are.equal("denied:" .. MASK, denied.code)
    assert.are.equal(MASK, header((barerr.spec or {}).headers, "x-custom-token"))

    local explained = explains["ok/explain"] or {}
    assert.is_not_nil(explained.result, "the explain record should carry the result")
    assert.are.equal(MASK, header(explained.result.headers, "x-session-token"))
  end)


  it("the sweep can see a leak: clean switched off shows the credential", function()
    local target = usable_op()
    if target == nil then
      pending("no operation of this SDK completes against a plain 200; nothing to sweep")
      return
    end

    local sinks = {}
    local client = make_sdk(SCENARIOS[2], sinks, { active = false })
    local err = drive(client, target, {}, sinks)
    assert.is_not_nil(err)

    -- Explaining a failure must not cost it its error.
    local explained = drive(make_sdk(SCENARIOS[2], {}, { active = false }), target, { explain = {} }, {})
    assert.are.equal(err.msg, explained and explained.msg, "with clean off, explain lost the error")

    local seen = 0
    for _, s in ipairs(sinks) do
      if 0 < #leaks(s.text) then
        seen = seen + 1
      end
    end
    assert.is_true(0 < seen, "with clean off, nothing showed the canary: the sweep is blind")

    if not AUTH.suppressed then
      local text = tojson(err.spec)
      assert.is_true(
        string.find(text, CANARY.apikey, 1, true) ~= nil
          or string.find(text, base64(CANARY.apikey .. ":" .. CANARY.secret), 1, true) ~= nil,
        "the raw spec should carry the credential when clean is off")
    end
  end)


  -- A feature's name is not a field name: a feature called secrets does not
  -- make its settings secret, though a sensitive field inside it still is. An
  -- entity block, of per-entity settings or seeded records keyed by entity
  -- name and id, is not read at all, and nor are rbac's rules, keyed by entity
  -- and operation names.
  it("a feature's name is read as a name", function()
    local client = construct({
      apikey = CANARY.apikey,
      feature = {
        secrets = { active = false, name = "ZZNAME-feat123", token = "ZZTOKEN-feat456" },
        rbac = { active = false, rules = { ["zztoken.load"] = "PLAINRULE-k7j5h3g1" } },
        test = { active = false, entity = { zztoken = { ZZTOKEN01 = { note = "PLAINRECORD-t5r3e1w9" } } } },
      },
      entity = { zztoken = { alias = { zzkey = "PLAINALIAS-m2n4b6v8" } } },
    })
    local clean = client:get_utility().clean
    local ctx = client:get_root_ctx()
    assert.are.equal("ZZNAME-feat123 " .. MASK, clean(ctx, "ZZNAME-feat123 ZZTOKEN-feat456"))
    assert.are.equal("record PLAINRECORD-t5r3e1w9", clean(ctx, "record PLAINRECORD-t5r3e1w9"))
    assert.are.equal("alias PLAINALIAS-m2n4b6v8", clean(ctx, "alias PLAINALIAS-m2n4b6v8"))
    assert.are.equal("rule PLAINRULE-k7j5h3g1", clean(ctx, "rule PLAINRULE-k7j5h3g1"))
  end)


  it("the generated config's own clean block is honoured", function()
    local utility = construct({}):get_utility()
    local config = { options = { clean = { keys = "zzsens", values = "CONFIG-SEEDED-1" } } }
    local opts = utility.make_options({
      utility = utility,
      config = config,
      options = { clean = { values = "CALLER-SEEDED-2" } },
    })
    local ctx = { options = opts }
    assert.are.equal("a " .. MASK .. " b " .. MASK,
      utility.clean(ctx, "a CONFIG-SEEDED-1 b CALLER-SEEDED-2"))
    assert.are.same({ my_zzsens = MASK, other = "y" }, utility.clean(ctx, { my_zzsens = "x", other = "y" }))
    assert.are.same({ keys = "zzsens", values = "CONFIG-SEEDED-1" }, config.options.clean)
  end)
end)
`
}


export {
  TestClean
}
