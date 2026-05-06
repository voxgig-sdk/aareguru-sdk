package voxgigaaregurusdk

import (
	"voxgigaaregurusdk/core"
	"voxgigaaregurusdk/entity"
	"voxgigaaregurusdk/feature"
	_ "voxgigaaregurusdk/utility"
)

// Type aliases preserve external API.
type AareguruSDK = core.AareguruSDK
type Context = core.Context
type Utility = core.Utility
type Feature = core.Feature
type Entity = core.Entity
type AareguruEntity = core.AareguruEntity
type FetcherFunc = core.FetcherFunc
type Spec = core.Spec
type Result = core.Result
type Response = core.Response
type Operation = core.Operation
type Control = core.Control
type AareguruError = core.AareguruError

// BaseFeature from feature package.
type BaseFeature = feature.BaseFeature

func init() {
	core.NewBaseFeatureFunc = func() core.Feature {
		return feature.NewBaseFeature()
	}
	core.NewTestFeatureFunc = func() core.Feature {
		return feature.NewTestFeature()
	}
	core.NewLegacyEntityFunc = func(client *core.AareguruSDK, entopts map[string]any) core.AareguruEntity {
		return entity.NewLegacyEntity(client, entopts)
	}
	core.NewStuffEntityFunc = func(client *core.AareguruSDK, entopts map[string]any) core.AareguruEntity {
		return entity.NewStuffEntity(client, entopts)
	}
	core.NewV2018EntityFunc = func(client *core.AareguruSDK, entopts map[string]any) core.AareguruEntity {
		return entity.NewV2018Entity(client, entopts)
	}
}

// Constructor re-exports.
var NewAareguruSDK = core.NewAareguruSDK
var TestSDK = core.TestSDK
var NewContext = core.NewContext
var NewSpec = core.NewSpec
var NewResult = core.NewResult
var NewResponse = core.NewResponse
var NewOperation = core.NewOperation
var MakeConfig = core.MakeConfig
var NewBaseFeature = feature.NewBaseFeature
var NewTestFeature = feature.NewTestFeature
