# Aareguru SDK utility: fetcher
require_relative 'struct/voxgig_struct'
require 'net/http'
require 'uri'
require 'json'

module AareguruUtilities
  # Started Net::HTTP connections keyed by scheme, host, port and proxy,
  # checked out for one request and returned. A Net::HTTP serves one
  # request at a time, so the pool holds idle ones rather than sharing one.
  HTTP_POOL = Hash.new { |h, k| h[k] = [] }
  HTTP_POOL_LOCK = Mutex.new
  HTTP_POOL_IDLE_MAX = 4

  def self.http_checkout(key, uri, proxy)
    http = HTTP_POOL_LOCK.synchronize { HTTP_POOL[key].pop }
    return http if http && http.started?

    if proxy
      purl = URI.parse(proxy)
      http = Net::HTTP.new(uri.host, uri.port, purl.host, purl.port, purl.user, purl.password)
    else
      http = Net::HTTP.new(uri.host, uri.port)
    end
    http.use_ssl = (uri.scheme == "https")
    http.start
  end

  def self.http_checkin(key, http)
    kept = HTTP_POOL_LOCK.synchronize do
      HTTP_POOL[key].size < HTTP_POOL_IDLE_MAX && HTTP_POOL[key].push(http)
    end
    http.finish unless kept
  rescue IOError
    nil
  end

  def self.http_discard(http)
    http.finish if http.started?
  rescue IOError
    nil
  end

  GETONLY_ENV = "VOXGIG_GETONLY_GUARD"

  # A GET-only live run refuses any other method before it is sent. The error
  # names the path alone: the query can carry a credential.
  def self.getonly_refusal(ctx, fullurl, method)
    method = method.to_s.upcase
    method = "GET" if method.empty?
    return nil if ENV[GETONLY_ENV] != "TRUE" || method == "GET"
    rest = fullurl.to_s
    rest = rest.split("://", 2)[1].sub(%r{\A[^/?#]*}, "") if rest.include?("://")
    path = rest[/\A[^?#]*/]
    path = "/" if path.empty?
    ctx.make_error("fetch_getonly_block", "[GET-ONLY GUARD] blocked #{method} #{path}")
  end

  DefaultHttpFetch = ->(fullurl, fetchdef) {
    method_str = fetchdef["method"] || "GET"
    body_str = fetchdef["body"]
    headers = fetchdef["headers"] || {}

    begin
      uri = URI.parse(fullurl)
      proxy = fetchdef["proxy"]
      proxy = nil unless proxy.is_a?(String) && !proxy.empty?
      key = [uri.scheme, uri.host, uri.port, proxy]

      klass = case method_str.upcase
              when "POST" then Net::HTTP::Post
              when "PUT" then Net::HTTP::Put
              when "DELETE" then Net::HTTP::Delete
              when "PATCH" then Net::HTTP::Patch
              else Net::HTTP::Get
              end

      request = klass.new(uri)
      has_ua = false
      headers.each do |k, v|
        next unless v.is_a?(String)
        has_ua = true if k.to_s.downcase == 'user-agent'
        request[k] = v.to_s
      end
      # Default User-Agent — Net::HTTP sets "Ruby" which some CDNs block.
      # Use a Mozilla-shaped UA unless the caller already set one, and record
      # it with the headers the request sent.
      unless has_ua
        request['User-Agent'] = 'Mozilla/5.0 (compatible; AareguruSDK/1.0)'
        fetchdef["headers"]['user-agent'] = request['User-Agent'] if fetchdef["headers"].is_a?(Hash)
      end
      if body_str.is_a?(String)
        request.body = body_str
      elsif body_str.respond_to?(:read)
        request.body_stream = body_str
        if body_str.respond_to?(:size)
          request['Content-Length'] = body_str.size.to_s
        else
          request['Transfer-Encoding'] = 'chunked'
        end
      end

      http = AareguruUtilities.http_checkout(key, uri, proxy)
      begin
        # Net::HTTP retries idempotent requests; an EOF can follow a committed POST.
        resp = http.request(request)
      rescue StandardError
        AareguruUtilities.http_discard(http)
        raise
      end
      AareguruUtilities.http_checkin(key, http)

      resp_headers = {}
      resp.each_header { |k, v| resp_headers[k.downcase] = v }

      json_body = nil
      unreadable = false
      begin
        json_body = JSON.parse(resp.body) if resp.body && !resp.body.strip.empty?
      rescue JSON::ParserError
        unreadable = true
      end

      return {
        "status" => resp.code.to_i,
        "statusText" => resp.message,
        "headers" => resp_headers,
        "json" => -> { json_body },
        "body" => resp.body,
        "unreadable" => unreadable,
      }, nil
    rescue StandardError => e
      # A request that got no answer (DNS, TCP, TLS, a timeout) fails the operation.
      return nil, "#{e.class}: #{e.message}"
    end
  }

  Fetcher = ->(ctx, fullurl, fetchdef) {
    if ctx.client.mode != "live"
      return nil, ctx.make_error("fetch_mode_block",
        "Request blocked by mode: \"#{ctx.client.mode}\" (URL was: \"#{fullurl}\")")
    end

    options = ctx.client.options_map
    if VoxgigStruct.getpath(options, "feature.test.active") == true
      return nil, ctx.make_error("fetch_test_block",
        "Request blocked as test feature is active (URL was: \"#{fullurl}\")")
    end

    sys_fetch = VoxgigStruct.getpath(options, "system.fetch")

    if sys_fetch.nil?
      refused = AareguruUtilities.getonly_refusal(ctx, fullurl, fetchdef["method"])
      return nil, refused if refused
      return DefaultHttpFetch.call(fullurl, fetchdef)
    end
    return sys_fetch.call(fullurl, fetchdef) if sys_fetch.is_a?(Proc)

    return nil, ctx.make_error("fetch_invalid", "system.fetch is not a valid function")
  }
end
