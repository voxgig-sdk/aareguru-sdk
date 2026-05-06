# Aareguru SDK utility: feature_add
module AareguruUtilities
  FeatureAdd = ->(ctx, f) {
    ctx.client.features << f
  }
end
