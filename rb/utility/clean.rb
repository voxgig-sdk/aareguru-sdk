# Aareguru SDK utility: clean
require 'json'
require 'set'
require_relative '../schema'
require_relative '../core/error'
require_relative 'struct/voxgig_struct'

module AareguruUtilities
  # Everything that leaves the pipeline passes through clean: the error, the
  # explain record, the serialised context, and whatever a feature emits.
  # Two layers: every registered secret VALUE (and its encoded forms) is
  # replaced wherever it appears in a string, and every value under a
  # sensitive KEY name is masked whatever it holds. Inside the pipeline data
  # stays raw, so a hook can still read the header it must add to.
  module CleanSupport
    MAXDEPTH = 32
    CIRCULAR = "[circular]"

    # Marks a value the copy must omit (a Proc), as ts omits `undefined`.
    DROP = Object.new.freeze

    def self.normkey(key)
      key.to_s.downcase.gsub(/[-_]/, "")
    end

    def self.splitkeys(keys)
      (keys.nil? ? "" : keys.to_s).split(/\s*,\s*/).map { |k| normkey(k) }.reject(&:empty?)
    end

    # The comma-separated literal values a caller registers; a list is taken
    # as-is for a caller that has one.
    def self.splitvalues(values)
      return values.select { |v| v.is_a?(String) } if values.is_a?(Array)
      (values.nil? ? "" : values.to_s).split(/\s*,\s*/).reject(&:empty?)
    end

    # The spec carries numbers as strings, so every target reads it alike.
    def self.count(val, dflt)
      n = Float(val.to_s, exception: false)
      n.nil? || n.nan? || n.infinite? || n < 0 ? dflt : n.floor
    end

    # The derived block make_options builds; a context without options
    # (make_error is reached with a bare one) falls back to the schema
    # defaults, so nothing leaves raw for want of a constructor. A Hash
    # stands in for a context before one exists (make_options).
    def self.config(ctx)
      opts = ctx.respond_to?(:options) ? ctx.options : (ctx.is_a?(Hash) ? ctx["options"] : nil)
      derived = opts.is_a?(Hash) ? VoxgigStruct.getpath(opts, "__derived__.clean") : nil
      return derived if derived.is_a?(Hash)
      make_config(AareguruSchema::OPTSPEC["clean"])
    end

    def self.make_config(cleanopts)
      opts = cleanopts.is_a?(Hash) ? cleanopts : {}
      {
        "active" => opts["active"] != false,
        "keys" => splitkeys(opts["keys"]),
        "values" => [],
        "mask" => opts["mask"].is_a?(String) ? opts["mask"] : "[redacted]",
        "hint" => count(opts["hint"], 0),
        "min" => [1, count(opts["min"], 4)].max,
      }
    end

    # encodeURIComponent, byte for byte: the form a query credential travels in.
    def self.pct(value)
      value.gsub(/[^A-Za-z0-9\-_.!~*'()]/) { |c| c.bytes.map { |b| format("%%%02X", b) }.join }
    end

    # The encoded forms a value travels in: Basic and Bearer both carry
    # base64, a query credential is percent-encoded, and a JSON dump escapes it.
    def self.forms(value)
      out = [value]
      add = ->(s) { out << s unless s.empty? || out.include?(s) }
      add.call([value].pack("m0"))
      add.call(pct(value))
      begin
        add.call(JSON.generate(value)[1..-2])
      rescue StandardError
        nil
      end
      out
    end

    # Register a secret value. Idempotent; shorter than `min` is not a secret
    # the SDK can mask without blanking ordinary text.
    def self.add(ctx, value)
      cfg = config(ctx)
      return unless value.is_a?(String) && value.length >= cfg["min"]
      values = cfg["values"]
      changed = false
      forms(value).each do |form|
        next if form.length < cfg["min"] || values.include?(form)
        values << form
        changed = true
      end
      values.sort_by! { |v| -v.length } if changed
      nil
    end

    def self.mask_value(cfg, value)
      hint = cfg["hint"]
      return cfg["mask"] + value[-hint..] if hint > 0 && value.length > 2 * hint
      cfg["mask"]
    end

    def self.clean_string(cfg, text)
      out = text
      cfg["values"].each do |value|
        next unless out.include?(value)
        masked = mask_value(cfg, value)
        out = out.gsub(value) { masked }
      end
      out
    end

    def self.sensitive_key?(cfg, key)
      return false if key.nil? || key.is_a?(Integer)
      nk = normkey(key)
      cfg["keys"].any? { |k| nk.include?(k) }
    end

    # A plain-data copy of what is about to leave: `to_h` is honoured (an
    # entity gives its data, a context its record), procs are dropped,
    # cycles are cut, and no live object is shared with the copy - masking
    # the copy must never mask the pipeline's own spec. An object without a
    # `to_h` copies as its instance variables, an exception as its message
    # and fields; its `ctx` is the one field never copied, as the context
    # holds the error that holds the context.
    def self.snapshot(cfg, val, key, depth, seen)
      return val if val.nil?

      if val.is_a?(String)
        return sensitive_key?(cfg, key) ? mask_value(cfg, val) : clean_string(cfg, val)
      end

      return DROP if val.is_a?(Proc) || val.is_a?(Method)

      if val.is_a?(Numeric) || val == true || val == false || val.is_a?(Symbol)
        return sensitive_key?(cfg, key) ? cfg["mask"] : val
      end

      return CIRCULAR if depth >= MAXDEPTH || seen.any? { |s| s.equal?(val) }

      return cfg["mask"] if sensitive_key?(cfg, key)

      seen.push(val)
      begin
        if val.is_a?(Array)
          out = []
          val.each_with_index do |item, i|
            v = snapshot(cfg, item, i, depth + 1, seen)
            out << v unless v.equal?(DROP)
          end
          return out
        end

        return plain(cfg, val, depth, seen) if val.is_a?(Hash)

        if val.is_a?(Exception)
          out = { "message" => clean_string(cfg, val.message.to_s) }
          val.instance_variables.each do |ivar|
            name = ivar.to_s.delete_prefix("@")
            next if name == "ctx"
            v = snapshot(cfg, val.instance_variable_get(ivar), name, depth + 1, seen)
            out[clean_name(cfg, out, name)] = v unless v.equal?(DROP)
          end
          return out
        end

        if val.is_a?(Struct) || (val.respond_to?(:to_h) && !val.is_a?(Enumerable))
          begin
            return snapshot(cfg, val.to_h, key, depth + 1, seen)
          rescue StandardError
            nil
          end
        end

        return snapshot(cfg, val.to_a, key, depth + 1, seen) if val.is_a?(Set)

        ivars(cfg, val, depth, seen)
      ensure
        seen.pop
      end
    end

    def self.plain(cfg, val, depth, seen)
      out = {}
      val.each do |k, v|
        c = snapshot(cfg, v, k, depth + 1, seen)
        out[clean_name(cfg, out, k)] = c unless c.equal?(DROP)
      end
      out
    end

    def self.ivars(cfg, val, depth, seen)
      out = {}
      val.instance_variables.each do |ivar|
        name = ivar.to_s.delete_prefix("@")
        c = snapshot(cfg, val.instance_variable_get(ivar), name, depth + 1, seen)
        out[clean_name(cfg, out, name)] = c unless c.equal?(DROP)
      end
      out
    end

    # A registered value used as a property name is masked like any other
    # string; names that mask alike take a counter, so none is lost.
    def self.clean_name(cfg, out, key)
      return key unless key.is_a?(String)
      name = clean_string(cfg, key)
      return name if name == key || !out.key?(name)
      i = 1
      i += 1 while out.key?("#{name}##{i}")
      "#{name}##{i}"
    end

    # Does any message along the cause chain hold a registered value?
    def self.dirty_chain?(cfg, err)
      seen = []
      until err.nil? || seen.any? { |s| s.equal?(err) }
        return true if clean_string(cfg, err.message.to_s) != err.message.to_s
        seen << err
        err = err.cause
      end
      false
    end

    # Clean a value on its way out. A string is redacted; an SDK error is
    # redacted IN PLACE (it is about to be raised, and its identity matters
    # to the caller); another exception's message cannot be rewritten, so a
    # changed one comes back as the same class carrying the cleaned text;
    # anything else comes back as a masked plain-data copy.
    def self.clean(ctx, val)
      cfg = config(ctx)

      return val if cfg["active"] == false

      return clean_string(cfg, val) if val.is_a?(String)

      if val.is_a?(Exception)
        if val.is_a?(AareguruError)
          val.msg = clean_string(cfg, val.msg.to_s)
          val.instance_variables.each do |ivar|
            name = ivar.to_s.delete_prefix("@")
            next if name == "ctx" || name == "msg"
            v = val.instance_variable_get(ivar)
            if v.is_a?(String)
              val.instance_variable_set(ivar,
                sensitive_key?(cfg, name) ? mask_value(cfg, v) : clean_string(cfg, v))
            elsif !v.nil? && !v.is_a?(Numeric) && v != true && v != false
              val.instance_variable_set(ivar, snapshot(cfg, v, name, 1, []))
            end
          end
          return val
        end

        # full_message prints the cause chain, so a dirty cause is dropped:
        # a fresh exception carries none until it is raised.
        return val unless dirty_chain?(cfg, val)
        msg = clean_string(cfg, val.message.to_s)
        out = val.class.exception(msg)
        out.set_backtrace(val.backtrace) if val.backtrace
        return out
      end

      out = snapshot(cfg, val, nil, 0, [])
      out.equal?(DROP) ? nil : out
    end

    # Every scalar under a sensitive name, at any depth and of any shape: a
    # credential mistyped as a map or a number is still a credential, and
    # the validation error that rejects it quotes it.
    def self.add_sensitive(ctx, val, under = false, depth = 0, seen = [])
      return if val.nil? || depth >= MAXDEPTH
      if val.is_a?(String) || val.is_a?(Integer) || val.is_a?(Float)
        add(ctx, val.to_s) if under
        return
      end
      return unless val.is_a?(Hash) || val.is_a?(Array)
      return if seen.any? { |s| s.equal?(val) }
      seen << val
      if val.is_a?(Hash)
        val.each { |k, v| add_sensitive(ctx, v, under || key?(ctx, k), depth + 1, seen) }
      else
        val.each { |v| add_sensitive(ctx, v, under, depth + 1, seen) }
      end
    end

    # A feature's name is not a field name: only the sensitive names inside
    # its settings count, so `secrets` does not make every setting a secret.
    # Entity blocks (per-entity settings, seeded records) hold no credential.
    def self.add_options(ctx, opts)
      top = opts.reject { |k, _| k == "feature" || k == "entity" }
      top["test"] = no_entity(top["test"]) if top.key?("test")
      add_sensitive(ctx, top)
      feature = opts["feature"]
      blocks = feature.is_a?(Hash) ? feature.values : (feature.is_a?(Array) ? feature : [feature])
      blocks.each { |fopts| add_sensitive(ctx, no_entity(fopts)) }
    end

    def self.no_entity(block)
      block.is_a?(Hash) ? block.reject { |k, _| k == "entity" } : block
    end

    # Is this key name sensitive under the context's clean configuration?
    def self.key?(ctx, key)
      sensitive_key?(config(ctx), key)
    end
  end

  Clean = ->(ctx, val) { CleanSupport.clean(ctx, val) }

  CleanAdd = ->(ctx, value) { CleanSupport.add(ctx, value) }
end
