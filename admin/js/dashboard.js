/**
 * Forsah CMS — لوحة التحكم
 * كل الأرقام هنا حقيقية ومُشتقة من محتوى المستودع نفسه (لا بيانات وهمية):
 * عدد المقالات المنشورة، المسودات، الأقسام المستخدمة، والنشاط الأخير.
 * إحصائيات الزوار (Google Analytics) تحتاج ربطًا منفصلًا لاحقًا، لذا تُعرض كـ "قريبًا".
 */

const CATEGORY_LABELS = {
  scholarships: "المنح الدراسية",
  jobs: "الوظائف",
  immigration: "الهجرة",
  visas: "التأشيرات",
  courses: "الكورسات",
  news: "الأخبار",
};

function parseArticleHTML(rawHTML, path) {
  const doc = new DOMParser().parseFromString(rawHTML, "text/html");
  const titleFull = doc.querySelector("title")?.textContent || "";
  const title = titleFull.replace(/\s*\|\s*Forsah\s*$/, "") || path;
  const article = doc.querySelector("article.post");
  const category = article?.getAttribute("data-category") || "";
  const slug = path.replace(/^blog\//, "").replace(/\.html$/, "");
  return { title, category, slug, path };
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
  return `منذ ${Math.floor(days / 30)} أشهر`;
}

async function loadDashboard() {
  const blogListing = (await ForsahGitHub.listDir("blog")) || [];
  const files = blogListing.filter((f) => f.type === "file" && f.name.endsWith(".html"));

  const draftsListing = (await ForsahGitHub.listDir("admin/drafts")) || [];
  const draftFiles = draftsListing.filter((f) => f.type === "file" && f.name.endsWith(".json"));

  const articles = [];
  for (const f of files) {
    try {
      const fileData = await ForsahGitHub.getFile(f.path);
      const meta = parseArticleHTML(fileData.content, f.path);
      const updatedAt = await ForsahGitHub.getLastCommitDate(f.path);
      articles.push({ ...meta, updatedAt });
    } catch (e) {}
  }

  articles.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const oneWeekAgo = Date.now() - 7 * 86400000;
  const publishedThisWeek = articles.filter(
    (a) => a.updatedAt && new Date(a.updatedAt).getTime() > oneWeekAgo
  ).length;
  const categoriesUsed = new Set(articles.map((a) => a.category).filter(Boolean)).size;

  document.getElementById("statTotal").textContent = articles.length;
  document.getElementById("statDrafts").textContent = draftFiles.length;
  document.getElementById("statCategories").textContent = categoriesUsed;
  document.getElementById("statWeek").textContent = publishedThisWeek;

  renderRecent(articles.slice(0, 6));
}

function renderRecent(articles) {
  const wrap = document.getElementById("recentList");
  if (!articles.length) {
    wrap.innerHTML = `<div class="spinner-row">لا توجد مقالات منشورة بعد</div>`;
    return;
  }
  wrap.innerHTML = "";
  for (const a of articles) {
    const row = document.createElement("div");
    row.className = "recent-row";
    row.innerHTML = `
      <div class="stamp stamp-sm stamp-published">${(CATEGORY_LABELS[a.category] || "؟")[0]}</div>
      <div class="recent-info">
        <div class="recent-title">${a.title}</div>
        <div class="recent-meta">${CATEGORY_LABELS[a.category] || a.category || "بدون قسم"} · ${timeAgo(a.updatedAt)}</div>
      </div>
      <a class="btn btn-ghost" href="editor.html?file=${encodeURIComponent(a.path)}">تعديل</a>
    `;
    wrap.appendChild(row);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ForsahGitHub.isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }
  const cfg = ForsahGitHub.getConfig();
  document.getElementById("repoLabel").textContent = `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;
  document.getElementById("logoutBtn").addEventListener("click", () => {
    ForsahGitHub.clearConfig();
    window.location.href = "index.html";
  });
  loadDashboard();
});
