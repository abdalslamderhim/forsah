/**
 * Forsah CMS — طبقة الاتصال بـ GitHub REST API
 * كل القراءة والكتابة على المستودع تمر من هنا.
 * لا يوجد سيرفر خلفي: هذا الملف يتحدث مباشرة مع api.github.com
 * باستخدام Personal Access Token يُدخله المستخدم ويُخزَّن في sessionStorage فقط
 * (يُمسح تلقائيًا عند إغلاق التبويب — لا يُرفع أبدًا إلى المستودع).
 */

const ForsahGitHub = (() => {
  const API = "https://api.github.com";

  function getConfig() {
    const raw = sessionStorage.getItem("forsah_cms_session");
    return raw ? JSON.parse(raw) : null;
  }

  function setConfig({ token, owner, repo, branch }) {
    sessionStorage.setItem(
      "forsah_cms_session",
      JSON.stringify({ token, owner, repo, branch: branch || "main" })
    );
  }

  function clearConfig() {
    sessionStorage.removeItem("forsah_cms_session");
  }

  function isLoggedIn() {
    return !!getConfig();
  }

  async function request(path, options = {}) {
    const cfg = getConfig();
    if (!cfg) throw new Error("NO_SESSION");

    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      clearConfig();
      throw new Error("UNAUTHORIZED");
    }
    if (res.status === 404) {
      const err = new Error("NOT_FOUND");
      err.status = 404;
      throw err;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GITHUB_API_ERROR ${res.status}: ${body}`);
    }
    // 204 No Content (e.g. delete) has no body
    if (res.status === 204) return null;
    return res.json();
  }

  /** يتحقق من صحة التوكن وصلاحية الوصول للمستودع المحدد */
  async function verifyAccess({ token, owner, repo, branch }) {
    setConfig({ token, owner, repo, branch });
    // يتحقق من هوية المستخدم أولاً
    const user = await request("/user");
    // يتحقق من وصوله للمستودع تحديدًا (وليس فقط صلاحية التوكن العامة)
    const repoInfo = await request(`/repos/${owner}/${repo}`);
    return { user, repoInfo };
  }

  /** ترميز نص عربي/UTF-8 إلى base64 بأمان (btoa العادي يفشل مع الأحرف غير اللاتينية) */
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  /** يقرأ ملفًا؛ يرجع null إن لم يكن موجودًا (بدل رمي خطأ) */
  async function getFile(filePath) {
    const cfg = getConfig();
    try {
      const data = await request(
        `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(filePath)}?ref=${cfg.branch}`
      );
      return {
        sha: data.sha,
        content: base64ToUtf8(data.content.replace(/\n/g, "")),
        path: data.path,
      };
    } catch (e) {
      if (e.status === 404 || e.message === "NOT_FOUND") return null;
      throw e;
    }
  }

  /** ينشئ الملف أو يحدّثه (commit مباشر) — يكتشف تلقائيًا إن كان موجودًا مسبقًا */
  async function putFile(filePath, content, commitMessage) {
    const cfg = getConfig();
    const existing = await getFile(filePath);
    const body = {
      message: commitMessage,
      content: utf8ToBase64(content),
      branch: cfg.branch,
    };
    if (existing) body.sha = existing.sha;

    return request(
      `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(filePath)}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
  }

  /** يرفع ملف ثنائي (صورة) — content يجب أن يكون base64 جاهزًا (بدون data: prefix) */
  async function putBinaryFile(filePath, base64Content, commitMessage) {
    const cfg = getConfig();
    const existing = await getFile(filePath).catch(() => null);
    const body = {
      message: commitMessage,
      content: base64Content,
      branch: cfg.branch,
    };
    if (existing) body.sha = existing.sha;
    return request(
      `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(filePath)}`,
      { method: "PUT", body: JSON.stringify(body) }
    );
  }

  /** يسرد الملفات داخل مجلد */
  async function listDir(dirPath) {
    const cfg = getConfig();
    try {
      return await request(
        `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(dirPath)}?ref=${cfg.branch}`
      );
    } catch (e) {
      if (e.status === 404 || e.message === "NOT_FOUND") return [];
      throw e;
    }
  }

  /** حذف ملف */
  async function deleteFile(filePath, commitMessage) {
    const cfg = getConfig();
    const existing = await getFile(filePath);
    if (!existing) return null;
    return request(
      `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(filePath)}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          message: commitMessage,
          sha: existing.sha,
          branch: cfg.branch,
        }),
      }
    );
  }

  return {
    getConfig,
    setConfig,
    clearConfig,
    isLoggedIn,
    verifyAccess,
    getFile,
    putFile,
    putBinaryFile,
    listDir,
    deleteFile,
  };
})();
