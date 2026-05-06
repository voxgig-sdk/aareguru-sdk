package = "aareguru-sdk"
version = "0.0-1"
source = {
  url = "git://github.com/voxgig/aareguru-sdk.git"
}
description = {
  summary = "Aareguru SDK for Lua",
  license = "MIT"
}
dependencies = {
  "lua >= 5.3",
  "dkjson >= 2.5",
  "dkjson >= 2.5",
}
build = {
  type = "builtin",
  modules = {
    ["aareguru_sdk"] = "aareguru_sdk.lua",
    ["config"] = "config.lua",
    ["features"] = "features.lua",
  }
}
