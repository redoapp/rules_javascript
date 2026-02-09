load("@rules_javascript//protobuf:aspects.bzl", "js_proto_aspect")
load("@rules_javascript//protobuf:rules.bzl", "js_proto_library_rule")

js_proto = js_proto_aspect("@rules-javascript-test//:js_protoc")

js_proto_library = js_proto_library_rule(js_proto)
