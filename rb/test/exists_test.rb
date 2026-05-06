# Aareguru SDK exists test

require "minitest/autorun"
require_relative "../Aareguru_sdk"

class ExistsTest < Minitest::Test
  def test_create_test_sdk
    testsdk = AareguruSDK.test(nil, nil)
    assert !testsdk.nil?
  end
end
