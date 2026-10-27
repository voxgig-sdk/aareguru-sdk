# Aareguru SDK utility: media
require_relative 'struct/voxgig_struct'

# The media types a point declares: `response` (the model's `rs`) for the
# Accept header, and `body` (the model's `rb`) for the request body.
module AareguruUtilities
  # The data key holding a raw request body. Like `$action`, it can never be
  # a declared argument name.
  RAW_BODY = "$body"

  def self.json_media?(media)
    m = media.to_s.split(";").first.to_s.strip.downcase
    m == "application/json" || m == "text/json" || m.end_with?("+json")
  end

  # The declared JSON type alone, else every declared type in the model's
  # order; nil when no success response declares a body.
  def self.accept_of(point)
    res = VoxgigStruct.getprop(point, "response")
    media = VoxgigStruct.getprop(res, "media")
    return nil unless media.is_a?(String) && !media.empty?
    return media if VoxgigStruct.getprop(res, "kind") == "json"
    alts = VoxgigStruct.getprop(res, "alternatives")
    types = [media]
    (alts.is_a?(Array) ? alts : []).each do |alt|
      m = VoxgigStruct.getprop(alt, "media")
      types << m if m.is_a?(String) && !m.empty?
    end
    types.join(", ")
  end

  def self.raw_request?(point)
    VoxgigStruct.getpath(point, "body.kind") == "raw"
  end

  def self.json_request?(point)
    VoxgigStruct.getpath(point, "body.kind") == "json"
  end

  # Bytes or a stream go as given. A hash or an array is JSON, and so is a
  # scalar on a point that declares a JSON body.
  def self.request_body(point, body)
    return body if body.respond_to?(:read) || (body.is_a?(String) && body.encoding == Encoding::BINARY)
    return VoxgigStruct.jsonify(body) if VoxgigStruct.isnode(body) || json_request?(point)
    body
  end

  def self.header?(headers, name)
    headers.keys.any? { |k| k.is_a?(String) && k.downcase == name }
  end

  # A caller's accept wins. A declared request type replaces each JSON
  # content-type, the SDK default, and leaves any other the caller set.
  def self.media_headers(point, headers)
    accept = accept_of(point)
    headers["accept"] = accept if accept && !header?(headers, "accept")

    body = VoxgigStruct.getprop(point, "body")
    kind = VoxgigStruct.getprop(body, "kind")
    media = VoxgigStruct.getprop(body, "media")
    if (kind == "raw" || kind == "json") && media.is_a?(String) && !media.empty?
      headers.delete_if { |k, v| k.is_a?(String) && k.downcase == "content-type" && json_media?(v) }
      headers["content-type"] = media unless header?(headers, "content-type")
    end
    headers
  end

  # A String, of bytes or text, or an IO, sent as it is. An IO can be read
  # once, so it is read here, before the first attempt, and a retry sends the
  # same bytes again.
  def self.raw_body(reqdata)
    body = reqdata.is_a?(Hash) ? reqdata[RAW_BODY] : nil
    body.respond_to?(:read) ? body.read : body
  end
end
