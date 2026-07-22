/**
 * Forsah CMS — قائمة المقالات
 * يقرأ كل ملفات blog/*.html، يستخرج العنوان والقسم من كل صفحة،
 * ويجلب تاريخ آخر تعديل فعلي من سجل commits الخاص بكل ملف.
 */

const CATEGORY_LABELS = {
  scholarships: "المنح الدراسية",
  jobs: "الوظائف",
  immigration: "الهجرة",
  visas: "التأشيرات",
  courses: "الكورسات",
  news: "الأخبار",
};

let allArticles = [];

function parseArticleHTML(rawHTML, path) {
  const doc = new DOMParser().parseFromString(rawHTML, "text/html");
  const titleFull = doc.querySelector("title")?.textContent || "";
  const title = titleFull.replace(/\s*\|\s*Forsah\s*$/, "") || path;
  const article = doc.querySelector("article.post");
  const category = article?.getAttribute("data-category") || "";
  const slug = path.replace(/^blog\//, "").replace(/\.html$/, "");
  return { title, category, slug, path };
}

async function loadArticles() {
  const tbody = document.getElementById("articlesBody");
  const listing = await ForsahGitHub.listDir("blog");
  const files = (listing || []).filter(
    (f) => f.type === "file" && f.name.endsWith(".html")
  );

  if (!files.length) {
    document.getElementById("emptyState").style.display = "block";
    document.getElementById("tableSection").style.display = "none";
    return;
  }

  const results = [];
  for (const f of files) {
    try {
      const fileData = await ForsahGitHub.getFile(f.path);
      const meta = parseArticleHTML(fileData.content, f.path);
      const updatedAt = await ForsahGitHub.getLastCommitDate(f.path);
      results.push({ ...meta, updatedAt });
    } catch (e) {
      // تجاهل ملف تعذّرت قراءته بدل إيقاف القائمة كاملة
    }
  }

  allArticles = results;
  document.getElementById("tableSection").style.display = "block";
  document.getElementById("emptyState").style.display = "none";
  renderTable();
}

function renderTable() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const cat = document.getElementById("categoryFilter").value;
  const sort = document.getElementById("sortSelect").value;

  let rows = allArticles.filter((a) => {
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search) ||
      a.slug.toLowerCase().includes(search);
    const matchesCat = !cat || a.category === cat;
    return matchesSearch && matchesCat;
  });

  rows.sort((a, b) => {
    if (sort === "alpha") return a.title.localeCompare(b.title, "ar");
    const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return sort === "oldest" ? da - db : db - da;
  });

  const tbody = document.getElementById("articlesBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="spinner-row">لا توجد نتائج مطابقة</td></tr>`;
    return;
  }

  for (const a of rows) {
    const tr = document.createElement("tr");
    const dateLabel = a.updatedAt
      ? new Date(a.updatedAt).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
    tr.innerHTML = `
      <td class="title-cell">${escapeHTML(a.title)}</td>
      <td><span class="badge">${CATEGORY_LABELS[a.category] || a.category || "—"}</span></td>
      <td class="mono" style="font-size:12px;color:var(--paper-dim)">${a.slug}</td>
      <td style="font-size:12.5px;color:var(--paper-dim)">${dateLabel}</td>
      <td>
        <div class="row-actions">
          <a class="btn btn-ghost" href="editor.html?file=${encodeURIComponent(a.path)}">تعديل</a>
          <button class="btn btn-danger" data-path="${a.path}" data-title="${escapeHTML(a.title)}">حذف</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".btn-danger").forEach((btn) => {
    btn.addEventListener("click", () => confirmDelete(btn.dataset.path, btn.dataset.title));
  });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function confirmDelete(path, title) {
  const ok = window.confirm(`حذف المقال نهائيًا:\n"${title}"\n\nهذا الإجراء لا يمكن التراجع عنه. متابعة؟`);
  if (!ok) return;
  try {
    await ForsahGitHub.deleteFile(path, `حذف: ${title}`);
    allArticles = allArticles.filter((a) => a.path !== path);
    renderTable();
    showToast("تم حذف المقال");
  } catch (e) {
    showToast("فشل الحذف — تحقق من الصلاحيات", true);
  }
}

function showToast(msg, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => (toast.className = "toast"), 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ForsahGitHub.isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }
  const cfg = ForsahGitHub.getConfig();
  document.getElementById("repoLabel").textContent = `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;

  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("categoryFilter").addEventListener("change", renderTable);
  document.getElementById("sortSelect").addEventListener("change", renderTable);
  document.getElementById("logoutBtn").addEventListener("click", () => {
    ForsahGitHub.clearConfig();
    window.location.href = "index.html";
  });

  loadArticles();
});
