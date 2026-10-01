# Aareguru SDK error

require 'json'

class AareguruError < StandardError
  attr_accessor :is_sdk_error, :sdk, :code, :msg, :ctx, :result, :spec, :status

  def initialize(code = "", msg = "", ctx = nil)
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
end
