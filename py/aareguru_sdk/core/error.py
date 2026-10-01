# Aareguru SDK error

from __future__ import annotations


class AareguruError(Exception):
    # The context holds the live spec and options, and an error is what gets
    # logged: a slot keeps it reachable for a debugger and out of `vars()`,
    # pickling and every attribute dump.
    __slots__ = ("_ctx",)

    def __init__(self, code="", msg="", ctx=None):
        super().__init__(msg)
        self.is_sdk_error = True
        self.sdk = "Aareguru"
        self.code = code
        self.msg = msg
        self._ctx = ctx
        self.status = -1
        self.result = None
        self.spec = None

    @property
    def ctx(self):
        return getattr(self, "_ctx", None)

    @ctx.setter
    def ctx(self, value):
        self._ctx = value

    # `err.not_found` rather than a magic number at every call site.
    @property
    def not_found(self):
        return 404 == self.status

    # What make_error attached is already cleaned; the context is not part
    # of the record.
    def to_json(self):
        return {
            "sdk": self.sdk,
            "code": self.code,
            "message": self.msg,
            "status": self.status,
            "result": self.result,
            "spec": self.spec,
        }

    def __str__(self):
        return self.msg

    def __repr__(self):
        return (self.__class__.__name__ + "(code=" + repr(self.code) +
                ", msg=" + repr(self.msg) + ", status=" + repr(self.status) + ")")

    def __getstate__(self):
        return dict(self.__dict__)

    def __reduce__(self):
        return (self.__class__, (self.code, self.msg), self.__getstate__())
