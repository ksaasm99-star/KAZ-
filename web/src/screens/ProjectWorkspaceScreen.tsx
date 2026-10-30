import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Project, ProjectKnowledge, ProjectMessage, ProjectSource } from "../project";
import { approveProjectEdit, getFactoryBuildStatus, KazApiError, loadIdentity, proposeProjectEdit, rejectProjectEdit, saveIdentity, sendProjectMessage, startFactoryBuild, type ProjectEditDraft, type ProjectEditInputMode } from "../memoryApi";
import type { FactoryDiagnostic, FactoryVerification } from "../memoryApi";
import type { KazIdentity } from "../agent/identity";
import { useSpeechInput } from "../voice/speechInput";

type Tab = "overview" | "sources" | "knowledge" | "chat";
type FactoryState = "idle" | "preparing" | "building" | "ready" | "error" | "blocked";

type ProjectWorkspaceProps = {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
  onArchive: () => void;
};

export default function ProjectWorkspaceScreen({ project, onBack, onUpdate, onArchive }: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [sourceName, setSourceName] = useState("");
  const [sourceValue, setSourceValue] = useState("");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [draft, setDraft] = useState("");
  const [inputMode, setInputMode] = useState<ProjectEditInputMode>("text");
  const [editPath, setEditPath] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDraft, setEditDraft] = useState<ProjectEditDraft | undefined>();
  const [editBusy, setEditBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [factoryState, setFactoryState] = useState<FactoryState>("idle");
  const [factoryMessage, setFactoryMessage] = useState("");
  const [factoryRequestId, setFactoryRequestId] = useState("");
  const [factoryVerification, setFactoryVerification] = useState<FactoryVerification | undefined>();
  const [factoryDiagnostics, setFactoryDiagnostics] = useState<FactoryDiagnostic[]>([]);
  const [factoryWorkflowUrl, setFactoryWorkflowUrl] = useState("");
  const [factoryDirectUrl, setFactoryDirectUrl] = useState("");
  const [identityEnabled, setIdentityEnabled] = useState(true);
  const [identitySaving, setIdentitySaving] = useState(false);
  const voiceInput = useSpeechInput((spoken) => { setInputMode("voice"); setDraft((current) => `${current.trim()}${current.trim() ? " " : ""}${spoken}`); });

  useEffect(() => { void loadIdentity().then((result) => setIdentityEnabled(result.identity.applyToProjectChat)).catch(() => undefined); }, []);

  async function toggleIdentity() {
    if (identitySaving) return;
    setIdentitySaving(true);
    try {
      const current = await loadIdentity();
      const next = !current.identity.applyToProjectChat;
      await saveIdentity({ ...current.identity, applyToProjectChat: next } as KazIdentity);
      setIdentityEnabled(next);
    } catch (error) {
      update({ messages: [...project.messages, { id: `message-${Date.now()}-identity`, role: "assistant", text: `تعذر تغيير هوية المشروع: ${error instanceof Error ? error.message : "خطأ غير معروف."}` }] });
    } finally { setIdentitySaving(false); }
  }

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

  async function sendMessage() {
    const text = draft.trim();
    if (!text || chatBusy) return;
    setChatBusy(true);
    setDraft("");
    try {
      const result = await sendProjectMessage(project.id, text, inputMode);
      onUpdate(result.project);
      if (result.factory) {
        setFactoryRequestId(result.factory.requestId);
        setFactoryVerification(undefined);
        setFactoryDiagnostics([]);
        setFactoryWorkflowUrl(result.factory.workflowUrl);
        setFactoryDirectUrl("");
        setFactoryState("building");
        setFactoryMessage(`${result.reply} رقم الطلب: ${result.factory.requestId}`);
      }
    } catch (error) {
      const reply = error instanceof Error ? `تعذر تشغيل محرك KAZ: ${error.message}` : "تعذر تشغيل محرك KAZ.";
      const messages: ProjectMessage[] = [...project.messages, { id: `message-${Date.now()}`, role: "user", text }, { id: `message-${Date.now()}-reply`, role: "assistant", text: reply }];
      update({ messages });
    } finally {
      setChatBusy(false);
    }
  }

  async function previewEdit() {
    if (!editPath.trim() || !editContent.trim() || editBusy) return;
    setEditBusy(true);
    try {
      const result = await proposeProjectEdit(project.id, draft.trim() || "تعديل ملف داخل المشروع", inputMode, [{ path: editPath.trim(), content: editContent }]);
      setEditDraft(result.draft);
    } catch (error) {
      update({ messages: [...project.messages, { id: `message-${Date.now()}-edit-error`, role: "assistant", text: `تعذر إنشاء معاينة التعديل: ${error instanceof Error ? error.message : "خطأ غير معروف."}` }] });
    } finally { setEditBusy(false); }
  }

  async function approveEdit() {
    if (!editDraft || editBusy) return;
    setEditBusy(true);
    try {
      const result = await approveProjectEdit(project.id, editDraft.approvalToken);
      update({ messages: [...project.messages, { id: `message-${Date.now()}-edit-applied`, role: "assistant", text: `تم اعتماد التعديل الآمن في ${result.paths.join(", ")} بعد مراجعة Diff.` }] });
      setEditDraft(undefined); setEditPath(""); setEditContent("");
    } catch (error) {
      update({ messages: [...project.messages, { id: `message-${Date.now()}-edit-conflict`, role: "assistant", text: `أُوقف اعتماد التعديل لحماية الملف: ${error instanceof Error ? error.message : "تعارض غير معروف."}` }] });
    } finally { setEditBusy(false); }
  }

  async function rejectEdit() {
    if (!editDraft || editBusy) return;
    setEditBusy(true);
    try { await rejectProjectEdit(project.id, editDraft.id); setEditDraft(undefined); } finally { setEditBusy(false); }
  }

  useEffect(() => {
    if (!factoryRequestId || !["preparing", "building"].includes(factoryState)) return;
    const timer = window.setInterval(async () => {
      try {
        const result = await getFactoryBuildStatus(factoryRequestId);
        setFactoryVerification(result.verification);
        setFactoryDiagnostics(result.diagnostics ?? []);
        setFactoryWorkflowUrl(result.workflowUrl ?? "");
        setFactoryDirectUrl(result.directUrl ?? "");
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
        setFactoryState(error instanceof KazApiError && error.status === 503 ? "blocked" : "error");
        setFactoryMessage(error instanceof Error ? error.message : "تعذر متابعة بناء APK.");
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [factoryRequestId, factoryState]);

  async function prepareFactory() {
    setFactoryState("preparing");
    setFactoryMessage("جاري التحقق من جاهزية المصنع وصلاحية الطلب…");
    try {
      const result = await startFactoryBuild(project.id, "kotlin");
      setFactoryRequestId(result.requestId);
      setFactoryVerification(undefined);
      setFactoryDiagnostics([]);
      setFactoryWorkflowUrl(result.workflowUrl ?? "");
      setFactoryDirectUrl("");
      setFactoryState("building");
      setFactoryMessage(`${result.message} رقم الطلب: ${result.requestId}`);
    } catch (error) {
      setFactoryState(error instanceof KazApiError && error.status === 503 ? "blocked" : "error");
      setFactoryMessage(error instanceof Error ? error.message : "تعذر تحضير طلب المصنع.");
    }
  }

  return (
    <div className="project-workspace-screen">
      <header className="project-workspace-topbar">
        <button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button>
        <div><span className="section-kicker">مساحة مشروع مستقلة</span><h1>{project.title}</h1></div>
        <button className={`identity-chat-toggle ${identityEnabled ? "enabled" : "disabled"}`} type="button" onClick={() => void toggleIdentity()} disabled={identitySaving}>{identitySaving ? "جاري الحفظ…" : identityEnabled ? "إيقاف هوية المشروع" : "تشغيل هوية المشروع"}</button>
        <button className="archive-project-button" type="button" onClick={onArchive}>أرشفة المشروع <span>↗</span></button>
        <span className="project-scope-badge">معزول</span>
      </header>
      <main className="project-workspace-layout">
        <section className="project-workspace-main">
          <div className="project-summary-card"><span className="section-kicker">وصف المشروع</span><p>{project.summary}</p><small>آخر تحديث: {new Date(project.updatedAt).toLocaleString("ar-EG")}</small></div>
          <nav className="project-tabs" aria-label="أقسام المشروع">
            {(["overview", "sources", "knowledge", "chat"] as Tab[]).map((item) => <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>{item === "overview" ? "نظرة عامة" : item === "sources" ? `المصادر (${project.sources.length})` : item === "knowledge" ? `المعرفة (${project.knowledge.length})` : "محادثة المشروع"}</button>)}
          </nav>
          {tab === "overview" && <Overview project={project} onSelect={setTab} onPrepareFactory={prepareFactory} factoryState={factoryState} factoryMessage={factoryMessage} factoryVerification={factoryVerification} />}
          {tab === "sources" && <section className="project-section"><SectionTitle eyebrow="مدخلات المشروع" title="المصادر" description="أضف روابط أو ملاحظات سيستخدمها هذا المشروع فقط." /><div className="project-form"><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="اسم المصدر" aria-label="اسم المصدر" /><textarea value={sourceValue} onChange={(event) => setSourceValue(event.target.value)} placeholder="الرابط أو محتوى الملاحظة..." rows={3} aria-label="قيمة المصدر" /><button className="primary-cta" type="button" onClick={addSource} disabled={!sourceName.trim() || !sourceValue.trim()}>إضافة مصدر <span>＋</span></button></div><ItemList empty="لا توجد مصادر مضافة لهذا المشروع." items={project.sources} onRemove={removeSource} render={(source) => <><strong>{source.name}</strong><p>{source.value}</p></>} /></section>}
          {tab === "knowledge" && <section className="project-section"><SectionTitle eyebrow="سياق خاص" title="معرفة المشروع" description="سجّل القواعد والمعلومات التي يجب أن يفهمها KAZ داخل هذا المشروع." /><div className="project-form"><input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} placeholder="عنوان المعرفة" aria-label="عنوان المعرفة" /><textarea value={knowledgeContent} onChange={(event) => setKnowledgeContent(event.target.value)} placeholder="مثال: الجمهور المستهدف، قواعد التصميم، متطلبات المشروع..." rows={4} aria-label="محتوى المعرفة" /><button className="primary-cta" type="button" onClick={addKnowledge} disabled={!knowledgeTitle.trim() || !knowledgeContent.trim()}>حفظ المعرفة <span>＋</span></button></div><ItemList empty="لم تضف معرفة خاصة بهذا المشروع بعد." items={project.knowledge} onRemove={removeKnowledge} render={(item) => <><strong>{item.title}</strong><p>{item.content}</p></>} /></section>}
          {tab === "chat" && <section className="project-section project-chat-section"><SectionTitle eyebrow="سياق معزول" title="محادثة المشروع" description={identityEnabled ? "هذه المحادثة تستخدم هوية KAZ وسياق خبير البناء لهذا المشروع فقط." : "هذه المحادثة تستخدم سياق المشروع فقط؛ هوية KAZ والحارس متوقفان."} />{factoryRequestId && <FactoryLivePreview requestId={factoryRequestId} state={factoryState} message={factoryMessage} verification={factoryVerification} diagnostics={factoryDiagnostics} workflowUrl={factoryWorkflowUrl} directUrl={factoryDirectUrl} />}<div className="project-message-list">{project.messages.map((message) => <div className={`project-message ${message.role}`} key={message.id}>{renderMessage(message.text)}</div>)}</div><div className="project-composer"><textarea value={draft} onChange={(event) => { setInputMode("text"); setDraft(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={chatBusy ? "جاري تحليل سياق المشروع..." : "اكتب أو تحدث بأمر داخل سياق المشروع..."} rows={3} aria-label="رسالة المشروع" disabled={chatBusy} /><div className="project-composer-actions"><button className={`voice-input-button ${voiceInput.listening ? "listening" : ""}`} type="button" onClick={voiceInput.toggle} disabled={chatBusy} aria-pressed={voiceInput.listening} title={voiceInput.supported ? "التحدث بالعربية وإضافة النص إلى الرسالة" : "الإدخال الصوتي غير مدعوم في هذا المتصفح"}>{voiceInput.listening ? "إيقاف الاستماع" : "تحدث"}<span aria-hidden="true">◉</span></button><button className="primary-cta" type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || chatBusy}>{chatBusy ? "جاري التحليل…" : "إرسال"} <span>←</span></button></div>{voiceInput.error && <p className="voice-input-error" role="alert">{voiceInput.error}</p>}<p className="voice-input-disclosure">مصدر الأمر الحالي: {inputMode === "voice" ? "صوت محوّل إلى نص" : "كتابة"}. كلاهما يمر عبر نفس حارس المشروع ولا ينفذ تعديلًا تلقائيًا.</p></div><EditReviewPanel path={editPath} content={editContent} draft={editDraft} busy={editBusy} onPathChange={setEditPath} onContentChange={setEditContent} onPreview={() => void previewEdit()} onApprove={() => void approveEdit()} onReject={() => void rejectEdit()} /></section>}
        </section>
        <aside className="project-workspace-aside"><div className="workspace-scope-card"><span className="section-kicker">حدود المشروع</span><h2>هذا المشروع مستقل</h2><p>المصادر والمعرفة والمحادثة محفوظة بمعرّف المشروع ولا تختلط بباقي المشاريع.</p><div><span>المصادر</span><strong>{project.sources.length.toLocaleString("ar-EG")}</strong></div><div><span>المعرفة</span><strong>{project.knowledge.length.toLocaleString("ar-EG")}</strong></div><div><span>الرسائل</span><strong>{project.messages.length.toLocaleString("ar-EG")}</strong></div></div></aside>
      </main>
    </div>
  );
}

function FactoryLivePreview({ requestId, state, message, verification, diagnostics, workflowUrl, directUrl }: { requestId: string; state: FactoryState; message: string; verification?: FactoryVerification; diagnostics: FactoryDiagnostic[]; workflowUrl: string; directUrl: string }) {
  const statusLabel = state === "blocked" ? "BLOCKED — المصنع غير متاح" : state === "error" ? "فشل البناء" : state === "ready" ? "APK جاهز" : state === "building" || state === "preparing" ? "البناء يعمل الآن" : "في انتظار البناء";
  return <section className={`factory-live-preview ${state}`} aria-live="polite"><div className="factory-live-preview-head"><div><span className="section-kicker">معاينة مباشرة</span><h3>حالة مصنع التطبيقات</h3></div><strong>{statusLabel}</strong></div><p>{message || "جاري الاتصال بحالة GitHub Actions…"}</p><div className="factory-live-steps"><span className={verification?.compile === "success" ? "passed" : verification?.compile === "failure" ? "failed" : "pending"}>compile: {verification?.compile ?? "pending"}</span><span className={verification?.build === "success" ? "passed" : verification?.build === "failure" ? "failed" : "pending"}>build: {verification?.build ?? "pending"}</span></div>{diagnostics.length > 0 && <div className="factory-diagnostics"><strong>آخر التشخيصات الفعلية</strong>{diagnostics.map((item, index) => <article className={`factory-diagnostic ${item.level}`} key={`${item.jobName}-${item.stepName}-${index}`}><b>{item.stepName}</b><span>{item.message}</span>{item.excerpt && <pre>{item.excerpt}</pre>}</article>)}</div>}<div className="factory-live-preview-links"><small>request: {requestId}</small>{workflowUrl && <a href={workflowUrl} target="_blank" rel="noreferrer">فتح سجل GitHub Actions</a>}{directUrl && <a href={directUrl} target="_blank" rel="noreferrer" download>تحميل APK</a>}</div></section>;
}

function EditReviewPanel({ path, content, draft, busy, onPathChange, onContentChange, onPreview, onApprove, onReject }: { path: string; content: string; draft?: ProjectEditDraft; busy: boolean; onPathChange: (value: string) => void; onContentChange: (value: string) => void; onPreview: () => void; onApprove: () => void; onReject: () => void }) {
  return <section className="project-edit-review"><div><span className="section-kicker">تعديل محمي</span><h3>معاينة التعديل قبل الكتابة</h3><p>لن يكتب KAZ أي ملف قبل عرض Diff واعتمادك الصريح. تعارض SHA يوقف العملية تلقائيًا.</p></div>{!draft && <div className="project-edit-form"><input value={path} onChange={(event) => onPathChange(event.target.value)} placeholder="مسار الملف داخل المشروع، مثال: app/src/Main.kt" aria-label="مسار الملف" /><textarea value={content} onChange={(event) => onContentChange(event.target.value)} placeholder="محتوى التعديل المقترح" rows={5} aria-label="محتوى التعديل" /><button className="secondary-cta" type="button" onClick={onPreview} disabled={busy || !path.trim() || !content.trim()}>{busy ? "جاري إنشاء Diff…" : "عرض Diff فقط"}</button></div>}{draft && <div className="project-edit-draft"><strong>مسودة {draft.inputMode === "voice" ? "صوتية" : "كتابية"} — لا تزال غير معتمدة</strong>{draft.changes.map((change) => <article key={change.path}><header><b>{change.path}</b><small>{change.created ? "ملف جديد" : `SHA السابق: ${(change.previousSha256 ?? "غير متاح").slice(0, 12)}`}</small></header><pre>{change.diff}</pre></article>)}<div className="project-edit-actions"><button className="secondary-cta" type="button" onClick={onReject} disabled={busy}>رفض المسودة</button><button className="primary-cta" type="button" onClick={onApprove} disabled={busy}>اعتماد وكتابة آمنة</button></div></div>}</section>;
}

function Overview({ project, onSelect, onPrepareFactory, factoryState, factoryMessage, factoryVerification }: { project: Project; onSelect: (tab: Tab) => void; onPrepareFactory: () => void; factoryState: FactoryState; factoryMessage: string; factoryVerification?: FactoryVerification }) {
  return <section className="project-section"><SectionTitle eyebrow="بداية المشروع" title="جهّز سياقك قبل البناء" description="أضف المصادر والمعرفة، ثم تحدث مع KAZ داخل مساحة هذا المشروع." /><div className="workspace-quick-grid"><button type="button" onClick={() => onSelect("sources")}><span>⌁</span><strong>أضف المصادر</strong><small>روابط وملاحظات المشروع</small></button><button type="button" onClick={() => onSelect("knowledge")}><span>✦</span><strong>أضف المعرفة</strong><small>قواعد ومعلومات خاصة</small></button><button type="button" onClick={() => onSelect("chat")}><span>◌</span><strong>افتح المحادثة</strong><small>محادثة مرتبطة بالمشروع</small></button></div><div className="factory-bridge-card"><div><span className="section-kicker">مصنع التطبيقات</span><h3>ابنِ APK من مسودة هذا المشروع</h3><p>لن يبدأ البناء إلا إذا كان المصنع مفعّلًا ومصادقًا. عند نجاحه تظهر معاينة compile/build ورابط التنزيل الحقيقي.</p></div><button className="primary-cta" type="button" onClick={onPrepareFactory} disabled={factoryState === "preparing" || factoryState === "building"}>{factoryState === "preparing" ? "جاري التحقق…" : factoryState === "building" ? "جاري بناء APK…" : factoryState === "ready" ? "إعادة بناء APK" : factoryState === "blocked" ? "إعادة المحاولة بعد التفعيل" : "ابنِ APK الآن"}<span>←</span></button>{factoryMessage && <div className={`factory-bridge-status ${factoryState}`} role={factoryState === "error" || factoryState === "blocked" ? "alert" : "status"}>{factoryMessage}</div>}{factoryVerification && <div className="factory-verification" role="status"><strong>دليل البناء الفعلي</strong><span>compile: {factoryVerification.compile}</span><span>build: {factoryVerification.build}</span><small>commit: {factoryVerification.sourceCommit.slice(0, 12)} · run: {factoryVerification.runId}</small></div>}</div></section>;
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
