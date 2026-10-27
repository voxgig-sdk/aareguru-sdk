# Aareguru SDK utility: result_body
module AareguruUtilities
  ResultBody = ->(ctx) {
    response = ctx.response
    result = ctx.result
    if result && response && response.json_func && response.body
      result.body = response.json_func.call
    end
    if result && response && response.unreadable
      sent = ctx.spec ? ctx.spec.headers : nil
      result.err = UnreadableBody.call(ctx, result.status, result.headers, response.body,
                                       sent, result.err)
    end
    result
  }

  BODY_PREVIEW_LENGTH = 160

  # A body that is not JSON. An HTTP failure keeps its own error, with the
  # response described; otherwise the code tells a wrong content type from
  # malformed JSON.
  UnreadableBody = ->(ctx, status, headers, text, sent, failed) {
    ctype = BodyHeader.call(headers, "content-type")
    agent = ctx.utility.clean.call(ctx, BodyHeader.call(sent, "user-agent")).to_s
    agent = "transport default" if agent.empty?
    detail = "HTTP #{status}, content-type #{ctype.empty? ? 'none' : ctype}, user-agent #{agent}"
    detail += ", body: " + BodyPreview.call(ctx, text) unless text.nil?

    if failed
      return "#{failed} (#{detail})" if failed.is_a?(String)
      message = "#{failed.message} (#{detail})"
      return RuntimeError.new(message) unless failed.is_a?(AareguruError)
      failed.msg = message
      return failed
    end

    if ctype.empty? || ctype.downcase.include?("json")
      ctx.make_error("response_json_invalid", "response: body is not valid JSON (#{detail})")
    else
      ctx.make_error("response_content_type", "response: expected JSON, got #{ctype} (#{detail})")
    end
  }

  BodyHeader = ->(headers, name) {
    return "" unless headers.is_a?(Hash)
    pair = headers.find { |key, _| key.to_s.downcase == name }
    pair ? pair[1].to_s : ""
  }

  # Cleaned whole: a secret the bound would split could leave its prefix.
  BodyPreview = ->(ctx, text) {
    raw = text.to_s.dup.force_encoding(Encoding::UTF_8).scrub("?")
    flat = ctx.utility.clean.call(ctx, raw.gsub(/\s+/, " ").strip).to_s
    flat.length > BODY_PREVIEW_LENGTH ? flat[0, BODY_PREVIEW_LENGTH] + "..." : flat
  }
end
