/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentContracts from "../agentContracts.js";
import type * as auth from "../auth.js";
import type * as automation_shared from "../automation/shared.js";
import type * as automation_taskQueue from "../automation/taskQueue.js";
import type * as findings from "../findings.js";
import type * as http from "../http.js";
import type * as lessons from "../lessons.js";
import type * as lib_repoIntake from "../lib/repoIntake.js";
import type * as pipeline from "../pipeline.js";
import type * as repoIntake from "../repoIntake.js";
import type * as repoIntakeWorkflow from "../repoIntakeWorkflow.js";
import type * as reporeaderAiAdmin from "../reporeaderAiAdmin.js";
import type * as repos from "../repos.js";
import type * as runs from "../runs.js";
import type * as validators from "../validators.js";
import type * as viewer from "../viewer.js";
import type * as workflow from "../workflow.js";
import type * as workflowEngine from "../workflowEngine.js";
import type * as workflowTypes from "../workflowTypes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentContracts: typeof agentContracts;
  auth: typeof auth;
  "automation/shared": typeof automation_shared;
  "automation/taskQueue": typeof automation_taskQueue;
  findings: typeof findings;
  http: typeof http;
  lessons: typeof lessons;
  "lib/repoIntake": typeof lib_repoIntake;
  pipeline: typeof pipeline;
  repoIntake: typeof repoIntake;
  repoIntakeWorkflow: typeof repoIntakeWorkflow;
  reporeaderAiAdmin: typeof reporeaderAiAdmin;
  repos: typeof repos;
  runs: typeof runs;
  validators: typeof validators;
  viewer: typeof viewer;
  workflow: typeof workflow;
  workflowEngine: typeof workflowEngine;
  workflowTypes: typeof workflowTypes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  launchthat_ai: import("@launchthatapp/ai/convex/component/_generated/component.js").ComponentApi<"launchthat_ai">;
};
