
import * as Path from 'node:path'

import {
  cmp, each, deriveEntityNames, entityIdField, mcpTools, matchArg, dataArg, idLiteral,
  File, Content, Fragment, Slot, goModule, goVersion, packageVersion, MCP_WRITE_OPS
} from '@voxgig/sdkgen'

import type { McpTool } from '@voxgig/sdkgen'

import type {
  ModelEntity,
} from '@voxgig/apidef'

import {
  KIT,
  getModelPath,
} from '@voxgig/apidef'


const MCP_GO_SDK_VERSION = 'v1.6.0'

// go.sum entries for MCP_GO_SDK_VERSION and its transitive deps. The sibling
// SDK dep needs no entry (path replace). Deterministic because the version
// is pinned above — regenerate with `go mod tidy` and update BOTH constants
// together when bumping MCP_GO_SDK_VERSION.
const MCP_GO_SDK_GOSUM = `github.com/golang-jwt/jwt/v5 v5.3.1 h1:kYf81DTWFe7t+1VvL7eS+jKFVWaUnK9cB1qbwn63YCY=
github.com/golang-jwt/jwt/v5 v5.3.1/go.mod h1:fxCRLWMO43lRc8nhHWY6LGqRcf+1gQWArsqaEUEa5bE=
github.com/google/go-cmp v0.7.0 h1:wk8382ETsv4JYUZwIsn6YpYiWiBsYLSJiTsyBybVuN8=
github.com/google/go-cmp v0.7.0/go.mod h1:pXiqmnSA92OHEEa9HXL2W4E7lf9JzCmGVUdgjX3N/iU=
github.com/google/jsonschema-go v0.4.3 h1:/DBOLZTfDow7pe2GmaJNhltueGTtDKICi8V8p+DQPd0=
github.com/google/jsonschema-go v0.4.3/go.mod h1:r5quNTdLOYEz95Ru18zA0ydNbBuYoo9tgaYcxEYhJVE=
github.com/modelcontextprotocol/go-sdk v1.6.0 h1:PPLS3kn7WtOEnR+Af4X5H96SG0qSab8R/ZQT/HkhPkY=
github.com/modelcontextprotocol/go-sdk v1.6.0/go.mod h1:kzm3kzFL1/+AziGOE0nUs3gvPoNxMCvkxokMkuFapXQ=
github.com/segmentio/asm v1.1.3 h1:WM03sfUOENvvKexOLp+pCqgb/WDjsi7EK8gIsICtzhc=
github.com/segmentio/asm v1.1.3/go.mod h1:Ld3L4ZXGNcSLRg4JBsZ3//1+f/TjYl0Mzen/DQy1EJg=
github.com/segmentio/encoding v0.5.4 h1:OW1VRern8Nw6ITAtwSZ7Idrl3MXCFwXHPgqESYfvNt0=
github.com/segmentio/encoding v0.5.4/go.mod h1:HS1ZKa3kSN32ZHVZ7ZLPLXWvOVIiZtyJnO1gPH1sKt0=
github.com/yosida95/uritemplate/v3 v3.0.2 h1:Ed3Oyj9yrmi9087+NczuL5BwkIc4wvTb5zIM+UJPGz4=
github.com/yosida95/uritemplate/v3 v3.0.2/go.mod h1:ILOh0sOhIJR3+L/8afwt/kE++YT040gmv5BQTMR2HP4=
golang.org/x/oauth2 v0.35.0 h1:Mv2mzuHuZuY2+bkyWXIHMfhNdJAdwW3FuWeCPYN5GVQ=
golang.org/x/oauth2 v0.35.0/go.mod h1:lzm5WQJQwKZ3nwavOZ3IS5Aulzxi68dUSgRHujetwEA=
golang.org/x/sys v0.41.0 h1:Ivj+2Cp/ylzLiEU89QhWblYnOE9zerudt9Ftecq2C6k=
golang.org/x/sys v0.41.0/go.mod h1:OgkHotnGiDImocRcuBABYBEXf8A9a87e/uXjp9XT3ks=
golang.org/x/tools v0.42.0 h1:uNgphsn75Tdz5Ji2q36v/nsFSfR/9BRFvqhGBaJGd5k=
golang.org/x/tools v0.42.0/go.mod h1:Ma6lCIwGZvHK6XtgbswSoWroEkhugApmsXyrUmBhfr0=
`


