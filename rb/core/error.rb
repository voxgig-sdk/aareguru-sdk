# Aareguru SDK error

require 'json'

class AareguruError < StandardError
  attr_accessor :is_sdk_error, :sdk, :code, :msg, :ctx, :result, :spec, :status

  # The message is the one positional argument, as for any Ruby exception, so
  # `e.class.new(e.message)` rebuilds an error that still says what failed.
  def initialize(msg = "", code: "", ctx: nil)
    super(msg)
    @is_sdk_error = true
    @sdk = "Aareguru"
    @code = code
    @msg = msg
    # Reachable for a debugger, absent from every serialiser below: the
    # context holds the live spec and options, and an error is what gets
    # logged.
    @ctx = ctx
    @result = nil
    @spec = nil
    # make_error promotes the HTTP status here so a consumer can branch on
    # `err.status` without reaching into `err.result`. Ruby needs the
    # accessor declared: unlike Python or Lua, assigning an undeclared
    # attribute is a NoMethodError, not a new field.
    @status = -1
  end

  def error
    @msg
  end

  # `err.not_found?` rather than a magic number at every call site.
  def not_found?
    404 == @status
  end

  def to_s
    @msg
  end

  def inspect
    "#<#{self.class.name} #{@code.inspect} #{@status}: #{@msg}>"
  end

  # What make_error attached is already cleaned; the context is not part of
  # the record.
  def to_h
    {
      "sdk" => @sdk,
      "code" => @code,
      "message" => @msg,
      "status" => @status,
      "result" => @result,
      "spec" => @spec,
    }
  end

  def as_json(*)
    to_h
  end

  def to_json(*args)
    to_h.to_json(*args)
  end

  # Marshal leaves the context out too: it holds procs, and minitest replaces
  # an error Marshal refuses. An exception cannot take marshal_load, hence
  # _dump and _load.
  def _dump(_level)
    Marshal.dump(to_h.merge("backtrace" => backtrace))
  end

  def self._load(data)
    record = Marshal.load(data)
    err = new(record["message"], code: record["code"])
    err.status = record["status"]
    err.result = record["result"]
    err.spec = record["spec"]
    err.set_backtrace(record["backtrace"]) unless record["backtrace"].nil?
    err
  end
end
