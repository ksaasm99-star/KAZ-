type HomeScreenProps = {
  onOpenWorkspace: () => void;
  onStartBuild: () => void;
};

function HomeMark() {
  return <span className="home-brand-mark" aria-hidden="true"><i /><b /><em /></span>;
}

export default function HomeScreen({ onOpenWorkspace, onStartBuild }: HomeScreenProps) {
  return (
    <div className="home-screen">
      <header className="home-topbar">
        <button className="home-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="العودة إلى بداية الصفحة">
          <HomeMark /><strong>KAZ</strong>
        </button>
        <nav className="home-nav" aria-label="روابط الصفحة الرئيسية">
          <a href="#how-it-works">كيف يعمل</a>
          <a href="#why-kaz">لماذا KAZ</a>
          <button type="button" onClick={onOpenWorkspace}>مساحة المشاريع</button>
        </nav>
        <button className="home-login" type="button" onClick={onOpenWorkspace}>دخول مساحة العمل <span>←</span></button>
      </header>

      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <span className="home-eyebrow"><i /> مصنع التطبيقات الذكي</span>
            <h1 id="home-title">من فكرة بسيطة<br /><em>إلى تطبيق حقيقي.</em></h1>
            <p>اكتب فكرتك بلغتك، ودع KAZ يرتبها إلى مشروع واضح قابل للبناء — بدون تعقيد، وبدون أن تضيع بين الأدوات.</p>
            <div className="home-actions">
              <button className="home-primary-cta" type="button" onClick={onStartBuild}><span>＋</span> ابدأ بناء تطبيق <b>←</b></button>
              <button className="home-secondary-cta" type="button" onClick={onOpenWorkspace}>استكشف مساحة العمل</button>
            </div>
            <div className="home-trust-line"><span>●</span> تجربة عربية مرتبة <i /> <span>●</span> مشروعك في مكان واحد <i /> <span>●</span> جاهز للتوسع</div>
          </div>
          <div className="home-visual" aria-label="معاينة لمساحة بناء KAZ">
            <div className="home-glow" />
            <div className="home-window">
              <div className="home-window-bar"><span /><span /><span /><small>مساحة البناء</small></div>
              <div className="home-window-body">
                <div className="home-window-sidebar"><b>م</b><span className="active" /><span /><span /><span /></div>
                <div className="home-window-content"><small>وصف فكرتك</small><strong>تطبيق يساعدني على<br /><em>تنظيم يومي.</em></strong><div className="home-progress"><i /><i /><i /></div><div className="home-window-button">تحويل إلى خطة <b>←</b></div></div>
              </div>
            </div>
            <span className="home-orbit-dot dot-a" /><span className="home-orbit-dot dot-b" />
          </div>
        </section>

        <section className="home-section" id="why-kaz" aria-labelledby="why-title">
          <div className="home-section-heading"><span className="home-eyebrow">لماذا KAZ؟</span><h2 id="why-title">كل ما تحتاجه لبداية<br /><em>أوضح وأسرع.</em></h2></div>
          <div className="home-feature-grid">
            <article className="home-feature-card featured"><span className="feature-number">٠١</span><div className="feature-icon">✦</div><h3>فكرة مرتبة من أول مرة</h3><p>حوّل الوصف العفوي إلى تصور منظم للمشروع، مع شاشات وميزات وخطوات واضحة.</p></article>
            <article className="home-feature-card"><span className="feature-number">٠٢</span><div className="feature-icon">⌁</div><h3>مساحة واحدة لمشاريعك</h3><p>احفظ مسوداتك وتابع كل فكرة من لوحة بسيطة لا تشتتك بين المسارات.</p></article>
            <article className="home-feature-card"><span className="feature-number">٠٣</span><div className="feature-icon">↗</div><h3>مبني للتوسع</h3><p>ابدأ من الويب اليوم، مع بنية قابلة للتحويل لاحقًا إلى تطبيق Android.</p></article>
          </div>
        </section>

        <section className="home-section home-steps-section" id="how-it-works" aria-labelledby="steps-title">
          <div className="home-section-heading compact"><span className="home-eyebrow">كيف يعمل؟</span><h2 id="steps-title">ثلاث خطوات، والبداية<br /><em>تصير واضحة.</em></h2></div>
          <div className="home-steps"><div><span>١</span><h3>اكتب فكرتك</h3><p>قل لـKAZ ماذا تريد بصياغتك الطبيعية.</p></div><i /><div><span>٢</span><h3>رتّب مشروعك</h3><p>راجع الخطة الأولية واختر طريقة التنفيذ.</p></div><i /><div><span>٣</span><h3>ابدأ البناء</h3><p>انتقل من التصور إلى مشروع قابل للتطوير.</p></div></div>
        </section>
      </main>

      <footer className="home-footer"><div><HomeMark /><strong>KAZ</strong></div><span>مساحة ذكية لبناء أفكارك.</span><button type="button" onClick={onStartBuild}>ابدأ الآن <b>←</b></button></footer>
    </div>
  );
}
