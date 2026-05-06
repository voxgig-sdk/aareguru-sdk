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

func TestLegacyEntity(t *testing.T) {
	t.Run("instance", func(t *testing.T) {
		testsdk := sdk.TestSDK(nil, nil)
		ent := testsdk.Legacy(nil)
		if ent == nil {
			t.Fatal("expected non-nil LegacyEntity")
		}
	})

	t.Run("basic", func(t *testing.T) {
		setup := legacyBasicSetup(nil)
		client := setup.client

		// Bootstrap entity data from existing test data (no create step in flow).
		legacyRef01DataRaw := vs.Items(core.ToMapAny(vs.GetPath("existing.legacy", setup.data)))
		var legacyRef01Data map[string]any
		if len(legacyRef01DataRaw) > 0 {
			legacyRef01Data = core.ToMapAny(legacyRef01DataRaw[0][1])
		}
		// Discard guards against Go's unused-var check when the flow's steps
		// happen not to consume the bootstrap data (e.g. list-only flows).
		_ = legacyRef01Data

		// LOAD
		legacyRef01Ent := client.Legacy(nil)
		legacyRef01MatchDt0 := map[string]any{
			"id": legacyRef01Data["id"],
		}
		legacyRef01DataDt0Loaded, err := legacyRef01Ent.Load(legacyRef01MatchDt0, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		legacyRef01DataDt0LoadResult := core.ToMapAny(legacyRef01DataDt0Loaded)
		if legacyRef01DataDt0LoadResult == nil {
			t.Fatal("expected load result to be a map")
		}
		if legacyRef01DataDt0LoadResult["id"] != legacyRef01Data["id"] {
			t.Fatal("expected load result id to match")
		}

	})
}

func legacyBasicSetup(extra map[string]any) *entityTestSetup {
	loadEnvLocal()

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)

	entityDataFile := filepath.Join(dir, "..", "..", ".sdk", "test", "entity", "legacy", "LegacyTestData.json")

	entityDataSource, err := os.ReadFile(entityDataFile)
	if err != nil {
		panic("failed to read legacy test data: " + err.Error())
	}

	var entityData map[string]any
	if err := json.Unmarshal(entityDataSource, &entityData); err != nil {
		panic("failed to parse legacy test data: " + err.Error())
	}

	options := map[string]any{}
	options["entity"] = entityData["existing"]

	client := sdk.TestSDK(options, extra)

	// Generate idmap via transform, matching TS pattern.
	idmap := vs.Transform(
		[]any{"legacy01", "legacy02", "legacy03"},
		map[string]any{
			"`$PACK`": []any{"", map[string]any{
				"`$KEY`": "`$COPY`",
				"`$VAL`": []any{"`$FORMAT`", "upper", "`$COPY`"},
			}},
		},
	)

	env := envOverride(map[string]any{
		"AAREGURU_TEST_LEGACY_ENTID": idmap,
		"AAREGURU_TEST_LIVE":      "FALSE",
		"AAREGURU_TEST_EXPLAIN":   "FALSE",
		"AAREGURU_APIKEY":         "NONE",
	})

	idmapResolved := core.ToMapAny(env["AAREGURU_TEST_LEGACY_ENTID"])
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
