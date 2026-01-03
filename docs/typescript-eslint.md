# TypeScript ESLint

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [//typescript-eslint:rules.bzl](#typescript-eslintrulesbzl)
  - [ts_eslint](#ts_eslint)
  - [ts_eslint_format](#ts_eslint_format)
  - [configure_ts_eslint](#configure_ts_eslint)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# //typescript-eslint:rules.bzl

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a id="ts_eslint"></a>

## ts_eslint

<pre>
load("@better_rules_javascript//typescript-eslint:rules.bzl", "ts_eslint")

ts_eslint(<a href="#ts_eslint-name">name</a>, <a href="#ts_eslint-bin">bin</a>, <a href="#ts_eslint-config">config</a>, <a href="#ts_eslint-config_dep">config_dep</a>)
</pre>

**ATTRIBUTES**

| Name                                        | Description                    | Type                                                                | Mandatory | Default |
| :------------------------------------------ | :----------------------------- | :------------------------------------------------------------------ | :-------- | :------ |
| <a id="ts_eslint-name"></a>name             | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |         |
| <a id="ts_eslint-bin"></a>bin               | eslint                         | <a href="https://bazel.build/concepts/labels">Label</a>             | required  |         |
| <a id="ts_eslint-config"></a>config         | -                              | String                                                              | required  |         |
| <a id="ts_eslint-config_dep"></a>config_dep | Configuration file             | <a href="https://bazel.build/concepts/labels">Label</a>             | required  |         |

<a id="ts_eslint_format"></a>

## ts_eslint_format

<pre>
load("@better_rules_javascript//typescript-eslint:rules.bzl", "ts_eslint_format")

ts_eslint_format(<a href="#ts_eslint_format-name">name</a>, <a href="#ts_eslint_format-srcs">srcs</a>, <a href="#ts_eslint_format-all_srcs">all_srcs</a>, <a href="#ts_eslint_format-ts">ts</a>, <a href="#ts_eslint_format-ts_eslint">ts_eslint</a>)
</pre>

TypeScript ESLint

**ATTRIBUTES**

| Name                                             | Description                    | Type                                                                | Mandatory | Default |
| :----------------------------------------------- | :----------------------------- | :------------------------------------------------------------------ | :-------- | :------ |
| <a id="ts_eslint_format-name"></a>name           | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |         |
| <a id="ts_eslint_format-srcs"></a>srcs           | Sources                        | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `None`  |
| <a id="ts_eslint_format-all_srcs"></a>all_srcs   | Use all compiled srcs          | Boolean                                                             | optional  | `True`  |
| <a id="ts_eslint_format-ts"></a>ts               | TypeScript compilation         | <a href="https://bazel.build/concepts/labels">Label</a>             | required  |         |
| <a id="ts_eslint_format-ts_eslint"></a>ts_eslint | -                              | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `None`  |

<a id="configure_ts_eslint"></a>

## configure_ts_eslint

<pre>
load("@better_rules_javascript//typescript-eslint:rules.bzl", "configure_ts_eslint")

configure_ts_eslint(<a href="#configure_ts_eslint-name">name</a>, <a href="#configure_ts_eslint-config">config</a>, <a href="#configure_ts_eslint-config_dep">config_dep</a>, <a href="#configure_ts_eslint-dep">dep</a>, <a href="#configure_ts_eslint-plugins">plugins</a>, <a href="#configure_ts_eslint-node_options">node_options</a>, <a href="#configure_ts_eslint-visibility">visibility</a>)
</pre>

**PARAMETERS**

| Name                                                      | Description               | Default Value                                   |
| :-------------------------------------------------------- | :------------------------ | :---------------------------------------------- |
| <a id="configure_ts_eslint-name"></a>name                 | <p align="center"> - </p> | none                                            |
| <a id="configure_ts_eslint-config"></a>config             | <p align="center"> - </p> | none                                            |
| <a id="configure_ts_eslint-config_dep"></a>config_dep     | <p align="center"> - </p> | none                                            |
| <a id="configure_ts_eslint-dep"></a>dep                   | <p align="center"> - </p> | `"@better_rules_javascript//eslint:eslint_lib"` |
| <a id="configure_ts_eslint-plugins"></a>plugins           | <p align="center"> - </p> | `[]`                                            |
| <a id="configure_ts_eslint-node_options"></a>node_options | <p align="center"> - </p> | `[]`                                            |
| <a id="configure_ts_eslint-visibility"></a>visibility     | <p align="center"> - </p> | `None`                                          |