// What each tool takes and says. `field` is the argument the operation reads.
const TOOL_SPEC: Record<string, {
  type: string, field: string, key: string, optional: boolean, help: string,
  summary: string, verb: string, returns: string, annotations: string,
}> = {
  list: {
    type: 'ListArgs', field: 'Query', key: 'query', optional: true,
    help: 'optional filter map; omit it for the first page',
    summary: 'first page of records', verb: 'List records from',
    returns: 'the first page of records', annotations: 'ReadOnlyHint: true',
  },
  load: {
    type: 'LoadArgs', field: 'Query', key: 'query', optional: false,
    help: 'match map naming the record, such as {"id":1}',
    summary: 'one record', verb: 'Load one record from',
    returns: 'the record', annotations: 'ReadOnlyHint: true',
  },
  create: {
    type: 'CreateArgs', field: 'Data', key: 'data', optional: false,
    help: "the new record's fields",
    summary: 'a new record', verb: 'Create a record in',
    returns: 'the created record', annotations: 'DestructiveHint: hint(false)',
  },
  update: {
    type: 'UpdateArgs', field: 'Data', key: 'data', optional: false,
    help: "the record's id and the fields to change",
    summary: "change a record's fields", verb: 'Update a record in',
    returns: 'the updated record', annotations: 'DestructiveHint: hint(true)',
  },
  patch: {
    type: 'PatchArgs', field: 'Data', key: 'data', optional: false,
    help: "the record's id and only the fields to change",
    summary: "change some of a record's fields", verb: 'Patch a record in',
    returns: 'the patched record', annotations: 'DestructiveHint: hint(true)',
  },
  remove: {
    type: 'RemoveArgs', field: 'Query', key: 'query', optional: false,
    help: 'match map naming the record, such as {"id":1}',
    summary: 'delete a record', verb: 'Remove a record from',
    returns: 'the removed record', annotations: 'DestructiveHint: hint(true)',
  },
}


function entityNames(tool: McpTool): string[] {
  return tool.entities.map((ent: any) => String(ent.name).toLowerCase())
}


// The arguments an agent sends to the tool, for its first entity. A list
// sends a query only for a route parameter it must fill.
function toolExample(tool: McpTool): string {
  const ent: any = tool.entities[0]
  const name = String(ent.name).toLowerCase()
  const spec = TOOL_SPEC[tool.op]
  const idF = entityIdField(ent)
  const arg = 'Data' === spec.field ? dataArg('json', ent, tool.op, idF) :
    matchArg('json', ent, tool.op, idF, idLiteral(ent, tool.op, idF))
  return 'list' === tool.op && '{}' === arg ? `{ "entity": "${name}" }` :
    `{ "entity": "${name}", "${spec.key}": ${arg} }`
}


function phrase(items: string[]): string {
  return items.length < 2 ? items.join('') :
    items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}


// A Go struct tag value carries its quotes escaped.
function tagText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}


