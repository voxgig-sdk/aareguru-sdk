# Aareguru SDK concurrency test
#
# Requests in flight at once on one client. Each resolves its operation
# through the cache the client's root context shares with every request, and
# registers and cleans secrets through the one registry the client holds.

import sys
import threading

from projectname_sdk import AareguruSDK


ROUNDS = 50
WIDTH = 8
OPS = 32
MASKED = "a [redacted] b [redacted] c"


# Runs body on WIDTH threads released together, and returns what they raised.
def _at_once(body):
    start = threading.Barrier(WIDTH)
    raised = []

    def run(n):
        try:
            start.wait()
            body(n)
        except BaseException as err:
            raised.append(err)

    threads = [threading.Thread(target=run, args=(n,)) for n in range(WIDTH)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return raised


# A live client whose transport answers at once.
def _live_client():
    def fetch(url, fetchdef):
        return {
            "status": 200,
            "statusText": "OK",
            "headers": {},
            "json": lambda: {"ok": True},
        }, None

    return AareguruSDK({
        "base": "http://concurrency.test/api",
        "allow": {"op": "direct"},
        "system": {"fetch": fetch},
    })


def _added_secret(rnd, n, k):
    return "ADDED-SECRET-%d-%d-%d" % (rnd, n, k)


# Half the threads register their secrets; the rest run body(n) until those
# are done or body returns False. Returns what the threads raised.
def _while_registering(utility, root, rnd, body):
    lock = threading.Lock()
    registering = [WIDTH // 2]
    registered = threading.Event()

    def work(n):
        if n < WIDTH // 2:
            try:
                for k in range(OPS):
                    utility.clean_add(root, _added_secret(rnd, n, k))
            finally:
                with lock:
                    registering[0] -= 1
                    if 0 == registering[0]:
                        registered.set()
            return
        while not registered.is_set():
            if not body(n):
                return

    return _at_once(work)


# The first secret registered in the round that a clean leaves raw.
def _unmasked_secret(utility, root, rnd):
    for n in range(WIDTH // 2):
        for k in range(OPS):
            added = _added_secret(rnd, n, k)
            if "[redacted]" != utility.clean(root, added):
                return added
    return None


class TestConcurrency:

    # Threads switch as often as the interpreter allows, so a race a few
    # bytecodes wide has room to show.
    def setup_method(self):
        self._interval = sys.getswitchinterval()
        sys.setswitchinterval(1e-6)

    def teardown_method(self):
        sys.setswitchinterval(self._interval)

    def test_concurrent_resolutions_share_one_cached_operation(self):
        for rnd in range(ROUNDS):
            client = AareguruSDK.test(None, None)
            utility = client.get_utility()
            root = client.get_root_ctx()
            ops = [[None] * OPS for _ in range(WIDTH)]

            def resolve(n):
                for k in range(OPS):
                    ops[n][k] = utility.make_context({"opname": "op%d" % k}, root).op

            raised = _at_once(resolve)

            assert [] == raised, "round %d raised: %r" % (rnd, raised)
            for k in range(OPS):
                cached = utility.make_context({"opname": "op%d" % k}, root).op
                for n in range(WIDTH):
                    assert ops[n][k] is cached, \
                        "round %d: op%d resolved to more than one Operation" % (rnd, k)

    # Secrets registered on some threads while others clean: every clean
    # masks what was registered before it, the longer secret whole, and no
    # registration is lost.
    def test_concurrent_registration_keeps_every_secret_masked(self):
        for rnd in range(ROUNDS // 4):
            client = AareguruSDK.test(None, None)
            utility = client.get_utility()
            root = client.get_root_ctx()
            inner = "INNER-SECRET-%d" % rnd
            utility.clean_add(root, inner)
            utility.clean_add(root, "OUTER-" + inner + "-TAIL")
            text = "a " + inner + " b OUTER-" + inner + "-TAIL c"
            assert MASKED == utility.clean(root, text)

            wrong = []

            def clean(n):
                got = utility.clean(root, text)
                if MASKED != got:
                    wrong.append(got)
                    return False
                return True

            raised = _while_registering(utility, root, rnd, clean)

            assert [] == raised, "round %d raised: %r" % (rnd, raised)
            assert [] == wrong, "round %d cleaned to: %r" % (rnd, wrong)
            added = _unmasked_secret(utility, root, rnd)
            assert added is None, "round %d: %s was registered but not masked" % (rnd, added)

    # Requests on one client while secrets register on it: each request
    # copies the client's options, the registry among them.
    def test_concurrent_requests_survive_registration(self):
        for rnd in range(ROUNDS // 4):
            client = _live_client()
            utility = client.get_utility()
            root = client.get_root_ctx()
            failed = []

            def request(n):
                res = client.direct({"path": "p%d" % n})
                if True is not res.get("ok"):
                    failed.append(res)
                    return False
                return True

            raised = _while_registering(utility, root, rnd, request)

            assert [] == raised, "round %d raised: %r" % (rnd, raised)
            assert [] == failed, "round %d, a request failed: %r" % (rnd, failed)
            added = _unmasked_secret(utility, root, rnd)
            assert added is None, "round %d: %s was registered but not masked" % (rnd, added)
