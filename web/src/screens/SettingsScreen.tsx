import { useEffect, useState } from "react";
import { getOwnerToken, loadIdentity, saveIdentity, setOwnerToken } from "../memoryApi";
import { DEFAULT_KAZ_IDENTITY, type KazIdentity } from "../agent/identity";

const SETTINGS_KEY = "kaz-web-settings";
type Settings = { localOnly: boolean; reduceMotion: boolean; compactLayout: boolean };
const defaults: Settings = { localOnly: true, reduceMotion: false, compactLayout: false };
const listFields: Array<{ key: keyof KazIdentity; label: string; hint: string }> = [
  { key: "principles", label: "المبادئ الأساسية", hint: "مبدأ في كل سطر" },
  { key: "responseRules", label: "قواعد الرد والتنفيذ", hint: "قاعدة في كل سطر" },
  { key: "prohibited", label: "الممنوعات", hint: "شيء ممنوع في كل سطر" },
  { key: "expertise", label: "مجالات الخبرة", hint: "مجال في كل سطر" },
  { key: "workflow", label: "طريقة العمل", hint: "خطوة في كل سطر" },
  { key: "evidencePolicy", label: "سياسة الأدلة", hint: "قاعدة دليل في كل سطر" },
  { key: "escalationPolicy", label: "متى يتوقف أو يطلب تأكيدًا", hint: "حالة في كل سطر" },
  { key: "outputFormat", label: "تنسيق المخرجات", hint: "قاعدة تنسيق في كل سطر" },
];