const Main = cmp(function Main(props: any) {
  const { target } = props
  const { model } = props.ctx$

  const sdkModule = goModule(model, 'go')
  const mcpModule = goModule(model, target.name)

  const entityMap: any = getModelPath(model, `main.${KIT}.entity`)
  deriveEntityNames(entityMap)
  const entityCount = Object.keys(entityMap).length

  // The slug prefixes every tool name, so an MCP host with several SDK
  // servers installed sees unambiguous tool ids.
  const slugLower = model.name.toLowerCase()
  const tools = mcpTools(model, target.name)
  const write = true === target.tool?.write

  const FRAGMENT = Path.normalize(__dirname + '/../../../src/cmp/go-mcp/fragment')

  File({ name: '.gitignore' }, () => Content(`/dist/
/${model.name}-mcp
/go-mcp
`))

  const bin = `${model.name}-mcp`
  const toolNames = phrase(tools.map((tool) => '`' + tool.name + '`'))
  const toolNoun = 1 === tools.length ? 'tool' : 'tools'
  const first = tools[0]

  const projUpper = String(model.name).toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const apiKeyEnv = projUpper + '_APIKEY'
  const baseEnv = projUpper + '_BASE'

  const toggle = `\`main: kit: target: '${target.name}': tool: write: true\``
  const writeOps = tools.map((tool) => tool.op).filter((op) => MCP_WRITE_OPS.includes(op))
  const writeNames = phrase(writeOps)
  const writeText = 0 < writeOps.length ?
    `${writeNames.charAt(0).toUpperCase() + writeNames.slice(1)} ${1 < writeOps.length ? 'are' : 'is'} on, as the SDK's model sets
${toggle}. Each tool carries the MCP hints an agent host reads before calling
it, listed in the reference below.` : write ?
      `The server only reads: the SDK's model sets ${toggle}, but no entity
has a create, update, patch or remove a plain call runs.` :
      `The server only reads. Create, update, patch and remove become tools too when the
SDK's own model sets ${toggle}; they are off by default, as an agent calling
them changes the API's data.`

  const exampleCalls = tools.map((tool) =>
    `// ${tool.name}: ${TOOL_SPEC[tool.op].summary}\n${toolExample(tool)}`).join('\n\n')

  const howtoCalls = tools.map((tool) => {
    const spec = TOOL_SPEC[tool.op]
    return `### Call the \`${tool.name}\` tool

Args: \`entity\` (required), \`${spec.key}\` (${spec.optional ? 'optional' : 'required'}: ${spec.help}).
Returns ${spec.returns} as JSON:

\`\`\`jsonc
${toolExample(tool)}
\`\`\`
`
  }).join('\n')

  const toolRows = tools.map((tool) => {
    const spec = TOOL_SPEC[tool.op]
    const hints = 'ReadOnlyHint: true' === spec.annotations ? 'read-only' :
      'DestructiveHint: hint(false)' === spec.annotations ? 'additive' : 'destructive'
    return `| \`${tool.name}\` | \`entity\`, \`${spec.key}\` (${spec.optional ? 'optional' : 'required'} map) | ${spec.returns.charAt(0).toUpperCase() + spec.returns.slice(1)} as JSON | ${hints} |`
  }).join('\n')

  const entityRows = tools.map((tool) =>
    `| \`${tool.name}\` | ${entityNames(tool).join(', ')} |`).join('\n')

  // A server with no tool has nothing to call, list or look up.
  const callText = null == first ? '' : `Tool-call arguments (what an agent sends):

\`\`\`jsonc
${exampleCalls}
\`\`\`

`

  const restart = null == first ?
    `4. **Restart Claude Code.** The server registers no tools for this SDK, so
   none appear.` :
    `4. **Restart Claude Code.** The ${toolNames} ${toolNoun} now appear in new
   sessions. Ask the agent to *"${first.op} ${entityNames(first)[0]} using ${slugLower}"*
   and it calls \`${first.name}\` with \`${toolExample(first).replace(/ /g, '')}\`.`

  const toolRef = null == first ? `The server registers no tools for this SDK.

` : `### Tools

| Tool | Args | Returns | MCP hints |
|------|------|---------|-----------|
${toolRows}

On error, a tool returns an MCP error result (\`isError: true\`) whose text is the
failure message (e.g. unknown entity, or an API error).

### Entities

Each tool takes as its \`entity\` argument one of the entities that has its
operation, of the ${entityCount} the SDK has:

| Tool | Entities |
|------|----------|
${entityRows}

JSON schemas are emitted by the SDK from each tool's argument struct's
\`json\` / \`jsonschema\` tags — no schema is hand-written. Each tool's
\`entity\` is an \`enum\` of the entities in its row, so the server refuses
any other before it runs a call.

`

  const smoke = null == first ? '' : `
### Smoke test via HTTP (raw JSON-RPC)

\`\`\`sh
./${bin} -transport http -addr :18080 &

# initialize, grab the session id
curl -sN -X POST http://localhost:18080 \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -D headers \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}'

SESSION=$(awk '/Mcp-Session-Id/ {print $2}' headers | tr -d '\\r')

curl -sN -X POST http://localhost:18080 \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -H "Mcp-Session-Id: $SESSION" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"${first.name}","arguments":${JSON.stringify(JSON.parse(toolExample(first)))}}}'
\`\`\`
`

  File({ name: 'README.md' }, () => Content(`# ${model.name}-mcp

[MCP](https://modelcontextprotocol.io) server exposing the ${model.Name} SDK as
${0 === tools.length ? 'no agent tools, as no entity has an operation a plain call runs,' :
  tools.length + ' agent ' + toolNoun + ', ' + toolNames + ','} built on the
[official Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk) and the
sibling Go SDK at \`../go\`. Runs over **stdio** (default, for spawnable installs)
or **streamable HTTP** (one shared server for several agents).

${writeText}

## Examples

\`\`\`sh
# 1. Build a native binary (-> dist/<os>-<arch>/${bin})
make build

# 2. Provide credentials via the environment
export ${apiKeyEnv}=sk_live_xxx

# 3a. Install into Claude Code over stdio (most common)
claude mcp add --scope user ${slugLower} \\
  -- /absolute/path/to/${bin} -transport stdio

# 3b. …or run a shared HTTP server instead
./${bin} -transport http -addr :8080
\`\`\`

${callText}> The rest of this guide follows the [Diátaxis](https://diataxis.fr) framework:
> a hands-on **Tutorial**, task-focused **How-to guides**, a factual
> **Reference**, and background **Explanation**.

## Tutorial: install and call a tool

1. **Build** the server from this \`go-mcp/\` directory:

   \`\`\`sh
   make build          # -> dist/<os>-<arch>/${bin}
   \`\`\`

2. **Set your API key:**

   \`\`\`sh
   export ${apiKeyEnv}=sk_live_xxx
   \`\`\`

3. **Install it into Claude Code** (stdio transport):

   \`\`\`sh
   claude mcp add --scope user ${slugLower} \\
     -- "$PWD"/dist/*/${bin} -transport stdio
   \`\`\`

${restart}

## How-to guides

### Authenticate and choose an environment

Configuration is read from the environment — nothing is written to disk:

\`\`\`sh
export ${apiKeyEnv}=sk_live_xxx            # API key
export ${baseEnv}=https://api.example.com  # optional: override the API base URL
\`\`\`

Set these in the shell that launches the server (or in the \`claude mcp add\`
environment) so every tool call is authenticated.

### Run as a shared HTTP server

\`\`\`sh
./${bin} -transport http -addr :8080
\`\`\`

Streamable HTTP lets several agents share one running process; stdio (the
default) spawns a fresh process per client.

${howtoCalls}
### ${write ? 'Turn the write tools off' : 'Turn on the write tools'}

In the SDK's own model (\`.sdk/model/sdk.aontu\`), then regenerate:

\`\`\`
main: kit: target: '${target.name}': tool: write: ${write ? 'false' : 'true'}
\`\`\`

### Cross-compile release binaries

\`\`\`sh
make build       # native binary for this machine
make build-all   # linux/darwin/windows x amd64/arm64, under dist/<os>-<arch>/
\`\`\`

## Reference

${toolRef}### Transports & flags

| Flag | Default | Purpose |
|------|---------|---------|
| \`-transport\` | \`stdio\` | \`stdio\` (spawnable) or \`http\` (streamable HTTP). |
| \`-addr\` | \`:8080\` | Listen address for the \`http\` transport. |

### Environment variables

| Variable | Purpose |
|----------|---------|
| \`${apiKeyEnv}\` | API key sent with every request. |
| \`${baseEnv}\` | Optional override of the API base URL. |
${smoke}
## Explanation

### How tools map to the SDK

\`main.go\` builds the SDK client (configured from the environment) and registers
one tool per operation the SDK's entities have. Each dispatches on the
\`entity\` argument to the matching entity in the sibling Go SDK at \`../go\`,
calls its operation, unwraps the \`Entity\` wrappers to plain data, and returns
it as pretty-printed JSON.

### Why two transports

**stdio** is the standard for agent hosts that spawn a server per client
(Claude Code's \`claude mcp add\`). **streamable HTTP** keeps one process running
that many agents can share — handy for a long-lived deployment.

### Schema generation

The input schema is derived from each tool's argument struct's \`json\` /
\`jsonschema\` tags at registration time, so the advertised tool schema can
never drift from the code that consumes it. The \`entity\` enum comes from the
same list the tool is registered for.

## Generated by

sdkgen \`go-mcp\` target. See the target source under \`.sdk/src/cmp/go-mcp/\` in
this repo, or upstream at
\`github.com/voxgig/sdkgen/project/.sdk/src/cmp/go-mcp/\`.
`))

  File({ name: 'go.mod' }, () => Content(`module ${mcpModule}

go ${goVersion(model, target.name, '1.25.0')}

require ${sdkModule} v0.0.0
require github.com/modelcontextprotocol/go-sdk ${MCP_GO_SDK_VERSION}

require github.com/google/jsonschema-go v0.4.3

require (
	github.com/segmentio/asm v1.1.3 // indirect
	github.com/segmentio/encoding v0.5.4 // indirect
	github.com/yosida95/uritemplate/v3 v3.0.2 // indirect
	golang.org/x/oauth2 v0.35.0 // indirect
	golang.org/x/sys v0.41.0 // indirect
)

replace ${sdkModule} => ../go
`))

  File({ name: 'go.sum' }, () => Content(MCP_GO_SDK_GOSUM))

  File({ name: 'Makefile' }, () => Content(`# ${model.name}-mcp build. GENERATED by @voxgig/sdkgen go-mcp target.
BINARY := ${model.name}-mcp
DIST := dist
GOOS := $(shell go env GOOS)
GOARCH := $(shell go env GOARCH)
EXT := $(if $(filter windows,$(GOOS)),.exe,)

.PHONY: build build-all clean

# Native build for the current machine -> dist/<os>-<arch>/${model.name}-mcp.
build:
\tgo build -o $(DIST)/$(GOOS)-$(GOARCH)/$(BINARY)$(EXT) .

# Cross-compiled release binaries: three desktop OSes x amd64/arm64, each named
# ${model.name}-mcp (+ .exe on windows) inside its own dist/<os>-<arch>/ folder.
build-all: clean
\tGOOS=linux   GOARCH=amd64 go build -o $(DIST)/linux-amd64/$(BINARY) .
\tGOOS=linux   GOARCH=arm64 go build -o $(DIST)/linux-arm64/$(BINARY) .
\tGOOS=darwin  GOARCH=amd64 go build -o $(DIST)/darwin-amd64/$(BINARY) .
\tGOOS=darwin  GOARCH=arm64 go build -o $(DIST)/darwin-arm64/$(BINARY) .
\tGOOS=windows GOARCH=amd64 go build -o $(DIST)/windows-amd64/$(BINARY).exe .
\tGOOS=windows GOARCH=arm64 go build -o $(DIST)/windows-arm64/$(BINARY).exe .

clean:
\trm -rf $(DIST) $(BINARY) go-mcp
`))

  File({ name: 'main.go' }, () => {
    Fragment(
      {
        from: Path.join(FRAGMENT, 'main.fragment.go'),
        replace: {
          ...props.ctx$.stdrep,
          GOMODULE: sdkModule,
          APIKEYENVVAR: String(model.name).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_APIKEY',
          BASEENVVAR: String(model.name).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_BASE',
        },
      },
      () => {
        Slot({ name: 'serverName' }, () => Content(slugLower))
        // The version the deploy tags this port with.
        Slot({ name: 'serverVersion' }, () => Content(packageVersion(model, target.name)))
      },
    )
  })

  File({ name: 'tools.go' }, () => {
    Fragment(
      {
        from: Path.join(FRAGMENT, 'tools.fragment.go'),
        replace: {
          ...props.ctx$.stdrep,
          GOMODULE: sdkModule,
        },
      },
      () => {
        Slot({ name: 'toolArgs' }, () => Content(tools.map((tool) => {
          const spec = TOOL_SPEC[tool.op]
          const json = spec.key + (spec.optional ? ',omitempty' : '')
          return `// ${spec.type} is what an agent sends to ${tool.name}.
type ${spec.type} struct {
	Entity string         \`json:"entity" jsonschema:"${tagText('one of: ' + entityNames(tool).join(' | '))}"\`
	${spec.field.padEnd(6)} map[string]any \`json:"${json}" jsonschema:"${tagText(spec.help)}"\`
}`
        }).join('\n\n')))
        Slot({ name: 'toolRegistrations' }, () => Content(tools.map((tool) => {
          const spec = TOOL_SPEC[tool.op]
          return `	mcp.AddTool(server, &mcp.Tool{
		Name:        ${JSON.stringify(tool.name)},
		Description: ${JSON.stringify(spec.verb + ' ' + model.Name + '. Args: entity, ' + spec.key + ' (' + spec.help + '). Returns ' + spec.returns + ' as JSON.')},
		Annotations: &mcp.ToolAnnotations{${spec.annotations}},
		InputSchema: entitySchema[${spec.type}](${entityNames(tool).map((name) => JSON.stringify(name)).join(', ')}),
	}, func(ctx context.Context, req *mcp.CallToolRequest, args ${spec.type}) (*mcp.CallToolResult, any, error) {
		return runOp(ctx, client, ${JSON.stringify(tool.op)}, args.Entity, args.${spec.field})
	})`
        }).join('\n')))
        Slot({ name: 'entityCases' }, () => {
          const cases: string[] = []
          each(entityMap, (entity: ModelEntity) => {
            cases.push(`\tcase "${entity.name.toLowerCase()}":
\t\treturn client.${(entity as any).Name}(nil), nil`)
          })
          Content(cases.join('\n'))
        })
      },
    )
  })
})


export {
  Main
}
