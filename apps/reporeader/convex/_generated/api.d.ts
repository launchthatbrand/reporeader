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
  workflow: {
    event: {
      create: FunctionReference<
        "mutation",
        "internal",
        { name: string; workflowId: string },
        string
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          eventId?: string;
          name?: string;
          result:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId?: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        string
      >;
    };
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { shortCircuit?: boolean; workflowId: string },
        {
          blocked?: boolean;
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startSteps: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          steps: Array<{
            retry?:
              | boolean
              | { base: number; initialBackoffMs: number; maxAttempts: number };
            schedulerOptions?: { runAt?: number } | { runAfter?: number };
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
          }>;
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        Array<{
          _creationTime: number;
          _id: string;
          step:
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                functionType: "query" | "mutation" | "action";
                handle: string;
                inProgress: boolean;
                kind?: "function";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workId?: string;
              }
            | {
                args: any;
                argsSize: number;
                completedAt?: number;
                handle: string;
                inProgress: boolean;
                kind: "workflow";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
                workflowId?: string;
              }
            | {
                args: { eventId?: string };
                argsSize: number;
                completedAt?: number;
                eventId?: string;
                inProgress: boolean;
                kind: "event";
                name: string;
                runResult?:
                  | { kind: "success"; returnValue: any }
                  | { error: string; kind: "failed" }
                  | { kind: "canceled" };
                startedAt: number;
              };
          stepNumber: number;
          workflowId: string;
        }>
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { force?: boolean; workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step:
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  functionType: "query" | "mutation" | "action";
                  handle: string;
                  inProgress: boolean;
                  kind?: "function";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workId?: string;
                }
              | {
                  args: any;
                  argsSize: number;
                  completedAt?: number;
                  handle: string;
                  inProgress: boolean;
                  kind: "workflow";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                  workflowId?: string;
                }
              | {
                  args: { eventId?: string };
                  argsSize: number;
                  completedAt?: number;
                  eventId?: string;
                  inProgress: boolean;
                  kind: "event";
                  name: string;
                  runResult?:
                    | { kind: "success"; returnValue: any }
                    | { error: string; kind: "failed" }
                    | { kind: "canceled" };
                  startedAt: number;
                };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listByName: FunctionReference<
        "query",
        "internal",
        {
          name: string;
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            context?: any;
            name?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      listSteps: FunctionReference<
        "query",
        "internal",
        {
          order: "asc" | "desc";
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          workflowId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            args: any;
            completedAt?: number;
            eventId?: string;
            kind: "function" | "workflow" | "event";
            name: string;
            nestedWorkflowId?: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            stepId: string;
            stepNumber: number;
            workId?: string;
            workflowId: string;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
        }
      >;
      restart: FunctionReference<
        "mutation",
        "internal",
        { from?: number | string; startAsync?: boolean; workflowId: string },
        null
      >;
    };
  };
  launchthat_ai: {
    actions: {
      addRagContent: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          importance?: number;
          key: string;
          metadata?: Record<string, any>;
          namespace: string;
          text: string;
          title?: string;
        },
        { created: boolean; entryId: string; status: string }
      >;
      auditLangfuseExportParity: FunctionReference<
        "action",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
          threadLimit?: number;
        },
        {
          parityMismatches: Array<string>;
          pipelineHealth: {
            failed: number;
            lastDeliveredAt?: number;
            oldestPendingCreatedAt?: number;
            pending: number;
            processing: number;
            sent: number;
            total: number;
          };
          threadsChecked: number;
          totalCanonicalMessages: number;
          totalExportedUniqueMessages: number;
        }
      >;
      backfillLangfuseFromAiEval: FunctionReference<
        "action",
        "internal",
        {
          perThreadMessageLimit?: number;
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
          threadLimit?: number;
        },
        {
          duplicateGenerations: number;
          failedMessages: number;
          queuedGenerations: number;
          queuedScores: number;
          scannedMessages: number;
          scannedThreads: number;
          skippedGenerations: number;
        }
      >;
      deleteRagEntrySync: FunctionReference<
        "action",
        "internal",
        { entryId: string },
        null
      >;
      drainLangfuseOutbox: FunctionReference<
        "action",
        "internal",
        { limit?: number },
        {
          claimed: number;
          duplicated: number;
          failed: number;
          requeued: number;
          sent: number;
        }
      >;
      runAgentStep: FunctionReference<
        "action",
        "internal",
        {
          apiKey?: string;
          newsEventsHandle?: string;
          orgIdOrSlug?: string;
          promptMessageId: string;
          strategyTools?: {
            addRuleHandle: string;
            addSessionHandle: string;
            createVersionHandle: string;
            deleteAnnotationHandle: string;
            removeRuleHandle: string;
            updateRiskHandle: string;
            updateRuleHandle: string;
            updateSessionHandle: string;
            updateSummaryHandle: string;
            upsertAnnotationHandle: string;
          };
          system?: string;
          threadId: string;
          userId: string;
        },
        { ok: boolean }
      >;
      searchRag: FunctionReference<
        "action",
        "internal",
        { apiKey: string; limit?: number; namespace: string; query: string },
        Array<{ key?: string; score: number; text: string; title?: string }>
      >;
      syncPricingFromProviders: FunctionReference<
        "action",
        "internal",
        { envKeys?: Record<string, string> },
        {
          deleteCount: number;
          insertCount: number;
          updateCount: number;
          updatedModels: number;
        }
      >;
    };
    mutations: {
      assertAndSpendTokens: FunctionReference<
        "mutation",
        "internal",
        { periodKey: string; tokens: number; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        }
      >;
      beginLinkAnalysisRun: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          runId: string;
          sourceUrls: Array<string>;
          threadId: string;
          userId: string;
        },
        {
          runId: string;
          startedAt: number;
          status: "running" | "completed" | "failed" | "cancelled";
          updatedAt: number;
        }
      >;
      createChatThread: FunctionReference<
        "mutation",
        "internal",
        { title?: string; userId: string },
        { createdAt: number; threadId: string }
      >;
      deleteRagEntry: FunctionReference<
        "mutation",
        "internal",
        { entryId: string },
        null
      >;
      getOrCreateChatThread: FunctionReference<
        "mutation",
        "internal",
        { title?: string; userId: string },
        { created: boolean; threadId: string }
      >;
      grantMonthlyCredits: FunctionReference<
        "mutation",
        "internal",
        { amount: number; periodKey: string; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        }
      >;
      importChatThreadMessages: FunctionReference<
        "mutation",
        "internal",
        {
          messages: Array<{
            content: string;
            createdAt?: number;
            role: "user" | "assistant";
          }>;
          threadId: string;
          userId: string;
        },
        {
          firstMessageAt: number;
          imported: number;
          lastMessageAt: number;
          totalMessages: number;
        }
      >;
      ingestExternalEvalMessage: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          costUsd?: number;
          createdAt: number;
          generation?: {
            costUsd?: number;
            generationKey?: string;
            inputTokens?: number;
            latencyMs?: number;
            metadata?: any;
            modelId?: string;
            outputTokens?: number;
            provider?: string;
            totalTokens?: number;
          };
          inputTokens?: number;
          messageKey: string;
          metadata?: any;
          modelId?: string;
          modelProvider?: string;
          outputTokens?: number;
          role: "user" | "assistant" | "system";
          sequence: number;
          thread: {
            appId: string;
            featureDomain: string;
            organizationId: string;
            sessionId?: string;
            source: string;
            threadKey: string;
          };
          totalTokens?: number;
        },
        {
          duplicate: boolean;
          inserted: boolean;
          messageDocId?: string;
          threadDocId: string;
        }
      >;
      logAiEventPublic: FunctionReference<
        "mutation",
        "internal",
        {
          eventType: string;
          level?: string;
          message: string;
          metadata?: any;
          source?: string;
          threadId?: string;
          userId?: string;
        },
        null
      >;
      recordAICostAndSpend: FunctionReference<
        "mutation",
        "internal",
        {
          messageId: string;
          modelId: string;
          periodKey: string;
          providerId: string;
          threadId?: string;
          usage: {
            completionTokens?: number;
            promptTokens?: number;
            totalTokens?: number;
          };
          userId: string;
        },
        { granted: number; remaining: number; spent: number }
      >;
      recordChatAssistantSummaryPublic: FunctionReference<
        "mutation",
        "internal",
        { content: string; threadId: string; userId: string },
        { totalMessages: number }
      >;
      recordChatMessage: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          role: "user" | "assistant";
          threadId: string;
          userId: string;
        },
        { messageId?: string; threadId: string; totalMessages: number }
      >;
      saveAiSettings: FunctionReference<
        "mutation",
        "internal",
        {
          embeddingDimension?: number;
          embeddingModel?: string;
          key?: string;
          model: string;
          provider: string;
          ragNamespace?: string;
          systemPrompt?: string;
        },
        { key: string; model: string; provider: string }
      >;
      updateLinkAnalysisRun: FunctionReference<
        "mutation",
        "internal",
        {
          completedAt?: number;
          metadata?: any;
          runId: string;
          status: "running" | "completed" | "failed" | "cancelled";
          urlRows: Array<{
            error?: string;
            sourceType: string;
            status: "detected" | "processing" | "completed" | "failed";
            updatedAt: number;
            url: string;
          }>;
        },
        {
          completedAt?: number;
          runId: string;
          status: "running" | "completed" | "failed" | "cancelled";
          updatedAt: number;
        }
      >;
      upsertAiPricing: FunctionReference<
        "mutation",
        "internal",
        {
          row: {
            limits: { context: number; output: number };
            modelId: string;
            modelName: string;
            pricing: {
              cache_read?: number;
              cache_write?: number;
              input: number;
              output: number;
              reasoning?: number;
            };
            providerId: string;
            providerName: string;
          };
        },
        {
          deleteCount: number;
          insertCount: number;
          updateCount: number;
          updatedModels: number;
        }
      >;
      upsertEvalThreadReplica: FunctionReference<
        "mutation",
        "internal",
        {
          firstMessageAt: number;
          lastMessageAt: number;
          messageCount: number;
          thread: {
            appId: string;
            featureDomain: string;
            organizationId: string;
            sessionId?: string;
            source: string;
            threadKey: string;
          };
        },
        {
          created: boolean;
          firstMessageAt: number;
          lastMessageAt: number;
          messageCount: number;
          threadDocId: string;
        }
      >;
      upsertLangfuseConfig: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            enabled?: boolean;
            host: string;
            ingestionPath?: string;
            publicKey: string;
            secretKey: string;
          };
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        { configured: boolean; enabled: boolean }
      >;
    };
    queries: {
      getAiSettings: FunctionReference<
        "query",
        "internal",
        { key?: string },
        null | {
          embeddingDimension?: number;
          embeddingModel?: string;
          key: string;
          model: string;
          provider: string;
          ragNamespace?: string;
          systemPrompt?: string;
          updatedAt: number;
        }
      >;
      getAllAiPricing: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          lastUpdated: number;
          limits: { context: number; output: number };
          modelId: string;
          modelName: string;
          pricing: {
            cache_read?: number;
            cache_write?: number;
            input: number;
            output: number;
            reasoning?: number;
          };
          providerId: string;
          providerName: string;
        }>
      >;
      getConversationForUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          createdAt: number;
          firstMessageAt: number;
          lastMessageAt: number;
          lastMessageRole?: "user" | "assistant";
          lastMessageSnippet?: string;
          threadId: string;
          totalMessages: number;
          updatedAt: number;
          userId: string;
        }
      >;
      getCostsSummaryForUsers: FunctionReference<
        "query",
        "internal",
        { userIds: Array<string> },
        { totalCostUsd: number; totalUserCostUsd: number; usersCount: number }
      >;
      getCreditBalance: FunctionReference<
        "query",
        "internal",
        { periodKey: string; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          userId: string;
        }
      >;
      getCreditsSummary: FunctionReference<
        "query",
        "internal",
        { nearLimitRatio?: number; periodKey: string },
        {
          periodKey: string;
          totalGranted: number;
          totalRemaining: number;
          totalSpent: number;
          usersAtLimit: number;
          usersNearLimit: number;
          usersTracked: number;
        }
      >;
      getEvalThreadStats: FunctionReference<
        "query",
        "internal",
        {
          thread: {
            appId: string;
            featureDomain: string;
            organizationId: string;
            threadKey: string;
          };
        },
        null | {
          appId: string;
          featureDomain: string;
          firstMessageAt: number;
          lastMessageAt: number;
          maxSequence?: number;
          messageCount: number;
          organizationId: string;
          sessionId?: string;
          source: string;
          threadDocId: string;
          threadKey: string;
          uniqueMessageKeys: number;
        }
      >;
      getLangfuseConfig: FunctionReference<
        "query",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        null | {
          enabled: boolean;
          host: string;
          ingestionPath?: string;
          publicKey: string;
          secretKey: string;
        }
      >;
      getLangfusePipelineHealth: FunctionReference<
        "query",
        "internal",
        {
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        {
          failed: number;
          lastDeliveredAt?: number;
          oldestPendingCreatedAt?: number;
          pending: number;
          processing: number;
          sent: number;
          total: number;
        }
      >;
      getLinkAnalysisRun: FunctionReference<
        "query",
        "internal",
        { runId: string },
        null | {
          completedAt?: number;
          metadata?: any;
          runId: string;
          sourceUrls: Array<string>;
          startedAt: number;
          status: "running" | "completed" | "failed" | "cancelled";
          threadId: string;
          updatedAt: number;
          urlRows: Array<{
            error?: string;
            sourceType: string;
            status: "detected" | "processing" | "completed" | "failed";
            updatedAt: number;
            url: string;
          }>;
          userId: string;
        }
      >;
      getRagEntryChunks: FunctionReference<
        "query",
        "internal",
        { entryId: string; limit?: number },
        Array<{ order: number; text: string }>
      >;
      getThread: FunctionReference<
        "query",
        "internal",
        { threadId: string },
        null | {
          createdAt: number;
          status: "active" | "archived";
          summary?: string;
          threadId: string;
          title?: string;
          userId?: string;
        }
      >;
      getUserAiSummary: FunctionReference<
        "query",
        "internal",
        { periodKey: string; userId: string },
        {
          granted: number;
          periodKey: string;
          remaining: number;
          spent: number;
          totalCostUsd: number;
          totalRequests: number;
          totalUserCostUsd: number;
          userId: string;
        }
      >;
      listAiLogs: FunctionReference<
        "query",
        "internal",
        {
          eventType?: string;
          limit?: number;
          threadId?: string;
          userId?: string;
        },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          eventType: string;
          level: string;
          message: string;
          metadata?: any;
          source?: string;
          threadId?: string;
          userId?: string;
        }>
      >;
      listChatMessages: FunctionReference<
        "query",
        "internal",
        {
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          streamArgs?:
            | { kind: "list"; startOrder?: number }
            | {
                cursors: Array<{ cursor: number; streamId: string }>;
                kind: "deltas";
              };
          threadId: string;
        },
        {
          continueCursor: string;
          isDone: boolean;
          page: Array<{
            _creationTime: number;
            _id: string;
            agentName?: string;
            embeddingId?: string;
            error?: string;
            fileIds?: Array<string>;
            finishReason?:
              | "stop"
              | "length"
              | "content-filter"
              | "tool-calls"
              | "error"
              | "other"
              | "unknown";
            id?: string;
            message?:
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            image: string | ArrayBuffer;
                            mimeType?: string;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "image";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "user";
                }
              | {
                  content:
                    | string
                    | Array<
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            text: string;
                            type: "text";
                          }
                        | {
                            data: string | ArrayBuffer;
                            filename?: string;
                            mimeType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "file";
                          }
                        | {
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            signature?: string;
                            text: string;
                            type: "reasoning";
                          }
                        | {
                            data: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            type: "redacted-reasoning";
                          }
                        | {
                            args: any;
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-call";
                          }
                        | {
                            args?: any;
                            experimental_content?: Array<
                              | { text: string; type: "text" }
                              | {
                                  data: string;
                                  mimeType?: string;
                                  type: "image";
                                }
                            >;
                            isError?: boolean;
                            output?:
                              | { type: "text"; value: string }
                              | { type: "json"; value: any }
                              | { type: "error-text"; value: string }
                              | { type: "error-json"; value: any }
                              | {
                                  type: "content";
                                  value: Array<
                                    | { text: string; type: "text" }
                                    | {
                                        data: string;
                                        mediaType: string;
                                        type: "media";
                                      }
                                  >;
                                };
                            providerExecuted?: boolean;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            result?: any;
                            toolCallId: string;
                            toolName: string;
                            type: "tool-result";
                          }
                        | {
                            id: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "url";
                            title?: string;
                            type: "source";
                            url: string;
                          }
                        | {
                            filename?: string;
                            id: string;
                            mediaType: string;
                            providerMetadata?: Record<
                              string,
                              Record<string, any>
                            >;
                            providerOptions?: Record<
                              string,
                              Record<string, any>
                            >;
                            sourceType: "document";
                            title: string;
                            type: "source";
                          }
                      >;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "assistant";
                }
              | {
                  content: Array<{
                    args?: any;
                    experimental_content?: Array<
                      | { text: string; type: "text" }
                      | { data: string; mimeType?: string; type: "image" }
                    >;
                    isError?: boolean;
                    output?:
                      | { type: "text"; value: string }
                      | { type: "json"; value: any }
                      | { type: "error-text"; value: string }
                      | { type: "error-json"; value: any }
                      | {
                          type: "content";
                          value: Array<
                            | { text: string; type: "text" }
                            | { data: string; mediaType: string; type: "media" }
                          >;
                        };
                    providerExecuted?: boolean;
                    providerMetadata?: Record<string, Record<string, any>>;
                    providerOptions?: Record<string, Record<string, any>>;
                    result?: any;
                    toolCallId: string;
                    toolName: string;
                    type: "tool-result";
                  }>;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "tool";
                }
              | {
                  content: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  role: "system";
                };
            model?: string;
            order: number;
            provider?: string;
            providerMetadata?: Record<string, Record<string, any>>;
            providerOptions?: Record<string, Record<string, any>>;
            reasoning?: string;
            reasoningDetails?: Array<
              | {
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  signature?: string;
                  text: string;
                  type: "reasoning";
                }
              | { signature?: string; text: string; type: "text" }
              | { data: string; type: "redacted" }
            >;
            sources?: Array<
              | {
                  id: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "url";
                  title?: string;
                  type?: "source";
                  url: string;
                }
              | {
                  filename?: string;
                  id: string;
                  mediaType: string;
                  providerMetadata?: Record<string, Record<string, any>>;
                  providerOptions?: Record<string, Record<string, any>>;
                  sourceType: "document";
                  title: string;
                  type: "source";
                }
            >;
            status: "pending" | "success" | "failed";
            stepOrder: number;
            text?: string;
            threadId: string;
            tool: boolean;
            usage?: {
              cachedInputTokens?: number;
              completionTokens: number;
              promptTokens: number;
              reasoningTokens?: number;
              totalTokens: number;
            };
            userId?: string;
            warnings?: Array<
              | {
                  details?: string;
                  setting: string;
                  type: "unsupported-setting";
                }
              | { details?: string; tool: any; type: "unsupported-tool" }
              | { message: string; type: "other" }
            >;
          }>;
          pageStatus?: "SplitRecommended" | "SplitRequired" | null;
          splitCursor?: string | null;
          streams?:
            | {
                kind: "list";
                messages: Array<{
                  agentName?: string;
                  format?: "UIMessageChunk" | "TextStreamPart";
                  model?: string;
                  order: number;
                  provider?: string;
                  providerOptions?: Record<string, Record<string, any>>;
                  status: "streaming" | "finished" | "aborted";
                  stepOrder: number;
                  streamId: string;
                  userId?: string;
                }>;
              }
            | {
                deltas: Array<{
                  end: number;
                  parts: Array<any>;
                  start: number;
                  streamId: string;
                }>;
                kind: "deltas";
              };
        }
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId?: string; userId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          firstMessageAt: number;
          lastMessageAt: number;
          lastMessageRole?: "user" | "assistant";
          lastMessageSnippet?: string;
          threadId: string;
          totalMessages: number;
          updatedAt: number;
          userId: string;
        }>
      >;
      listCreditLedger: FunctionReference<
        "query",
        "internal",
        { limit?: number; periodKey?: string; userId?: string },
        Array<{
          _creationTime: number;
          _id: string;
          granted: number;
          periodKey: string;
          spent: number;
          updatedAt: number;
          userId: string;
        }>
      >;
      listEvalThreadMessages: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          thread: {
            appId: string;
            featureDomain: string;
            organizationId: string;
            threadKey: string;
          };
        },
        Array<{
          content: string;
          costUsd?: number;
          createdAt: number;
          inputTokens?: number;
          messageDocId: string;
          messageKey: string;
          metadata?: any;
          mirroredAt: number;
          modelId?: string;
          modelProvider?: string;
          outputTokens?: number;
          role: "user" | "assistant" | "system";
          sequence: number;
          totalTokens?: number;
        }>
      >;
      listEvalThreadsForScope: FunctionReference<
        "query",
        "internal",
        {
          appId: string;
          featureDomain: string;
          limit?: number;
          organizationId: string;
        },
        Array<{
          appId: string;
          createdAt: number;
          featureDomain: string;
          firstMessageAt: number;
          lastMessageAt: number;
          messageCount: number;
          organizationId: string;
          sessionId?: string;
          source: string;
          threadDocId: string;
          threadKey: string;
          updatedAt: number;
        }>
      >;
      listLangfuseFailedOutbox: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          scope: {
            appId: string;
            featureDomain: string;
            organizationId: string;
          };
        },
        Array<{
          appId: string;
          attempts: number;
          createdAt: number;
          featureDomain: string;
          idempotencyKey: string;
          kind: "generation" | "score";
          lastError?: string;
          maxAttempts: number;
          nextRetryAt: number;
          organizationId: string;
          outboxId: string;
          sequence: number;
          status: "pending" | "processing" | "sent" | "failed";
          threadKey: string;
          updatedAt: number;
        }>
      >;
      listLinkAnalysisRunsForThread: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId: string },
        Array<{
          completedAt?: number;
          metadata?: any;
          runId: string;
          sourceUrls: Array<string>;
          startedAt: number;
          status: "running" | "completed" | "failed" | "cancelled";
          threadId: string;
          updatedAt: number;
          urlRows: Array<{
            error?: string;
            sourceType: string;
            status: "detected" | "processing" | "completed" | "failed";
            updatedAt: number;
            url: string;
          }>;
          userId: string;
        }>
      >;
      listRagEntries: FunctionReference<
        "query",
        "internal",
        { limit?: number; namespaceId: string },
        Array<{
          _creationTime: number;
          _id: string;
          importance: number;
          key?: string;
          status: string;
          title?: string;
        }>
      >;
      listRagNamespaces: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _id: string;
          dimension: number;
          modelId: string;
          namespace: string;
          status: string;
        }>
      >;
      listThreadMessages: FunctionReference<
        "query",
        "internal",
        { limit?: number; threadId: string },
        Array<{
          _id: string;
          content: string;
          createdAt: number;
          role: "user" | "assistant";
        }>
      >;
    };
  };
};
