package sdktest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	sdk "voxgigaaregurusdk"
	"voxgigaaregurusdk/core"

	vs "github.com/voxgig/struct"
)

func TestStuffEntity(t *testing.T) {
	t.Run("instance", func(t *testing.T) {
		testsdk := sdk.TestSDK(nil, nil)
		ent := testsdk.Stuff(nil)
		if ent == nil {
			t.Fatal("expected non-nil StuffEntity")
		}
	})

	t.Run("basic", func(t *testing.T) {
		setup := stuffBasicSetup(nil)
		client := setup.client

		// Bootstrap entity data from existing test data (no create step in flow).
		stuffRef01DataRaw := vs.Items(core.ToMapAny(vs.GetPath("existing.stuff", setup.data)))
		var stuffRef01Data map[string]any
		if len(stuffRef01DataRaw) > 0 {
			stuffRef01Data = core.ToMapAny(stuffRef01DataRaw[0][1])
		}
		// Discard guards against Go's unused-var check when the flow's steps
		// happen not to consume the bootstrap data (e.g. list-only flows).
		_ = stuffRef01Data

		// LOAD
		stuffRef01Ent := client.Stuff(nil)
		stuffRef01MatchDt0 := map[string]any{
			"id": stuffRef01Data["id"],
		}
		stuffRef01DataDt0Loaded, err := stuffRef01Ent.Load(stuffRef01MatchDt0, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		stuffRef01DataDt0LoadResult := core.ToMapAny(stuffRef01DataDt0Loaded)
		if stuffRef01DataDt0LoadResult == nil {
			t.Fatal("expected load result to be a map")
		}
		if stuffRef01DataDt0LoadResult["id"] != stuffRef01Data["id"] {
			t.Fatal("expected load result id to match")
		}

	})
}

func stuffBasicSetup(extra map[string]any) *entityTestSetup {
	loadEnvLocal()

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)

	entityDataFile := filepath.Join(dir, "..", "..", ".sdk", "test", "entity", "stuff", "StuffTestData.json")

	entityDataSource, err := os.ReadFile(entityDataFile)
	if err != nil {
		panic("failed to read stuff test data: " + err.Error())
	}

	var entityData map[string]any
	if err := json.Unmarshal(entityDataSource, &entityData); err != nil {
		panic("failed to parse stuff test data: " + err.Error())
	}

	options := map[string]any{}
	options["entity"] = entityData["existing"]

	client := sdk.TestSDK(options, extra)

	// Generate idmap via transform, matching TS pattern.
	idmap := vs.Transform(
		[]any{"stuff01", "stuff02", "stuff03"},
		map[string]any{
			"`$PACK`": []any{"", map[string]any{
				"`$KEY`": "`$COPY`",
				"`$VAL`": []any{"`$FORMAT`", "upper", "`$COPY`"},
			}},
		},
	)

	env := envOverride(map[string]any{
		"AAREGURU_TEST_STUFF_ENTID": idmap,
		"AAREGURU_TEST_LIVE":      "FALSE",
		"AAREGURU_TEST_EXPLAIN":   "FALSE",
		"AAREGURU_APIKEY":         "NONE",
	})

	idmapResolved := core.ToMapAny(env["AAREGURU_TEST_STUFF_ENTID"])
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

	return &entityTestSetup{
		client:  client,
		data:    entityData,
		idmap:   idmapResolved,
		env:     env,
		explain: env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
		now:     time.Now().UnixMilli(),
	}
}
