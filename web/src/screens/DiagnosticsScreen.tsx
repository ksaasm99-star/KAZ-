import { useCallback, useEffect, useState } from "react";
import { loadDiagnosticsErrors, loadHealth, type DiagnosticsError, type HealthReport } from "../memoryApi";

type Props = { onBack: () => void };

function statusLabel(status: string) {
  return status === "healthy" ? "سليم" : status === "degraded" ? "متدهور جزئيًا" : "غير سليم";
}

export default function DiagnosticsScreen({ onBack }: Props) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [errors, setErrors] = useState<DiagnosticsError[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  const diagnose = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const [nextReport, nextErrors] = await Promise.all([loadHealth(), loadDiagnosticsErrors()]);
      setReport(nextReport);
      setErrors(nextErrors.errors);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "تعذر تحميل تقرير التشخيص.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void diagnose(); }, [diagnose]);

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard?.writeText(JSON.stringify({ report, errors }, null, 2));
  }

  return (
    <div className="app-shell diagnostics-shell">
      <main className="diagnostics-page">
        <header className="diagnostics-header">
          <div><span className="section-kicker">KAZ / مراقبة ذاتية</span><h1>التشخيص</h1><p>قراءة مباشرة لصحة المكونات وسجل الأخطاء القابل للتتبع.</p></div>
          <div className="diagnostics-actions"><button className="secondary-cta" type="button" onClick={onBack}>العودة</button><button className="primary-cta" type="button" onClick={() => void diagnose()} disabled={loading}>{loading ? "جاري الفحص…" : "تشخيص الآن"}</button><button className="text-link" type="button" onClick={() => void copyReport()}>نسخ التقرير</button></div>
        </header>
        {failure && <div className="diagnostics-alert" role="alert">{failure}</div>}
        {report && <>
          <section className={`diagnostics-status status-${report.status}`}><div><span className="section-kicker">الحالة العامة</span><strong>{statusLabel(report.status)}</strong></div><small>{new Date(report.timestamp).toLocaleString("ar-EG")}</small></section>
          <section className="diagnostics-grid" aria-label="فحوص مكونات KAZ">
            {Object.entries(report.checks).map(([name, check]) => {
              const status = typeof check === "object" && check && "status" in check ? String(check.status) : "healthy";
              return <article className="diagnostic-card" key={name}><div className="diagnostic-card-head"><strong>{name.replaceAll("_", " ")}</strong><span className={`check-dot check-${status}`} /></div><b>{statusLabel(status)}</b><small>{typeof check === "object" && check && "latencyMs" in check ? `${String(check.latencyMs)} ms` : "فحص مسجل"}</small><pre>{String(JSON.stringify(check, null, 2))}</pre></article>;
            })}
          </section>
        </>}
        <section className="diagnostics-errors"><div className="section-heading"><div><span className="section-kicker">Evidence Ledger</span><h2>آخر 20 خطأ</h2></div><span className="project-count">{errors.length.toLocaleString("ar-EG")} أحداث</span></div>{errors.length === 0 ? <p className="diagnostics-empty">لا توجد أخطاء مسجلة في آخر فحص.</p> : <div className="error-list">{errors.map((event) => <article className="error-row" key={event.eventId}><div><strong>{String(event.payload.code ?? event.eventType)}</strong><small>{event.occurredAt} · {String(event.payload.traceId ?? "بدون traceId")}</small></div><p>{String(event.payload.message ?? event.payload.reason ?? "خطأ مسجل في السجل.")}</p></article>)}</div>}</section>
      </main>
    </div>
  );
}
