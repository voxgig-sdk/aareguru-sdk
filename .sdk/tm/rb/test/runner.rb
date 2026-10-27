# Aareguru SDK test runner

require 'json'

module AareguruTestRunner
  @env = {}

  def self.load_env_local
    env_file = File.join(File.dirname(__FILE__), '..', '..', '.env.local')
    return unless File.exist?(env_file)

    File.readlines(env_file, encoding: 'UTF-8').each do |line|
      line = line.strip
      next if line.empty? || line.start_with?('#')
      key, val = line.split('=', 2)
      next unless key && val
      @env[key.strip] = val.strip
    end
  end

  def self.getenv(key)
    @env[key] || ENV[key]
  end

  def self.env_override(m)
    live = getenv("PROJECTENV_TEST_LIVE")
    override = getenv("PROJECTENV_TEST_OVERRIDE")

    if live == "TRUE" || override == "TRUE"
      m.each_key do |key|
        envval = getenv(key)
        if envval && !envval.empty?
          envval = envval.strip
          if envval.start_with?('{')
            begin
              parsed = JSON.parse(envval)
              m[key] = parsed
              next
            rescue JSON::ParserError
            end
          end
          m[key] = envval
        end
      end
    end

    explain = getenv("PROJECTENV_TEST_EXPLAIN")
    m["PROJECTENV_TEST_EXPLAIN"] = explain if explain && !explain.empty?

    m
  end

  def self.entity_list_to_data(list)
    out = []
    list.each do |item|
      if item.is_a?(Hash)
        out << item
      elsif item.respond_to?(:data_get)
        d = item.data_get
        out << d if d.is_a?(Hash)
      end
    end
    out
  end

  @test_control = nil

  # Load sdk-test-control.json from this test dir; cache. Returns the
  # empty-skip default if the file is missing or invalid.
  def self.load_test_control
    return @test_control unless @test_control.nil?
    ctrl_path = File.join(File.dirname(__FILE__), 'sdk-test-control.json')
    @test_control = begin
      JSON.parse(File.read(ctrl_path, encoding: 'UTF-8'))
    rescue StandardError
      {
        'version' => 1,
        'test' => { 'skip' => {
          'live' => { 'direct' => [], 'entityOp' => [] },
          'unit' => { 'direct' => [], 'entityOp' => [] },
        }},
      }
    end
    @test_control
  end

  # Check sdk-test-control.json for a skip entry. Returns [skip, reason].
  def self.is_control_skipped(kind, name, mode)
    ctrl = load_test_control
    skip = (ctrl.dig('test', 'skip', mode) || {})
    items = skip[kind] || []
    items.each do |item|
      if kind == 'direct' && item['test'] == name
        return [true, item['reason']]
      end
      if kind == 'entityOp'
        key = "#{item['entity']}.#{item['op']}"
        return [true, item['reason']] if key == name
      end
    end
    [false, nil]
  end

  # Extra SDK options every LIVE client is constructed with, read from
  # sdk-test-control.json `test.client.options`.
  #
  # The generated live client knows two things: the base URL (from the spec)
  # and the credential (from the environment). Everything else about how a
  # particular API wants to be talked to - which features to switch on, and
  # with what settings - is a property of THAT API, known to the project and
  # to nothing in the toolchain.
  #
  # Merged UNDER the generated fields, so the suite's own base/apikey/server
  # values win: this ADDS to the live client, it does not redirect it.
  #
  # Reserved fields are stripped HERE rather than at each merge site: the
  # generated hash only names a field when the model calls for one, so a
  # "base" in this block would face no competing value and would silently
  # redirect the whole suite - credential included - to another host.
  LIVE_RESERVED = %w[base prefix suffix server apikey secret].freeze

  def self.live_client_options
    ctrl = load_test_control
    opts = ctrl.dig('test', 'client', 'options')
    return {} unless opts.is_a?(Hash)
    opts.reject { |k, _v| LIVE_RESERVED.include?(k) }
  end

  # Per-test live pacing delay (ms); default 500.
  def self.live_delay_ms
    ctrl = load_test_control
    v = ctrl.dig('test', 'live', 'delayMs')
    return v if v.is_a?(Integer) && v >= 0
    500
  end

  # A live check that did not pass, as main.kit.test.live.strict decides:
  # strict fails the test, lenient skips it with the same reason.
  def self.live_miss(strict, reason)
    raise Minitest::Assertion, reason if strict
    raise Minitest::Skip, reason
  end

  # An account holding no record for the test to read skips either way.
  def self.live_empty(reason)
    raise Minitest::Skip, reason
  end

  # A live list response's records: the body, or the first list an
  # envelope holds.
  def self.live_list(data)
    return data if data.is_a?(Array)
    return data.values.find { |v| v.is_a?(Array) } if data.is_a?(Hash)
    nil
  end

  # A live response for a message: the SDK's error, or else its status and
  # content type, never its body.
  def self.live_describe(result)
    return "no response" unless result.is_a?(Hash)
    err = result["err"]
    return (err.respond_to?(:message) ? err.message : err.to_s) unless err.nil?
    headers = result["headers"].is_a?(Hash) ? result["headers"] : {}
    ctype = headers.find { |k, _v| k.to_s.downcase == "content-type" }&.last
    "HTTP #{result["status"]}" + (ctype ? " #{ctype.to_s.split(";").first.strip}" : "")
  end

  # The record a create-less flow reads live: the first its list returns,
  # put where the flow reads the fixture's existing records.
  def self.live_existing(setup, strict, name)
    found = begin
      yield
    rescue StandardError => e
      live_miss(strict, "Live list discovery failed: #{e.message}")
    end
    live_miss(strict, "Live list discovery returned no list") unless found.is_a?(Array)
    live_empty("The account has no #{name} record to load") if found.empty?
    first = found[0]
    record = first.respond_to?(:data_get) ? first.data_get : first
    (setup[:data]["existing"] ||= {})[name] = { "live01" => record }
  end

  # In a lenient live run a failing check skips, observing the live API.
  def self.live_observe(error, setup, strict)
    raise error if strict || !setup.is_a?(Hash) || !setup[:live] || error.is_a?(Minitest::Skip)
    raise Minitest::Skip, "live run, main.kit.test.live.strict is false: #{error.message}"
  end
end

# Module-level aliases for test convenience.
Runner = AareguruTestRunner
Helpers = AareguruHelpers
Vs = VoxgigStruct
