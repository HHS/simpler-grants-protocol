import "@typespec/http";
import "@typespec/versioning";
import "@common-grants/core";

import "./routes.tsp";

/** API description here */
@service(#{ title: "Quickstart API" })
@Versioning.useDependency(CommonGrants.Versions.v0_2)
namespace Quickstart;
