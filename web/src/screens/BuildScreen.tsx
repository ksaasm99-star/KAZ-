import { useEffect, useState } from "react";
import { createKazProvider } from "../engine/createKazProvider";
import { inspectLocalRuntime, monitorLocalPerformance } from "../engine/localProvider";
import type { BuildPlan, EngineId } from "../engine/provider";
import type { LocalPerformanceStatus, LocalRuntimeStatus } from "../engine/localProvider";
import type { ProjectDraft } from "../project";
type ApiState = "idle" | "loading" | "success" | "error";

type Draft = {
  projectName: string;
  description: string;
  engine: EngineId;
  savedAt: string;
};

const DRAFT_KEY = "kaz-web-build-draft";
const cloudProvider = createKazProvider("cloud");

const engines: Array<{ id: EngineId; badge: string; title: string; subtitle: string; description: string }> = [
  { id: "auto", badge: "AUTO", title: "تلقائي ذكي", subtitle: "يختار الأنسب", description: "يحلل KAZ وصفك ويختار محرك الويب أو Kotlin حسب احتياج التطبيق." },
  { id: "html_js", badge: "WEB", title: "محرك الويب السريع", subtitle: "HTML / CSS / JS", description: "مناسب للتطبيقات الخفيفة والتجارب التي تحتاج تشغيلًا سريعًا." },
  { id: "kotlin", badge: "KOTLIN", title: "محرك Kotlin الأصلي", subtitle: "Jetpack Compose", description: "مناسب لتطبيقات Android الأصلية وقدرات الجهاز المتقدمة." },
];

