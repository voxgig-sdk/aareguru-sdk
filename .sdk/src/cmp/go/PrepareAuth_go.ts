
import {
  Content,
  File,
  Folder,
  cmp,
  goModule,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
  resolveAuthPrefix,
} from '@voxgig/sdkgen'


import {
  KIT,
  getModelPath,
} from '@voxgig/apidef'


const PrepareAuth = cmp(async function PrepareAuth(props: any) {
  const { target } = props
  const { model } = props.ctx$

  // The generated source cannot use the `GOMODULE` / `github.com/voxgig/struct`
  // placeholders: those are rewritten by Main's `Copy({from:'tm/go'})`, and
  // this file never travels through that Copy. The real import paths go in
  // here, the same way EntityTypes_go resolves them.
  const gomodule = goModule(model, target.name)

  const active = isAuthActive_go(model)
  const where = resolveAuthIn(model)
  const name = resolveAuthName(model)
  const prefix = resolveAuthPrefix(model)
  const basic = isHttpBasicAuth(model)

  Folder({ name: 'utility' }, () => {
    File({ name: 'prepare_auth.' + target.ext }, () => {
      Content(render({ gomodule, active, where, name, prefix, basic }))
    })
  })
})


type AuthSpec = {
  gomodule: string
  active: boolean
  where: string
  name: string
  prefix: string
  basic: boolean
}


function render(spec: AuthSpec): string {

  if (!spec.active) {
    return `package utility

import (
	"${spec.gomodule}/core"
)

// This API declares no authentication, so there is no credential to place.
// The function stays in the pipeline because makeSpec calls it
// unconditionally.
func prepareAuthUtil(ctx *core.Context) (*core.Spec, error) {
	spec := ctx.Spec
	if spec == nil {
		return nil, ctx.MakeError("auth_no_spec",
			"Expected context spec property to be defined.")
	}

	return spec, nil
}
`
  }

  // HTTP Basic is header-only by definition: the scheme is
  // `Authorization: Basic base64(user:pass)`. It cannot be expressed as a
  // query parameter or a cookie, so the branch is emitted only where it can
  // mean something.
  const withBasic = spec.basic && 'header' === spec.where

  const head = `const credName = "${gostr(credLiteral(spec.where, spec.name))}"
${'cookie' === spec.where ? `const cookieHeader = "cookie"
` : ''}const optionApikey = "apikey"
${withBasic ? `const optionSecret = "secret"
` : ''}const notFound = "__NOTFOUND__"

// The client's auth.name option, when set, replaces the name the API declares.
func authName(options map[string]any) string {
	if name, ok := vs.GetPath(options, []any{"auth", "name"}).(string); ok && name != "" {
		return ${caseFold(spec.where, 'name')}
	}
	return credName
}

${cookieHelper(spec.where)}func prepareAuthUtil(ctx *core.Context) (*core.Spec, error) {
	spec := ctx.Spec
	if spec == nil {
		return nil, ctx.MakeError("auth_no_spec",
			"Expected context spec property to be defined.")
	}

	${bagName(spec.where)} := spec.${bagField(spec.where)}
	options := ctx.Client.OptionsMap()

	// Public APIs that need no auth omit the options.auth block entirely.
	if options["auth"] == nil {
		${clear(spec.where, 'credName')}
		return spec, nil
	}

	name := authName(options)

	// A credential left under the declared name would travel beside the renamed one.
	if name != credName {
		${clear(spec.where, 'credName')}
	}

	apikey := vs.GetProp(options, optionApikey, notFound)

	skip := false
	if apikey == nil {
		skip = true
	} else if apikeyStr, ok := apikey.(string); ok &&
		(apikeyStr == notFound || apikeyStr == "") {
		skip = true
	}
`

  const basicBlock = !withBasic ? '' : `
	// True HTTP Basic Auth joins the two credentials, base64-encoded - a single
	// token in the header (the branch below) can never authenticate against
	// an API that actually checks \`Authorization: Basic base64(user:pass)\`.
	// The password may be empty (RFC 7617): Lob, for one, documents the key as
	// the user with a blank password (\`curl -u key:\`).
	if basicAuth, _ := vs.GetPath(options, []any{"auth", "basic"}).(bool); basicAuth {
		secret := vs.GetProp(options, optionSecret, notFound)

		secretVal, _ := secret.(string)
		if secretVal == notFound {
			secretVal = ""
		}

		if skip {
			${clear(spec.where, 'name')}
		} else {
			apikeyVal, _ := apikey.(string)
			b64 := base64.StdEncoding.EncodeToString([]byte(apikeyVal + ":" + secretVal))
			// The joined, encoded pair is a wire form neither credential's own
			// registration covers.
			ctx.Utility.CleanAdd(ctx, b64)

			basicPrefix := ""
			if ap := vs.GetPath(options, []any{"auth", "prefix"}); ap != nil {
				basicPrefix, _ = ap.(string)
			}
			// Empty prefix (raw apiKey credential) must not add a leading space.
			if basicPrefix == "" {
				${bagName(spec.where)}[name] = b64
			} else {
				${bagName(spec.where)}[name] = basicPrefix + " " + b64
			}
		}

		return spec, nil
	}
`

  const body = head + basicBlock + `
	if skip {
		${clear(spec.where, 'name')}
	} else {
${place(spec.where, 'name')}
	}

	return spec, nil
}
`

  return `package utility

import (
${stdImports(body)}	vs "${spec.gomodule}/utility/struct"

	"${spec.gomodule}/core"
)

` + body
}


