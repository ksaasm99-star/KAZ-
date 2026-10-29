import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Project, ProjectKnowledge, ProjectMessage, ProjectSource } from "../project";
import { getFactoryBuildStatus, startFactoryBuild } from "../memoryApi";

type Tab = "overview" | "sources" | "knowledge" | "chat";

type ProjectWorkspaceProps = {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
};

export default function ProjectWorkspaceScreen({ project, onBack, onUpdate }: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [sourceName, setSourceName] = useState("");
  const [sourceValue, setSourceValue] = useState("");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [draft, setDraft] = useState("");
  const [factoryState, setFactoryState] = useState<"idle" | "preparing" | "building" | "ready" | "error">("idle");
  const [factoryMessage, setFactoryMessage] = useState("");
  const [factoryRequestId, setFactoryRequestId] = useState("");

  function update(changes: Partial<Project>) {
    onUpdate({ ...project, ...changes, updatedAt: new Date().toISOString() });
  }

  function addSource() {
    const name = sourceName.trim();
    const value = sourceValue.trim();
    if (!name || !value) return;
    const source: ProjectSource = { id: `source-${Date.now()}`, name, value, kind: value.startsWith("http") ? "link" : "note" };
    update({ sources: [...project.sources, source] });
    setSourceName("");
    setSourceValue("");
  }

  function removeSource(id: string) {
    update({ sources: project.sources.filter((source) => source.id !== id) });
  }

  function addKnowledge() {
    const title = knowledgeTitle.trim();
    const content = knowledgeContent.trim();
    if (!title || !content) return;
    const item: ProjectKnowledge = { id: `knowledge-${Date.now()}`, title, content };
    update({ knowledge: [...project.knowledge, item] });
    setKnowledgeTitle("");
    setKnowledgeContent("");
  }

  function removeKnowledge(id: string) {
    update({ knowledge: project.knowledge.filter((item) => item.id !== id) });
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    const reply = `تم حفظ رسالتك داخل مشروع «${project.title}». محرك KAZ غير مفعّل حاليًا، لذلك لم يتم إرسال طلب خارجي؛ ستبقى الرسالة ضمن سياق المشروع لاستخدامها عند التفعيل.`;
    const messages: ProjectMessage[] = [...project.messages, { id: `message-${Date.now()}`, role: "user", text }, { id: `message-${Date.now()}-reply`, role: "assistant", text: reply }];
    update({ messages });
    setDraft("");
  }

  useEffect(() => {
    if (!factoryRequestId || !["preparing", "building"].includes(factoryState)) return;
    const timer = window.setInterval(async () => {
      try {
        const result = await getFactoryBuildStatus(factoryRequestId);
        if (result.status === "queued" || result.status === "building" || result.status === "packaging") {
          setFactoryState("building");
          setFactoryMessage(result.message);
          return;
        }
        window.clearInterval(timer);
        if (result.status === "ready" && result.directUrl) {
          setFactoryState("ready");
          setFactoryMessage(result.message);
          const alreadyAdded = project.messages.some((message) => message.text.includes(result.directUrl ?? ""));
          if (!alreadyAdded) update({ messages: [...project.messages, { id: `message-${Date.now()}-apk`, role: "assistant", text: `اكتمل بناء مشروعك. حمّل ملف APK مباشرة من هنا: ${result.directUrl}` }] });
        } else if (result.status === "failed") {
          setFactoryState("error");
          setFactoryMessage(result.message);
        }
      } catch (error) {
        window.clearInterval(timer);
        setFactoryState("error");
        setFactoryMessage(error instanceof Error ? error.message : "تعذر متابعة بناء APK.");
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [factoryRequestId, factoryState]);

  async function prepareFactory() {
    setFactoryState("preparing");
    setFactoryMessage("جاري إرسال مسودة المشروع إلى GitHub Actions لبناء APK…");
    try {
      const result = await startFactoryBuild(project.id, "kotlin");
      setFactoryRequestId(result.requestId);
      setFactoryState("building");
      setFactoryMessage(`${result.message} رقم الطلب: ${result.requestId}`);
    } catch (error) {
      setFactoryState("error");
      setFactoryMessage(error instanceof Error ? error.message : "تعذر تحضير طلب المصنع.");
    }
  }

  return (
    <div className="project-workspace-screen">
      <header className="project-workspace-topbar">
        <button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button>
        <div><span className="section-kicker">مساحة مشروع مستقلة</span><h1>{project.title}</h1></div>
        <span className="project-scope-badge">معزول</span>
      </header>
      <main className="project-workspace-layout">
        <section className="project-workspace-main">
          <div className="project-summary-card"><span className="section-kicker">وصف المشروع</span><p>{project.summary}</p><small>آخر تحديث: {new Date(project.updatedAt).toLocaleString("ar-EG")}</small></div>
          <nav className="project-tabs" aria-label="أقسام المشروع">
            {(["overview", "sources", "knowledge", "chat"] as Tab[]).map((item) => <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>{item === "overview" ? "نظرة عامة" : item === "sources" ? `المصادر (${project.sources.length})` : item === "knowledge" ? `المعرفة (${project.knowledge.length})` : "محادثة المشروع"}</button>)}
          </nav>
          {tab === "overview" && <Overview project={project} onSelect={setTab} onPrepareFactory={prepareFactory} factoryState={factoryState} factoryMessage={factoryMessage} />}
          {tab === "sources" && <section className="project-section"><SectionTitle eyebrow="مدخلات المشروع" title="المصادر" description="أضف روابط أو ملاحظات سيستخدمها هذا المشروع فقط." /><div className="project-form"><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="اسم المصدر" aria-label="اسم المصدر" /><textarea value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} placeholder="الرابط أو محتوى الملاحظة..." rows={3} aria-label="قيمة المصدر" /><button className="primary-cta" type="button" onClick={addSource} disabled={!sourceName.trim() || !sourceValue.trim()}>إضافة مصدر <span>＋</span></button></div><ItemList empty="لا توجد مصادر مضافة لهذا المشروع." items={project.sources} onRemove={removeSource} render={(source) => <><strong>{source.name}</strong><p>{source.value}</p></>} /></section>}
          {tab === "knowledge" && <section className="project-section"><SectionTitle eyebrow="سياق خاص" title="معرفة المشروع" description="سجّل القواعد والمعلومات التي يجب أن يفهمها KAZ داخل هذا المشروع." /><div className="project-form"><input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} placeholder="عنوان المعرفة" aria-label="عنوان المعرفة" /><textarea value={knowledgeContent} onChange={(event) => setKnowledgeContent(event.target.value)} placeholder="مثال: الجمهور المستهدف، قواعد التصميم، متطلبات المشروع..." rows={4} aria-label="محتوى المعرفة" /><button className="primary-cta" type="button" onClick={addKnowledge} disabled={!knowledgeTitle.trim() || !knowledgeContent.trim()}>حفظ المعرفة <span>＋</span></button></div><ItemList empty="لم تضف معرفة خاصة بهذا المشروع بعد." items={project.knowledge} onRemove={removeKnowledge} render={(item) => <><strong>{item.title}</strong><p>{item.content}</p></>} /></section>}
          {tab === "chat" && <section className="project-section project-chat-section"><SectionTitle eyebrow="سياق معزول" title="محادثة المشروع" description="هذه المحادثة مرتبطة بهذا المشروع ولا تشارك رسائل المشاريع الأخرى." /><div className="project-message-list">{project.messages.map((message) => <div className={`project-message ${message.role}`} key={message.id}>{renderMessage(message.text)}</div>)}</div><div className="project-composer"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="اكتب رسالة داخل سياق المشروع..." rows={3} aria-label="رسالة المشروع" /><button className="primary-cta" type="button" onClick={sendMessage} disabled={!draft.trim()}>إرسال <span>←</span></button></div></section>}
        </section>
        <aside className="project-workspace-aside"><div className="workspace-scope-card"><span className="section-kicker">حدود المشروع</span><h2>هذا المشروع مستقل</h2><p>المصادر والمعرفة والمحادثة محفوظة بمعرّف المشروع ولا تختلط بباقي المشاريع.</p><div><span>المصادر</span><strong>{project.sources.length.toLocaleString("ar-EG")}</strong></div><div><span>المعرفة</span><strong>{project.knowledge.length.toLocaleString("ar-EG")}</strong></div><div><span>الرسائل</span><strong>{project.messages.length.toLocaleString("ar-EG")}</strong></div></div></aside>
      </main>
    </div>
  );
}

  function Overview({ project, onSelect, onPrepareFactory, factoryState, factoryMessage }: { project: Project; onSelect: (tab: Tab) => void; onPrepareFactory: () => void; factoryState: "idle" | "preparing" | "building" | "ready" | "error"; factoryMessage: string }) {
  return <section className="project-section"><SectionTitle eyebrow="بداية المشروع" title="جهّز سياقك قبل البناء" description="أضف المصادر والمعرفة، ثم تحدث مع KAZ داخل مساحة هذا المشروع." /><div className="workspace-quick-grid"><button type="button" onClick={() => onSelect("sources")}><span>⌁</span><strong>أضف المصادر</strong><small>روابط وملاحظات المشروع</small></button><button type="button" onClick={() => onSelect("knowledge")}><span>✦</span><strong>أضف المعرفة</strong><small>قواعد ومعلومات خاصة</small></button><button type="button" onClick={() => onSelect("chat")}><span>◌</span><strong>افتح المحادثة</strong><small>محادثة مرتبطة بالمشروع</small></button></div><div className="factory-bridge-card"><div><span className="section-kicker">مصنع التطبيقات</span><h3>ابنِ APK من مسودة هذا المشروع</h3><p>سيُرسل اسم المشروع ووصفه ومصادره ومعرفته إلى GitHub Actions. بعد نجاح البناء ستظهر رسالة في محادثة المشروع تحتوي رابط تنزيل مباشر.</p></div><button className="primary-cta" type="button" onClick={onPrepareFactory} disabled={factoryState === "preparing" || factoryState === "building"}>{factoryState === "preparing" ? "جاري الإرسال…" : factoryState === "building" ? "جاري بناء APK…" : factoryState === "ready" ? "إعادة بناء APK" : "ابنِ APK الآن"}<span>←</span></button>{factoryMessage && <div className={`factory-bridge-status ${factoryState}`} role={factoryState === "error" ? "alert" : "status"}>{factoryMessage}</div>}</div></section>;
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="project-section-title"><span className="section-kicker">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function renderMessage(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => part.startsWith("http") ? <a href={part} key={`${part}-${index}`} target="_blank" rel="noreferrer" download>تحميل APK مباشرة</a> : <span key={`${part}-${index}`}>{part}</span>);
}

function ItemList<T extends { id: string }>({ empty, items, onRemove, render }: { empty: string; items: T[]; onRemove: (id: string) => void; render: (item: T) => ReactNode }) {
  return items.length === 0 ? <div className="project-empty-state">{empty}</div> : <div className="project-item-list">{items.map((item) => <article className="project-item" key={item.id}><div>{render(item)}</div><button type="button" onClick={() => onRemove(item.id)} aria-label="حذف العنصر">×</button></article>)}</div>;
}