export default function BuildScreen({ onBack, onSaved }: { onBack: () => void; onSaved: (draft: ProjectDraft) => void }) {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState<EngineId>("auto");
  const [errors, setErrors] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [apiState, setApiState] = useState<ApiState>("idle");
  const [apiMessage, setApiMessage] = useState("");
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiStatusLabel, setApiStatusLabel] = useState("جاري التحقق من الحالة");
  const [localRuntime, setLocalRuntime] = useState<LocalRuntimeStatus>({ ready: false, label: "جاري الفحص", detail: "يتم فحص دعم WebGPU فقط." });
  const [localPerformance, setLocalPerformance] = useState<LocalPerformanceStatus | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [plan, setPlan] = useState<BuildPlan | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as Draft;
      setProjectName(draft.projectName ?? "");
      setDescription(draft.description ?? "");
      setEngine(draft.engine ?? "auto");
      setHasDraft(true);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((response) => response.json() as Promise<{ enabled?: boolean; provider?: string; model?: string }>)
      .then((status) => {
        if (!active) return;
        const enabled = status.enabled === true;
        setApiEnabled(enabled);
        setApiStatusLabel(enabled ? `مفعّل — ${status.provider ?? "cloud"}` : "متوقف — لم يتم التفعيل");
      })
      .catch(() => {
        if (!active) return;
        setApiEnabled(false);
        setApiStatusLabel("غير متاح — الخادم لم يعلن الحالة");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    inspectLocalRuntime().then((status) => {
      if (!active) return;
      setLocalRuntime(status);
      if (!status.ready && status.fallbackEngine) {
        setEngine((current) => current === "auto" ? status.fallbackEngine ?? current : current);
        setFallbackMessage("لم يتوفر محول WebGPU مناسب، لذلك تم التحويل تلقائيًا إلى محرك الويب الآمن.");
      }
    }).catch(() => {
      if (active) {
        setLocalRuntime({ ready: false, label: "تعذر الفحص", detail: "حدث خطأ أثناء فحص قدرات المتصفح.", fallbackEngine: "html_js" });
        setEngine((current) => current === "auto" ? "html_js" : current);
        setFallbackMessage("تعذر فحص WebGPU، لذلك تم التحويل تلقائيًا إلى محرك الويب الآمن.");
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!localRuntime.ready) {
      setLocalPerformance(null);
      return;
    }
    return monitorLocalPerformance(setLocalPerformance);
  }, [localRuntime.ready]);

  const selectedEngine = engines.find((item) => item.id === engine) ?? engines[0];

  function validate() {
    const nextErrors: string[] = [];
    if (projectName.trim().length < 2) nextErrors.push("اكتب اسمًا واضحًا للمشروع.");
    if (description.trim().length < 5) nextErrors.push("اكتب وصفًا من خمس كلمات على الأقل.");
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function persistDraft() {
    const draft: Draft = { projectName: projectName.trim(), description: description.trim(), engine, savedAt: new Date().toISOString() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setHasDraft(true);
  }

  function saveDraft() {
    if (!validate()) return;
    persistDraft();
    onSaved({ projectName: projectName.trim(), description: description.trim() });
  }

  async function runKAZ() {
    if (!validate()) return;
    if (!apiEnabled) {
      setApiState("error");
      setApiMessage("محرك KAZ غير مفعّل حاليًا. لم يتم إرسال أي طلب خارجي.");
      return;
    }
    persistDraft();
    setApiState("loading");
    setApiMessage("KAZ يحلل الوصف الآن...");
    setPlan(null);
    try {
      const result = await cloudProvider.analyze({ projectName: projectName.trim(), description: description.trim(), engine });
      setPlan(result.plan);
      setApiState("success");
      setApiMessage("تم تحليل المسودة فعليًا بواسطة محرك KAZ.");
    } catch (error) {
      setApiState("error");
      setApiMessage(error instanceof Error ? error.message : "تعذر الاتصال بمحرك KAZ.");
    }
  }

  function clearForm() {
    window.localStorage.removeItem(DRAFT_KEY);
    setProjectName("");
    setDescription("");
    setEngine("auto");
    setErrors([]);
    setHasDraft(false);
    setPlan(null);
    setApiState("idle");
    setApiMessage("");
  }

  return (
    <div className="build-screen">
      <header className="build-topbar">
        <button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button>
        <div className="build-progress-label"><span>المرحلة ٣</span><i /><strong>تشغيل محرك KAZ</strong></div>
      </header>

      <main className="build-layout">
        <section className="build-main" aria-labelledby="build-title">
          <span className="section-kicker">محرك KAZ الفعلي</span>
          <h1 id="build-title">حوّل المسودة إلى خطة تنفيذ</h1>
          <p className="build-lead">أرسل وصفك إلى محرك KAZ عبر الخادم الآمن. سيعيد تحليلًا أوليًا منظمًا دون كشف مفتاح Gemini للمتصفح.</p>

          <div className="build-field-group"><label htmlFor="project-name">اسم المشروع <span>مطلوب</span></label><input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="مثال: متجري الصغير" maxLength={70} /></div>
          <div className="build-field-group"><div className="field-label-row"><label htmlFor="project-description">وصف التطبيق <span>مطلوب</span></label><small>{description.length.toLocaleString("ar-EG")} / ٢٠٠٠</small></div><textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 2000))} placeholder="مثال: أريد تطبيقًا لإدارة مصاريفي اليومية مع تصنيفات ورسوم بسيطة وحفظ محلي..." rows={8} /></div>
          {errors.length > 0 && <div className="form-errors" role="alert"><strong>راجع البيانات:</strong>{errors.map((error) => <span key={error}>• {error}</span>)}</div>}

          <div className="build-section-heading"><div><span className="section-kicker">طريقة التنفيذ</span><h2>محرك البناء</h2></div><span className="engine-current">{selectedEngine.badge}</span></div>
          <div className="engine-grid">{engines.map((item) => <button className={`engine-card ${engine === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setEngine(item.id)}><span className="engine-radio">{engine === item.id ? "✓" : ""}</span><span className="engine-badge">{item.badge}</span><strong>{item.title}</strong><small>{item.subtitle}</small><p>{item.description}</p></button>)}</div>

          <div className="build-actions"><button className="run-kaz-button" type="button" onClick={runKAZ} disabled={apiState === "loading" || !apiEnabled}>{apiState === "loading" ? "جاري التحليل..." : apiEnabled ? "حلّل بواسطة KAZ" : "محرك KAZ غير مفعّل"}<span>←</span></button><button className="save-draft-button secondary" type="button" onClick={saveDraft}>{hasDraft ? "تحديث المسودة" : "حفظ المسودة"}</button><button className="clear-draft-button" type="button" onClick={clearForm}>مسح الحقول</button></div>
          <div className="engine-status-line" role="status"><span className={apiEnabled ? "status-dot on" : "status-dot"} />{apiStatusLabel}</div>
          <div className="engine-status-line" role="status"><span className={localRuntime.ready ? "status-dot on" : "status-dot"} /><strong>المحرك المحلي:</strong> {localRuntime.label} — {localRuntime.detail}</div>
          <div className="engine-status-line" role="status"><span className="status-dot" /><strong>ذاكرة الجهاز:</strong> {localRuntime.deviceMemoryGb === undefined ? "غير معلنة من المتصفح" : `${localRuntime.deviceMemoryGb.toLocaleString("ar-EG")} جيجابايت تقريبًا — تقدير المتصفح`}</div>
          {fallbackMessage && <div className="api-status error" role="alert"><span>!</span>{fallbackMessage}</div>}
          <div className="engine-status-line" role="status"><span className={localPerformance ? "status-dot on" : "status-dot"} /><strong>مراقبة الأداء:</strong> {!localPerformance ? "تتفعّل عند تشغيل المحرك المحلي فعليًا." : `الذاكرة ${localPerformance.memoryUsedMb === undefined ? "غير معلنة" : `${localPerformance.memoryUsedMb} MB${localPerformance.memoryLimitMb ? ` / ${localPerformance.memoryLimitMb} MB` : ""}`}${localPerformance.heapPercent === undefined ? "" : ` (${localPerformance.heapPercent}%)`} — ضغط واجهة JavaScript التقريبي ${localPerformance.eventLoopLagMs}ms${localPerformance.cores ? ` — ${localPerformance.cores} أنوية معلنة` : ""}`}</div>
          {apiMessage && <div className={`api-status ${apiState}`} role={apiState === "error" ? "alert" : "status"}><span>{apiState === "loading" ? "◌" : apiState === "success" ? "✓" : "!"}</span>{apiMessage}</div>}
          <p className="build-disclosure">مفتاح Gemini لا يصل إلى المتصفح. هذه المرحلة تنفذ تحليلًا فعليًا للمواصفات؛ توليد الملفات وتجميع التطبيق يحتاجان مراحل لاحقة منفصلة.</p>

          {plan && <section className="plan-result" aria-labelledby="plan-title"><div className="plan-result-head"><div><span className="section-kicker">نتيجة محرك KAZ</span><h2 id="plan-title">خطة أولية للمشروع</h2></div><span className="engine-current">{plan.engine.toUpperCase()}</span></div><p className="plan-summary">{plan.summary}</p><div className="plan-columns"><PlanList title="الميزات المقترحة" items={plan.features} /><PlanList title="الشاشات" items={plan.screens} /><PlanList title="الملفات المقترحة" items={plan.files} /><PlanList title="الخطوات التالية" items={plan.nextSteps} /></div></section>}
        </section>

        <aside className="build-aside"><div className="aside-card progress-card"><div className="aside-card-head"><span className="aside-number">١</span><div><span className="section-kicker">مسار واضح</span><h2>مراحل المشروع</h2></div></div><ol><li className="done"><span>✓</span><div><strong>وصف الفكرة</strong><small>الاسم والوصف الأساسي</small></div></li><li className={projectName.trim() && description.trim() ? "active" : ""}><span>٢</span><div><strong>اختيار المحرك</strong><small>{selectedEngine.subtitle}</small></div></li><li className={apiState === "success" ? "done" : "active"}><span>{apiState === "success" ? "✓" : "٣"}</span><div><strong>تحليل KAZ</strong><small>{apiState === "success" ? "اكتمل التحليل الأولي" : "جاهز للتشغيل"}</small></div></li><li><span>٤</span><div><strong>التوليد والمعاينة</strong><small>مرحلة لاحقة بعد اعتماد الخطة</small></div></li></ol></div><div className="aside-card selected-engine-card"><span className="section-kicker">اختيارك الحالي</span><div className="selected-engine-mark">{selectedEngine.badge}</div><h2>{selectedEngine.title}</h2><p>{selectedEngine.description}</p></div></aside>
      </main>
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div className="plan-list"><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
