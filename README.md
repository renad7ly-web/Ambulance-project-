# محاكي سيارة الإسعاف · Ambulance Simulator

محاكاة تفاعلية لتدريب طلاب الإسعاف (Paramedic) على التعامل مع الحالات الطارئة من لحظة البلاغ حتى النقل، مع شاشة مراقبة واقعية، وسيناريوهات طبية وإصابات، وتمارين ACLS Megacode، وجولة داخل سيارة الإسعاف.

An interactive training simulator that takes paramedic students from the dispatch call to transport. It includes a realistic patient monitor, medical and trauma scenarios, ACLS megacodes, and a tour of the ambulance interior. The interface is in Arabic and English.

---

## المميزات · Features

| | العربية | English |
|---|---|---|
| 🚑 | 18 سيناريو (قلب، تنفس، سكري، صدمات، إصابات، أطفال…) | 18 scenarios: cardiac, respiratory, metabolic, shock, trauma, paediatric and more |
| 📈 | شاشة مراقبة: ECG، SpO₂، EtCO₂، NIBP، إنذارات، و12-lead، مع زر توسعة | Patient monitor with ECG, SpO₂ pleth, capnography, NIBP, alarms and 12-lead, plus a full-screen mode |
| 🎓 | وضع تدريب (توجيه وتلميحات) ووضع اختبار (بدون تلميحات) | Training mode with coaching, and exam mode with no hints |
| 🧭 | أول تدريب موجّه خطوة بخطوة | Guided first run |
| 📝 | تقرير بعد الحالة يحلّل قرارات الطالب ويرتبها حسب الأهمية | Post-case report that analyses the student's decisions and ranks them by importance |
| ❤️ | ACLS Megacode (VF, PEA, pVT, الغرق، النزيف) حسب AHA | ACLS megacodes (VF, PEA, pVT, drowning, haemorrhagic PEA) based on the AHA algorithms |
| 🧰 | فحص تجهيزات السيارة (Life Bag, Pro Bag, AED, أكسجين…) | Ambulance equipment check (Life Bag, Pro Bag, AED, oxygen and more) |
| 🗺️ | جولة داخل السيارة: صورة تفاعلية + نموذج ثلاثي الأبعاد | Interior tour as an interactive photo with hotspots, or as a 3D model |
| 🔊 | مؤثرات صوتية وأصوات الرئة | Sound effects and lung sounds |
| 🌐 | عربي / English | Arabic and English |

## هيكل المشروع · Project structure

```
ambulance-simulator/
├── index.html            # الصفحة الرئيسية · main page
├── css/styles.css        # التنسيقات · styles
├── js/i18n-data.js       # جدول الترجمة عربي→إنجليزي · AR→EN translation pairs
├── js/app.js             # منطق المحاكاة · simulator logic
└── assets/amb-interior.webp  # صورة داخل السيارة · interior photo
```

There is no build step and no dependencies to install. Three.js r128 loads from a CDN and is used only for the 3D view.

## التشغيل · Running it

**محليًا:** افتح `index.html` في المتصفح (Chrome / Edge / Safari / Firefox).

**Locally:** open `index.html` in a browser. Alternatively, serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

**النشر على GitHub Pages · Publishing on GitHub Pages:**
1. Upload the folder contents to a repository, with `index.html` at the repository root.
2. Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.
3. After about a minute, the site is live at `https://<username>.github.io/<repo>/`.

> The fonts and the 3D view need an internet connection. The simulation itself works offline.

## ⚠️ تنبيه تعليمي · Educational disclaimer

هذا المحاكي **للتعليم والتدريب فقط** وليس مرجعًا سريريًا. الجرعات والبروتوكولات يجب أن يراجعها المدرب وتُطابق البروتوكول المحلي المعتمد قبل استخدامها في التدريس.

This simulator is **for education and training only** and is not a clinical reference. An instructor must review all doses and protocols and match them to the locally approved protocol before using them in teaching.

## الصورة · Image

The file `assets/amb-interior.webp` is a reference photo of an ambulance interior, and visible equipment brand names appear in it. Before making the repository public, confirm that you have the right to publish this image, or replace it with your own photo. Keep the same filename, and ideally a 4:3 ratio, so the hotspots still line up.
