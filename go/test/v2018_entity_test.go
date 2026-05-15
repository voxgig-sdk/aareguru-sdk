package sdktest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	sdk "github.com/voxgig-sdk/aareguru-sdk"
	"github.com/voxgig-sdk/aareguru-sdk/core"

	vs "github.com/voxgig/struct"
)

func TestV2018Entity(t *testing.T) {
	t.Run("instance", func(t *testing.T) {
		testsdk := sdk.TestSDK(nil, nil)
		ent := testsdk.V2018(nil)
		if ent == nil {
			t.Fatal("expected non-nil V2018Entity")
		}
	})

	t.Run("basic", func(t *testing.T) {
		setup := v2018BasicSetup(nil)
		// Per-op sdk-test-control.json skip — basic test exercises a flow
		// with multiple ops; skipping any op skips the whole flow.
		_mode := "unit"
		if setup.live {
			_mode = "live"
		}
		for _, _op := range []string{"load"} {
			if _shouldSkip, _reason := isControlSkipped("entityOp", "v2018." + _op, _mode); _shouldSkip {
				if _reason == "" {
					_reason = "skipped via sdk-test-control.json"
				}
				t.Skip(_reason)
				return
			}
		}
		// The basic flow consumes synthetic IDs from the fixture. In live mode
		// without an *_ENTID env override, those IDs hit the live API and 4xx.
		if setup.syntheticOnly {
			t.Skip("live entity test uses synthetic IDs from fixture — set AAREGURU_TEST_V_____ENTID JSON to run live")
			return
		}
		client := setup.client

		// Bootstrap entity data from existing test data (no create step in flow).
		v2018Ref01DataRaw := vs.Items(core.ToMapAny(vs.GetPath("existing.v2018", setup.data)))
		var v2018Ref01Data map[string]any
		if len(v2018Ref01DataRaw) > 0 {
			v2018Ref01Data = core.ToMapAny(v2018Ref01DataRaw[0][1])
		}
		// Discard guards against Go's unused-var check when the flow's steps
		// happen not to consume the bootstrap data (e.g. list-only flows).
		_ = v2018Ref01Data

		// LOAD
		v2018Ref01Ent := client.V2018(nil)
		v2018Ref01MatchDt0 := map[string]any{}
		v2018Ref01DataDt0Loaded, err := v2018Ref01Ent.Load(v2018Ref01MatchDt0, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		if v2018Ref01DataDt0Loaded == nil {
			t.Fatal("expected load result to be non-nil")
		}

	})
}

func v2018BasicSetup(extra map[string]any) *entityTestSetup {
	loadEnvLocal()

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)

	entityDataFile := filepath.Join(dir, "..", "..", ".sdk", "test", "entity", "v2018", "V2018TestData.json")

	entityDataSource, err := os.ReadFile(entityDataFile)
	if err != nil {
		panic("failed to read v2018 test data: " + err.Error())
	}

	var entityData map[string]any
	if err := json.Unmarshal(entityDataSource, &entityData); err != nil {
		panic("failed to parse v2018 test data: " + err.Error())
	}

	options := map[string]any{}
	options["entity"] = entityData["existing"]

	client := sdk.TestSDK(options, extra)

	// Generate idmap via transform, matching TS pattern.
	idmap := vs.Transform(
		[]any{"v201801", "v201802", "v201803"},
		map[string]any{
			"`$PACK`": []any{"", map[string]any{
				"`$KEY`": "`$COPY`",
				"`$VAL`": []any{"`$FORMAT`", "upper", "`$COPY`"},
			}},
		},
	)

	// Detect ENTID env override before envOverride consumes it. When live
	// mode is on without a real override, the basic test runs against synthetic
	// IDs from the fixture and 4xx's. Surface this so the test can skip.
	entidEnvRaw := os.Getenv("AAREGURU_TEST_V_____ENTID")
	idmapOverridden := entidEnvRaw != "" && strings.HasPrefix(strings.TrimSpace(entidEnvRaw), "{")

	env := envOverride(map[string]any{
		"AAREGURU_TEST_V_____ENTID": idmap,
		"AAREGURU_TEST_LIVE":      "FALSE",
		"AAREGURU_TEST_EXPLAIN":   "FALSE",
		"AAREGURU_APIKEY":         "NONE",
	})

	idmapResolved := core.ToMapAny(env["AAREGURU_TEST_V_____ENTID"])
	if idmapResolved == nil {
		idmapResolved = core.ToMapAny(idmap)
	}

	if env["AAREGURU_TEST_LIVE"] == "TRUE" {
		mergedOpts := vs.Merge([]any{
			map[string]any{
				"apikey": env["AAREGURU_APIKEY"],
			},
			extra,
		})
		client = sdk.NewAareguruSDK(core.ToMapAny(mergedOpts))
	}

	live := env["AAREGURU_TEST_LIVE"] == "TRUE"
	return &entityTestSetup{
		client:        client,
		data:          entityData,
		idmap:         idmapResolved,
		env:           env,
		explain:       env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
		live:          live,
		syntheticOnly: live && !idmapOverridden,
		now:           time.Now().UnixMilli(),
	}
}
