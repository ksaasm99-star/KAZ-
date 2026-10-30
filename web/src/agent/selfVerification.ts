import type { ProjectExpertContext } from "./projectExpert";

export type GeneratedCodeFile = {
  path: string;
  content: string;
  language?: string;
};

export type VerificationSeverity = "error" | "warning";

export type SelfVerificationIssue = {
  severity: VerificationSeverity;
  code: string;
  path?: string;
  message: string;
};

export type SelfVerificationResult = {
  status: "VERIFIED" | "PARTIAL" | "BLOCKED";
  allowed: boolean;
  checkedFiles: number;
  checks: string[];
  issues: SelfVerificationIssue[];
  checkedAt: string;
};

const SECRET_PATTERNS: RegExp[] = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /(?:ghp_|github_pat_|sk-[A-Za-z0-9_-]{16,})/,
  /(?:GEMINI_API_KEY|OPENAI_API_KEY|API_KEY)\s*[:=]\s*["']?[^\s"']{12,}/i,
];

const BALANCED_PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSING = new Set(Object.values(BALANCED_PAIRS));

function hasUnsafePath(path: string): boolean {
  return !path.trim() || path.startsWith("/") || path.split(/[\\/]/).includes("..") || /[\u0000-\u001f]/.test(path);
}

function checkBalancedDelimiters(file: GeneratedCodeFile): SelfVerificationIssue | undefined {
  const stack: string[] = [];
  for (const character of file.content) {
    if (BALANCED_PAIRS[character]) stack.push(BALANCED_PAIRS[character]);
    else if (CLOSING.has(character) && stack.pop() !== character) {
      return { severity: "error", code: "UNBALANCED_DELIMITERS", path: file.path, message: "الأقواس أو المحددات غير متوازنة." };
    }
  }
  if (stack.length > 0) {
    return { severity: "error", code: "UNBALANCED_DELIMITERS", path: file.path, message: "يوجد قوس أو محدد مفتوح بلا إغلاق." };
  }
  return undefined;
}

export function verifyGeneratedCode(files: readonly GeneratedCodeFile[], options: { expertContext?: ProjectExpertContext; now?: Date } = {}): SelfVerificationResult {
  const issues: SelfVerificationIssue[] = [];
  const checks = ["سلامة المسارات", "ملفات غير فارغة", "كشف الأسرار", "توازن المحددات"];
  const seen = new Set<string>();

  if (files.length === 0) {
    issues.push({ severity: "error", code: "NO_ARTIFACTS", message: "لا يوجد كود مولّد لفحصه." });
  }

  for (const file of files) {
    if (seen.has(file.path)) issues.push({ severity: "error", code: "DUPLICATE_PATH", path: file.path, message: "تكرر مسار الملف داخل الناتج." });
    seen.add(file.path);
    if (hasUnsafePath(file.path)) issues.push({ severity: "error", code: "UNSAFE_PATH", path: file.path, message: "مسار الملف غير آمن أو يحاول الخروج من مساحة المشروع." });
    if (!file.content.trim()) issues.push({ severity: "error", code: "EMPTY_FILE", path: file.path, message: "الملف فارغ ولا يمكن اعتماده." });
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(file.content)) {
        issues.push({ severity: "error", code: "SECRET_DETECTED", path: file.path, message: "اكتُشفت قيمة تبدو كسر أو مفتاح داخل الكود." });
        break;
      }
    }
    const delimiterIssue = checkBalancedDelimiters(file);
    if (delimiterIssue) issues.push(delimiterIssue);
  }

  if (options.expertContext && options.expertContext.project.id.trim() === "") {
    issues.push({ severity: "error", code: "MISSING_PROJECT_CONTEXT", message: "لا يمكن اعتماد الكود دون سياق مشروع صالح." });
  }

  const hasErrors = issues.some((issue) => issue.severity === "error");
  const hasWarnings = issues.some((issue) => issue.severity === "warning");
  return {
    status: hasErrors ? "BLOCKED" : hasWarnings ? "PARTIAL" : "VERIFIED",
    allowed: !hasErrors,
    checkedFiles: files.length,
    checks,
    issues,
    checkedAt: (options.now ?? new Date()).toISOString(),
  };
}
