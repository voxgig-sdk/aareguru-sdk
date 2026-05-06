package sdktest

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	sdk "voxgigaaregurusdk"
	"voxgigaaregurusdk/core"
)

func TestLegacyDirect(t *testing.T) {
	t.Run("direct-load-legacy", func(t *testing.T) {
		setup := legacyDirectSetup(map[string]any{"id": "direct01"})
		client := setup.client


		result, err := client.Direct(map[string]any{
			"path":   "current",
			"method": "GET",
			"params": map[string]any{},
		})
		if err != nil {
			t.Fatalf("direct failed: %v", err)
		}

		if result["ok"] != true {
			t.Fatalf("expected ok to be true, got %v", result["ok"])
		}
		if core.ToInt(result["status"]) != 200 {
			t.Fatalf("expected status 200, got %v", result["status"])
		}
		if result["data"] == nil {
			t.Fatal("expected data to be non-nil")
		}

		if !setup.live {
			if dataMap, ok := result["data"].(map[string]any); ok {
				if dataMap["id"] != "direct01" {
					t.Fatalf("expected data.id to be direct01, got %v", dataMap["id"])
				}
			}

			if len(*setup.calls) != 1 {
				t.Fatalf("expected 1 call, got %d", len(*setup.calls))
			}
			call := (*setup.calls)[0]
			if initMap, ok := call["init"].(map[string]any); ok {
				if initMap["method"] != "GET" {
					t.Fatalf("expected method GET, got %v", initMap["method"])
				}
			}
			if _, ok := call["url"].(string); ok {
			}
		}
	})

}

type legacyDirectSetupResult struct {
	client *sdk.AareguruSDK
	calls  *[]map[string]any
	live   bool
	idmap  map[string]any
}

func legacyDirectSetup(mockres any) *legacyDirectSetupResult {
	loadEnvLocal()

	calls := &[]map[string]any{}

	env := envOverride(map[string]any{
		"AAREGURU_TEST_LEGACY_ENTID": map[string]any{},
		"AAREGURU_TEST_LIVE":    "FALSE",
		"AAREGURU_APIKEY":       "NONE",
	})

	live := env["AAREGURU_TEST_LIVE"] == "TRUE"

	if live {
		mergedOpts := map[string]any{
			"apikey": env["AAREGURU_APIKEY"],
		}
		client := sdk.NewAareguruSDK(mergedOpts)

		idmap := map[string]any{}
		if entidRaw, ok := env["AAREGURU_TEST_LEGACY_ENTID"]; ok {
			if entidStr, ok := entidRaw.(string); ok && strings.HasPrefix(entidStr, "{") {
				json.Unmarshal([]byte(entidStr), &idmap)
			} else if entidMap, ok := entidRaw.(map[string]any); ok {
				idmap = entidMap
			}
		}

		return &legacyDirectSetupResult{client: client, calls: calls, live: true, idmap: idmap}
	}

	mockFetch := func(url string, init map[string]any) (map[string]any, error) {
		*calls = append(*calls, map[string]any{"url": url, "init": init})
		return map[string]any{
			"status":     200,
			"statusText": "OK",
			"headers":    map[string]any{},
			"json": (func() any)(func() any {
				if mockres != nil {
					return mockres
				}
				return map[string]any{"id": "direct01"}
			}),
		}, nil
	}

	client := sdk.NewAareguruSDK(map[string]any{
		"base": "http://localhost:8080",
		"system": map[string]any{
			"fetch": (func(string, map[string]any) (map[string]any, error))(mockFetch),
		},
	})

	return &legacyDirectSetupResult{client: client, calls: calls, live: false, idmap: map[string]any{}}
}

var _ = os.Getenv
var _ = json.Unmarshal
