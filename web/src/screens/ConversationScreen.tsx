import { useEffect, useState } from "react";
import { monitorLocalPerformance } from "../engine/localProvider";
import type { LocalPerformanceStatus } from "../engine/localProvider";
import { loadIdentity, saveIdentity, sendGlobalMessage } from "../memoryApi";
import type { KazIdentity } from "../agent/identity";
import { useSpeechInput } from "../voice/speechInput";

type Message = { id: number; role: "user" | "assistant"; text: string };

const initialMessages: Message[] = [{ id: 1, role: "assistant", text: "مرحبًا، أنا مساحة محادثة KAZ. اكتب فكرتك أو اسألني عن مشروعك، وسأساعدك في ترتيب الخطوة التالية." }];

export default function ConversationScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [busy, setBusy] = useState(false);
  const [performanceStatus, setPerformanceStatus] = useState<LocalPerformanceStatus | null>(null);
  const [identityEnabled, setIdentityEnabled] = useState(true);
  const [identitySaving, setIdentitySaving] = useState(false);
  const voiceInput = useSpeechInput((spoken) => {
    setInputMode("voice");
    setDraft((current) => `${current.trim()}${current.trim() ? " " : ""}${spoken}`);
  });

  useEffect(() => monitorLocalPerformance(setPerformanceStatus), []);
  useEffect(() => { void loadIdentity().then((result) => setIdentityEnabled(result.identity.applyToGlobalChat)).catch(() => undefined); }, []);

  async function toggleIdentity() {
    if (identitySaving) return;
    setIdentitySaving(true);
    try {
      const current = await loadIdentity();
      const next = !current.identity.applyToGlobalChat;
      await saveIdentity({ ...current.identity, applyToGlobalChat: next } as KazIdentity);
      setIdentityEnabled(next);
    } catch (error) {
      setMessages((current) => [...current, { id: Date.now(), role: "assistant", text: `تعذر تغيير هوية المحادثة: ${error instanceof Error ? error.message : "خطأ غير معروف."}` }]);
    } finally { setIdentitySaving(false); }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    setMessages((current) => [...current, { id: Date.now(), role: "user", text }]);
    try {
      const result = await sendGlobalMessage(text, inputMode);
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", text: result.reply }]);
    } catch (error) {
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", text: `BLOCKED: ${error instanceof Error ? error.message : "تعذر تشغيل النموذج."}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-screen">
      <header className="workspace-topbar"><button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button><div><span className="section-kicker">هوية KAZ المركزية</span><h1>المحادثة العامة</h1></div><button className={`identity-chat-toggle ${identityEnabled ? "enabled" : "disabled"}`} type="button" onClick={() => void toggleIdentity()} disabled={identitySaving}>{identitySaving ? "جاري الحفظ…" : identityEnabled ? "إيقاف الهوية" : "تشغيل الهوية"}</button></header>
      <main className="conversation-layout">
        <section className="conversation-panel" aria-label="محادثة KAZ">
          <div className="conversation-head"><div className="conversation-avatar">K</div><div><strong>مساعد KAZ</strong><small>{identityEnabled ? "الهوية والحارس مطبقان" : "الهوية متوقفة لهذه المحادثة"}</small></div><span className="conversation-local">{identityEnabled ? "هوية مفعلة" : "بدون هوية"}</span></div>
          <PerformanceIndicators status={performanceStatus} />
          <div className="message-list">{messages.map((message) => <div className={`message-bubble ${message.role}`} key={message.id}>{message.text}</div>)}</div>
          <div className="message-composer"><textarea value={draft} onChange={(event) => { setInputMode("text"); setDraft(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={busy ? "جاري تطبيق الهوية وتحليل الرسالة..." : "اكتب رسالتك..."} rows={2} aria-label="رسالة جديدة" disabled={busy} /><div className="message-composer-actions"><button className={`voice-input-button ${voiceInput.listening ? "listening" : ""}`} type="button" onClick={voiceInput.toggle} disabled={busy} aria-pressed={voiceInput.listening} title={voiceInput.supported ? "التحدث بالعربية وإضافة النص إلى الرسالة" : "الإدخال الصوتي غير مدعوم في هذا المتصفح"}>{voiceInput.listening ? "إيقاف الاستماع" : "تحدث"}<span aria-hidden="true">◉</span></button><button className="message-send-button" type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || busy}>{busy ? "جاري التحليل…" : "إرسال"} <span>←</span></button></div></div>
          {voiceInput.error && <p className="voice-input-error" role="alert">{voiceInput.error}</p>}
          <p className="conversation-disclosure">مصدر الأمر: {inputMode === "voice" ? "صوت محوّل إلى نص" : "كتابة"}. كلاهما يمر عبر حارس الهوية نفسه ولا ينفذ تعديلًا تلقائيًا. يمكنك إيقاف هوية KAZ لهذه المحادثة فقط من الزر أعلاه.</p>
        </section>
      </main>
    </div>
  );
}

function PerformanceIndicators({ status }: { status: LocalPerformanceStatus | null }) {
  const memoryValue = status?.heapPercent;
  const responsivenessValue = status ? Math.min(100, Math.round(status.eventLoopLagMs * 5)) : 0;
  return (
    <section className="conversation-performance" aria-label="مؤشرات أداء الجهاز الحية">
      <div className="performance-heading"><div><span className="section-kicker">مراقبة حية</span><strong>أداء المحادثة</strong></div><small>{status ? "يتحدث كل ثانية" : "جاري القياس"}</small></div>
      <div className="performance-grid">
        <PerformanceMetric label="ذاكرة JavaScript" value={status?.memoryUsedMb === undefined ? "غير معلنة" : `${status.memoryUsedMb} MB`} detail={status?.memoryLimitMb ? `من ${status.memoryLimitMb} MB` : "المتصفح لا يعلن الحد"} percent={memoryValue} />
        <PerformanceMetric label="استجابة المعالج التقريبية" value={status ? `${status.eventLoopLagMs} ms` : "—"} detail={status?.cores ? `${status.cores} أنوية معلنة` : "CPU الحقيقي غير متاح من المتصفح"} percent={responsivenessValue} inverse />
      </div>
      <p className="performance-disclosure">الذاكرة هي Heap المتصفح، ومؤشر المعالج يقيس تأخر حلقة JavaScript؛ لا يساوي نسبة استخدام CPU النظام.</p>
    </section>
  );
}

function PerformanceMetric({ label, value, detail, percent, inverse = false }: { label: string; value: string; detail: string; percent?: number; inverse?: boolean }) {
  const width = percent === undefined ? 0 : Math.max(3, Math.min(100, percent));
  return <div className="performance-metric"><div className="performance-metric-top"><span>{label}</span><strong>{value}</strong></div><div className="performance-bar" aria-hidden="true"><i className={inverse ? "inverse" : ""} style={{ width: `${width}%` }} /></div><small>{detail}{percent === undefined ? "" : ` — ${percent}%`}</small></div>;
}
