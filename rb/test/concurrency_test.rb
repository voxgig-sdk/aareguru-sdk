# Aareguru SDK concurrency test
#
# Requests in flight at once on one client. Each resolves its operation
# through the cache the client's root context shares with every request, and
# registers and cleans secrets through the one registry the client holds.
#
# The interpreter switches threads about every 100ms, so each test runs long
# enough to be switched in the middle of a resolution or a registration.

require "minitest/autorun"
require_relative "../Aareguru_sdk"

class ConcurrencyTest < Minitest::Test
  ROUNDS = 3
  WIDTH = 8
  OPS = 6000
  SEEDED = 1000
  ADDED = 400
  MASKED = "a [redacted] b [redacted] c"

  # Runs the block on WIDTH threads, released once every one is waiting, and
  # returns what they raised.
  def at_once
    lock = Mutex.new
    waiting = 0
    ready = Queue.new
    gate = Queue.new
    seen = Queue.new
    raised = Queue.new
    threads = (0...WIDTH).map do |n|
      Thread.new do
        lock.synchronize { waiting += 1 }
        ready << n
        gate.pop
        seen << lock.synchronize { waiting }
        yield n
      rescue Exception => e
        raised << e
      end
    end
    WIDTH.times { ready.pop }
    WIDTH.times { gate << true }
    threads.each(&:join)
    released = Array.new(seen.size) { seen.pop }
    assert_equal [WIDTH] * WIDTH, released, "threads released before #{WIDTH} were waiting"
    Array.new(raised.size) { raised.pop }
  end

  def test_concurrent_resolutions_share_one_cached_operation
    ROUNDS.times do |round|
      client = AareguruSDK.test(nil, nil)
      utility = client.get_utility
      root = client.get_root_ctx
      ops = Array.new(WIDTH) { Array.new(OPS) }

      raised = at_once do |n|
        OPS.times { |k| ops[n][k] = utility.make_context.call({ "opname" => "op#{k}" }, root).op }
      end

      assert_empty raised, "round #{round} raised: #{raised.inspect}"
      OPS.times do |k|
        cached = utility.make_context.call({ "opname" => "op#{k}" }, root).op
        WIDTH.times do |n|
          assert_same cached, ops[n][k], "round #{round}: op#{k} resolved to more than one Operation"
        end
      end
    end
  end

  # A live client whose transport answers at once.
  def live_client
    AareguruSDK.new({
      "base" => "http://concurrency.test/api",
      "allow" => { "op" => "direct" },
      "system" => {
        "fetch" => lambda { |_url, _fetchdef|
          [{ "status" => 200, "statusText" => "OK", "headers" => {},
             "json" => lambda { { "ok" => true } } }, nil]
        },
      },
    })
  end

  # Half the threads register their secrets; the rest run body until those
  # are done or it returns false. Returns what the threads raised.
  def while_registering(utility, root, &body)
    lock = Mutex.new
    registering = WIDTH / 2
    at_once do |n|
      if n < WIDTH / 2
        begin
          ADDED.times { |k| utility.clean_add.call(root, "ADDED-SECRET-#{n}-#{k}") }
        ensure
          lock.synchronize { registering -= 1 }
        end
      else
        while 0 < lock.synchronize { registering }
          break unless body.call(n)
          Thread.pass
        end
      end
    end
  end

  def assert_every_secret_masked(utility, root)
    (WIDTH / 2).times do |n|
      ADDED.times do |k|
        added = "ADDED-SECRET-#{n}-#{k}"
        assert_equal "[redacted]", utility.clean.call(root, added), "#{added} was registered but not masked"
      end
    end
  end

  # Secrets registered on some threads while others clean: every clean masks
  # what was registered before it, the longer secret whole, and no
  # registration is lost.
  def test_concurrent_registration_keeps_every_secret_masked
    client = AareguruSDK.test(nil, nil)
    utility = client.get_utility
    root = client.get_root_ctx
    SEEDED.times { |k| utility.clean_add.call(root, "SEEDED-SECRET-#{k}") }
    utility.clean_add.call(root, "INNER-SECRET")
    utility.clean_add.call(root, "OUTER-INNER-SECRET-TAIL")
    text = "a INNER-SECRET b OUTER-INNER-SECRET-TAIL c"
    assert_equal MASKED, utility.clean.call(root, text)

    wrong = Queue.new
    raised = while_registering(utility, root) do
      got = utility.clean.call(root, text)
      wrong << got if MASKED != got
      MASKED == got
    end

    cleaned = Array.new(wrong.size) { wrong.pop }
    assert_empty raised, "raised: #{raised.inspect}"
    assert_empty cleaned, "cleaned to: #{cleaned.inspect}"
    assert_every_secret_masked(utility, root)
  end

  # Requests on one client while secrets register on it: each request copies
  # the client's options, the registry among them.
  def test_concurrent_requests_survive_registration
    client = live_client
    utility = client.get_utility
    root = client.get_root_ctx
    SEEDED.times { |k| utility.clean_add.call(root, "SEEDED-SECRET-#{k}") }

    failed = Queue.new
    raised = while_registering(utility, root) do |n|
      res = client.direct({ "path" => "p#{n}" })
      failed << res unless true == res["ok"]
      true == res["ok"]
    end

    requests = Array.new(failed.size) { failed.pop }
    assert_empty raised, "raised: #{raised.inspect}"
    assert_empty requests, "a request failed: #{requests.inspect}"
    assert_every_secret_masked(utility, root)
  end
end
