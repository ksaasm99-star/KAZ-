import type { AgentTask } from "./agentTask";
import { createTypedFactoryRequest, type TypedFactoryRequest, type TypedFactoryRequestInput } from "./factoryRequest";

export type AgentFactoryRequestPlan = Omit<TypedFactoryRequestInput, "projectId" | "requestId" | "userIntent">;

/**
 * يحول مهمة وكيل موجودة إلى عقد مصنع typed دون أي كتابة أو تنفيذ خارجي.
 * projectId وrequestId وuserIntent تأتي من المهمة نفسها لمنع تبديل نطاق الطلب.
 */
export async function createFactoryRequestFromAgentTask(
  task: AgentTask,
  plan: AgentFactoryRequestPlan,
  createdAt?: string,
): Promise<TypedFactoryRequest> {
  return createTypedFactoryRequest(
    {
      projectId: task.projectId,
      requestId: task.id,
      userIntent: task.request,
      requirements: plan.requirements,
      constraints: plan.constraints,
      targetPlatform: plan.targetPlatform,
      acceptanceCriteria: plan.acceptanceCriteria,
      buildCommands: plan.buildCommands,
      testCommands: plan.testCommands,
    },
    createdAt,
  );
}
