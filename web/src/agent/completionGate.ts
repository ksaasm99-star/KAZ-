import type { AgentEvidence, AgentTaskState } from "./agentTask";
import type { SelfVerificationResult } from "./selfVerification";

export type CompletionGateStatus = "VERIFIED" | "PARTIAL" | "BLOCKED" | "FAILED" | "CANCELLED";

export type CompletionGateResult = {
  status: CompletionGateStatus;
  allowed: boolean;
  reason: string;
  checkedAt: string;
  evidenceCount: number;
  verifiedEvidenceCount: number;
};

function evidenceSummary(evidence: AgentEvidence[]): { count: number; verified: number } {
  return {
    count: evidence.length,
    verified: evidence.filter((item) => item.ok && item.sourceIds.length > 0).length,
  };
}

export function evaluateCompletionGate(state: Pick<AgentTaskState, "status" | "evidence"> & { requiresSelfVerification?: boolean; selfVerification?: SelfVerificationResult }, now = new Date()): CompletionGateResult {
  const { count, verified } = evidenceSummary(state.evidence);
  const checkedAt = now.toISOString();

  if (state.status === "cancelled") {
    return { status: "CANCELLED", allowed: false, reason: "أُلغيت المهمة قبل اكتمال الأدلة.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (state.status === "failed") {
    return { status: "FAILED", allowed: false, reason: "فشلت المهمة؛ لا يمكن اعتماد النتيجة.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (state.status === "blocked") {
    return { status: "BLOCKED", allowed: false, reason: "حُجبت المهمة بسبب مهلة أو قيد تنفيذي.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (state.status !== "completed") {
    return { status: "PARTIAL", allowed: false, reason: "لم تصل المهمة إلى حالة اكتمال.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (state.requiresSelfVerification && !state.selfVerification) {
    return { status: "BLOCKED", allowed: false, reason: "مُنعت حالة النجاح: لم يُنفّذ التحقق الذاتي للكود المولّد.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (state.requiresSelfVerification && state.selfVerification && !state.selfVerification.allowed) {
    return { status: "BLOCKED", allowed: false, reason: "مُنعت حالة النجاح: فشل التحقق الذاتي للكود المولّد.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (count === 0) {
    return { status: "BLOCKED", allowed: false, reason: "مُنعت حالة النجاح: لا توجد أي أدلة مسجلة.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  if (verified !== count) {
    return { status: "PARTIAL", allowed: false, reason: "مُنعت حالة النجاح: بعض الأدلة فشلت أو لا تحتوي مصدرًا.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
  }
  return { status: "VERIFIED", allowed: true, reason: "اكتملت المهمة وكل خطوة ناجحة مرتبطة بمصدر دليل.", checkedAt, evidenceCount: count, verifiedEvidenceCount: verified };
}

export function hasVerifiedEvidence(evidence: AgentEvidence[]): boolean {
  return evidence.length > 0 && evidence.every((item) => item.ok && item.sourceIds.length > 0);
}
