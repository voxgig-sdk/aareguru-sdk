package core

var UtilityRegistrar func(u *Utility)

var NewBaseFeatureFunc func() Feature

var NewTestFeatureFunc func() Feature

var NewLegacyEntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

var NewStuffEntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

var NewV2018EntityFunc func(client *AareguruSDK, entopts map[string]any) AareguruEntity

