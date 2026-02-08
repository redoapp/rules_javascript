load("//:rules.bzl", "%{var}")

%{var}(
  name = "tool",
  visibility = ["//visibility:public"],
)
