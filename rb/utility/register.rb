# Aareguru SDK utility registration
require_relative '../core/utility_type'
require_relative 'clean'
require_relative 'done'
require_relative 'make_error'
require_relative 'feature_add'
require_relative 'feature_hook'
require_relative 'feature_init'
require_relative 'fetcher'
require_relative 'make_fetch_def'
require_relative 'make_context'
require_relative 'make_options'
require_relative 'make_request'
require_relative 'make_response'
require_relative 'make_result'
require_relative 'make_point'
require_relative 'make_spec'
require_relative 'make_url'
require_relative 'param'
require_relative 'prepare_auth'
require_relative 'prepare_body'
require_relative 'prepare_headers'
require_relative 'prepare_method'
require_relative 'prepare_params'
require_relative 'prepare_path'
require_relative 'prepare_query'
require_relative 'result_basic'
require_relative 'result_body'
require_relative 'result_headers'
require_relative 'transform_request'
require_relative 'transform_response'

AareguruUtility.registrar = ->(u) {
  u.clean = AareguruUtilities::Clean
  u.done = AareguruUtilities::Done
  u.make_error = AareguruUtilities::MakeError
  u.feature_add = AareguruUtilities::FeatureAdd
  u.feature_hook = AareguruUtilities::FeatureHook
  u.feature_init = AareguruUtilities::FeatureInit
  u.fetcher = AareguruUtilities::Fetcher
  u.make_fetch_def = AareguruUtilities::MakeFetchDef
  u.make_context = AareguruUtilities::MakeContext
  u.make_options = AareguruUtilities::MakeOptions
  u.make_request = AareguruUtilities::MakeRequest
  u.make_response = AareguruUtilities::MakeResponse
  u.make_result = AareguruUtilities::MakeResult
  u.make_point = AareguruUtilities::MakePoint
  u.make_spec = AareguruUtilities::MakeSpec
  u.make_url = AareguruUtilities::MakeUrl
  u.param = AareguruUtilities::Param
  u.prepare_auth = AareguruUtilities::PrepareAuth
  u.prepare_body = AareguruUtilities::PrepareBody
  u.prepare_headers = AareguruUtilities::PrepareHeaders
  u.prepare_method = AareguruUtilities::PrepareMethod
  u.prepare_params = AareguruUtilities::PrepareParams
  u.prepare_path = AareguruUtilities::PreparePath
  u.prepare_query = AareguruUtilities::PrepareQuery
  u.result_basic = AareguruUtilities::ResultBasic
  u.result_body = AareguruUtilities::ResultBody
  u.result_headers = AareguruUtilities::ResultHeaders
  u.transform_request = AareguruUtilities::TransformRequest
  u.transform_response = AareguruUtilities::TransformResponse
}
