# Aareguru SDK utility: make_url
require_relative 'struct/voxgig_struct'
module AareguruUtilities
  MakeUrl = ->(ctx) {
    spec = ctx.spec
    result = ctx.result

    return "", ctx.make_error("url_no_spec", "Expected context spec property to be defined.") unless spec
    return "", ctx.make_error("url_no_result", "Expected context result property to be defined.") unless result

    url = VoxgigStruct.join([spec.base, spec.prefix, spec.path, spec.suffix], "/", true)
    resmatch = {}

    # Sent with the request, never recorded as the entity's match.
    authquery = (spec.respond_to?(:authquery) ? spec.authquery : nil) || []

    # A route the definition ends with a slash keeps it, for a Django REST server,
    # and a host with no path takes /, or luasocket reads a query as the host.
    orig = ctx.point ? VoxgigStruct.getprop(ctx.point, "orig") : nil
    if orig.is_a?(String) && orig.end_with?("/") && spec.suffix.to_s.empty? && !url.end_with?("/")
      url += "/"
    end
    authority = url.index("://")
    url += "/" if authority && 0 < authority && url[(authority + 3)..] !~ %r{[/?#]}

    param_items = VoxgigStruct.items(spec.params)
    if param_items
      param_items.each do |item|
        key = item[0]
        val = item[1]
        if val && key.is_a?(String)
          placeholder = "{#{key}}"
          val_str = val.is_a?(String) ? val : val.to_s
          # A whole . or .. is a dot segment, which moves the request to another route.
          if [".", ".."].include?(val_str)
            return "", ctx.make_error("url_param_invalid", "URL path parameter #{key} cannot be \"#{val_str}\".")
          end
          encoded = VoxgigStruct.escurl(val_str)
          url = url.gsub(placeholder, encoded)
          resmatch[key] = val
        end
      end
    end

    # A placeholder left in the route would send the request to the wrong route.
    # The base's own placeholders are server variables, resolved with the options.
    base = spec.base.is_a?(String) ? spec.base.sub(%r{/+\z}, "") : ""
    route = url.delete_prefix(base)
    unfilled = route.scan(/\{[^{}\/]+\}/)
    unless unfilled.empty?
      return "", ctx.make_error("url_param_missing", "URL path has no value for #{unfilled.join(', ')}.")
    end

    # Append query string from spec.query.
    qsep = "?"
    query_items = VoxgigStruct.items(spec.respond_to?(:query) ? spec.query : nil)
    if query_items
      query_items.each do |item|
        key = item[0]
        val = item[1]
        if val && key.is_a?(String)
          val_str = val.is_a?(String) ? val : val.to_s
          url += qsep + VoxgigStruct.escurl(key) + "=" + VoxgigStruct.escurl(val_str)
          qsep = "&"
          resmatch[key] = val unless authquery.include?(key)
        end
      end
    end

    result.resmatch = resmatch
    return url, nil
  }
end
