
import {
  Content,
  File,
  Folder,
  cmp,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
  resolveAuthPrefix,
} from '@voxgig/sdkgen'


const PrepareAuth = cmp(async function PrepareAuth(props: any) {
  const { target } = props
  const { model } = props.ctx$

  const active = !isAuthSuppressed(model)
  const where = resolveAuthIn(model)
  const prefix = resolveAuthPrefix(model)
  const basic = isHttpBasicAuth(model)

  const cred = resolveAuthName(model)
  const name = 'header' === where ? cred.toLowerCase() : cred

  Folder({ name: 'utility' }, () => {
    File({ name: 'prepare_auth.' + target.ext }, () => {
      Content(render({
        project: model.const.Name,
        active,
        where,
        name,
        prefix,
        basic,
      }))
    })
  })
})


function render(spec: {
  project: string, active: boolean, where: string,
  name: string, prefix: string, basic: boolean
}): string {
  const head = `-- ${spec.project} SDK utility: prepare_auth\n`

  if (!spec.active) {
    return head + `
-- This API declares no authentication, so there is no credential to place.
-- The function stays in the pipeline because make_spec calls it
-- unconditionally.
local function prepare_auth_util(ctx)
  local spec = ctx.spec
  if spec == nil then
    return nil, ctx:make_error("auth_no_spec",
      "Expected context spec property to be defined.")
  end

  return spec, nil
end

return prepare_auth_util
`
  }

  const where = spec.where

  // HTTP Basic is header-only by definition: the scheme is
  // "Authorization: Basic base64(user:pass)". It cannot be expressed as a
  // query parameter or a cookie, so the branch is emitted only where it
  // can mean something.
  const basic = spec.basic && 'header' === where

  const CRED = credConst(where)

  const consts =
    `local ${CRED} = "${luastr(spec.name)}"\n` +
    ('cookie' === where ? `local HEADER_COOKIE = "cookie"\n` : '') +
    `local OPTION_APIKEY = "apikey"\n` +
    (basic ? `local OPTION_SECRET = "secret"\n` : '') +
    `local NOT_FOUND = "__NOTFOUND__"\n`

  return head + `
local vs = require("utility.struct.struct")
` + ('cookie' === where ? `local helpers = require("core.helpers")
` : '') + `
` + consts + `

-- The client's auth.name option, when set, replaces the name the API declares.
local function auth_name(options)
  local name = vs.getpath(options, "auth.name")
  if type(name) == "string" and name ~= "" then${'header' === where ? `
    -- ASCII rules, as a field name is ASCII: lower-casing in the string library follows the C locale.` : ''}
    return ${'header' === where ? FOLD : 'name'}
  end
  return ${CRED}
end
` + (basic ? BASE64 : '') + ('cookie' === where ? COOKIE_SET : '') + `
local function prepare_auth_util(ctx)
  local spec = ctx.spec
  if spec == nil then
    return nil, ctx:make_error("auth_no_spec",
      "Expected context spec property to be defined.")
  end

${bag(where)}  local options = ctx.client:options_map()

  -- Public APIs that need no auth omit the options.auth block entirely.
  if options.auth == nil then
${clear(where, CRED, 4)}
    return spec, nil
  end

  local name = auth_name(options)

  -- A credential left under the declared name would travel beside the renamed one.
  if name ~= ${CRED} then
${clear(where, CRED, 4)}
  end

  local apikey = vs.getprop(options, OPTION_APIKEY, NOT_FOUND)
` + (basic ? BASIC : '') + `
  if apikey == nil
    or (type(apikey) == "string" and (apikey == NOT_FOUND or apikey == ""))
  then
${clear(where, 'name', 4)}
  else
${place(where)}
  end

  return spec, nil
end

return prepare_auth_util
`
}


const FOLD = '(string.gsub(name, "[A-Z]", function(c) return string.char(c:byte() + 32) end))'


function credConst(where: string): string {
  return 'query' === where ? 'QUERY_AUTH' :
    'cookie' === where ? 'COOKIE_AUTH' : 'HEADER_AUTH'
}