// Go rejects an unused import, and which of these the body calls varies by placement.
const STD_IMPORTS = ['encoding/base64', 'strings']

function stdImports(body: string): string {
  return STD_IMPORTS
    .filter((pkg) => new RegExp('\\b' + pkg.split('/').pop() + '\\.[A-Z]').test(body))
    .map((pkg) => `\t"${pkg}"\n\n`)
    .join('')
}


function credLiteral(where: string, name: string): string {
  return 'header' === where ? String(name).toLowerCase() : String(name)
}


// The bag the credential lands in, per placement. Cookies ride the header
// bag because a cookie IS a header.
function bagName(where: string): string {
  return 'query' === where ? 'query' : 'headers'
}


function bagField(where: string): string {
  return 'query' === where ? 'Query' : 'Headers'
}


// Header names travel lower-cased; query and cookie names are case-sensitive.
function caseFold(where: string, expr: string): string {
  return 'header' === where ? 'strings.ToLower(' + expr + ')' : expr
}


// A cookie has no header of its own: place() writes it into `cookie` as
// `name=value`, so clear() frees that pair, not a header of that name.
function clear(where: string, name: string): string {
  if ('cookie' === where) {
    return `cookieSet(headers, ${name}, nil)`
  }

  return `delete(${bagName(where)}, ${name})`
}


function cookieHelper(where: string): string {
  if ('cookie' !== where) {
    return ''
  }

  return `func cookieSet(headers map[string]any, name string, value any) {
	kept := []string{}

	if existing, ok := headers[cookieHeader].(string); ok && existing != "" {
		kept = cookieKeep(existing, map[string]bool{name: true})
	}

	if value != nil {
		valStr, _ := value.(string)
		kept = append(kept, name+"="+valStr)
	}

	if len(kept) == 0 {
		delete(headers, cookieHeader)
	} else {
		headers[cookieHeader] = strings.Join(kept, "; ")
	}
}

`
}


function place(where: string, name: string): string {
  if ('query' === where) {
    return `		apikeyVal := ""
		if av, ok := apikey.(string); ok {
			apikeyVal = av
		}
		query[${name}] = apikeyVal`
  }

  if ('cookie' === where) {
    return `		apikeyVal := ""
		if av, ok := apikey.(string); ok {
			apikeyVal = av
		}
		cookieSet(headers, ${name}, apikeyVal)`
  }

  return `		authPrefix := ""
		if ap := vs.GetPath(options, []any{"auth", "prefix"}); ap != nil {
			authPrefix, _ = ap.(string)
		}
		apikeyVal := ""
		if av, ok := apikey.(string); ok {
			apikeyVal = av
		}
		// Empty prefix (raw apiKey credential) must not add a leading space.
		if authPrefix == "" {
			headers[${name}] = apikeyVal
		} else {
			headers[${name}] = authPrefix + " " + apikeyVal
		}`
}


function gostr(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}


export {
  PrepareAuth
}


function isAuthActive_go(model: any): boolean {
  const auth = getModelPath(model, `main.${KIT}.config.auth`,
    { only_active: false, required: false })
  return !(null != auth && false === auth.active)
}
