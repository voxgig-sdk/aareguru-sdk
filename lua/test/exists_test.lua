-- ProjectName SDK exists test

local sdk = require("aareguru_sdk")

describe("AareguruSDK", function()
  it("should create test SDK", function()
    local testsdk = sdk.test(nil, nil)
    assert.is_not_nil(testsdk)
  end)
end)
