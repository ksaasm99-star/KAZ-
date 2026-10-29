import { useEffect, useMemo, useState } from "react";
import BuildScreen from "./screens/BuildScreen";
import ConversationScreen from "./screens/ConversationScreen";
import HomeScreen from "./screens/HomeScreen";
import ProjectWorkspaceScreen from "./screens/ProjectWorkspaceScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { createProject } from "./project";
import type { Project, ProjectDraft } from "./project";
import { loadArchivedProjects, loadProjects, restoreArchivedProject, saveProject } from "./memoryApi";

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /></span>;
}

function Glyph({ children }: { children: string }) {
  return <span className="glyph" aria-hidden="true">{children}</span>;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [memoryReady, setMemoryReady] = useState(false);
  const [persistentMemory, setPersistentMemory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "dashboard" | "build" | "project" | "conversation" | "settings">("home");

  useEffect(() => {
    let active = true;
    Promise.all([loadProjects(), loadArchivedProjects()]).then(([activeProjects, archived]) => {
      if (!active) return;
      setProjects(activeProjects.projects);
      setArchivedProjects(archived.projects);
      setPersistentMemory(activeProjects.persistent);
      setMemoryReady(true);
    });
    return () => { active = false; };
  }, []);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    if (!normalized) return projects;
    return projects.filter((project) =>
      `${project.title} ${project.summary}`.toLocaleLowerCase("ar").includes(normalized),
    );
  }, [projects, query]);

  function handleNewProject() {
    setNotice(null);
    setView("build");
  }

  async function handleProjectCreated(draft: ProjectDraft) {
    const project = createProject(draft);
    const result = await saveProject(project);
    setProjects((current) => [result.project, ...current.filter((item) => item.id !== result.project.id)]);
    setPersistentMemory(result.persistent);
    setSelectedProjectId(result.project.id);
    setView("project");
    setNotice(result.persistent ? "تم إنشاء المشروع وحفظه في ذاكرة KAZ الدائمة." : "تم إنشاء المشروع محليًا مؤقتًا؛ التخزين الدائم غير متاح الآن.");
    window.setTimeout(() => setNotice(null), 4200);
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId);
    setView("project");
  }

  async function updateProject(updated: Project) {
    const result = await saveProject(updated);
    setProjects((current) => current.map((project) => project.id === result.project.id ? result.project : project));
    setPersistentMemory(result.persistent);
  }

  async function handleRestoreProject(projectId: string) {
    setRestoringProjectId(projectId);
    try {
      const result = await restoreArchivedProject(projectId);
      setProjects((current) => [result.project, ...current.filter((item) => item.id !== result.project.id)]);
      setArchivedProjects((current) => current.filter((item) => item.id !== projectId));
      setPersistentMemory(result.persistent);
      setNotice("تمت استعادة المشروع وإعادته إلى قائمة مشاريعك.");
      window.setTimeout(() => setNotice(null), 4200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر استعادة المشروع الآن.");
    } finally {
      setRestoringProjectId(null);
    }
  }

  if (view === "home") {
    return <HomeScreen onOpenWorkspace={() => setView("dashboard")} onStartBuild={handleNewProject} />;
  }

  if (!memoryReady && view === "dashboard") {
    return <div className="memory-loading-screen"><span className="section-kicker">ذاكرة KAZ</span><h1>جاري استعادة مشاريعك</h1><p>يتم تحميل الذاكرة الدائمة والأرشيف بأمان.</p></div>;
  }

  if (view === "build") {
    return <BuildScreen onBack={() => setView("dashboard")} onSaved={handleProjectCreated} />;
  }

  if (view === "project") {
    const project = projects.find((item) => item.id === selectedProjectId);
    if (project) return <ProjectWorkspaceScreen project={project} onBack={() => setView("dashboard")} onUpdate={updateProject} />;
    return <div className="missing-project-screen"><span className="section-kicker">مساحة KAZ</span><h1>تعذر فتح المشروع</h1><p>لم يعد هذا المشروع متاحًا في القائمة الحالية. ارجع إلى المشاريع لإعادة تحميل الذاكرة.</p><button className="back-button" type="button" onClick={() => setView("dashboard")}><span>→</span> العودة للمشاريع</button></div>;
  }

  if (view === "conversation") return <ConversationScreen onBack={() => setView("dashboard")} />;
  if (view === "settings") return <SettingsScreen onBack={() => setView("dashboard")} />;

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="التنقل الرئيسي">
        <div className="rail-brand"><BrandMark /><span>KAZ</span></div>
        <nav className="rail-nav">
          <button className="rail-link active" type="button" aria-current="page">
            <Glyph>⌂</Glyph><span>المشاريع</span>
          </button>
          <button className="rail-link" type="button" onClick={handleNewProject}>
            <Glyph>＋</Glyph><span>بناء تطبيق</span>
          </button>
          <button className="rail-link rail-link-disabled" type="button" disabled aria-label="حزم التطبيقات — ستتوفر لاحقًا">
            <Glyph>▦</Glyph><span>حزم التطبيقات <small>قريبًا</small></span>
          </button>
          <button className="rail-link" type="button" onClick={() => setView("conversation")}>
            <Glyph>◌</Glyph><span>المحادثة</span>
          </button>
        </nav>
        <button className="rail-link rail-settings" type="button" onClick={() => setView("settings")}>
          <Glyph>⚙</Glyph><span>الإعدادات</span>
        </button>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark /><strong>KAZ</strong></div>
          <div className="topbar-actions">
            <span className="connection-status"><i /> {persistentMemory ? "ذاكرة KAZ متصلة" : "وضع محلي مؤقت"}</span>
            <span className="avatar" aria-label="مساحة مستخدم واحد">م</span>
          </div>
        </header>

        <div className="content-wrap">
          <section className="hero-section" aria-labelledby="dashboard-title">
            <div className="hero-copy">
              <span className="eyebrow">مساحة البناء الذكي</span>
              <h1 id="dashboard-title">أفكارك تستحق<br /><em>تطبيقًا حقيقيًا.</em></h1>
              <p>أنشئ تطبيقك من وصف بسيط، وتابع كل مشروع من مكان واحد.</p>
              <button className="primary-cta" type="button" onClick={handleNewProject}>
                <span className="cta-icon">＋</span>
                <span>ابدأ مشروعًا جديدًا</span>
                <span className="cta-arrow">←</span>
              </button>
            </div>
            <div className="hero-orbit" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit-core"><BrandMark /></div>
              <span className="orbit-dot dot-one" /><span className="orbit-dot dot-two" />
            </div>
          </section>

          <section className="stat-strip" aria-label="ملخص المشاريع">
            <div className="stat-card"><span className="stat-label">مشاريعي</span><strong>{projects.length.toLocaleString("ar-EG")}</strong><small>مشاريع محفوظة</small></div>
            <div className="stat-card stat-archive"><span className="stat-label">الأرشيف</span><strong>{archivedProjects.length.toLocaleString("ar-EG")}</strong><small>مشاريع قابلة للاستعادة</small></div>
            <div className="stat-card stat-highlight"><span className="stat-label">حالة الذاكرة</span><strong>{persistentMemory ? "متصل" : "محلي"}</strong><small>{persistentMemory ? "الحفظ الدائم يعمل" : "الحفظ المحلي المؤقت"}</small><span className="stat-pulse" /></div>
          </section>

          <section className="projects-section" aria-labelledby="projects-title">
            <div className="section-heading projects-heading">
              <div><span className="section-kicker">مساحتك الخاصة</span><h2 id="projects-title">مشاريعي</h2></div>
              <div className="projects-heading-actions"><span className="project-count">{projects.length.toLocaleString("ar-EG")} محفوظ</span><button className="add-project-button" type="button" onClick={handleNewProject} aria-label="إنشاء مشروع جديد"><span>＋</span><b>مشروع جديد</b></button></div>
            </div>
            <label className="search-box projects-search">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في مشاريعك..." aria-label="البحث في المشاريع" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث">×</button>}
            </label>
            {filteredProjects.length === 0 && <div className="projects-state">
              <div className="empty-visual"><div className="empty-folder">⌁</div><span className="empty-spark spark-a">✦</span><span className="empty-spark spark-b">·</span></div>
              <h3>{query ? "لم نجد مشروعًا بهذا الاسم" : "مساحتك جاهزة لفكرتك الأولى"}</h3>
              <p>{query ? "جرّب كلمة بحث مختلفة أو امسح البحث لرؤية كل المشاريع." : "ابدأ من وصف بسيط، وسنحوّل الفكرة إلى مشروع قابل للبناء."}</p>
              {!query && <button className="secondary-cta" type="button" onClick={handleNewProject}>إنشاء أول مشروع <span>←</span></button>}
              {query && <button className="secondary-cta" type="button" onClick={() => setQuery("")}>مسح البحث</button>}
            </div>}
            {filteredProjects.length > 0 && <div className="project-list">{filteredProjects.map((project) => <button className="project-card" type="button" key={project.id} onClick={() => openProject(project.id)}><strong>{project.title}</strong><p>{project.summary}</p><small>فتح مساحة المشروع ←</small></button>)}</div>}
          </section>

          <section className="archived-section" aria-labelledby="archived-title">
            <div className="section-heading projects-heading">
              <div><span className="section-kicker">حافظنا عليها لك</span><h2 id="archived-title">المشاريع المؤرشفة</h2></div>
              <span className="project-count">{archivedProjects.length.toLocaleString("ar-EG")} في الأرشيف</span>
            </div>
            <p className="archive-intro">المشاريع المؤرشفة لا تظهر في قائمتك الرئيسية، لكنها محفوظة ويمكن إعادتها في أي وقت.</p>
            {archivedProjects.length === 0 ? (
              <div className="archive-empty"><span className="archive-empty-icon">⌁</span><div><strong>الأرشيف فارغ حاليًا</strong><p>عند أرشفة أي مشروع سيظهر هنا مع خيار استعادته.</p></div></div>
            ) : (
              <div className="archived-list">{archivedProjects.map((project) => <article className="archived-card" key={project.id}>
                <div className="archived-card-icon" aria-hidden="true">◫</div>
                <div className="archived-card-copy"><strong>{project.title}</strong><p>{project.summary || "مشروع محفوظ في أرشيف KAZ."}</p><small>{project.sources.length.toLocaleString("ar-EG")} مصادر · {project.knowledge.length.toLocaleString("ar-EG")} عناصر معرفة · {project.messages.length.toLocaleString("ar-EG")} رسائل</small></div>
                <button className="restore-button" type="button" onClick={() => handleRestoreProject(project.id)} disabled={restoringProjectId === project.id}>{restoringProjectId === project.id ? "جاري الاستعادة…" : "استعادة المشروع"}<span>↗</span></button>
              </article>)}</div>
            )}
          </section>
        </div>

        <nav className="mobile-nav" aria-label="التنقل على الجوال">
          <button className="mobile-nav-link active" type="button"><Glyph>⌂</Glyph><span>المشاريع</span></button>
          <button className="mobile-nav-link" type="button" onClick={handleNewProject}><Glyph>＋</Glyph><span>بناء</span></button>
          <button className="mobile-nav-link" type="button" onClick={() => setView("conversation")}><Glyph>◌</Glyph><span>المحادثة</span></button>
          <button className="mobile-nav-link" type="button" onClick={() => setView("settings")}><Glyph>⚙</Glyph><span>الإعدادات</span></button>
        </nav>
      </main>

      {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button type="button" onClick={() => setNotice(null)} aria-label="إغلاق التنبيه">×</button></div>}
    </div>
  );
}
