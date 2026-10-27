# Aareguru SDK utility: prepare_auth
require_relative 'struct/voxgig_struct'
module AareguruUtilities
  HEADER_AUTH = "authorization"
  OPTION_APIKEY = "apikey"
  NOT_FOUND = "__NOTFOUND__"

  PrepareAuth = ->(ctx) {
    spec = ctx.spec
    return nil, ctx.make_error("auth_no_spec", "Expected context spec property to be defined.") unless spec

    headers = spec.headers
    options = ctx.client.options_map

    # Public APIs that need no auth omit the options.auth block entirely.
    if options["auth"].nil?
      headers.delete(HEADER_AUTH)
      return spec, nil
    end

    # The client's auth.name option, when set, replaces the name the API declares.
    auth_name = VoxgigStruct.getpath(options, "auth.name")
    name = auth_name.is_a?(String) && !auth_name.empty? ? auth_name.downcase : HEADER_AUTH

    # A credential left under the declared name would travel beside the renamed one.
    headers.delete(HEADER_AUTH) unless name == HEADER_AUTH

    apikey = VoxgigStruct.getprop(options, OPTION_APIKEY, NOT_FOUND)

    if apikey.nil? || (apikey.is_a?(String) && (apikey == NOT_FOUND || apikey == ""))
      headers.delete(name)
    else
      auth_prefix = VoxgigStruct.getpath(options, "auth.prefix") || ""
      apikey_val = apikey.is_a?(String) ? apikey : ""
      # Empty prefix (raw apiKey credential) must not add a leading space.
      headers[name] =
        auth_prefix.empty? ? apikey_val : "#{auth_prefix} #{apikey_val}"
    end

    return spec, nil
  }
end
