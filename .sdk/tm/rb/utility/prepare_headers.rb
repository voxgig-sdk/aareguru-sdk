# Aareguru SDK utility: prepare_headers
require_relative 'struct/voxgig_struct'
require_relative 'param'
require_relative 'media'
module AareguruUtilities
  # The form style of a cookie parameter: a list repeats the name, a map sends
  # its own keys, and every value is percent-encoded.
  def self.cookie_pair(wire, val)
    esc = ->(v) { VoxgigStruct.escurl(VoxgigStruct.stringify(v)) }
    pairs = if VoxgigStruct.islist(val)
      val.map { |item| "#{wire}=#{esc.call(item)}" }
    elsif VoxgigStruct.ismap(val)
      VoxgigStruct.keysof(val).map { |key| "#{VoxgigStruct.escurl(key)}=#{esc.call(val[key])}" }
    else
      ["#{wire}=#{esc.call(val)}"]
    end
    pairs.join("; ")
  end
  PrepareHeaders = ->(ctx) {
    options = ctx.client.options_map
    headers = VoxgigStruct.getprop(options, "headers")
    out = headers ? VoxgigStruct.clone(headers) : {}
    out = {} unless out.is_a?(Hash)
    out = AareguruUtilities.media_headers(ctx.point, out)
    # A header argument replaces a default of the same name, whatever its case.
    AareguruUtilities.call_args(ctx, "header").each do |_name, orig, val|
      next if val.nil?
      wire = orig.downcase
      out.delete_if { |k, _| k.is_a?(String) && k.downcase == wire }
      out[wire] = VoxgigStruct.stringify(val)
    end
    # A cookie argument travels in the cookie header, form serialized and
    # percent-encoded, replacing a cookie of the same name among those the
    # caller's headers already send.
    sent = AareguruUtilities.call_args(ctx, "cookie").reject { |_name, _orig, val| val.nil? }
    unless sent.empty?
      names = sent.flat_map do |_name, orig, val|
        VoxgigStruct.ismap(val) ? VoxgigStruct.keysof(val).map { |k| VoxgigStruct.escurl(k) } : [orig]
      end
      kept = []
      out.keys.select { |k| k.is_a?(String) && k.downcase == "cookie" }.each do |k|
        given = out.delete(k)
        next unless given.is_a?(String)
        kept.concat(AareguruUtilities.cookie_keep(given, names))
      end
      sent.each do |_name, orig, val|
        pair = AareguruUtilities.cookie_pair(orig, val)
        kept << pair unless pair.empty?
      end
      out["cookie"] = kept.join("; ") unless kept.empty?
    end
    out
  }

  # The caller's cookie pieces with the named cookies removed: a cookie is one
  # ;-delimited piece, whatever its value holds.
  def self.cookie_keep(header, names)
    header.split(";").each_with_object([]) do |piece, kept|
      cookie = piece.strip
      kept << cookie unless cookie.empty? || names.include?(cookie.split("=", 2)[0].to_s.strip)
    end
  end
end
