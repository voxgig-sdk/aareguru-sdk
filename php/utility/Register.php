<?php
declare(strict_types=1);

// Aareguru SDK utility registration

require_once __DIR__ . '/../core/UtilityType.php';
require_once __DIR__ . '/Clean.php';
require_once __DIR__ . '/Done.php';
require_once __DIR__ . '/MakeError.php';
require_once __DIR__ . '/FeatureAdd.php';
require_once __DIR__ . '/FeatureHook.php';
require_once __DIR__ . '/FeatureInit.php';
require_once __DIR__ . '/Fetcher.php';
require_once __DIR__ . '/MakeFetchDef.php';
require_once __DIR__ . '/MakeContext.php';
require_once __DIR__ . '/MakeOptions.php';
require_once __DIR__ . '/MakeRequest.php';
require_once __DIR__ . '/MakeResponse.php';
require_once __DIR__ . '/MakeResult.php';
require_once __DIR__ . '/MakePoint.php';
require_once __DIR__ . '/MakeSpec.php';
require_once __DIR__ . '/MakeUrl.php';
require_once __DIR__ . '/Param.php';
require_once __DIR__ . '/PrepareAuth.php';
require_once __DIR__ . '/PrepareBody.php';
require_once __DIR__ . '/PrepareHeaders.php';
require_once __DIR__ . '/PrepareMethod.php';
require_once __DIR__ . '/PrepareParams.php';
require_once __DIR__ . '/PreparePath.php';
require_once __DIR__ . '/PrepareQuery.php';
require_once __DIR__ . '/ResultBasic.php';
require_once __DIR__ . '/ResultBody.php';
require_once __DIR__ . '/ResultHeaders.php';
require_once __DIR__ . '/TransformRequest.php';
require_once __DIR__ . '/TransformResponse.php';

AareguruUtility::setRegistrar(function (AareguruUtility $u): void {
    $u->clean = [AareguruClean::class, 'call'];
    $u->done = [AareguruDone::class, 'call'];
    $u->make_error = [AareguruMakeError::class, 'call'];
    $u->feature_add = [AareguruFeatureAdd::class, 'call'];
    $u->feature_hook = [AareguruFeatureHook::class, 'call'];
    $u->feature_init = [AareguruFeatureInit::class, 'call'];
    $u->fetcher = [AareguruFetcher::class, 'call'];
    $u->make_fetch_def = [AareguruMakeFetchDef::class, 'call'];
    $u->make_context = [AareguruMakeContext::class, 'call'];
    $u->make_options = [AareguruMakeOptions::class, 'call'];
    $u->make_request = [AareguruMakeRequest::class, 'call'];
    $u->make_response = [AareguruMakeResponse::class, 'call'];
    $u->make_result = [AareguruMakeResult::class, 'call'];
    $u->make_point = [AareguruMakePoint::class, 'call'];
    $u->make_spec = [AareguruMakeSpec::class, 'call'];
    $u->make_url = [AareguruMakeUrl::class, 'call'];
    $u->param = [AareguruParam::class, 'call'];
    $u->prepare_auth = [AareguruPrepareAuth::class, 'call'];
    $u->prepare_body = [AareguruPrepareBody::class, 'call'];
    $u->prepare_headers = [AareguruPrepareHeaders::class, 'call'];
    $u->prepare_method = [AareguruPrepareMethod::class, 'call'];
    $u->prepare_params = [AareguruPrepareParams::class, 'call'];
    $u->prepare_path = [AareguruPreparePath::class, 'call'];
    $u->prepare_query = [AareguruPrepareQuery::class, 'call'];
    $u->result_basic = [AareguruResultBasic::class, 'call'];
    $u->result_body = [AareguruResultBody::class, 'call'];
    $u->result_headers = [AareguruResultHeaders::class, 'call'];
    $u->transform_request = [AareguruTransformRequest::class, 'call'];
    $u->transform_response = [AareguruTransformResponse::class, 'call'];
});
