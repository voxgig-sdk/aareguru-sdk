<?php
declare(strict_types=1);

// Aareguru SDK base feature

class AareguruBaseFeature
{
    public string $version;
    public string $name;
    public bool $active;

    // Positions this feature when added via the client `extend` option:
    // "__before__" / "__after__" / "__replace__" name an already-added
    // feature (mirrors the ts feature `_options`). Declared so setting it
    // on an extension instance avoids the dynamic-property deprecation.
    public ?array $_options = null;

    public function __construct()
    {
        $this->version = '0.0.1';
        $this->name = 'base';
        $this->active = true;
    }

    public function get_version(): string { return $this->version; }
    public function get_name(): string { return $this->name; }
    public function get_active(): bool { return $this->active; }

    public function init(AareguruContext $ctx, array $options): void {}
    public function PostConstruct(AareguruContext $ctx): void {}
    public function PostConstructEntity(AareguruContext $ctx): void {}
    public function SetData(AareguruContext $ctx): void {}
    public function GetData(AareguruContext $ctx): void {}
    public function GetMatch(AareguruContext $ctx): void {}
    public function SetMatch(AareguruContext $ctx): void {}
    public function PrePoint(AareguruContext $ctx): void {}
    public function PreSpec(AareguruContext $ctx): void {}
    public function PreRequest(AareguruContext $ctx): void {}
    public function PreResponse(AareguruContext $ctx): void {}
    public function PreResult(AareguruContext $ctx): void {}
    public function PreDone(AareguruContext $ctx): void {}
    public function PreUnexpected(AareguruContext $ctx): void {}
}
