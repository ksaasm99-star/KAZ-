import type { PersistentMemory } from "./persistentMemory";
import { inspectUntrustedData } from "../src/agent/promptDefense";

export type ProjectEvidence = {
  entityType: string;
  entityId: string;
  title: string;
  snippet: string;
  createdAt: string;
  confidence: "confirmed" | "inference" | "suggestion" | "unknown";
  confidenceLabel: "مؤكد" | "استنتاج" | "اقتراح" | "غير معروف";
  confidenceReason: string;
};

function labelFor(entityType: string): string {
  if (entityType === "source") return "مصدر";
  if (entityType === "knowledge") return "معرفة";
  if (entityType === "message") return "رسالة سابقة";
  return "ملف المشروع";
}

function trustRank(entityType: string): number {
  if (entityType === "knowledge") return 3;
  if (entityType === "source") return 2;
  if (entityType === "project") return 1;
  return 0;
}

function classifyConfidence(entityType: string, text: string): ProjectEvidence["confidence"] {
  const normalized = text.toLocaleLowerCase("ar");
  if (/\[(غير معروف|unknown)\]|غير مؤكد|غير معروف/.test(normalized)) return "unknown";
  if (/\[(اقتراح|suggestion)\]|اقتراح|يفضل|من الأفضل|يمكن أن/.test(normalized)) return "suggestion";
  if (/\[(استنتاج|inference)\]|استنتاج|ربما|قد يكون|يبدو أن|أعتقد/.test(normalized)) return "inference";
  if (entityType === "knowledge" || entityType === "project") return "confirmed";
  return "unknown";
}

function confidenceLabelFor(confidence: ProjectEvidence["confidence"]): ProjectEvidence["confidenceLabel"] {
  if (confidence === "confirmed") return "مؤكد";
  if (confidence === "inference") return "استنتاج";
  if (confidence === "suggestion") return "اقتراح";
  return "غير معروف";
}

function confidenceReasonFor(confidence: ProjectEvidence["confidence"], entityType: string): string {
  if (confidence === "confirmed") return entityType === "knowledge" ? "معرفة محفوظة كقاعدة للمشروع." : "بيانات تعريف المشروع المحفوظة.";
  if (confidence === "inference") return "النص يحتوي لغة استنتاجية أو وسم استنتاج.";
  if (confidence === "suggestion") return "النص يحتوي لغة اقتراحية أو وسم اقتراح.";
  return "المصدر موجود في الذاكرة، لكن درجة التحقق غير مثبتة.";
}

export function retrieveProjectEvidence(memory: PersistentMemory, projectId: string, query: string, limit = 6): ProjectEvidence[] {
  try {
    const rows = memory.search(query, projectId) as Array<Record<string, unknown>>;
    const trustedRows = rows
      .filter((row) => String(row.entityType ?? "project") !== "message")
      .sort((left, right) => trustRank(String(right.entityType ?? "project")) - trustRank(String(left.entityType ?? "project")));
    return trustedRows.slice(0, limit).map((row) => {
      const rawEntityType = String(row.entityType ?? "project");
      const snippet = inspectUntrustedData(String(row.content ?? "")).sanitized.replace(/\s+/g, " ").trim().slice(0, 900);
      const confidence = classifyConfidence(rawEntityType, `${String(row.title ?? "")} ${snippet}`);
      return {
      entityType: labelFor(rawEntityType),
      entityId: String(row.entityId ?? ""),
      title: String(row.title ?? "بدون عنوان"),
      snippet,
      createdAt: String(row.createdAt ?? ""),
      confidence,
      confidenceLabel: confidenceLabelFor(confidence),
      confidenceReason: confidenceReasonFor(confidence, rawEntityType),
      };
    }).filter((item) => item.snippet.length > 0);
  } catch {
    return [];
  }
}

export function formatProjectEvidence(evidence: ProjectEvidence[]): string {
  if (evidence.length === 0) return "لا توجد أدلة مطابقة في ذاكرة هذا المشروع.";
  return evidence.map((item, index) => `[${index + 1}] ${item.confidenceLabel} — ${item.entityType}: ${item.title}\n${item.snippet}\nسبب التصنيف: ${item.confidenceReason}`).join("\n\n");
}

export function appendEvidenceToReply(reply: string, evidence: ProjectEvidence[]): string {
  if (evidence.length === 0) return `${reply}\n\n--- أدلة الذاكرة ---\nلم يُستخدم مصدر محفوظ؛ الإجابة مبنية على رسالة المستخدم وسياق المشروع العام.`;
  const list = evidence.map((item, index) => `${index + 1}. [${item.confidenceLabel}] ${item.entityType} — ${item.title}\n   ${item.snippet}\n   سبب التصنيف: ${item.confidenceReason}`).join("\n");
  return `${reply}\n\n--- أدلة الذاكرة المستخدمة ---\n${list}`;
}