// The bag the credential lands in, per placement. A cookie rides the
// header bag, because a cookie IS a header.
function bag(where: string): string {
  return 'query' === where ?
    '  local query = spec.query\n' :
    '  local headers = spec.headers\n'
}


// A cookie has no header of its own: place() writes it into `cookie` as
// `name=value`, so clear() frees that pair, not a header of that name.
function clear(where: string, name: string, indent: number): string {
  const pad = ' '.repeat(indent)

  if ('query' === where) {
    return pad + `query[${name}] = nil`
  }

  if ('cookie' === where) {
    return pad + `cookie_set(headers, ${name}, nil)`
  }

  return pad + `headers[${name}] = nil`
}


function place(where: string): string {
  if ('query' === where) {
    return `    -- NO PREFIX IN A QUERY STRING: "?token=Bearer%20abc" is not a thing
    -- any API reads, so the auth.prefix a header placement space-joins is
    -- dropped here deliberately rather than concatenated.
    local apikey_val = ""
    if type(apikey) == "string" then
      apikey_val = apikey
    end
    query[name] = apikey_val`
  }

  if ('cookie' === where) {
    return `    local apikey_val = ""
    if type(apikey) == "string" then
      apikey_val = apikey
    end
    -- The prefix is a header-value convention and has no meaning in a
    -- cookie pair, so it is dropped the way a query placement drops it.
    cookie_set(headers, name, apikey_val)`
  }

  return `    local auth_prefix = ""
    local ap = vs.getpath(options, "auth.prefix")
    if type(ap) == "string" then
      auth_prefix = ap
    end
    local apikey_val = ""
    if type(apikey) == "string" then
      apikey_val = apikey
    end
    -- Empty prefix (raw apiKey credential) must not add a leading space.
    if auth_prefix == "" then
      headers[name] = apikey_val
    else
      headers[name] = auth_prefix .. " " .. apikey_val
    end`
}


const BASIC = `
  -- True HTTP Basic Auth joins the two credentials, base64-encoded - a single
  -- token in the header (the branch below) can never authenticate against
  -- an API that actually checks "Authorization: Basic base64(user:pass)".
  -- The password may be empty (RFC 7617): Lob, for one, documents the key as
  -- the user with a blank password ("curl -u key:").
  if vs.getpath(options, "auth.basic") == true then
    local secret = vs.getprop(options, OPTION_SECRET, NOT_FOUND)
    if secret == nil or secret == NOT_FOUND then
      secret = ""
    end

    if apikey == nil
      or (type(apikey) == "string" and (apikey == NOT_FOUND or apikey == ""))
    then
      headers[name] = nil
    else
      local auth_prefix = ""
      local ap = vs.getpath(options, "auth.prefix")
      if type(ap) == "string" then
        auth_prefix = ap
      end
      local joined = base64(tostring(apikey) .. ":" .. tostring(secret))
      -- The joined, encoded pair is a wire form neither credential's own
      -- registration covers.
      ctx.utility.clean_add(ctx, joined)
      if auth_prefix == "" then
        headers[name] = joined
      else
        headers[name] = auth_prefix .. " " .. joined
      end
    end

    return spec, nil
  end
`


// Lua 5.4 has no base64, and the vendored sekreto encoder lives inside the
// OPTIONAL secrets feature - an SDK that never asked for secrets does not
// ship it - so an HTTP Basic SDK carries its own. Emitted only in that
// branch, so nothing else pays for it.
const BASE64 = `
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

    -- One trailing source byte yields two characters and "==", two yield
    -- three and "=".
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

`


const COOKIE_SET = `
local function cookie_set(headers, name, value)
  local kept = {}
  local existing = headers[HEADER_COOKIE]

  if type(existing) == "string" then
    kept = helpers.cookie_keep(existing, { [name] = true })
  end

  if value ~= nil then
    kept[#kept + 1] = name .. "=" .. value
  end

  if #kept == 0 then
    headers[HEADER_COOKIE] = nil
  else
    headers[HEADER_COOKIE] = table.concat(kept, "; ")
  end
end

`


function luastr(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}


export {
  PrepareAuth
}
