# VENDORED: @voxgig/omni sdk-20261016-0845-0 (ruby/lib/voxgig_omni.rb)
# Source: https://github.com/voxgig/omni @ e9cb45a308a4da47ffdbc1b3149b9c59199190b2  [tag: sdk-20261016-0845-0]
# License: MIT (c) voxgig - see repository LICENSE. Do not edit: resync from upstream.
# voxgig_omni - shared multi-language test runner.

require_relative 'util'
require_relative 'runner'

module VoxgigOmni
  module_function

  def make_runner(specref, provider = nil)
    Runner.make_runner(specref, provider)
  end
end
