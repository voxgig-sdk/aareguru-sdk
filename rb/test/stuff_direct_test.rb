# Stuff direct test

require "minitest/autorun"
require "json"
require_relative "../Aareguru_sdk"
require_relative "runner"

class StuffDirectTest < Minitest::Test
  def test_direct_load_stuff
    setup = stuff_direct_setup({ "id" => "direct01" })
    client = setup[:client]


    result, err = client.direct({
      "path" => "logs",
      "method" => "GET",
      "params" => {},
    })
    assert_nil err
    assert result["ok"]
    assert_equal 200, Helpers.to_int(result["status"])
    assert !result["data"].nil?

    unless setup[:live]
      if result["data"].is_a?(Hash)
        assert_equal "direct01", result["data"]["id"]
      end
      assert_equal 1, setup[:calls].length
    end
  end

end


def stuff_direct_setup(mockres)
  Runner.load_env_local

  calls = []

  env = Runner.env_override({
    "AAREGURU_TEST_STUFF_ENTID" => {},
    "AAREGURU_TEST_LIVE" => "FALSE",
    "AAREGURU_APIKEY" => "NONE",
  })

  live = env["AAREGURU_TEST_LIVE"] == "TRUE"

  if live
    merged_opts = {
      "apikey" => env["AAREGURU_APIKEY"],
    }
    client = AareguruSDK.new(merged_opts)
    return {
      client: client,
      calls: calls,
      live: true,
      idmap: {},
    }
  end

  mock_fetch = ->(url, init) {
    calls.push({ "url" => url, "init" => init })
    return {
      "status" => 200,
      "statusText" => "OK",
      "headers" => {},
      "json" => ->() {
        if !mockres.nil?
          return mockres
        end
        return { "id" => "direct01" }
      },
      "body" => "mock",
    }, nil
  }

  client = AareguruSDK.new({
    "base" => "http://localhost:8080",
    "system" => {
      "fetch" => mock_fetch,
    },
  })

  {
    client: client,
    calls: calls,
    live: false,
    idmap: {},
  }
end