function asLines(value: string[]) { return value.join("\n"); }
function fromLines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [identity, setIdentity] = useState<KazIdentity>(DEFAULT_KAZ_IDENTITY);
  const [ownerToken, setOwnerTokenValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (stored) { try { setSettings({ ...defaults, ...(JSON.parse(stored) as Partial<Settings>) }); } catch { window.localStorage.removeItem(SETTINGS_KEY); } }
    setOwnerTokenValue(getOwnerToken());
    loadIdentity().then((result) => setIdentity(result.identity)).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر تحميل الهوية.")).finally(() => setLoading(false));
  }, []);

  function updateSetting(key: keyof Settings) {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function updateText(key: keyof KazIdentity, value: string) { setIdentity((current) => ({ ...current, [key]: value })); }
  function updateList(key: keyof KazIdentity, value: string) { setIdentity((current) => ({ ...current, [key]: fromLines(value) })); }

  async function persistIdentity() {
    setSaving(true); setError(null);
    try { const result = await saveIdentity(identity); setIdentity(result.identity); setSaved(true); window.setTimeout(() => setSaved(false), 2200); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ الهوية."); }
    finally { setSaving(false); }
  }

  function persistOwnerToken() {
    setOwnerToken(ownerToken);
    setTokenSaved(true);
    window.setTimeout(() => setTokenSaved(false), 2200);
  }

  return (
    <div className="workspace-screen">
      <header className="workspace-topbar"><button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button><div><span className="section-kicker">مساحة KAZ</span><h1>الهوية والإعدادات</h1></div></header>
      <main className="settings-layout">
        <section className="settings-panel identity-panel" aria-labelledby="identity-title">
          <span className="section-kicker">هوية مركزية لكل النماذج</span><h2 id="identity-title">عرّف KAZ بطريقتك</h2>
          <p className="settings-lead">هذه السياسة تُحفظ في SQLite وتُحقن قبل سياق كل مشروع في مسارات النماذج. اكتب القوائم، عنصرًا في كل سطر.</p>
          {loading ? <div className="settings-saved" role="status">جاري تحميل الهوية الدائمة…</div> : <>
            <div className="identity-form-grid">
              <label><span>اسم الهوية</span><input value={identity.name} onChange={(event) => updateText("name", event.target.value)} /></label>
              <label><span>الدور</span><input value={identity.role} onChange={(event) => updateText("role", event.target.value)} /></label>
              <label className="wide"><span>المهمة الأساسية</span><textarea rows={3} value={identity.mission} onChange={(event) => updateText("mission", event.target.value)} /></label>
              <label><span>اللغة</span><input value={identity.language} onChange={(event) => updateText("language", event.target.value)} /></label>
              <label><span>النبرة</span><input value={identity.tone} onChange={(event) => updateText("tone", event.target.value)} /></label>
            </div>
            <div className="identity-list-grid">{listFields.map(({ key, label, hint }) => <label key={key}><span>{label}</span><textarea rows={5} placeholder={hint} value={asLines(identity[key] as string[])} onChange={(event) => updateList(key, event.target.value)} /></label>)}</div>
            <div className="identity-toggles">
              <button className="setting-row" type="button" onClick={() => setIdentity((current) => ({ ...current, strictMode: !current.strictMode }))}><span><strong>الوضع الصارم</strong><small>يلزم النموذج بالهوية ويمنع ادعاء نتائج غير مثبتة.</small></span><i className={identity.strictMode ? "toggle on" : "toggle"} /></button>
              <button className="setting-row" type="button" onClick={() => setIdentity((current) => ({ ...current, allowExternalRequests: !current.allowExternalRequests }))}><span><strong>السماح بالطلبات الخارجية</strong><small>لا تفعّله إلا إذا أردت السماح بإرسال السياق لخدمة خارجية.</small></span><i className={identity.allowExternalRequests ? "toggle on" : "toggle"} /></button>
              <button className="setting-row" type="button" onClick={() => setIdentity((current) => ({ ...current, applyToGlobalChat: !current.applyToGlobalChat }))}><span><strong>هوية المحادثة العامة</strong><small>يمكنك إيقاف الهوية والحارس للمحادثة العامة فقط.</small></span><i className={identity.applyToGlobalChat ? "toggle on" : "toggle"} /></button>
              <button className="setting-row" type="button" onClick={() => setIdentity((current) => ({ ...current, applyToProjectChat: !current.applyToProjectChat }))}><span><strong>هوية محادثات المشاريع</strong><small>يمكنك إيقاف الهوية والحارس لمحادثات المشاريع فقط.</small></span><i className={identity.applyToProjectChat ? "toggle on" : "toggle"} /></button>
            </div>
            <button className="primary-cta identity-save-button" type="button" onClick={() => void persistIdentity()} disabled={saving || !identity.name.trim() || !identity.mission.trim()}>{saving ? "جاري حفظ الهوية…" : "حفظ الهوية المركزية"}<span>✓</span></button>
            {saved && <div className="settings-saved" role="status">✓ تم حفظ الهوية وتطبيقها على مسارات النماذج.</div>}
            {error && <div className="settings-error" role="alert">{error}</div>}
          </>}
        </section>
        <section className="settings-panel"><span className="section-kicker">تفضيلات الجهاز</span><h2>تحكم في طريقة عمل الواجهة</h2><div className="settings-list"><button className="setting-row" type="button" onClick={() => updateSetting("localOnly")}><span className="setting-icon">◉</span><span><strong>الوضع المحلي أولًا</strong><small>لا تستخدم خدمة خارجية إلا بعد التفعيل الصريح.</small></span><i className={settings.localOnly ? "toggle on" : "toggle"} /></button><button className="setting-row" type="button" onClick={() => updateSetting("reduceMotion")}><span className="setting-icon">≈</span><span><strong>تقليل الحركة</strong><small>يقلل الانتقالات البصرية في الواجهة.</small></span><i className={settings.reduceMotion ? "toggle on" : "toggle"} /></button><button className="setting-row" type="button" onClick={() => updateSetting("compactLayout")}><span className="setting-icon">▤</span><span><strong>المساحة المدمجة</strong><small>يستخدم تخطيطًا أكثر اختصارًا في الشاشات الداخلية.</small></span><i className={settings.compactLayout ? "toggle on" : "toggle"} /></button></div><div className="settings-token"><label><span>رمز مالك KAZ</span><input className="token-input" type="password" autoComplete="off" value={ownerToken} onChange={(event) => setOwnerTokenValue(event.target.value)} placeholder="أدخل KAZ_OWNER_TOKEN" /></label><small>يُحفظ محليًا في هذا المتصفح ويُرسل فقط مع الطلبات الحساسة.</small><button className="secondary-cta" type="button" onClick={persistOwnerToken}>حفظ رمز المالك</button>{tokenSaved && <div className="settings-saved" role="status">✓ تم حفظ رمز المالك محليًا.</div>}</div></section>
      </main>
    </div>
  );
}
