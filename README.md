# Aareguru SDK

Real-time water temperature, weather, and flow data for the Aare River in Switzerland.

> Golang, Lua, PHP, Python, Ruby, TypeScript SDKs, a CLI, an interactive REPL, and an MCP server for AI agents — all generated from one OpenAPI spec by [Voxgig](https://voxgig.com/sdk).

## About Aare.guru API

[Aare.guru](https://aare.guru) is a community-run service that publishes
live measurements for the [Aare](https://en.wikipedia.org/wiki/Aare) —
Switzerland's longest river entirely within the country, and the river
many Bernese swim in on a summer afternoon. The API answers the
practical question *"how warm is the Aare today, and is it safe to
swim?"* and exposes the raw data behind it.

**What you get from the API**

- Current water **temperature** (°C, rounded and unrounded variants)
- **Flow** (m³/s) and a 1-5 **danger level** (`flow_gefahrenstufe`)
- River **height** (m above sea level)
- Air temperature, precipitation, sunshine and forecast **weather symbols**
- Plain-text descriptions (`text`, `temperature_text`) suitable for UIs
- Per-city queries for Bern, Olten, Thun, and other Aare locations

**Data sources** — BAFU (Swiss Federal Office of Environment) for national
Aare measurements, [TemperAare](https://temperaare.ch) for Olten, MeteoSchweiz
SwissMetNet for weather observations, and Meteotest for the forecast.

**Operational notes** — data updates every ~10 minutes (with 10-20 min
delay); polling every 5 minutes is plenty. Responses are cached for 2
minutes. CORS is wide-open (`*`) and JSONP is supported via a
`callback` query parameter. Per the maintainers, *"every value could
be null at any time — defensive programming always pays off."*

## Try it

**Golang**
```bash
go get github.com/voxgig-sdk/aareguru-sdk/go
```

**Lua**
```bash
luarocks install aareguru-sdk
```

**PHP**
```bash
composer require voxgig/aareguru-sdk
```

**Python**
```bash
pip install aareguru-sdk
```

**Ruby**
```bash
gem install aareguru-sdk
```

**TypeScript**
```bash
npm install aareguru
```

## 30-second quickstart

### TypeScript

```ts
import { AareguruSDK } from 'aareguru'

const client = new AareguruSDK()

// Load legacy data
const legacy = await client.Legacy().load({})
console.log(legacy.data)
```

See the [TypeScript README](ts/README.md) for the
full guide, or scroll down for the same example in other languages.

## What's in the box

| Surface | Use it for | Path |
| --- | --- | --- |
| **SDK** (Golang, Lua, PHP, Python, Ruby, TypeScript) | App integration | `go/` `lua/` `php/` `py/` `rb/` `ts/` |
| **CLI** | Scripts, CI, ops, one-off API calls | `go-cli/` |
| **MCP server** | AI agents (Claude, Cursor, Cline) | `go-mcp/` |

## Use it from an AI agent (MCP)

The generated MCP server exposes every operation in this SDK as an
[MCP](https://modelcontextprotocol.io) tool that Claude, Cursor or Cline
can call directly. Build and register it:

```bash
cd go-mcp && go build -o aareguru-mcp .
```

Then add it to your agent's MCP config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "aareguru": {
      "command": "/abs/path/to/aareguru-mcp"
    }
  }
}
```

## Entities

The API exposes 3 entities:

| Entity | Description | API path |
| --- | --- | --- |
| **Legacy** | Legacy single-location endpoints (`/current`, `/today`, `/currentV2`) — returns current Aare water and weather data without a city parameter. Kept for backwards compatibility; new code should prefer `v2018`. | `/current` |
| **Stuff** | Operational data: request logs (`/logs`), Slack feed (`/slack`), and raw upstream measurements (`/rawdata`). | `/logs` |
| **V2018** | The current data API. Per-city queries for current conditions, today's forecast, history, and the embeddable widget (`/v2018/current`, `/v2018/today`, `/v2018/history`, `/v2018/cities`, `/v2018/widget`). | `/v2018/history` |

Each entity supports the following operations where available: **load**,
**list**, **create**, **update**, and **remove**.

## Quickstart in other languages

### Golang

```go
import sdk "github.com/voxgig-sdk/aareguru-sdk/go"

client := sdk.New()

// Load legacy data
legacy, err := client.Legacy(nil).Load(map[string]any{}, nil)
fmt.Println(legacy)
```

### Lua

```lua
local sdk = require("aareguru_sdk")

local client = sdk.new()


-- Load a specific legacy
local legacy, err = client:Legacy():load({ id = "example_id" })
print(legacy)
```

### PHP

```php
<?php
require_once 'aareguru_sdk.php';

$client = new AareguruSDK();


// Load a specific legacy
[$legacy, $err] = $client->Legacy()->load(["id" => "example_id"]);
print_r($legacy);
```

### Python

```python
from aareguru_sdk import AareguruSDK

client = AareguruSDK()


# Load a specific legacy
legacy, err = client.Legacy().load({"id": "example_id"})
print(legacy)
```

### Ruby

```ruby
require_relative "Aareguru_sdk"

client = AareguruSDK.new


# Load a specific legacy
legacy, err = client.Legacy().load({ "id" => "example_id" })
puts legacy
```

## Unit testing in offline mode

Every SDK ships a test mode that swaps the HTTP transport for an
in-memory mock, so unit tests run offline.

### Golang

```go
client := sdk.Test()
result, err := client.Legacy(nil).Load(
    map[string]any{"id": "test01"}, nil,
)
```

### Lua

```lua
local client = sdk.test()
local result, err = client:Legacy():load({ id = "test01" })
```

### PHP

```php
$client = AareguruSDK::test();
[$result, $err] = $client->Legacy()->load(["id" => "test01"]);
```

### Python

```python
client = AareguruSDK.test()
result, err = client.Legacy().load({"id": "test01"})
```

### Ruby

```ruby
client = AareguruSDK.test
result, err = client.Legacy().load({ "id" => "test01" })
```

### TypeScript

```ts
const client = AareguruSDK.test()
const result = await client.Legacy().load({ id: 'test01' })
// result.ok === true, result.data contains mock data
```

## How it works

Every SDK call runs the same five-stage pipeline:

1. **Point** — resolve the API endpoint from the operation definition.
2. **Spec** — build the HTTP specification (URL, method, headers, body).
3. **Request** — send the HTTP request.
4. **Response** — receive and parse the response.
5. **Result** — extract the result data for the caller.

A feature hook fires at each stage (e.g. `PrePoint`, `PreSpec`,
`PreRequest`), so features can inspect or modify the pipeline without
forking the SDK.

### Features

| Feature | Purpose |
| --- | --- |
| **TestFeature** | In-memory mock transport for testing without a live server |

Pass custom features via the `extend` option at construction time.

### Direct and Prepare

For endpoints the entity model doesn't cover, use the low-level methods:

- **`direct(fetchargs)`** — build and send an HTTP request in one step.
- **`prepare(fetchargs)`** — build the request without sending it.

Both accept a map with `path`, `method`, `params`, `query`,
`headers`, and `body`. See the [How-to guides](#how-to-guides) below.

## How-to guides

### Make a direct API call

When the entity interface does not cover an endpoint, use `direct`:

**Go:**
```go
result, err := client.Direct(map[string]any{
    "path":   "/api/resource/{id}",
    "method": "GET",
    "params": map[string]any{"id": "example"},
})
```

**Lua:**
```lua
local result, err = client:direct({
  path = "/api/resource/{id}",
  method = "GET",
  params = { id = "example" },
})
```

**PHP:**
```php
[$result, $err] = $client->direct([
    "path" => "/api/resource/{id}",
    "method" => "GET",
    "params" => ["id" => "example"],
]);
```

**Python:**
```python
result, err = client.direct({
    "path": "/api/resource/{id}",
    "method": "GET",
    "params": {"id": "example"},
})
```

**Ruby:**
```ruby
result, err = client.direct({
  "path" => "/api/resource/{id}",
  "method" => "GET",
  "params" => { "id" => "example" },
})
```

**TypeScript:**
```ts
const result = await client.direct({
  path: '/api/resource/{id}',
  method: 'GET',
  params: { id: 'example' },
})
console.log(result.data)
```

## Per-language documentation

- [Golang](go/README.md)
- [Lua](lua/README.md)
- [PHP](php/README.md)
- [Python](py/README.md)
- [Ruby](rb/README.md)
- [TypeScript](ts/README.md)

## Using the Aare.guru API

- Upstream: [https://aare.guru](https://aare.guru)
- API docs: [https://aareguru.existenz.ch](https://aareguru.existenz.ch)
- Contact: [aaregurus@existenz.ch](mailto:aaregurus@existenz.ch)

**Free for non-commercial use.** If you build something with this API, please:

- email [aaregurus@existenz.ch](mailto:aaregurus@existenz.ch) to let them know
- link back to [https://aare.guru](https://aare.guru) and the Swiss Federal
  Office of Environment ([BAFU](https://www.bafu.admin.ch))
- credit the upstream data sources where you display the data

---

Generated by the [Voxgig SDK Generator](https://voxgig.com/sdk) from the
Aare.guru API OpenAPI spec. MIT-licensed — fork it, ship it, own it.

Browse 500+ more generated SDKs at [https://github.com/voxgig-sdk](https://github.com/voxgig-sdk).

Want this production-grade for your team? [Voxgig DX consulting](https://voxgig.com/consulting/developer-experience).
