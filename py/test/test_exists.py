# ProjectName SDK exists test

import pytest
from aareguru_sdk import AareguruSDK


class TestExists:

    def test_should_create_test_sdk(self):
        testsdk = AareguruSDK.test(None, None)
        assert testsdk is not None
