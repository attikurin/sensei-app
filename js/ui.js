/**
 * 先生アプリ - 共通UIユーティリティ
 */

// =============================================
// トースト通知
// =============================================
function showToast(message, type = "default") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const icons = { success: "✅", error: "❌", warning: "⚠️", default: "📢" };
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// =============================================
// モーダル
// =============================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}
// オーバーレイクリックで閉じる
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});

// =============================================
// ヘッダー：ハンバーガーメニュー
// =============================================
function initHamburger() {
  const btn  = document.getElementById("hamburger-btn");
  const menu = document.getElementById("mobile-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => {
    menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", menu.classList.contains("open"));
  });
}

// =============================================
// ドロップダウン
// =============================================
function initDropdowns() {
  document.querySelectorAll(".dropdown").forEach(dropdown => {
    const trigger = dropdown.querySelector("[data-dropdown-trigger]");
    const menu    = dropdown.querySelector(".dropdown-menu");
    if (!trigger || !menu) return;
    trigger.addEventListener("click", e => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", () => menu.classList.remove("open"));
  });
}

// =============================================
// アプリカードHTMLを生成
// =============================================
function createAppCard(app) {
  const tags = (app.tags || []).map(t =>
    `<span class="badge badge--moss">${escHtml(t)}</span>`
  ).join("");

  const typeBadge = app.shareType === "html"
    ? `<span class="badge badge--green">📦 ローカル動作</span>`
    : `<span class="badge badge--gray">🔗 リンク</span>`;

  const offlineBadge = app.offlineSupport
    ? `<span class="badge badge--offline" title="インターネット不要で動作します">📴 オフライン動作対応</span>`
    : "";

  const thumb = app.thumbnailUrl
    ? `<img src="${escHtml(app.thumbnailUrl)}" alt="${escHtml(app.title)}" loading="lazy">`
    : `<div class="app-card__thumb-placeholder">${getAppEmoji(app.tags)}</div>`;

  return `
    <article class="card app-card" data-id="${escHtml(app.id)}">
      <a href="app-detail.html?id=${escHtml(app.id)}" class="app-card__thumb" aria-label="${escHtml(app.title)}の詳細">
        ${thumb}
        <div class="app-card__type">${typeBadge}</div>
      </a>
      <div class="app-card__body">
        <div class="app-card__tags" aria-label="カテゴリ">${tags}${offlineBadge}</div>
        <h3 class="app-card__title">
          <a href="app-detail.html?id=${escHtml(app.id)}">${escHtml(app.title)}</a>
        </h3>
        <p class="app-card__desc">${escHtml(app.description || "").slice(0, 80)}${(app.description || "").length > 80 ? "…" : ""}</p>
        <footer class="app-card__footer">
          <span class="app-card__author">
            ${app.authorPhoto
              ? `<img src="${escHtml(app.authorPhoto)}" alt="" class="app-card__author-icon">`
              : `<span class="app-card__author-icon app-card__author-icon--default">${escHtml((app.authorName || "先")[0])}</span>`
            }
            ${escHtml(app.authorName || "先生")}
          </span>
          <span class="app-card__stats">
            ❤️ ${app.likeCount || 0}
            &nbsp;👁 ${app.viewCount || 0}
          </span>
        </footer>
      </div>
    </article>`;
}

/** タグからアイコン絵文字を返す */
function getAppEmoji(tags = []) {
  const map = {
    "校務支援":  "📋",
    "学級経営":  "🏫",
    "授業・教材": "📚",
    "評価・採点": "✅",
    "保護者連絡": "📨",
    "特別支援":  "🤝",
    "ICT活用":   "💻",
    "部活・行事": "🎉",
    "その他":    "🌟"
  };
  for (const t of tags) {
    if (map[t]) return map[t];
  }
  return "🍀";
}

// =============================================
// スケルトンカードを n 枚生成
// =============================================
function createSkeletonCards(n = 6) {
  return Array.from({ length: n }, () => `
    <div class="card app-card app-card--skeleton">
      <div class="app-card__thumb skeleton" style="height:160px;"></div>
      <div class="app-card__body">
        <div class="skeleton" style="height:18px;width:60%;border-radius:6px;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:22px;width:90%;border-radius:6px;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:14px;border-radius:6px;margin-bottom:4px;"></div>
        <div class="skeleton" style="height:14px;width:70%;border-radius:6px;"></div>
      </div>
    </div>`).join("");
}

// =============================================
// HTML エスケープ
// =============================================
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =============================================
// 日時フォーマット
// =============================================
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

// =============================================
// グローバル公開
// =============================================
window.UI = {
  showToast, openModal, closeModal,
  initHamburger, initDropdowns,
  createAppCard, createSkeletonCards,
  escHtml, formatDate, getAppEmoji
};
