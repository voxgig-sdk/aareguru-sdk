# Aareguru SDK feature factory

require_relative 'feature/base_feature'
require_relative 'feature/ratelimit_feature'
require_relative 'feature/retry_feature'
require_relative 'feature/test_feature'
require_relative 'feature/timeout_feature'


module AareguruFeatures
  def self.make_feature(name)
    case name
    when "base"
      AareguruBaseFeature.new
    when "ratelimit"
      AareguruRatelimitFeature.new
    when "retry"
      AareguruRetryFeature.new
    when "test"
      AareguruTestFeature.new
    when "timeout"
      AareguruTimeoutFeature.new
    else
      AareguruBaseFeature.new
    end
  end
end
