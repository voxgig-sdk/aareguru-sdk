import {
  cmp,
  File,
  Content,
  isAuthSuppressed,
  isHttpBasicAuth,
  resolveAuthIn,
  resolveAuthName,
} from '@voxgig/sdkgen'


// The canary sweep: every credential slot holds a distinctive value, every
// diagnostic feature this SDK ships is switched on with a capturing sink, a
// real operation runs through every outcome, and every string that leaves
// the SDK is searched for the canaries and their encoded forms. It also
// proves its own sensitivity: with clean switched off the canary MUST show.
const TestClean = cmp(function TestClean(props: any) {
  const { model } = props.ctx$
  const { target } = props

  const auth = {
    suppressed: isAuthSuppressed(model),
    where: resolveAuthIn(model),
    name: 'header' === resolveAuthIn(model)
      ? resolveAuthName(model).toLowerCase() : resolveAuthName(model),
    basic: isHttpBasicAuth(model),
  }

  File({ name: 'clean_test.' + target.ext }, () => Content(render(model.const.Name, auth)))
})


function rbstr(s: string): string {
  return JSON.stringify(String(s)).replace(/#\{/g, '\\#{')
}


// The class name carries the project prefix, and every helper sits inside
// it: the target's constant guard reads top-level declarations.
function render(Name: string, auth: {
  suppressed: boolean, where: string, name: string, basic: boolean
}): string {
  return `# ${Name} SDK clean test
#
# The canary sweep: every credential slot holds a distinctive value, every
# diagnostic feature this SDK ships is switched on with a capturing sink, a
# real operation runs through every outcome, and every string that leaves
# the SDK is searched for the canaries and their encoded forms. It also
# proves its own sensitivity: with clean switched off the canary MUST show.

require "minitest/autorun"
require "json"
require "pp"
require_relative "../${Name}_sdk"

class ${Name}CleanTest < Minitest::Test
  # Generated: the credential's wire placement is fixed when the SDK is built.
  AUTH = {
    "suppressed" => ${auth.suppressed},
    "where" => ${rbstr(auth.where)},
    "name" => ${rbstr(auth.name)},
    "basic" => ${auth.basic},
  }.freeze

  CANARY = {
    "apikey" => "CANARY-APIKEY-k9x2m7q4p1",
    "secret" => "CANARY-SECRET-w3e8r5t2y6",
    "header" => "CANARY-HEADER-z1x4c7v0b3",
    "value" => "CANARY-VALUE-n5m8b2v9c4",
    "config" => "CANARY-CONFIG-h6j3k8l2m5",
  }.freeze

  MASK = "[redacted]"

  # encodeURIComponent, the form a query credential travels in.
  def self.pct(value)
    value.gsub(/[^A-Za-z0-9\\-_.!~*'()]/) { |c| c.bytes.map { |b| format("%%%02X", b) }.join }
  end

  # Every form a canary can travel in.
  FORMS = (CANARY.values.flat_map { |v| [v, [v].pack("m0"), pct(v)] } +
    [["#{CANARY['apikey']}:#{CANARY['secret']}"].pack("m0")]).freeze

  module Sweep
    module_function

    # Header maps keep the caller's spelling; the assertion should not care.
    def header(map, name)
      return nil unless map.is_a?(Hash)
      map.each { |k, v| return v if k.to_s.downcase == name.downcase }
      nil
    end

    def leaks(text)
      FORMS.select { |f| text.include?(f) }
    end

    # Every printed form of a value that left the SDK.
    def forms(name, val)
      out = []
      surface(out, name, "json") { JSON.generate(val) }
      surface(out, name, "string") { val.to_s }
      surface(out, name, "inspect") { val.inspect }
      surface(out, name, "pp") { PP.pp(val, +"") }
      if val.is_a?(Exception)
        surface(out, name, "message") { val.message.to_s }
        surface(out, name, "full") { val.full_message(highlight: false) }
        surface(out, name, "ivars") do
          val.instance_variables.map { |v| [v, val.instance_variable_get(v)] }.inspect
        end
      end
      out
    end

    def surface(out, name, kind)
      out << { "name" => "#{name}:#{kind}", "text" => yield.to_s }
    rescue StandardError
      nil
    end

    def response(status, data, headers = nil)
      h = { "content-type" => "application/json" }.merge(headers || {})
      {
        "status" => status,
        "statusText" => status < 400 ? "OK" : "ERR",
        "headers" => h,
        "json" => -> { data },
        "body" => JSON.generate(data),
      }
    end
  end

  # Captures the serialised context from inside the pipeline: what a hook
  # author would hand to a logger.
  class CaptureFeature < ${Name}BaseFeature
    def initialize(sinks)
      super()
      @name = "capture"
      @version = "0.0.1"
      @active = true
      @sinks = sinks
    end

    def PreRequest(ctx); @sinks.concat(Sweep.forms("ctx@PreRequest", ctx)); end
    def PreResponse(ctx); @sinks.concat(Sweep.forms("ctx@PreResponse", ctx)); end

    # The SDK's own error as a hook reads it, which an observability feature
    # logs.
    def PreUnexpected(ctx)
      @sinks.concat(Sweep.forms("ctx@PreUnexpected", ctx))
      err = ctx.ctrl.err
      @sinks.concat(Sweep.forms("ctrl.err@PreUnexpected", err)) if err.is_a?(${Name}Error)
    end
  end

  # A feature that raises from inside the pipeline, quoting the request it
  # saw: an error make_error never handled.
  class ThrowFeature < ${Name}BaseFeature
    def initialize(response = true, unexpected = false)
      super()
      @name = "throwhook"
      @version = "0.0.1"
      @active = true
      @response = response
      @unexpected = unexpected
    end

    def PreResponse(ctx)
      raise "hook saw #{ctx.spec.inspect}" if @response
    end

    # Fires in make_error, and in the catch path before its cleaning.
    def PreUnexpected(ctx)
      raise "hook saw #{ctx.spec.inspect}" if @unexpected
    end
  end

  # A stream that succeeds, so the pipeline's terminal step never runs.
  class StreamOkFeature < ${Name}BaseFeature
    def initialize
      super()
      @name = "streamok"
      @version = "0.0.1"
      @active = true
    end

    def PreDone(ctx)
      data = ctx.result.resdata
      ctx.result.stream = (data.is_a?(Array) ? data : (data.nil? ? [] : [data])).each
    end
  end

  # A feature that hands the caller the stream it was given.
  class StreamFeature < ${Name}BaseFeature
    def initialize(stream)
      super()
      @name = "streamed"
      @version = "0.0.1"
      @active = true
      @stream = stream
    end

    def PreDone(ctx)
      ctx.result.stream = @stream
    end
  end

  class CaptureLogger
    def initialize(sinks)
      @sinks = sinks
    end

    def puts(line)
      @sinks << { "name" => "log", "text" => line.to_s }
    end
  end

  # Each scenario answers the transport's [response, err] pair.
  SCENARIOS = [
    ["ok", ->(_url, _fd) {
      [Sweep.response(200, { "id" => "i1", "name" => "n1" },
        { "x-session-token" => "RESP-TOKEN-a1b2c3d4e5" }), nil]
    }],
    ["notfound", ->(_url, _fd) { [Sweep.response(404, { "error" => "no such record" }), nil] }],
    ["server", ->(_url, _fd) { [Sweep.response(500, { "error" => "boom" }), nil] }],
    ["transport", ->(url, _fd) {
      [nil, RuntimeError.new("socket hang up (URL was: \\"#{url}\\")")]
    }],
    # The SDK's own error, its code quoting a registered value.
    ["coded", ->(_url, _fd) { [nil, ${Name}Error.new("denied_#{CANARY['apikey']}", "coded failure")] }],
    ["notjson", ->(_url, _fd) {
      [{
        "status" => 200, "statusText" => "OK", "headers" => {},
        "json" => -> { raise "Unexpected token < in JSON" },
        "body" => "<html>",
      }, nil]
    }],
  ].freeze

  VARIANTS = [
    ["throw", -> { {} }],
    ["explain", -> { { "explain" => {} } }],
    ["nothrow", -> { { "throw" => false, "explain" => {} } }],
  ].freeze

  # True when this SDK was generated with the named feature.
  def has_feature?(name)
    f = ${Name}Config.shared_config["feature"]
    f.is_a?(Hash) && !f[name].nil?
  end

  def make_sdk(scenario, sinks, cleanopts = nil, extra = [])
    capture = ->(name) { ->(rec) { sinks.concat(Sweep.forms(name, rec)) } }
    feature = {}
    feature["log"] = { "active" => true, "logger" => CaptureLogger.new(sinks) } if has_feature?("log")
    feature["debug"] = { "active" => true, "on_entry" => capture.call("debug") } if has_feature?("debug")
    feature["audit"] = { "active" => true, "sink" => capture.call("audit") } if has_feature?("audit")
    feature["telemetry"] = { "active" => true, "exporter" => capture.call("telemetry") } if has_feature?("telemetry")
    feature["cost"] = { "active" => true, "sink" => capture.call("cost") } if has_feature?("cost")
    feature["metrics"] = { "active" => true } if has_feature?("metrics")
    feature["clienttrack"] = { "active" => true } if has_feature?("clienttrack")

    respond = scenario[1]
    ${Name}SDK.new({
      "apikey" => CANARY["apikey"],
      "secret" => CANARY["secret"],
      "headers" => { "X-Custom-Token" => CANARY["header"] },
      "clean" => { "values" => CANARY["value"] }.merge(cleanopts || {}),
      "feature" => feature,
      "extend" => [CaptureFeature.new(sinks)] + extra,
      "utility" => { "fetcher" => ->(_ctx, url, fetchdef) { respond.call(url, fetchdef) } },
    })
  end

  # The first operation that completes against a plain 200: with no
  # arguments, else with every path parameter its points declare filled in.
  # An entity accessor is a capitalised client method whose result answers
  # get_name, as the feature corpus runner finds them.
  def usable_op
    plain = ${Name}SDK.new({
      "apikey" => CANARY["apikey"],
      "utility" => { "fetcher" => ->(_ctx, _url, _fd) { [Sweep.response(200, { "id" => "i1" }), nil] } },
    })

    found = {}
    plain.public_methods(false).each do |m|
      name = m.to_s
      next unless name[0] =~ /[A-Z]/
      ent = begin
        plain.public_send(m)
      rescue StandardError
        next
      end
      next unless ent.respond_to?(:get_name)
      found[ent.get_name.to_s] = name
    end

    entities = ${Name}Config.shared_config["entity"] || {}
    found.keys.sort.each do |entname|
      accessor = found[entname]
      %w[list load create update remove].each do |op|
        next unless plain.public_send(accessor).respond_to?(op)
        filled = {}
        points = entities.dig(entname, "op", op, "points")
        (points.is_a?(Array) ? points : []).each do |point|
          params = point.is_a?(Hash) ? point.dig("args", "params") : nil
          (params.is_a?(Array) ? params : []).each do |p|
            filled[p["name"]] = "p1" if p.is_a?(Hash) && p["name"].is_a?(String)
          end
        end
        [{}, filled].each do |match|
          plain.public_send(accessor).public_send(op, match.dup, {})
          return { "accessor" => accessor, "op" => op, "match" => match }
        rescue StandardError
          next
        end
      end
    end
    nil
  end

  def drive(sdk, target, ctrl, sinks)
    # A caller may keep the record it passed rather than read ctrl["explain"].
    held = ctrl["explain"]
    out = nil
    err = nil
    begin
      out = sdk.public_send(target["accessor"]).public_send(target["op"], target["match"].dup, ctrl)
    rescue StandardError => e
      err = e
    end
    sinks.concat(Sweep.forms("error", err)) unless err.nil?
    sinks.concat(Sweep.forms("result", out)) unless out.nil?
    sinks.concat(Sweep.forms("explain", ctrl["explain"])) unless ctrl["explain"].nil?
    sinks.concat(Sweep.forms("explain:held", held)) unless held.nil? || held.equal?(ctrl["explain"])
    err
  end

  def test_no_credential_leaves_the_sdk_in_any_form
    target = usable_op
    skip "no operation of this SDK completes against a plain 200; nothing to sweep" if target.nil?

    sinks = []
    errors = {}
    explains = {}

    SCENARIOS.each do |scenario|
      VARIANTS.each do |vname, make_ctrl|
        sdk = make_sdk(scenario, sinks)
        ctrl = make_ctrl.call
        err = drive(sdk, target, ctrl, sinks)
        key = "#{scenario[0]}/#{vname}"
        errors[key] = err unless err.nil?
        explains[key] = ctrl["explain"] unless ctrl["explain"].nil?
        sinks.concat(Sweep.forms("sdk", sdk))
      end
    end

    # A credential mistyped as a map is rejected by validation, whose
    # message quotes the value it rejected.
    rejected = nil
    begin
      ${Name}SDK.new({ "apikey" => { "value" => CANARY["apikey"] }, "clean" => { "values" => CANARY["value"] } })
    rescue StandardError => e
      rejected = e
    end
    refute_nil rejected, "a credential mistyped as a map should be rejected"
    sinks.concat(Sweep.forms("rejected", rejected))

    # An error a feature hook raises, quoting the request, skips make_error.
    # The variant raising only in PreUnexpected reaches make_error's own
    # firing through a 404.
    hooked = nil
    [[SCENARIOS[0], ThrowFeature.new], [SCENARIOS[0], ThrowFeature.new(true, true)],
     [SCENARIOS[1], ThrowFeature.new(false, true)]].each do |scenario, hook|
      hooked = make_sdk(scenario, sinks, nil, [hook])
      refute_nil drive(hooked, target, { "explain" => {} }, sinks), "the throwing hook should fail the operation"
    end

    # Iterating a stream runs inside the same catch path as the operation,
    # and the explain record the caller passed is cleaned however it ends;
    # what the caller's own block raises passes through as it was raised.
    stream = ->(extra, explain = {}) {
      make_sdk(SCENARIOS[0], sinks, nil, extra).public_send(target["accessor"])
        .stream(target["op"], { "reqmatch" => target["match"].dup }, { "ctrl" => { "explain" => explain } })
    }
    failing = Enumerator.new { |_y| raise "stream saw #{CANARY['apikey']}" }
    [["stream", [StreamFeature.new(failing)]], ["stream-ok", [StreamOkFeature.new]],
     ["stream-plain", []]].each do |name, extra|
      explain = {}
      streamerr = nil
      begin
        stream.call(extra, explain).each { |_item| }
      rescue StandardError => e
        streamerr = e
      end
      assert_equal name == "stream", !streamerr.nil?, "#{name}: only the failing stream raises"
      sinks.concat(Sweep.forms(name, streamerr)) unless streamerr.nil?
      refute_empty explain, "#{name}: the explain record was not filled"
      sinks.concat(Sweep.forms("#{name}:explain", explain))
    end
    mine = RuntimeError.new("caller saw #{CANARY['apikey']}")
    got = begin
      stream.call([StreamFeature.new([1].each)]).each { |_item| raise mine }
    rescue StandardError => e
      e
    end
    assert_same mine, got, "the caller's own error should leave the stream as raised"

    # A registered value used as a property name is masked; names that
    # mask alike are all kept.
    named = hooked.get_utility.clean.call(hooked.get_root_ctx,
      { CANARY["header"] => 1, CANARY["value"] => 2, "plain" => 3 })
    assert_equal({ MASK => 1, "#{MASK}#1" => 2, "plain" => 3 }, named)
    sinks.concat(Sweep.forms("named", named))

    # The generated config's own clean block is read beside the caller's,
    # and is not changed by it.
    util = hooked.get_utility
    cfgclean = { "keys" => "zzsens", "values" => CANARY["config"] }
    built = util.make_options.call(util.make_context.call({
      "utility" => util,
      "config" => { "options" => { "clean" => cfgclean } },
      "options" => { "clean" => { "values" => CANARY["value"] } },
    }, nil))
    cfgctx = util.make_context.call({ "options" => built }, nil)
    seeded = util.clean.call(cfgctx, "config #{CANARY['config']} caller #{CANARY['value']}")
    sinks << { "name" => "config-clean", "text" => seeded.to_s }
    assert_equal "config #{MASK} caller #{MASK}", seeded
    assert_equal({ "my_zzsens" => MASK, "other" => "y" },
      util.clean.call(cfgctx, { "my_zzsens" => "x", "other" => "y" }))
    assert_equal({ "keys" => "zzsens", "values" => CANARY["config"] }, cfgclean)

    # With no clean option at all, the schema defaults still apply.
    bare = ${Name}SDK.new({
      "apikey" => CANARY["apikey"],
      "secret" => CANARY["secret"],
      "headers" => { "X-Custom-Token" => CANARY["header"] },
      "utility" => { "fetcher" => ->(_ctx, url, fetchdef) { SCENARIOS[1][1].call(url, fetchdef) } },
    })
    refute_nil drive(bare, target, { "explain" => {} }, sinks), "the 404 should fail"

    # A feature's name is not a field name: only the sensitive names inside
    # its settings register. An entity block, of per-entity settings or
    # seeded records keyed by entity name and id, is not read at all.
    featured = ${Name}SDK.new({
      "apikey" => CANARY["apikey"],
      "feature" => {
        "zzsecrets" => { "active" => false, "kind" => "PLAINSETTING-q8w2e4r6" },
        "zzfeat" => { "active" => false, "apitoken" => "FEATTOKEN-z9y8x7w6" },
        "test" => { "active" => false, "entity" => {
          "zztoken" => { "ZZTOKEN01" => { "note" => "PLAINRECORD-t5r3e1w9" } } } },
      },
      "entity" => { "zztoken" => { "alias" => { "zzkey" => "PLAINALIAS-m2n4b6v8" } } },
    })
    fclean = featured.get_utility.clean
    fplain = fclean.call(featured.get_root_ctx, "kind PLAINSETTING-q8w2e4r6")
    ftoken = fclean.call(featured.get_root_ctx, "token FEATTOKEN-z9y8x7w6")
    frecord = fclean.call(featured.get_root_ctx, "record PLAINRECORD-t5r3e1w9")
    falias = fclean.call(featured.get_root_ctx, "alias PLAINALIAS-m2n4b6v8")

    leaked = sinks
      .map { |s| [s["name"], Sweep.leaks(s["text"])] }
      .reject { |_, found| found.empty? }

    puts "clean: swept #{sinks.length} surface(s), #{leaked.length} leak(s)"

    assert_equal 0, leaked.length, "credential leaked through: " +
      leaked.map { |name, found| "#{name} [#{found.join(', ')}]" }.join("; ")

    # The positive half: the slot the credential travelled in is masked,
    # and an unregistered token in a response header is masked by name.
    notfound = errors["notfound/throw"]
    refute_nil notfound, "the 404 scenario must raise"
    assert_equal 404, notfound.status
    unless AUTH["suppressed"]
      spec = notfound.spec.is_a?(Hash) ? notfound.spec : {}
      if AUTH["where"] == "query"
        assert_equal MASK, Sweep.header(spec["query"], AUTH["name"])
      elsif AUTH["where"] == "cookie"
        cookie = Sweep.header(spec["headers"], "cookie").to_s
        assert cookie.include?(MASK), "cookie: #{cookie}"
      else
        got = Sweep.header(spec["headers"], AUTH["name"]).to_s
        assert got.end_with?(MASK), "#{AUTH['name']}: #{got}"
      end
    end
    assert_equal MASK, Sweep.header(notfound.spec["headers"], "x-custom-token")

    coded = errors["coded/throw"]
    assert coded.is_a?(${Name}Error) && coded.code == "denied_#{MASK}", coded.inspect

    assert_equal "kind PLAINSETTING-q8w2e4r6", fplain
    assert_equal "token #{MASK}", ftoken
    assert_equal "record PLAINRECORD-t5r3e1w9", frecord
    assert_equal "alias PLAINALIAS-m2n4b6v8", falias

    explained = explains["ok/explain"] || {}
    refute_nil explained["result"], "the explain record should carry the result"
    assert_equal MASK, Sweep.header(explained["result"]["headers"], "x-session-token")
  end

  def test_the_sweep_can_see_a_leak_clean_switched_off_shows_the_credential
    target = usable_op
    skip "no operation of this SDK completes against a plain 200; nothing to sweep" if target.nil?

    sinks = []
    sdk = make_sdk(SCENARIOS[1], sinks, { "active" => false })
    err = drive(sdk, target, {}, sinks)
    refute_nil err

    # Explaining a failure must not cost it its error.
    explained = drive(make_sdk(SCENARIOS[1], [], { "active" => false }), target, { "explain" => {} }, [])
    assert_equal err.message, explained&.message, "with clean off, explain lost the error"

    leaked = sinks.select { |s| !Sweep.leaks(s["text"]).empty? }
    assert !leaked.empty?, "with clean off, nothing showed the canary: the sweep is blind"

    unless AUTH["suppressed"]
      # With clean off the spec is the live object; its default print shows
      # every field.
      text = err.spec.inspect
      pair = ["#{CANARY['apikey']}:#{CANARY['secret']}"].pack("m0")
      assert text.include?(CANARY["apikey"]) || text.include?(pair),
        "the raw spec should carry the credential when clean is off"
    end
  end
end
`
}


export {
  TestClean
}
