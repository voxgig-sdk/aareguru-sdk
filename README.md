# Aareguru SDK



Available for [Golang](go/) and [Lua](lua/) and [PHP](php/) and [Python](py/) and [Ruby](rb/) and [TypeScript](ts/).


## Architecture

### Entity-operation model

Every SDK call follows the same pipeline:

1. **Point** — resolve the API endpoint from the operation definition.
2. **Spec** — build the HTTP specification (URL, method, headers, body).
3. **Request** — send the HTTP request.
4. **Response** — receive and parse the response.
5. **Result** — extract the result data for the caller.

At each stage a feature hook fires (e.g. `PrePoint`, `PreSpec`,
`PreRequest`), allowing features to inspect or modify the pipeline.

### Features

Features are hook-based middleware that extend SDK behaviour.

| Feature | Purpose |
| --- | --- |
| **TestFeature** | In-memory mock transport for testing without a live server |

You can add custom features by passing them in the `extend` option at
construction time.

### Direct and Prepare

For endpoints not covered by the entity model, use the low-level methods:

- **`direct(fetchargs)`** — build and send an HTTP request in one step.
- **`prepare(fetchargs)`** — build the request without sending it.

Both accept a map with `path`, `method`, `params`, `query`, `headers`,
and `body`.


## Quick start

### Golang

```go
import sdk "voxgigaaregurusdk"

client := sdk.NewAareguruSDK(map[string]any{
    "apikey": os.Getenv("AAREGURU_APIKEY"),
})

```

### Lua

```lua
local sdk = require("aareguru_sdk")

local client = sdk.new({
  apikey = os.getenv("AAREGURU_APIKEY"),
})

```

### PHP

```php
<?php
require_once 'aareguru_sdk.php';

$client = new AareguruSDK([
    "apikey" => getenv("AAREGURU_APIKEY"),
]);

```

### Python

```python
import os
from aareguru_sdk import AareguruSDK

client = AareguruSDK({
    "apikey": os.environ.get("AAREGURU_APIKEY"),
})

```

### Ruby

```ruby
require_relative "Aareguru_sdk"

client = AareguruSDK.new({
  "apikey" => ENV["AAREGURU_APIKEY"],
})

```

### TypeScript

```ts
import { AareguruSDK } from 'aareguru'

const client = new AareguruSDK({
  apikey: process.env.AAREGURU_APIKEY,
})

```


## Testing

Both SDKs provide a test mode that replaces the HTTP transport with an
in-memory mock, so tests run without a network connection.

### Golang

```go
client := sdk.TestSDK(nil, nil)
```

### Lua

```lua
local client = sdk.test(nil, nil)
```

### PHP

```php
$client = AareguruSDK::test(null, null);
```

### Python

```python
client = AareguruSDK.test(None, None)
```

### Ruby

```ruby
client = AareguruSDK.test(nil, nil)
```

### TypeScript

```ts
const client = AareguruSDK.test()
```


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


## Language-specific documentation

- [Golang SDK](go/README.md)
- [Lua SDK](lua/README.md)
- [PHP SDK](php/README.md)
- [Python SDK](py/README.md)
- [Ruby SDK](rb/README.md)
- [TypeScript SDK](ts/README.md)

