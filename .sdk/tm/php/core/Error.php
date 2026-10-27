<?php
declare(strict_types=1);

// Aareguru SDK error

class AareguruError extends \Exception implements \JsonSerializable
{
    public bool $is_sdk_error;
    public string $sdk;
    public string $sdk_code;
    public string $msg;
    public mixed $result;
    public mixed $spec;

    // HTTP status of the response that caused this error, or -1 when the
    // request never got one. Promoted to the top level so a consumer can
    // branch on `err->status` / `err->notFound()` instead of reaching into
    // `err->result`.
    //
    // DECLARED, not created on assignment. makeError set it on an undeclared
    // property, which PHP 8.2 deprecates and PHP 9 makes fatal - so every
    // error path in this SDK was on course to stop working. ts declares the
    // same field; php needs it spelled out because the class is typed.
    public int $status;

    // The context stays reachable for a debugger (`ctx()`) and out of every
    // serialiser: print_r and json_encode take the record below, and
    // var_export renders a closure as empty where a property would dump the
    // context's whole object graph, options and credential included.
    private ?\Closure $ctxref;

    public function __construct(string $code = '', string $msg = '', mixed $ctx = null)
    {
        parent::__construct($msg);
        $this->is_sdk_error = true;
        $this->sdk = 'Aareguru';
        $this->sdk_code = $code;
        $this->msg = $msg;
        $this->ctxref = null === $ctx ? null : static function () use ($ctx): mixed {
            return $ctx;
        };
        $this->result = null;
        $this->spec = null;
        $this->status = -1;
    }

    public function ctx(): mixed
    {
        return null === $this->ctxref ? null : ($this->ctxref)();
    }

    public function error(): string
    {
        return $this->msg;
    }

    public function notFound(): bool
    {
        return 404 === $this->status;
    }

    public function __toString(): string
    {
        return $this->msg;
    }

    // What make_error attached is already cleaned; the context is not part
    // of the record.
    public function jsonSerialize(): array
    {
        return [
            'sdk' => $this->sdk,
            'code' => $this->sdk_code,
            'message' => $this->getMessage(),
            'status' => $this->status,
            'result' => $this->result,
            'spec' => $this->spec,
        ];
    }

    public function __debugInfo(): array
    {
        return $this->jsonSerialize();
    }
}
