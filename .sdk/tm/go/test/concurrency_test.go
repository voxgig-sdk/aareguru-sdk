package sdktest

import (
	"fmt"
	"sync"
	"testing"

	sdk "GOMODULE"
)

// Requests in flight at once on one client. Each resolves its operation
// through the cache the client's root context shares with every request, and
// registers and cleans secrets through the one registry the client holds.

const concurrencyRounds = 200
const concurrencyWidth = 8
const concurrencyOps = 32

// concurrencyClient is a live client whose transport answers at once.
func concurrencyClient() *sdk.AareguruSDK {
	return sdk.NewAareguruSDK(map[string]any{
		"base":  "http://concurrency.test/api",
		"allow": map[string]any{"op": "direct"},
		"system": map[string]any{
			"fetch": func(url string, fetchdef map[string]any) (map[string]any, error) {
				return map[string]any{
					"status":     200,
					"statusText": "OK",
					"headers":    map[string]any{},
					"json":       func() any { return map[string]any{"ok": true} },
				}, nil
			},
		},
	})
}

// atOnce runs body on concurrencyWidth goroutines released together.
func atOnce(body func(n int)) {
	var ready, done sync.WaitGroup
	start := make(chan struct{})
	ready.Add(concurrencyWidth)
	done.Add(concurrencyWidth)
	for i := 0; i < concurrencyWidth; i++ {
		go func(n int) {
			defer done.Done()
			ready.Done()
			<-start
			body(n)
		}(i)
	}
	ready.Wait()
	close(start)
	done.Wait()
}

func TestConcurrentFirstRequests(t *testing.T) {
	for round := 0; round < concurrencyRounds; round++ {
		// A fresh client each round, so every request in it is a first request.
		client := concurrencyClient()
		results := make([]map[string]any, concurrencyWidth)
		errs := make([]error, concurrencyWidth)
		atOnce(func(n int) {
			results[n], errs[n] = client.Direct(map[string]any{"path": fmt.Sprintf("p%d", n)})
		})
		for n := range results {
			if errs[n] != nil || results[n]["ok"] != true {
				t.Fatalf("round %d, request %d failed: %v %v", round, n, errs[n], results[n])
			}
		}
	}
}

func TestConcurrentOperationResolution(t *testing.T) {
	for round := 0; round < concurrencyRounds; round++ {
		client := concurrencyClient()
		utility := client.GetUtility()
		root := client.GetRootCtx()
		ops := make([][]*sdk.Operation, concurrencyWidth)
		atOnce(func(n int) {
			ops[n] = make([]*sdk.Operation, concurrencyOps)
			for k := range ops[n] {
				ops[n][k] = utility.MakeContext(map[string]any{"opname": fmt.Sprintf("op%d", k)}, root).Op
			}
		})
		for k := 0; k < concurrencyOps; k++ {
			cached := utility.MakeContext(map[string]any{"opname": fmt.Sprintf("op%d", k)}, root).Op
			for n := range ops {
				if ops[n][k] != cached {
					t.Fatalf("round %d: op%d resolved to more than one Operation", round, k)
				}
			}
		}
	}
}

func addedSecret(round, n, k int) string {
	return fmt.Sprintf("ADDED-SECRET-%d-%d-%d", round, n, k)
}

// registerSecrets registers goroutine n's secrets.
func registerSecrets(utility *sdk.Utility, root *sdk.Context, round, n int) {
	for k := 0; k < concurrencyOps; k++ {
		utility.CleanAdd(root, addedSecret(round, n, k))
	}
}

// unmaskedSecret is the first secret registered in the round that a clean
// leaves raw, or "".
func unmaskedSecret(utility *sdk.Utility, root *sdk.Context, round int) string {
	for n := 0; n < concurrencyWidth/2; n++ {
		for k := 0; k < concurrencyOps; k++ {
			added := addedSecret(round, n, k)
			if got := utility.Clean(root, added); got != "[redacted]" {
				return added
			}
		}
	}
	return ""
}

// whileRegistering has half the goroutines register their secrets, and the
// rest run body until those are done or body returns false.
func whileRegistering(utility *sdk.Utility, root *sdk.Context, round int, body func(n int) bool) {
	var registering sync.WaitGroup
	registering.Add(concurrencyWidth / 2)
	registered := make(chan struct{})
	go func() {
		registering.Wait()
		close(registered)
	}()
	atOnce(func(n int) {
		if n < concurrencyWidth/2 {
			defer registering.Done()
			registerSecrets(utility, root, round, n)
			return
		}
		for {
			select {
			case <-registered:
				return
			default:
			}
			if !body(n) {
				return
			}
		}
	})
}

// Secrets registered on some goroutines while others clean: every clean masks
// what was registered before it, the longer secret whole, and no registration
// is lost.
func TestConcurrentCleanRegistry(t *testing.T) {
	const masked = "a [redacted] b [redacted] c"
	for round := 0; round < concurrencyRounds/4; round++ {
		client := concurrencyClient()
		utility := client.GetUtility()
		root := client.GetRootCtx()
		inner := fmt.Sprintf("INNER-SECRET-%d", round)
		utility.CleanAdd(root, inner)
		utility.CleanAdd(root, "OUTER-"+inner+"-TAIL")
		text := "a " + inner + " b OUTER-" + inner + "-TAIL c"
		if got := utility.Clean(root, text); got != masked {
			t.Fatalf("round %d cleaned to: %v", round, got)
		}

		wrong := make([]any, concurrencyWidth)
		whileRegistering(utility, root, round, func(n int) bool {
			if got := utility.Clean(root, text); got != masked {
				wrong[n] = got
				return false
			}
			return true
		})

		for n, got := range wrong {
			if got != nil {
				t.Fatalf("round %d, cleaner %d cleaned to: %v", round, n, got)
			}
		}
		if raw := unmaskedSecret(utility, root, round); raw != "" {
			t.Fatalf("round %d: %s was registered but not masked", round, raw)
		}
	}
}

// Requests on one client while secrets register on it: each request copies
// the client's options, the registry among them.
func TestConcurrentRequestsWhileRegistering(t *testing.T) {
	for round := 0; round < concurrencyRounds/4; round++ {
		client := concurrencyClient()
		utility := client.GetUtility()
		root := client.GetRootCtx()

		failed := make([]any, concurrencyWidth)
		whileRegistering(utility, root, round, func(n int) bool {
			res, err := client.Direct(map[string]any{"path": fmt.Sprintf("p%d", n)})
			if err != nil || res["ok"] != true {
				failed[n] = fmt.Sprint(err, res)
				return false
			}
			return true
		})

		for n, got := range failed {
			if got != nil {
				t.Fatalf("round %d, request %d failed: %v", round, n, got)
			}
		}
		if raw := unmaskedSecret(utility, root, round); raw != "" {
			t.Fatalf("round %d: %s was registered but not masked", round, raw)
		}
	}
}
