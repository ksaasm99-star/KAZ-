import { useEffect, useState } from "react";
import { monitorLocalPerformance } from "../engine/localProvider";
import type { LocalPerformanceStatus } from "../engine/localProvider";

type Message = { id: number; role: "user" | "assistant"; text: string };

const initialMessages: Message[] = [{ id: 1, role: "assistant", text: "مرحبًا، أنا مساحة محادثة KAZ. اكتب فكرتك أو اسألني عن مشروعك، وسأساعدك في ترتيب الخطوة التالية." }];

export default function ConversationScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [performanceStatus, setPerformanceStatus] = useState<LocalPerformanceStatus | null>(null);

  useEffect(() => monitorLocalPerformance(setPerformanceStatus), []);

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: "وصلت فكرتك. رتّبها في شاشة البناء عندما تكون جاهزًا، وسأبقي هذه المحادثة محلية حتى تفعّل محرك KAZ صراحةً." }]);
    setDraft("");
  }

  return (
    <div className="workspace-screen">
      <header className="workspace-topbar"><button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button><div><span className="section-kicker">مساحة KAZ</span><h1>المحادثة</h1></div></header>
      <main className="conversation-layout">
        <section className="conversation-panel" aria-label="محادثة KAZ">
          <div className="conversation-head"><div className="conversation-avatar">K</div><div><strong>مساعد KAZ</strong><small>المحادثة المحلية جاهزة</small></div><span className="conversation-local">محلي</span></div>
          <PerformanceIndicators status={performanceStatus} />
          <div className="message-list">{messages.map((message) => <div className={`message-bubble ${message.role}`} key={message.id}>{message.text}</div>)}</div>
          <div className="message-composer"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="اكتب رسالتك..." rows={2} aria-label="رسالة جديدة" /><button type="button" onClick={sendMessage} disabled={!draft.trim()}>إرسال <span>←</span></button></div>
          <p className="conversation-disclosure">المحادثة الحالية محلية على هذا الجهاز. لا يتم إرسالها إلى خدمة خارجية ما لم يتم تفعيل محرك KAZ.</p>
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
