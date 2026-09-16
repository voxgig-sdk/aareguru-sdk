package core

var UtilityRegistrar func(u *Utility)

var NewBaseFeatureFunc func() Feature

var NewRatelimitFeatureFunc func() Feature

var NewRetryFeatureFunc func() Feature

var NewTestFeatureFunc func() Feature

var NewTimeoutFeatureFunc func() Feature

var NewLegacyEntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

var NewStuffEntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

var NewV2018EntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

