<?php
declare(strict_types=1);

// Typed models for the Aareguru SDK.
//
// GENERATED from the API model: main.kit.entity.<e>.fields[] and per-op
// params (op.<name>.points[].args.params[]). Field/param types come from the
// canonical type sentinels via @voxgig/sdkgen canonToType (source of truth:
// @voxgig/apidef VALID_CANON). Do not edit by hand.
//
// These are documentation-grade value objects (PHP 8 typed properties),
// registered on the composer classmap autoload. The SDK boundary exchanges
// assoc-arrays; these classes name the shapes for tooling and typed callers.

/** Legacy entity data model. */
class Legacy
{
}

/** Request payload for Legacy#load. */
class LegacyLoadMatch
{
    public ?string $app = null;
    public ?string $version = null;
}

/** Stuff entity data model. */
class Stuff
{
}

/** Request payload for Stuff#load. */
class StuffLoadMatch
{
    public ?string $app = null;
    public ?int $line = null;
    public string $service;
    public ?string $version = null;
}

/** V2018 entity data model. */
class V2018
{
}

/** Request payload for V2018#load. */
class V2018LoadMatch
{
    public ?string $app = null;
    public string $city;
    public string $end;
    public string $start;
    public ?string $value = null;
    public ?string $version = null;
}

