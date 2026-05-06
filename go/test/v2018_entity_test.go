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
		v2018Ref01MatchDt0 := map[string]any{
			"id": v2018Ref01Data["id"],
		}
		v2018Ref01DataDt0Loaded, err := v2018Ref01Ent.Load(v2018Ref01MatchDt0, nil)
		if err != nil {
			t.Fatalf("load failed: %v", err)
		}
		v2018Ref01DataDt0LoadResult := core.ToMapAny(v2018Ref01DataDt0Loaded)
		if v2018Ref01DataDt0LoadResult == nil {
			t.Fatal("expected load result to be a map")
		}
		if v2018Ref01DataDt0LoadResult["id"] != v2018Ref01Data["id"] {
			t.Fatal("expected load result id to match")
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

	return &entityTestSetup{
		client:  client,
		data:    entityData,
		idmap:   idmapResolved,
		env:     env,
		explain: env["AAREGURU_TEST_EXPLAIN"] == "TRUE",
		now:     time.Now().UnixMilli(),
	}
}
