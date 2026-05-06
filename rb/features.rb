# Aareguru SDK feature factory

require_relative 'feature/base_feature'
require_relative 'feature/test_feature'


module AareguruFeatures
  def self.make_feature(name)
    case name
    when "base"
      AareguruBaseFeature.new
    when "test"
      AareguruTestFeature.new
    else
      AareguruBaseFeature.new
    end
  end
end
