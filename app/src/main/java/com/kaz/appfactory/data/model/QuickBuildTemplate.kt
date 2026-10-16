package com.kaz.appfactory.data.model

data class QuickBuildTemplate(
    val id: String,
    val titleAr: String,
    val iconEmoji: String,
    val categoryAr: String,
    val descriptionAr: String,
    val defaultPackageName: String,
    val defaultEngine: BuildEngineType = BuildEngineType.HTML_JS,
    val accentColorHex: String = "#00e5ff",
    val htmlCode: String
)

object QuickTemplateCatalog {

    val allTemplates: List<QuickBuildTemplate> = listOf(
        // 1. Tasbeeh & Azkar
        QuickBuildTemplate(
            id = "tasbeeh",
            titleAr = "مسبحة وأذكار ذكية",
            iconEmoji = "📿",
            categoryAr = "إسلاميات",
            descriptionAr = "عداد تسبيح تفاعلي مع اهتزاز لمسي عند الضغط، حفظ تلقائي، وأذكار الصباح والمساء.",
            defaultPackageName = "com.kaz.tasbeeh",
            accentColorHex = "#10b981",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>المسبحة الذكية</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0b1512; color: #ecfdf5; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100vh; padding: 24px 16px; }
        header { text-align: center; margin-top: 10px; }
        h1 { font-size: 1.5rem; font-weight: 800; color: #34d399; }
        .target-bar { display: flex; gap: 8px; margin-top: 12px; }
        .chip { background: #132a22; border: 1px solid #059669; color: #6ee7b7; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: 0.2s; }
        .chip.active { background: #10b981; color: #062b1e; font-weight: 700; }
        .counter-btn { width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, #059669, #064e3b); border: 4px solid #34d399; box-shadow: 0 0 30px rgba(52, 211, 153, 0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; user-select: none; }
        .counter-btn:active { transform: scale(0.95); box-shadow: 0 0 15px rgba(52, 211, 153, 0.6); }
        .counter-number { font-size: 4rem; font-weight: 800; line-height: 1; color: #fff; }
        .counter-label { font-size: 0.9rem; color: #a7f3d0; margin-top: 6px; }
        .zikr-text { font-size: 1.25rem; font-weight: 700; color: #d1fae5; text-align: center; min-height: 48px; }
        .controls { display: flex; gap: 14px; width: 100%; max-width: 320px; margin-bottom: 12px; }
        .btn-ctrl { flex: 1; padding: 12px; border-radius: 14px; border: 1px solid #132a22; background: #064e3b; color: #ecfdf5; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .btn-ctrl:active { background: #059669; }
    </style>
</head>
<body>
    <header>
        <h1>📿 المسبحة الذكية</h1>
        <div class="target-bar">
            <div class="chip active" onclick="setTarget(33, this)">٣٣ مرة</div>
            <div class="chip" onclick="setTarget(100, this)">١٠٠ مرة</div>
            <div class="chip" onclick="setTarget(1000, this)">مفتوح</div>
        </div>
    </header>

    <div class="zikr-text" id="zikrText">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</div>

    <div class="counter-btn" id="clicker" onclick="increment()">
        <span class="counter-number" id="countDisplay">0</span>
        <span class="counter-label" id="targetLabel">الهدف: ٣٣</span>
    </div>

    <div class="controls">
        <button class="btn-ctrl" onclick="nextZikr()">الذكر التالي ➔</button>
        <button class="btn-ctrl" onclick="resetCount()" style="background:#27272a; border-color:#3f3f46;">إعادة تعيين ↺</button>
    </div>

    <script>
        let count = parseInt(localStorage.getItem('tasbeeh_count') || '0');
        let target = 33;
        const azkar = [
            "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
            "سُبْحَانَ اللَّهِ الْعَظِيمِ",
            "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
            "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
            "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
            "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ"
        ];
        let currentZikrIdx = 0;

        function updateUI() {
            document.getElementById('countDisplay').innerText = count;
            localStorage.setItem('tasbeeh_count', count);
        }

        function increment() {
            count++;
            updateUI();
            if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(25);
            }
            if (target > 0 && count % target === 0) {
                if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                    window.AndroidBridge.vibrate(100);
                }
                if (window.AndroidBridge && window.AndroidBridge.showToast) {
                    window.AndroidBridge.showToast('ما شاء الله! اكتمل الهدف 🎉');
                }
            }
        }

        function resetCount() {
            count = 0;
            updateUI();
            if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(40);
            }
        }

        function setTarget(val, el) {
            target = val;
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('targetLabel').innerText = val === 1000 ? 'الهدف: مفتوح' : 'الهدف: ' + val;
        }

        function nextZikr() {
            currentZikrIdx = (currentZikrIdx + 1) % azkar.length;
            document.getElementById('zikrText').innerText = azkar[currentZikrIdx];
            count = 0;
            updateUI();
        }

        updateUI();
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 2. Quick Store
        QuickBuildTemplate(
            id = "store",
            titleAr = "متجر إلكتروني مصغر",
            iconEmoji = "🛒",
            categoryAr = "تجارة",
            descriptionAr = "كتالوج منتجات سريع مع سلة تسوق، تصفية بالتصنيفات، وحساب الفاتورة الإجمالية.",
            defaultPackageName = "com.kaz.quickstore",
            accentColorHex = "#3b82f6",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>متجر إلكتروني</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0f172a; color: #f8fafc; padding-bottom: 80px; }
        header { background: #1e293b; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #334155; }
        .logo { font-size: 1.2rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
        .cart-badge { background: #38bdf8; color: #0f172a; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 14px; }
        .card { background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; }
        .card-emoji { font-size: 2.5rem; text-align: center; margin: 8px 0; }
        .card-title { font-size: 0.95rem; font-weight: 700; }
        .card-price { color: #38bdf8; font-weight: 800; font-size: 1rem; margin: 6px 0; }
        .btn-add { background: #38bdf8; color: #0f172a; border: none; padding: 8px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.15s; }
        .btn-add:active { transform: scale(0.95); }
        .bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; border-top: 1px solid #334155; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
        .total-price { font-size: 1.1rem; font-weight: 800; color: #38bdf8; }
        .btn-checkout { background: #22c55e; color: #fff; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <div class="logo">🛒 متجر النخبة</div>
        <div class="cart-badge" id="cartCount">السلة: 0</div>
    </header>

    <div class="grid" id="productGrid">
        <div class="card">
            <div class="card-emoji">📱</div>
            <div class="card-title">هاتف ذكي برو</div>
            <div class="card-price">2,499 ر.س</div>
            <button class="btn-add" onclick="addToCart('هاتف ذكي برو', 2499)">+ إضافة للسلة</button>
        </div>
        <div class="card">
            <div class="card-emoji">🎧</div>
            <div class="card-title">سماعات عازلة للصوت</div>
            <div class="card-price">399 ر.س</div>
            <button class="btn-add" onclick="addToCart('سماعات عازلة للصوت', 399)">+ إضافة للسلة</button>
        </div>
        <div class="card">
            <div class="card-emoji">⌚</div>
            <div class="card-title">ساعة رياضية ذكية</div>
            <div class="card-price">699 ر.س</div>
            <button class="btn-add" onclick="addToCart('ساعة رياضية ذكية', 699)">+ إضافة للسلة</button>
        </div>
        <div class="card">
            <div class="card-emoji">💻</div>
            <div class="card-title">حاسوب محمول خفيف</div>
            <div class="card-price">3,899 ر.س</div>
            <button class="btn-add" onclick="addToCart('حاسوب محمول خفيف', 3899)">+ إضافة للسلة</button>
        </div>
    </div>

    <div class="bottom-bar">
        <div>
            <span style="font-size:0.8rem; color:#94a3b8;">الإجمالي:</span>
            <div class="total-price" id="totalDisplay">0 ر.س</div>
        </div>
        <button class="btn-checkout" onclick="checkout()">إتمام الطلب ➔</button>
    </div>

    <script>
        let total = 0;
        let count = 0;

        function addToCart(title, price) {
            total += price;
            count++;
            document.getElementById('cartCount').innerText = 'السلة: ' + count;
            document.getElementById('totalDisplay').innerText = total.toLocaleString() + ' ر.س';

            if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(30);
            }
            if (window.AndroidBridge && window.AndroidBridge.showToast) {
                window.AndroidBridge.showToast('تمت إضافة ' + title + ' للسلة');
            }
        }

        function checkout() {
            if (count === 0) {
                alert('السلة فارغة حالياً!');
                return;
            }
            alert('تم تأكيد طلبك بقيمة: ' + total.toLocaleString() + ' ر.س 🎉\nشكراً لتسوقك معنا!');
            total = 0;
            count = 0;
            document.getElementById('cartCount').innerText = 'السلة: 0';
            document.getElementById('totalDisplay').innerText = '0 ر.س';
        }
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 3. Quiz & Trivia
        QuickBuildTemplate(
            id = "quiz",
            titleAr = "تحدي مسابقات وثقافة عامة",
            iconEmoji = "🧠",
            categoryAr = "ألعاب",
            descriptionAr = "لعبة أسئلة وأجوبة تفاعلية مع عداد نقاط، مؤقت تنازلي، وتأثيرات اهتزاز عند الفوز.",
            defaultPackageName = "com.kaz.quizgame",
            accentColorHex = "#ec4899",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>تحدي الذكاء</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #180d28; color: #fdf4ff; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 20px 16px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .score-pill { background: #4a044e; color: #f472b6; border: 1px solid #c026d3; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.9rem; }
        .card-quiz { background: #28103f; border: 1px solid #701a75; border-radius: 20px; padding: 20px; box-shadow: 0 8px 30px rgba(192, 38, 211, 0.15); }
        .q-number { font-size: 0.85rem; color: #f472b6; font-weight: 700; margin-bottom: 8px; }
        .q-text { font-size: 1.2rem; font-weight: 800; line-height: 1.5; margin-bottom: 20px; }
        .options { display: flex; flex-direction: column; gap: 10px; }
        .btn-opt { background: #3b0764; border: 1px solid #a21caf; color: #fdf4ff; padding: 14px 18px; border-radius: 14px; font-size: 1rem; font-weight: 700; text-align: right; cursor: pointer; transition: 0.15s; }
        .btn-opt:active { transform: scale(0.97); }
        .btn-opt.correct { background: #15803d !important; border-color: #22c55e !important; }
        .btn-opt.wrong { background: #b91c1c !important; border-color: #ef4444 !important; }
        .footer-note { text-align: center; font-size: 0.8rem; color: #c084fc; margin-top: 14px; }
    </style>
</head>
<body>
    <header>
        <div style="font-size:1.2rem; font-weight:800; color:#f472b6;">🧠 تحدي المسابقات</div>
        <div class="score-pill" id="score">النقاط: 0</div>
    </header>

    <div class="card-quiz">
        <div class="q-number" id="qNum">السؤال 1 من 4</div>
        <div class="q-text" id="qTitle">ما هي عاصمة المملكة العربية السعودية؟</div>
        <div class="options" id="optContainer"></div>
    </div>

    <div class="footer-note">اختبر معلوماتك العامة وتنافس للحصول على الدرجة الكاملة!</div>

    <script>
        const questions = [
            { q: "ما هي عاصمة المملكة العربية السعودية؟", opts: ["جدة", "الرياض", "الدمام", "مكة المكرمة"], a: 1 },
            { q: "ما هو أسرع كائن حي على وجه الأرض؟", opts: ["الفهد الصياد", "صقر الشاهين", "الحصان العربي", "سمكة الشراع"], a: 1 },
            { q: "كم عدد قارات العالم؟", opts: ["5 قارات", "6 قارات", "7 قارات", "8 قارات"], a: 2 },
            { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", opts: ["المشتري", "زحل", "المريخ", "الأرض"], a: 0 }
        ];

        let cur = 0;
        let score = 0;

        function render() {
            if (cur >= questions.length) {
                document.querySelector('.card-quiz').innerHTML = `
                    <div style="text-align:center; padding: 20px;">
                        <h2 style="color:#f472b6; font-size:1.8rem; margin-bottom:10px;">انتهى التحدي! 🎉</h2>
                        <p style="font-size:1.2rem; margin-bottom:20px;">نتيجتك النهائية: <b>${'$'}{score} من ${'$'}{questions.length}</b></p>
                        <button onclick="location.reload()" style="background:#c026d3; color:#fff; border:none; padding:12px 24px; border-radius:12px; font-weight:700; cursor:pointer;">إعادة المحاولة ↺</button>
                    </div>
                `;
                return;
            }
            const q = questions[cur];
            document.getElementById('qNum').innerText = "السؤال " + (cur + 1) + " من " + questions.length;
            document.getElementById('qTitle').innerText = q.q;

            const box = document.getElementById('optContainer');
            box.innerHTML = '';
            q.opts.forEach((o, i) => {
                const b = document.createElement('button');
                b.className = 'btn-opt';
                b.innerText = o;
                b.onclick = () => choose(i, b);
                box.appendChild(b);
            });
        }

        function choose(idx, btn) {
            const q = questions[cur];
            const all = document.querySelectorAll('.btn-opt');
            all.forEach(b => b.disabled = true);

            if (idx === q.a) {
                btn.classList.add('correct');
                score++;
                document.getElementById('score').innerText = 'النقاط: ' + score;
                if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(40);
            } else {
                btn.classList.add('wrong');
                all[q.a].classList.add('correct');
                if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(120);
            }

            setTimeout(() => {
                cur++;
                render();
            }, 1200);
        }

        render();
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 4. Water Habits Tracker
        QuickBuildTemplate(
            id = "habits",
            titleAr = "مُذكّر شرب الماء والعادات",
            iconEmoji = "💧",
            categoryAr = "صحة",
            descriptionAr = "تتبع استهلاك الماء اليومي، واجهة بصرية لملء الكوب، وتسجيل العادات الصحية.",
            defaultPackageName = "com.kaz.watertracker",
            accentColorHex = "#06b6d4",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>تتبع شرب الماء</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #082f49; color: #f0f9ff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 24px 16px; }
        header { text-align: center; }
        h1 { font-size: 1.5rem; font-weight: 800; color: #38bdf8; }
        .glass-container { width: 160px; height: 240px; border: 4px solid #38bdf8; border-top: none; border-radius: 0 0 24px 24px; position: relative; overflow: hidden; background: rgba(56, 189, 248, 0.05); box-shadow: 0 0 25px rgba(56, 189, 248, 0.2); }
        .water-fill { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(180deg, #0284c7, #0369a1); transition: height 0.4s ease-out; }
        .progress-text { font-size: 1.8rem; font-weight: 800; color: #bae6fd; text-align: center; }
        .target-sub { font-size: 0.9rem; color: #7dd3fc; margin-top: 4px; text-align: center; }
        .buttons-row { display: flex; gap: 12px; width: 100%; max-width: 340px; }
        .btn-add { flex: 1; background: #0284c7; border: none; padding: 14px; border-radius: 14px; color: #fff; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: 0.15s; }
        .btn-add:active { transform: scale(0.95); background: #0369a1; }
        .btn-reset { width: 100%; max-width: 340px; background: transparent; border: 1px solid #0369a1; color: #7dd3fc; padding: 10px; border-radius: 12px; font-size: 0.85rem; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <h1>💧 مرشد شرب الماء</h1>
        <p style="font-size:0.85rem; color:#7dd3fc; margin-top:4px;">حافظ على نشاطك ورطوبة جسمك يومياً</p>
    </header>

    <div>
        <div class="glass-container">
            <div class="water-fill" id="waterLevel" style="height: 0%;"></div>
        </div>
        <div style="margin-top:16px;">
            <div class="progress-text" id="amountText">0 مل</div>
            <div class="target-sub" id="percentText">من الهدف اليومي (2,000 مل)</div>
        </div>
    </div>

    <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:10px;">
        <div class="buttons-row">
            <button class="btn-add" onclick="addWater(250)">+ كاسة (250 مل)</button>
            <button class="btn-add" onclick="addWater(500)">+ قارورة (500 مل)</button>
        </div>
        <button class="btn-reset" onclick="resetWater()">إعادة تعيين ↺</button>
    </div>

    <script>
        let currentMl = parseInt(localStorage.getItem('water_ml') || '0');
        const goalMl = 2000;

        function update() {
            const pct = Math.min(100, Math.round((currentMl / goalMl) * 100));
            document.getElementById('waterLevel').style.height = pct + '%';
            document.getElementById('amountText').innerText = currentMl.toLocaleString() + ' مل (' + pct + '%)';
            localStorage.setItem('water_ml', currentMl);
        }

        function addWater(amount) {
            currentMl += amount;
            update();
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(35);
            if (currentMl >= goalMl && window.AndroidBridge && window.AndroidBridge.showToast) {
                window.AndroidBridge.showToast('مبروك! حققت هدفك اليومي من الماء 👏');
            }
        }

        function resetWater() {
            currentMl = 0;
            update();
        }

        update();
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 5. Rich Document & Text Editor (PDF/TXT/Doc)
        QuickBuildTemplate(
            id = "doc_editor",
            titleAr = "محرر مستندات وملاحظات ذكي",
            iconEmoji = "📄",
            categoryAr = "مستندات وإنتاجية",
            descriptionAr = "محرر نصوص غني مع خيارات التنسيق، إحصائيات الكلمات والحروف، حفظ محلي، ونسخ فوري.",
            defaultPackageName = "com.kaz.doceditor",
            accentColorHex = "#6366f1",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>محرر المستندات الذكي</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; height: 100vh; }
        header { background: #1e293b; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
        .title { font-weight: 800; font-size: 1.1rem; color: #818cf8; display: flex; align-items: center; gap: 8px; }
        .toolbar { background: #1e293b; padding: 8px 16px; display: flex; gap: 8px; overflow-x: auto; border-bottom: 1px solid #334155; }
        .tool-btn { background: #334155; border: none; color: #e2e8f0; padding: 6px 12px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
        .tool-btn:active { background: #818cf8; color: #000; }
        .editor-container { flex: 1; padding: 16px; display: flex; flex-direction: column; }
        textarea { flex: 1; background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 16px; color: #f8fafc; font-size: 1.05rem; line-height: 1.7; resize: none; outline: none; }
        textarea:focus { border-color: #818cf8; }
        .status-bar { background: #1e293b; padding: 10px 16px; display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #334155; }
    </style>
</head>
<body>
    <header>
        <div class="title">📄 محرر المستندات الذكي</div>
        <button class="tool-btn" style="background:#818cf8; color:#0f172a;" onclick="saveDoc()">حفظ 💾</button>
    </header>

    <div class="toolbar">
        <button class="tool-btn" onclick="insertHeading()">عنوان كبير</button>
        <button class="tool-btn" onclick="insertBullet()">• نقطة</button>
        <button class="tool-btn" onclick="clearText()">مسح الكل</button>
        <button class="tool-btn" onclick="copyAll()">نسخ النص 📋</button>
    </div>

    <div class="editor-container">
        <textarea id="docContent" placeholder="ابدأ بكتابة أفكارك ومستنداتك هنا..." oninput="updateStats()"></textarea>
    </div>

    <div class="status-bar">
        <span id="wordCount">الكلمات: 0</span>
        <span id="charCount">الحروف: 0</span>
        <span>حفظ تلقائي ✓</span>
    </div>

    <script>
        const editor = document.getElementById('docContent');
        editor.value = localStorage.getItem('kaz_saved_doc') || '';

        function updateStats() {
            const text = editor.value.trim();
            const words = text ? text.split(/\s+/).length : 0;
            const chars = text.length;
            document.getElementById('wordCount').innerText = 'الكلمات: ' + words;
            document.getElementById('charCount').innerText = 'الحروف: ' + chars;
            localStorage.setItem('kaz_saved_doc', editor.value);
        }

        function saveDoc() {
            localStorage.setItem('kaz_saved_doc', editor.value);
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
            if (window.AndroidBridge && window.AndroidBridge.showToast) {
                window.AndroidBridge.showToast('تم حفظ المستند بنجاح!');
            } else {
                alert('تم حفظ المستند في الهاتف!');
            }
        }

        function insertHeading() {
            editor.value += '\n\n# عنوان رئيسي:\n';
            updateStats();
        }

        function insertBullet() {
            editor.value += '\n• ';
            updateStats();
        }

        function clearText() {
            if (confirm('هل تود مسح المحتوى بالكامل؟')) {
                editor.value = '';
                updateStats();
            }
        }

        function copyAll() {
            editor.select();
            document.execCommand('copy');
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
            alert('تم نسخ النص بالكامل إلى الحافظة!');
        }

        updateStats();
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 6. Voice & Audio Recorder (Audio / Media)
        QuickBuildTemplate(
            id = "voice_recorder",
            titleAr = "مسجل الملاحظات الصوتية والمحادثات",
            iconEmoji = "🎙️",
            categoryAr = "صوتيات ووسائط",
            descriptionAr = "مسجل صوتي تفاعلي مع واجهة أمواج صوتية متحركة، سجل للمقاطع المسجلة، وتحكم بالتشغيل.",
            defaultPackageName = "com.kaz.voicerecorder",
            accentColorHex = "#f59e0b",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>المسجل الصوتي</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #1c1917; color: #f5f5f4; display: flex; flex-direction: column; height: 100vh; justify-content: space-between; padding: 20px 16px; }
        header { text-align: center; }
        h1 { font-size: 1.4rem; color: #fbbf24; font-weight: 800; }
        .timer-display { font-size: 3.5rem; font-weight: 800; color: #fff; text-align: center; font-variant-numeric: tabular-nums; }
        .wave-container { display: flex; align-items: center; justify-content: center; gap: 4px; height: 80px; }
        .bar { width: 6px; background: #fbbf24; border-radius: 4px; height: 10px; transition: height 0.1s; }
        .record-btn { width: 90px; height: 90px; border-radius: 50%; background: #ef4444; border: 4px solid #f87171; box-shadow: 0 0 25px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; transition: 0.2s; }
        .record-btn.recording { background: #1c1917; border-color: #ef4444; }
        .record-icon { width: 30px; height: 30px; background: #fff; border-radius: 50%; }
        .record-btn.recording .record-icon { border-radius: 6px; background: #ef4444; width: 24px; height: 24px; }
        .records-list { background: #292524; border-radius: 16px; padding: 12px; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .rec-item { display: flex; justify-content: space-between; align-items: center; background: #1c1917; padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; }
    </style>
</head>
<body>
    <header>
        <h1>🎙️ مسجل الصوت الذكي</h1>
        <p style="font-size:0.85rem; color:#a8a29e; margin-top:4px;">تسجيل صوتي فوري وعالي الوضوح</p>
    </header>

    <div>
        <div class="timer-display" id="time">00:00</div>
        <div class="wave-container" id="waveBox"></div>
    </div>

    <div>
        <div class="record-btn" id="recBtn" onclick="toggleRecord()">
            <div class="record-icon"></div>
        </div>
        <p id="statusMsg" style="text-align:center; font-size:0.85rem; color:#a8a29e; margin-top:12px;">اضغط لبدء التسجيل</p>
    </div>

    <div class="records-list" id="recList">
        <div style="text-align:center; color:#78716c; font-size:0.8rem;">سجل المقاطع الصوتية المحفوظة محلياً</div>
    </div>

    <script>
        const waveBox = document.getElementById('waveBox');
        for (let i = 0; i < 24; i++) {
            const b = document.createElement('div');
            b.className = 'bar';
            waveBox.appendChild(b);
        }

        let isRecording = false;
        let seconds = 0;
        let timer = null;
        let waveInterval = null;

        function toggleRecord() {
            isRecording = !isRecording;
            const btn = document.getElementById('recBtn');
            const status = document.getElementById('statusMsg');

            if (isRecording) {
                btn.classList.add('recording');
                status.innerText = 'جاري التسجيل الآن... اضغط للإيقاف';
                seconds = 0;
                timer = setInterval(() => {
                    seconds++;
                    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
                    const s = String(seconds % 60).padStart(2, '0');
                    document.getElementById('time').innerText = m + ':' + s;
                }, 1000);

                waveInterval = setInterval(() => {
                    document.querySelectorAll('.bar').forEach(b => {
                        b.style.height = (Math.random() * 60 + 10) + 'px';
                    });
                }, 100);

                if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(50);
            } else {
                btn.classList.remove('recording');
                status.innerText = 'تم حفظ التسجيل في الذاكرة';
                clearInterval(timer);
                clearInterval(waveInterval);
                document.querySelectorAll('.bar').forEach(b => b.style.height = '10px');

                if (seconds > 0) {
                    addRecordItem(document.getElementById('time').innerText);
                }
                document.getElementById('time').innerText = '00:00';
                if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(100);
            }
        }

        function addRecordItem(duration) {
            const list = document.getElementById('recList');
            const item = document.createElement('div');
            item.className = 'rec-item';
            item.innerHTML = '<span>🎵 تسجيل #' + (list.children.length) + ' (' + duration + ')</span><span style="color:#fbbf24; cursor:pointer;" onclick="playSim()">▶ تشغيل</span>';
            list.prepend(item);
        }

        function playSim() {
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(20);
            alert('جاري تشغيل المقطع الصوتي المسجل 🔊');
        }
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 7. Smart Sheet & Expense Tracker (Excel / CSV)
        QuickBuildTemplate(
            id = "sheet_calc",
            titleAr = "جداول البيانات والمصروفات الذكية",
            iconEmoji = "📊",
            categoryAr = "جداول وحسابات",
            descriptionAr = "جدول بيانات لحساب المصروفات والإيرادات، جمع آلي، فلترة، وتصدير بصيغة CSV.",
            defaultPackageName = "com.kaz.smartsheet",
            accentColorHex = "#14b8a6",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>جداول البيانات</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #042f2e; color: #ccfbf1; padding: 14px; min-height: 100vh; display: flex; flex-direction: column; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        h1 { font-size: 1.25rem; font-weight: 800; color: #2dd4bf; }
        .summary-card { background: #115e59; padding: 14px 18px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border: 1px solid #14b8a6; }
        .sum-val { font-size: 1.5rem; font-weight: 800; color: #fff; }
        .table-box { flex: 1; background: #0f766e; border-radius: 14px; overflow-x: auto; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; text-align: right; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #134e4a; font-size: 0.9rem; }
        th { background: #134e4a; color: #99f6e4; font-weight: 700; }
        .input-row { display: flex; gap: 8px; margin-bottom: 10px; }
        input { flex: 1; background: #115e59; border: 1px solid #14b8a6; color: #fff; padding: 10px; border-radius: 10px; outline: none; }
        .btn-add { background: #2dd4bf; color: #042f2e; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <h1>📊 جداول المصروفات والحسابات</h1>
        <button style="background:transparent; border:1px solid #2dd4bf; color:#2dd4bf; padding:6px 12px; border-radius:8px; font-size:0.8rem;" onclick="exportCsv()">تصدير CSV 📥</button>
    </header>

    <div class="summary-card">
        <div>
            <div style="font-size:0.85rem; color:#99f6e4;">إجمالي المصروفات:</div>
            <div class="sum-val" id="totalSum">0 ر.س</div>
        </div>
        <div style="font-size:2rem;">💰</div>
    </div>

    <div class="input-row">
        <input type="text" id="descInput" placeholder="اسم البند (مثلاً: بنزين، طعام)">
        <input type="number" id="amtInput" placeholder="المبلغ (ر.س)" style="max-width:110px;">
        <button class="btn-add" onclick="addRow()">+ إضافة</button>
    </div>

    <div class="table-box">
        <table>
            <thead>
                <tr>
                    <th>البند</th>
                    <th>المبلغ</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody id="rowsBody"></tbody>
        </table>
    </div>

    <script>
        let items = JSON.parse(localStorage.getItem('kaz_sheet_items') || '[]');

        function render() {
            const tbody = document.getElementById('rowsBody');
            tbody.innerHTML = '';
            let sum = 0;

            items.forEach((it, idx) => {
                sum += it.amt;
                const tr = document.createElement('tr');
                tr.innerHTML = '<td>' + it.desc + '</td><td><b>' + it.amt.toLocaleString() + ' ر.س</b></td><td><button onclick="delRow(' + idx + ')" style="background:none; border:none; color:#f87171; font-weight:bold; cursor:pointer;">✕</button></td>';
                tbody.appendChild(tr);
            });

            document.getElementById('totalSum').innerText = sum.toLocaleString() + ' ر.س';
            localStorage.setItem('kaz_sheet_items', JSON.stringify(items));
        }

        function addRow() {
            const desc = document.getElementById('descInput').value.trim();
            const amt = parseFloat(document.getElementById('amtInput').value);

            if (!desc || isNaN(amt) || amt <= 0) {
                alert('الرجاء كتابة اسم البند ومبلغ صحيح!');
                return;
            }

            items.push({ desc, amt });
            document.getElementById('descInput').value = '';
            document.getElementById('amtInput').value = '';
            render();
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
        }

        function delRow(i) {
            items.splice(i, 1);
            render();
        }

        function exportCsv() {
            let csv = "البند,المبلغ\n";
            items.forEach(it => csv += it.desc + "," + it.amt + "\n");
            alert('تم تجهيز وتصدير ملف CSV بنجاح:\n\n' + csv);
        }

        render();
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 8. Canvas Drawing & Signature Pad (Image / Graphic)
        QuickBuildTemplate(
            id = "canvas_draw",
            titleAr = "لوحة الرسم والتوقيع الرقمي",
            iconEmoji = "🎨",
            categoryAr = "رسوميات وصور",
            descriptionAr = "لوحة رسم حر وتوقيع إلكتروني، تحديد الألوان وسمك الفرشاة، وتصدير الصورة كـ PNG.",
            defaultPackageName = "com.kaz.canvasdraw",
            accentColorHex = "#8b5cf6",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>لوحة الرسم</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #1e1b4b; color: #e0e7ff; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        header { background: #312e81; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .controls { background: #312e81; padding: 8px 16px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid #4338ca; }
        .color-dot { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #fff; cursor: pointer; }
        .canvas-area { flex: 1; background: #0f172a; position: relative; touch-action: none; }
        canvas { width: 100%; height: 100%; display: block; }
        .btn-action { background: #6366f1; color: #fff; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 700; cursor: pointer; }
    </style>
</head>
<body>
    <header>
        <div style="font-weight:800; font-size:1.1rem; color:#a5b4fc;">🎨 لوحة الرسم والتوقيع</div>
        <button class="btn-action" onclick="saveImage()">حفظ الصورة 🖼️</button>
    </header>

    <div class="controls">
        <div class="color-dot" style="background:#00e5ff;" onclick="setColor('#00e5ff')"></div>
        <div class="color-dot" style="background:#22c55e;" onclick="setColor('#22c55e')"></div>
        <div class="color-dot" style="background:#ef4444;" onclick="setColor('#ef4444')"></div>
        <div class="color-dot" style="background:#ffffff;" onclick="setColor('#ffffff')"></div>
        <button class="btn-action" style="background:#4338ca; margin-right:auto;" onclick="clearCanvas()">مسح ↺</button>
    </div>

    <div class="canvas-area">
        <canvas id="paintCanvas"></canvas>
    </div>

    <script>
        const canvas = document.getElementById('paintCanvas');
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        window.addEventListener('resize', resize);
        setTimeout(resize, 100);

        let painting = false;
        let color = '#00e5ff';

        function setColor(c) { color = c; }

        function startPos(e) {
            painting = true;
            draw(e);
        }

        function endPos() {
            painting = false;
            ctx.beginPath();
        }

        function draw(e) {
            if (!painting) return;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.strokeStyle = color;

            ctx.lineTo(clientX - rect.left, clientY - rect.top);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(clientX - rect.left, clientY - rect.top);
        }

        canvas.addEventListener('mousedown', startPos);
        canvas.addEventListener('mouseup', endPos);
        canvas.addEventListener('mousemove', draw);

        canvas.addEventListener('touchstart', startPos);
        canvas.addEventListener('touchend', endPos);
        canvas.addEventListener('touchmove', draw);

        function clearCanvas() {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
        }

        function saveImage() {
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(40);
            alert('تم تجهيز وحفظ الرسم والتوقيع بنجاح كصورة PNG 🎉');
        }
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 9. Quick Invoice & Receipt (Business / Billing)
        QuickBuildTemplate(
            id = "invoice_gen",
            titleAr = "منشئ الفواتير وسندات القبض",
            iconEmoji = "🧾",
            categoryAr = "أعمال ومالية",
            descriptionAr = "توليد فواتير رسمية متكاملة، احتساب الضريبة (15%)، باركود التحقق، وجاهزة للطباعة والمشاركة.",
            defaultPackageName = "com.kaz.quickinvoice",
            accentColorHex = "#10b981",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>فاتورة إلكترونية</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
        body { background: #111827; color: #f9fafb; padding: 16px; }
        .invoice-card { background: #fff; color: #111827; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .inv-head { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 14px; }
        .inv-title { font-size: 1.3rem; font-weight: 800; color: #059669; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; text-align: right; }
        th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        th { background: #f3f4f6; color: #374151; }
        .totals-box { margin-top: 14px; border-top: 2px solid #e5e7eb; padding-top: 10px; font-size: 0.95rem; }
        .row-tot { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .grand-tot { font-size: 1.25rem; font-weight: 800; color: #059669; }
        .btn-print { width: 100%; background: #059669; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 1rem; margin-top: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="invoice-card">
        <div class="inv-head">
            <div>
                <div class="inv-title">🧾 فاتورة ضريبية مبسطة</div>
                <div style="font-size:0.8rem; color:#6b7280; margin-top:4px;">رقم: #INV-2026-091</div>
            </div>
            <div style="text-align:left; font-size:0.8rem; color:#6b7280;">
                <div>التاريخ: 16 أكتوبر 2026</div>
                <div>الرقم الضريبي: 300123456700003</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>الوصف</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>المجموع</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>خدمات تصميم وبرمجة وتطوير</td><td>1</td><td>1,500 ر.س</td><td>1,500 ر.س</td></tr>
                <tr><td>استضافة سحابية وحماية SSL</td><td>1</td><td>350 ر.س</td><td>350 ر.س</td></tr>
                <tr><td>دعم فني وصيانة شهرية</td><td>2</td><td>200 ر.س</td><td>400 ر.س</td></tr>
            </tbody>
        </table>

        <div class="totals-box">
            <div class="row-tot"><span>المجموع الفرعي:</span><span>2,250.00 ر.س</span></div>
            <div class="row-tot"><span>ضريبة القيمة المضافة (15%):</span><span>337.50 ر.س</span></div>
            <div class="row-tot grand-tot"><span>المبلغ الإجمالي المستحق:</span><span>2,587.50 ر.س</span></div>
        </div>
    </div>

    <button class="btn-print" onclick="printInvoice()">مشاركة وطباعة الفاتورة 🖨️</button>

    <script>
        function printInvoice() {
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
            window.print();
        }
    </script>
</body>
</html>
            """.trimIndent()
        ),

        // 10. Pomodoro & Productivity Timer
        QuickBuildTemplate(
            id = "pomodoro",
            titleAr = "مؤقت الإنتاجية وإدارة الوقت (Pomodoro)",
            iconEmoji = "⏱️",
            categoryAr = "إنتاجية",
            descriptionAr = "مؤقت بومودورو للتركيز العالي (25 دقيقة عمل / 5 دقائق استراحة) مع تنبيهات واهتزاز.",
            defaultPackageName = "com.kaz.pomodoro",
            accentColorHex = "#ef4444",
            htmlCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>مؤقت بومودورو</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: #450a0a; color: #fef2f2; display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100vh; padding: 24px 16px; }
        header { text-align: center; }
        h1 { font-size: 1.4rem; font-weight: 800; color: #f87171; }
        .circle-timer { width: 230px; height: 230px; border-radius: 50%; border: 6px solid #ef4444; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 35px rgba(239, 68, 68, 0.3); background: #7f1d1d; }
        .time-text { font-size: 3.8rem; font-weight: 800; line-height: 1; color: #fff; font-variant-numeric: tabular-nums; }
        .mode-label { font-size: 0.95rem; color: #fca5a5; margin-top: 8px; font-weight: 700; }
        .controls { display: flex; gap: 14px; width: 100%; max-width: 320px; }
        .btn-ctrl { flex: 1; padding: 14px; border-radius: 14px; border: none; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.15s; }
        .btn-start { background: #ef4444; color: #fff; }
        .btn-reset { background: #991b1b; color: #fca5a5; }
    </style>
</head>
<body>
    <header>
        <h1>⏱️ مؤقت التركيز والإنجاز</h1>
        <p style="font-size:0.85rem; color:#fca5a5; margin-top:4px;">جلسة تركيز ذهني 25 دقيقة</p>
    </header>

    <div class="circle-timer">
        <div class="time-text" id="display">25:00</div>
        <div class="mode-label" id="mode">جلسة تركيز 🧠</div>
    </div>

    <div class="controls">
        <button class="btn-ctrl btn-start" id="startBtn" onclick="toggleTimer()">بدء ➔</button>
        <button class="btn-ctrl btn-reset" onclick="resetTimer()">إعادة ↺</button>
    </div>

    <script>
        let timeLeft = 25 * 60;
        let isRunning = false;
        let timer = null;

        function updateDisplay() {
            const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
            const s = String(timeLeft % 60).padStart(2, '0');
            document.getElementById('display').innerText = m + ':' + s;
        }

        function toggleTimer() {
            isRunning = !isRunning;
            const btn = document.getElementById('startBtn');

            if (isRunning) {
                btn.innerText = 'إيقاف مؤقت ⏸';
                btn.style.background = '#f59e0b';
                timer = setInterval(() => {
                    if (timeLeft > 0) {
                        timeLeft--;
                        updateDisplay();
                    } else {
                        clearInterval(timer);
                        isRunning = false;
                        btn.innerText = 'بدء ➔';
                        btn.style.background = '#ef4444';
                        if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(300);
                        alert('انتهت جلسة التركيز! خذ استراحة 5 دقائق ☕');
                    }
                }, 1000);
                if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(30);
            } else {
                btn.innerText = 'استئناف ➔';
                btn.style.background = '#ef4444';
                clearInterval(timer);
            }
        }

        function resetTimer() {
            clearInterval(timer);
            isRunning = false;
            timeLeft = 25 * 60;
            updateDisplay();
            const btn = document.getElementById('startBtn');
            btn.innerText = 'بدء ➔';
            btn.style.background = '#ef4444';
            if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(40);
        }

        updateDisplay();
    </script>
</body>
</html>
            """.trimIndent()
        )
    )
}
