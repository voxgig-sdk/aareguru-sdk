# Aareguru SDK feature factory

from feature.base_feature import AareguruBaseFeature
from feature.test_feature import AareguruTestFeature


def _make_feature(name):
    features = {
        "base": lambda: AareguruBaseFeature(),
        "test": lambda: AareguruTestFeature(),
    }
    factory = features.get(name)
    if factory is not None:
        return factory()
    return features["base"]()
