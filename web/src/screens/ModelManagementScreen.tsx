import { useEffect, useMemo, useState } from "react";
import { checkModelCompatibility, type ModelCapability, type ModelExecution, type ModelFormat, type ModelRegistryEntry } from "../agent/modelRegistry";
import { loadModels, loadOllamaUiStatus, planModelDownload, registerModel, verifyModelFile, type OllamaUiStatus } from "../memoryApi";

type Props = { onBack: () => void };
type Filter = "all" | ModelExecution | ModelFormat | ModelCapability;

const capabilityLabels: Record<ModelCapability, string> = { chat: "محادثة", planning: "تخطيط", code: "برمجة", review: "مراجعة", embedding: "فهرسة" };
const statusLabels: Record<string, string> = { planned: "مخطط", registered: "مسجل", downloading: "جاري التنزيل", paused: "متوقف مؤقتًا", available: "متاح", installed: "مثبت", verifying: "جاري التحقق", verified: "موثق", corrupted: "تالف", failed: "فشل", deleted: "محذوف" };
const formatLabels: Record<ModelFormat, string> = { gguf: "GGUF", pte: "ExecuTorch PTE", safetensors: "Safetensors", onnx: "ONNX" };

function formatBytes(bytes?: number) {
  if (!bytes) return "غير معروف";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

function statusClass(status: string) {
  if (["verified", "installed", "available"].includes(status)) return "model-status-good";
  if (["corrupted", "failed"].includes(status)) return "model-status-bad";
  return "model-status-warn";
}

export default function ModelManagementScreen({ onBack }: Props) {
  const [models, setModels] = useState<ModelRegistryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageMb, setStorageMb] = useState<number | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaUiStatus | null>(null);
  const [form, setForm] = useState({ displayName: "", execution: "local" as ModelExecution, format: "gguf" as ModelFormat, runtime: "llama.cpp" as ModelRegistryEntry["runtime"], sourceUrl: "", localPath: "", sha256: "", capabilities: ["chat"] as ModelCapability[], contextLength: "8192", memory: "4096", storage: "4096" });

  useEffect(() => {
    let active = true;
    loadModels().then((result) => { if (active) { setModels(result.models.filter((model) => model.status !== "deleted")); setLoading(false); } }).catch((error) => { if (active) { setNotice(error instanceof Error ? error.message : "تعذر تحميل سجل النماذج."); setLoading(false); } });
    if (navigator.storage?.estimate) navigator.storage.estimate().then((estimate) => { if (active && estimate.quota && estimate.usage !== undefined) setStorageMb((estimate.quota - estimate.usage) / 1024 ** 2); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void loadOllamaUiStatus().then((result) => { if (active) setOllamaStatus(result); });
    return () => { active = false; };
  }, []);

  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return models.filter((model) => {
      const matchesQuery = !normalized || `${model.displayName} ${model.id} ${model.family ?? ""} ${model.license ?? ""}`.toLocaleLowerCase("ar").includes(normalized);
      const matchesFilter = filter === "all" || model.execution === filter || model.format === filter || model.capabilities.includes(filter as ModelCapability);
      return matchesQuery && matchesFilter;
    });
  }, [filter, models, query]);

  const selected = models.find((model) => model.id === selectedId) ?? filteredModels[0] ?? models[0] ?? null;
  const deviceMemoryMb = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === "number" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory! * 1024 : undefined;
  const stats = { total: models.length, verified: models.filter((model) => model.status === "verified").length, pending: models.filter((model) => !["verified", "installed", "available"].includes(model.status)).length, bad: models.filter((model) => ["corrupted", "failed"].includes(model.status)).length };

  async function handleVerify(model: ModelRegistryEntry) {
    if (!model.artifact?.localPath) { setNotice("لا يوجد مسار محلي لهذا النموذج؛ لا يمكن تنفيذ تحقق SHA-256 بعد."); return; }
    setVerifyingId(model.id);
    try {
      const result = await verifyModelFile(model.id);
      if (result.result.model) setModels((current) => current.map((item) => item.id === model.id ? result.result.model! : item));
      setNotice(result.result.verified ? "تم توثيق بصمة النموذج بنجاح." : "فشلت مطابقة البصمة؛ تم إبقاء النموذج غير موثق.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر التحقق من بصمة النموذج."); }
    finally { setVerifyingId(null); }
  }

  async function handleDownloadPlan(model: ModelRegistryEntry) {
    setPlanningId(model.id);
    try {
      const result = await planModelDownload(model.id);
      const size = result.plan.remoteSizeBytes ? `${(result.plan.remoteSizeBytes / 1024 ** 3).toFixed(2)} GB` : "الحجم غير معلن";
      setNotice(`المعاينة جاهزة: ${size}. لم يبدأ التنزيل.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر معاينة تنزيل النموذج.");
    } finally {
      setPlanningId(null);
    }
  }

  function toggleCapability(capability: ModelCapability) {
    setForm((current) => ({ ...current, capabilities: current.capabilities.includes(capability) ? current.capabilities.filter((item) => item !== capability) : [...current.capabilities, capability] }));
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (!form.displayName.trim() || form.capabilities.length === 0) { setNotice("أدخل اسم النموذج واختر قدرة واحدة على الأقل."); return; }
    const id = `model-${form.displayName.trim().toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
    const model: ModelRegistryEntry = { id, displayName: form.displayName.trim(), execution: form.execution, format: form.format, status: "registered", capabilities: form.capabilities, contextLength: Number(form.contextLength) || 8192, runtime: form.runtime, sourceUrl: form.sourceUrl.trim() || undefined, artifact: form.localPath.trim() || form.sha256.trim() ? { uri: form.sourceUrl.trim() || form.localPath.trim() || id, localPath: form.localPath.trim() || undefined, sha256: form.sha256.trim() || undefined } : undefined, requirements: { minimumMemoryMb: Number(form.memory) || undefined, storageRequiredMb: Number(form.storage) || undefined }, policy: { allowProjectData: true, allowNetwork: form.execution === "cloud", allowSilentFallback: false }, verification: { metadataRead: false, loaded: false, firstToken: false } };
    setSaving(true);
    try { const result = await registerModel(model); setModels((current) => [result.model, ...current]); setSelectedId(result.model.id); setShowForm(false); setForm((current) => ({ ...current, displayName: "", sourceUrl: "", localPath: "", sha256: "" })); setNotice("تم تسجيل النموذج في ذاكرة KAZ. لم يتم تنزيله أو تشغيله."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "تعذر تسجيل النموذج."); }
    finally { setSaving(false); }
  }

  return <div className="models-screen">
    <header className="workspace-topbar"><button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button><div><span className="section-kicker">عقل KAZ</span><h1>إدارة النماذج</h1></div><span className="model-persistent-badge">Model Registry · SQLite</span></header>
    <main className="models-layout">
      <section className="models-main">
        <div className="models-intro"><div><span className="section-kicker">السجل الحقيقي</span><h2>النماذج المحلية والسحابية</h2><p>سجل واحد يوضح ما تم تعريفه وما تم التحقق منه فعليًا، بدون ادعاء تنزيل أو تشغيل غير موجود.</p></div><button className="primary-cta model-add-button" type="button" onClick={() => setShowForm((value) => !value)}><span className="cta-icon">＋</span>{showForm ? "إغلاق الإضافة" : "إضافة نموذج"}</button></div>
        {showForm && <form className="model-form" onSubmit={handleRegister}><div className="model-form-grid"><label>اسم النموذج<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="مثال: KAZ Code Small" /></label><label>التنفيذ<select value={form.execution} onChange={(event) => setForm({ ...form, execution: event.target.value as ModelExecution })}><option value="local">محلي</option><option value="cloud">سحابي</option></select></label><label>الصيغة<select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value as ModelFormat })}>{Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>المحرك<select value={form.runtime} onChange={(event) => setForm({ ...form, runtime: event.target.value as ModelRegistryEntry["runtime"] })}><option value="llama.cpp">llama.cpp</option><option value="executorch">ExecuTorch</option><option value="managed-api">Managed API</option></select></label><label>رابط المصدر<input dir="ltr" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder="https://huggingface.co/..." /></label><label>المسار المحلي للتحقق<input dir="ltr" value={form.localPath} onChange={(event) => setForm({ ...form, localPath: event.target.value })} placeholder="يُستخدم للتحقق فقط" /></label><label>SHA-256 المتوقعة<input dir="ltr" value={form.sha256} onChange={(event) => setForm({ ...form, sha256: event.target.value })} placeholder="اختياري" /></label><label>السياق<input type="number" min="512" value={form.contextLength} onChange={(event) => setForm({ ...form, contextLength: event.target.value })} /></label><label>ذاكرة دنيا MB<input type="number" min="0" value={form.memory} onChange={(event) => setForm({ ...form, memory: event.target.value })} /></label><label>تخزين مطلوب MB<input type="number" min="0" value={form.storage} onChange={(event) => setForm({ ...form, storage: event.target.value })} /></label></div><fieldset><legend>قدرات النموذج</legend><div className="model-capability-picker">{(Object.keys(capabilityLabels) as ModelCapability[]).map((capability) => <button key={capability} className={form.capabilities.includes(capability) ? "selected" : ""} type="button" onClick={() => toggleCapability(capability)}>{capabilityLabels[capability]}</button>)}</div></fieldset><button className="primary-cta" type="submit" disabled={saving}>{saving ? "جاري التسجيل…" : "حفظ في السجل"}</button></form>}
        <div className="ollama-runtime-card" role="status"><div><span className="section-kicker">المحرك المحلي</span><strong>{ollamaStatus?.ok ? "Ollama متاح" : ollamaStatus ? "BLOCKED — Ollama غير متاح" : "جاري فحص Ollama…"}</strong></div>{ollamaStatus?.ok ? <p>النماذج المثبتة: {ollamaStatus.modelCount.toLocaleString("ar-EG")} · النموذج النشط: {ollamaStatus.activeModel || "غير محدد"}<small dir="ltr">{ollamaStatus.baseUrl}</small></p> : ollamaStatus ? <p>السبب الفعلي: <code>{ollamaStatus.reason}</code>. لم يبدأ أي تنزيل أو اتصال بديل.</p> : <p>قراءة الحالة فقط؛ لا يتم تغيير النموذج النشط من هذه الشاشة.</p>}</div>
        <div className="model-stats"><div><small>كل النماذج</small><strong>{stats.total}</strong></div><div><small>موثق</small><strong className="good-text">{stats.verified}</strong></div><div><small>بانتظار التحقق</small><strong className="warn-text">{stats.pending}</strong></div><div><small>تحتاج معالجة</small><strong className="bad-text">{stats.bad}</strong></div></div>
        <div className="model-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو العائلة أو الترخيص" aria-label="البحث في النماذج" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} aria-label="تصفية النماذج"><option value="all">كل الفلاتر</option><option value="local">محلي</option><option value="cloud">سحابي</option><option value="gguf">GGUF</option><option value="safetensors">Safetensors</option>{(Object.keys(capabilityLabels) as ModelCapability[]).map((key) => <option key={key} value={key}>{capabilityLabels[key]}</option>)}</select></div>
        {loading ? <div className="model-empty">جاري تحميل سجل النماذج…</div> : filteredModels.length === 0 ? <div className="model-empty"><strong>لا توجد نماذج مطابقة</strong><p>أضف تعريف نموذج أو غيّر الفلاتر. الإضافة لا تنزّل ملفًا تلقائيًا.</p></div> : <div className="model-list">{filteredModels.map((model) => <button className={`model-card ${selected?.id === model.id ? "selected" : ""}`} key={model.id} type="button" onClick={() => setSelectedId(model.id)}><div className="model-card-head"><span className={`model-status ${statusClass(model.status)}`}><i />{statusLabels[model.status] ?? model.status}</span><span className="model-format">{formatLabels[model.format]}</span></div><strong>{model.displayName}</strong><small>{model.family ?? model.id}</small><div className="model-card-meta"><span>{model.execution === "local" ? "محلي" : "سحابي"}</span><span>{model.runtime}</span><span>{model.capabilities.map((capability) => capabilityLabels[capability]).join(" · ")}</span></div></button>)}</div>}
      </section>
      <aside className="models-aside">{selected ? <><div className="model-detail-card"><div className="model-detail-title"><span className={`model-status ${statusClass(selected.status)}`}><i />{statusLabels[selected.status] ?? selected.status}</span><span>{selected.execution === "local" ? "محلي" : "سحابي"}</span></div><h2>{selected.displayName}</h2><p className="model-id" dir="ltr">{selected.id}</p><div className="model-detail-grid"><div><small>المحرك</small><strong>{selected.runtime}</strong></div><div><small>السياق</small><strong>{selected.contextLength.toLocaleString("ar-EG")}</strong></div><div><small>الذاكرة الدنيا</small><strong>{selected.requirements.minimumMemoryMb ? `${selected.requirements.minimumMemoryMb} MB` : "غير محددة"}</strong></div><div><small>التخزين المطلوب</small><strong>{selected.requirements.storageRequiredMb ? `${selected.requirements.storageRequiredMb} MB` : "غير محدد"}</strong></div></div><div className="model-detail-lines"><p><span>المصدر</span><a href={selected.sourceUrl || "#"} target="_blank" rel="noreferrer" onClick={(event) => !selected.sourceUrl && event.preventDefault()}>{selected.sourceUrl ? "فتح المصدر" : "غير مضاف"}</a></p><p><span>الترخيص</span><b>{selected.license || "غير مسجل"}</b></p><p><span>البصمة المتوقعة</span><code>{selected.artifact?.sha256 || "غير مضافة"}</code></p><p><span>البصمة المحسوبة</span><code>{selected.artifact?.computedSha256 || "لم تُحسب"}</code></p></div><div className="model-action-row"><button className="secondary-cta model-verify-button" type="button" onClick={() => handleVerify(selected)} disabled={verifyingId === selected.id || !selected.artifact?.localPath}>{verifyingId === selected.id ? "جاري حساب SHA-256…" : "تحقق من البصمة"}</button><button className="secondary-cta" type="button" onClick={() => handleDownloadPlan(selected)} disabled={planningId === selected.id || !selected.sourceUrl || selected.execution !== "local"}>{planningId === selected.id ? "جاري فحص المصدر…" : "معاينة التنزيل"}</button></div>{!selected.artifact?.localPath && <small className="model-action-note">أضف مسارًا محليًا للتحقق؛ معاينة التنزيل لا تبدأ تحميلًا.</small>}</div><div className="model-check-card"><span className="section-kicker">توافق الجهاز</span><h3>فحص تقديري للويب</h3>{(() => { const compatibility = checkModelCompatibility(selected, { availableMemoryMb: deviceMemoryMb, availableStorageMb: storageMb, runtime: selected.runtime }); return <><div className={`compatibility-result ${compatibility.compatible ? "compatible" : "incompatible"}`}><strong>{compatibility.compatible ? "متوافق مبدئيًا" : "يحتاج معالجة"}</strong><small>{compatibility.reasons.length ? compatibility.reasons.join(" · ") : "لا توجد عقبة معروفة"}</small></div><p>الذاكرة المعلنة: {deviceMemoryMb ? `${Math.round(deviceMemoryMb)} MB` : "غير متاحة"} · المساحة التقديرية: {storageMb ? `${Math.round(storageMb)} MB` : "غير متاحة"}</p><small>هذا ليس اختبار Android فعليًا ولا يثبت تحميل النموذج أو أول token.</small></>; })()}</div></> : <div className="model-empty">اختر نموذجًا لعرض تفاصيله.</div>}</aside>
    </main>
    {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button type="button" onClick={() => setNotice(null)} aria-label="إغلاق التنبيه">×</button></div>}
  </div>;
}
