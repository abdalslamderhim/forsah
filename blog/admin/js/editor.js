/**
 * Forsah CMS — منطق محرر المقالات
 * المسودات: تُحفظ كملف JSON داخل admin/drafts/ (غير مرتبط بأي صفحة عامة)
 * النشر: يولّد صفحة HTML كاملة ويكتبها مباشرة في blog/{slug}.html
 */

const CATEGORIES = {
  scholarships: "المنح الدراسية",
  jobs: "الوظائف",
  immigration: "الهجرة",
  visas: "التأشيرات",
  courses: "الكورسات",
  news: "الأخبار",
};

let quill;
let currentDraftPath = null; // admin/drafts/xxx.json إن كنا نعدّل مسودة موجودة
let autosaveTimer = null;

function slugify(text) {
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasLatin) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  // نص عربي بالكامل: نبني slug من التاريخ + أول كلمات مُرمّزة لضمان رابط صالح وقصير
  const stamp = Date.now().toString(36);
  return `article-${stamp}`;
}

function showToast(msg, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (toast.className = "toast"), 3500);
}

function setStatusStamp(status) {
  const el = document.getElementById("statusStamp");
  el.textContent = status === "published" ? "منشور" : "مسودة";
  el.className = "stamp stamp-sm " + (status === "published" ? "stamp-published" : "stamp-draft");
}

function gatherFormData() {
  return {
    title: document.getElementById("f-title").value.trim(),
    slug: document.getElementById("f-slug").value.trim(),
    category: document.getElementById("f-category").value,
    metaDescription: document.getElementById("f-meta").value.trim(),
    bodyHTML: quill.root.innerHTML,
    updatedAt: new Date().toISOString(),
  };
}

function fillForm(data) {
  document.getElementById("f-title").value = data.title || "";
  document.getElementById("f-slug").value = data.slug || "";
  document.getElementById("f-category").value = data.category || "scholarships";
  document.getElementById("f-meta").value = data.metaDescription || "";
  quill.root.innerHTML = data.bodyHTML || "";
}

/** يبني صفحة HTML عامة كاملة جاهزة للنشر على GitHub Pages */
function buildArticleHTML(data) {
  const catLabel = CATEGORIES[data.category] || data.category;
  const desc = (data.metaDescription || "").replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${data.title} | Forsah</title>
<meta name="description" content="${desc}" />
<meta property="og:title" content="${data.title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="stylesheet" href="../assets/blog.css" />
</head>
<body>
<article class="post" data-category="${data.category}">
  <p class="post-eyebrow">${catLabel}</p>
  <h1>${data.title}</h1>
  <div class="post-body">
${data.bodyHTML}
  </div>
</article>
</body>
</html>
`;
}

async function saveDraft(showMsg = true) {
  const data = gatherFormData();
  if (!data.title) return;
  if (!data.slug) data.slug = slugify(data.title);
  document.getElementById("f-slug").value = data.slug;

  const path = currentDraftPath || `admin/drafts/${data.slug}.json`;
  try {
    await ForsahGitHub.putFile(
      path,
      JSON.stringify(data, null, 2),
      `مسودة: ${data.title}`
    );
    currentDraftPath = path;
    setStatusStamp("draft");
    if (showMsg) showToast("تم حفظ المسودة");
  } catch (err) {
    showToast("فشل حفظ المسودة — تحقق من الاتصال والصلاحيات", true);
  }
}

async function publishArticle() {
  const data = gatherFormData();
  if (!data.title || !data.slug) {
    showToast("العنوان والرابط (slug) مطلوبان قبل النشر", true);
    return;
  }
  const publishBtn = document.getElementById("publishBtn");
  publishBtn.disabled = true;
  publishBtn.textContent = "جارٍ النشر...";
  try {
    const html = buildArticleHTML(data);
    await ForsahGitHub.putFile(
      `blog/${data.slug}.html`,
      html,
      `نشر: ${data.title}`
    );
    setStatusStamp("published");
    showToast(`تم النشر: blog/${data.slug}.html`);
  } catch (err) {
    showToast("فشل النشر — تحقق من الاتصال والصلاحيات", true);
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "نشر المقال";
  }
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveDraft(false), 4000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ForsahGitHub.isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  quill = new Quill("#quillEditor", {
    theme: "snow",
    placeholder: "اكتب محتوى المقال هنا...",
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image", "blockquote", "code-block"],
        ["clean"],
      ],
    },
  });

  const cfg = ForsahGitHub.getConfig();
  document.getElementById("repoLabel").textContent = `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;

  ["f-title", "f-slug", "f-category", "f-meta"].forEach((id) => {
    document.getElementById(id).addEventListener("input", scheduleAutosave);
  });
  quill.on("text-change", scheduleAutosave);

  document.getElementById("saveDraftBtn").addEventListener("click", () => saveDraft(true));
  document.getElementById("publishBtn").addEventListener("click", publishArticle);
  document.getElementById("genSlugBtn").addEventListener("click", () => {
    const title = document.getElementById("f-title").value.trim();
    if (title) document.getElementById("f-slug").value = slugify(title);
  });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    ForsahGitHub.clearConfig();
    window.location.href = "index.html";
  });

  setStatusStamp("draft");
});
