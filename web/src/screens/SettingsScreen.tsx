import { useEffect, useState } from "react";

const SETTINGS_KEY = "kaz-web-settings";

type Settings = { localOnly: boolean; reduceMotion: boolean; compactLayout: boolean };
const defaults: Settings = { localOnly: true, reduceMotion: false, compactLayout: false };

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return;
    try { setSettings({ ...defaults, ...(JSON.parse(stored) as Partial<Settings>) }); } catch { window.localStorage.removeItem(SETTINGS_KEY); }
  }, []);

  function updateSetting(key: keyof Settings) {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      return next;
    });
  }

  return (
    <div className="workspace-screen">
      <header className="workspace-topbar"><button className="back-button" type="button" onClick={onBack}><span>→</span> العودة للمشاريع</button><div><span className="section-kicker">مساحة KAZ</span><h1>الإعدادات</h1></div></header>
      <main className="settings-layout">
        <section className="settings-panel" aria-labelledby="settings-title"><span className="section-kicker">تفضيلاتك</span><h2 id="settings-title">تحكم في طريقة عمل KAZ</h2><p className="settings-lead">تُحفظ هذه الخيارات على جهازك فقط، ويمكنك تغييرها في أي وقت.</p>
          <div className="settings-list">
            <button className="setting-row" type="button" onClick={() => updateSetting("localOnly")}><span className="setting-icon">◉</span><span><strong>الوضع المحلي أولًا</strong><small>لا تستخدم خدمة خارجية إلا بعد التفعيل الصريح.</small></span><i className={settings.localOnly ? "toggle on" : "toggle"} /></button>
            <button className="setting-row" type="button" onClick={() => updateSetting("reduceMotion")}><span className="setting-icon">≈</span><span><strong>تقليل الحركة</strong><small>يقلل الانتقالات البصرية في الواجهة.</small></span><i className={settings.reduceMotion ? "toggle on" : "toggle"} /></button>
            <button className="setting-row" type="button" onClick={() => updateSetting("compactLayout")}><span className="setting-icon">▤</span><span><strong>المساحة المدمجة</strong><small>يستخدم تخطيطًا أكثر اختصارًا في الشاشات الداخلية.</small></span><i className={settings.compactLayout ? "toggle on" : "toggle"} /></button>
          </div>
          {saved && <div className="settings-saved" role="status">✓ تم حفظ الإعدادات على هذا الجهاز.</div>}
        </section>
      </main>
    </div>
  );
}
