# Aareguru SDK feature factory

from aareguru_sdk.feature.base_feature import AareguruBaseFeature
from aareguru_sdk.feature.ratelimit_feature import AareguruRatelimitFeature
from aareguru_sdk.feature.retry_feature import AareguruRetryFeature
from aareguru_sdk.feature.test_feature import AareguruTestFeature
from aareguru_sdk.feature.timeout_feature import AareguruTimeoutFeature


_FEATURES = {
    "base": lambda: AareguruBaseFeature(),
    "ratelimit": lambda: AareguruRatelimitFeature(),
    "retry": lambda: AareguruRetryFeature(),
    "test": lambda: AareguruTestFeature(),
    "timeout": lambda: AareguruTimeoutFeature(),
}


def _make_feature(name):
    factory = _FEATURES.get(name)
    if factory is not None:
        return factory()
    return _FEATURES["base"]()


# True when this SDK was generated with the named feature class - the
# constructor's tolerance for extend-carried features reads this (an
# active name with no generated class must not become a BaseFeature
# stray when an extend instance carries it).
def _has_feature(name):
    return name in _FEATURES
