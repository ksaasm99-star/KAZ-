import { randomUUID } from "node:crypto";
import {
  applyAuthorizedProjectEdit,
  authorizeProjectEditApproval,
  getProjectWorkspacePolicy,
  proposeProjectEdit,
  type ProjectEditDraft,
  type ProjectEditFileInput,
  type ProjectEditInputMode,
  type ProjectLike,
} from "./projectEditGateway";
import { resolveWorkspacePath } from "./workspacePolicy";
import { isEmergencyStopped } from "./emergencyStop";
import type { TypedFactoryRequest } from "../src/agent/factoryRequest";
import { containsPromptInjection } from "../src/agent/promptDefense";

declare const Buffer: { byteLength(value: string, encoding: string): number };

export type PlannerProposal = Readonly<{
  kind: "project_edit";
  requestId: string;
  projectId: string;
  instruction: string;
  inputMode: ProjectEditInputMode;
  files: readonly ProjectEditFileInput[];
  factoryRequest?: TypedFactoryRequest;
}>;

export type PolicyDecision = Readonly<{
  allowed: boolean;
  reasons: readonly string[];
  normalizedPaths: readonly string[];
}>;

export type ApprovedExecution = Readonly<{
  authorizationId: string;
  requestId: string;
  projectId: string;
  draftId: string;
}>;

const MAX_FILES = 12;
const MAX_INSTRUCTION_LENGTH = 2000;

/** Planner-only boundary: it creates data and cannot read, write, or execute anything. */
export function createPlannerProposal(input: {
  projectId: string;
  instruction: string;
  inputMode: ProjectEditInputMode;
  files: ProjectEditFileInput[];
  factoryRequest?: TypedFactoryRequest;
}): PlannerProposal {
  const instruction = input.instruction.trim();
  if (!input.projectId.trim()) throw new Error("PROJECT_ID_REQUIRED");
  if (!instruction || instruction.length > MAX_INSTRUCTION_LENGTH) throw new Error("INVALID_PLANNER_INSTRUCTION");
  if (!Array.isArray(input.files) || input.files.length === 0 || input.files.length > MAX_FILES) throw new Error("INVALID_PLANNER_FILE_COUNT");
  return Object.freeze({
    kind: "project_edit",
    requestId: `planner-${randomUUID()}`,
    projectId: input.projectId,
    instruction,
    inputMode: input.inputMode,
    files: Object.freeze(input.files.map((file) => Object.freeze({ ...file }))),
    ...(input.factoryRequest ? { factoryRequest: input.factoryRequest } : {}),
  });
}

/** Policy is evaluated before an approval token is issued. It never writes files. */
export function evaluatePolicy(project: ProjectLike, proposal: PlannerProposal): PolicyDecision {
  const reasons: string[] = [];
  const normalizedPaths: string[] = [];
  if (proposal.kind !== "project_edit") reasons.push("ACTION_NOT_ALLOWED");
  if (proposal.projectId !== project.id) reasons.push("PROJECT_SCOPE_MISMATCH");
  if (proposal.files.length === 0 || proposal.files.length > MAX_FILES) reasons.push("FILE_COUNT_NOT_ALLOWED");
  if (containsPromptInjection(proposal.instruction)) reasons.push("PROMPT_INJECTION_DETECTED:INSTRUCTION");

  let policy;
  try {
    policy = getProjectWorkspacePolicy(project);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "WORKSPACE_POLICY_UNAVAILABLE");
  }

  const seen = new Set<string>();
  if (policy) {
    for (const file of proposal.files) {
      if (containsPromptInjection(file.content)) reasons.push(`PROMPT_INJECTION_DETECTED:${file.path}`);
      try {
        const resolved = resolveWorkspacePath(policy, file.path, "write");
        if (seen.has(resolved.relativePath)) reasons.push(`DUPLICATE_PATH:${resolved.relativePath}`);
        seen.add(resolved.relativePath);
        normalizedPaths.push(resolved.relativePath);
        if (Buffer.byteLength(file.content, "utf8") > policy.maxFileBytes) reasons.push(`FILE_TOO_LARGE:${resolved.relativePath}`);
      } catch (error) {
        reasons.push(error instanceof Error ? error.message : "PATH_POLICY_REJECTED");
      }
    }
  }

  return Object.freeze({ allowed: reasons.length === 0, reasons: Object.freeze(reasons), normalizedPaths: Object.freeze(normalizedPaths) });
}

const approvedExecutions = new Map<string, { project: ProjectLike; draft: ProjectEditDraft }>();

/** Policy + proposal stage. The returned draft is not applied. */
export async function requestProjectEditApproval(input: { project: ProjectLike; proposal: PlannerProposal }): Promise<{ proposal: PlannerProposal; policy: PolicyDecision; draft: ProjectEditDraft }> {
  const policy = evaluatePolicy(input.project, input.proposal);
  if (!policy.allowed) throw new Error(`POLICY_REJECTED:${policy.reasons.join("|")}`);
  const draft = await proposeProjectEdit({
    project: input.project,
    instruction: input.proposal.instruction,
    inputMode: input.proposal.inputMode,
    files: [...input.proposal.files],
    factoryRequest: input.proposal.factoryRequest,
  });
  return { proposal: input.proposal, policy, draft };
}

/** Approval gate: validates the real SHA/input digest, then issues an opaque one-use executor witness. */
export async function approvePlannerProposal(input: { project: ProjectLike; proposal: PlannerProposal; draft: ProjectEditDraft }): Promise<ApprovedExecution> {
  if (input.draft.projectId !== input.project.id || input.draft.projectId !== input.proposal.projectId) throw new Error("APPROVAL_SCOPE_MISMATCH");
  if (input.draft.instruction !== input.proposal.instruction || input.draft.changes.length !== input.proposal.files.length) throw new Error("APPROVAL_PROPOSAL_MISMATCH");
  const authorizedDraft = await authorizeProjectEditApproval(input.project, input.draft.approvalToken, input.proposal.factoryRequest);
  const authorizationId = `authorized-${randomUUID()}`;
  approvedExecutions.set(authorizationId, { project: input.project, draft: authorizedDraft });
  return Object.freeze({ authorizationId, requestId: input.proposal.requestId, projectId: input.project.id, draftId: authorizedDraft.id });
}

/** The only project-edit executor entry point. No witness means no filesystem write. */
export async function executeApprovedProjectEdit(input: { project: ProjectLike; approval: ApprovedExecution }): Promise<ProjectEditDraft> {
  if (isEmergencyStopped()) throw new Error("EMERGENCY_STOPPED");
  const pending = approvedExecutions.get(input.approval.authorizationId);
  if (!pending) throw new Error("APPROVAL_REQUIRED");
  approvedExecutions.delete(input.approval.authorizationId);
  if (pending.project.id !== input.project.id || pending.draft.id !== input.approval.draftId || pending.project.id !== input.approval.projectId) throw new Error("EXECUTION_SCOPE_MISMATCH");
  return applyAuthorizedProjectEdit(input.project, pending.draft);
}

export function pendingApprovalCount(): number {
  return approvedExecutions.size;
}
