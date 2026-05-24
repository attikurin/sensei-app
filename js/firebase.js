/**
 * 先生アプリ - Firebase 設定・認証・DB モジュール
 *
 * ⚠️ 本番環境では以下の firebaseConfig を
 *    Firebaseコンソールで取得した実際の値に置き換えてください。
 */

// =============================================
// Firebase 設定（ここを本番値に変更）
// =============================================
const firebaseConfig = {
  apiKey:            "AIzaSyAp572rzJeUQ2x4yVFqYYHmXA8_9jnYfrI",
  authDomain:        "sensei-app-b4501.firebaseapp.com",
  projectId:         "sensei-app-b4501",
  storageBucket:     "sensei-app-b4501.firebasestorage.app",
  messagingSenderId: "424628963913",
  appId:             "1:424628963913:web:189d91f4de59e03f834d98",
  measurementId:     "G-Q8WCQTSE6B"
};

// =============================================
// Firebase 初期化
// =============================================
import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
                                                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection, doc,
  getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  increment, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                                                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// =============================================
// 認証 ヘルパー
// =============================================

/** Googleログイン（ポップアップ） */
async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user   = result.user;
    // Firestoreにユーザードキュメントを作成（初回のみ）
    await ensureUserDoc(user);
    return user;
  } catch (e) {
    console.error("Googleログイン失敗:", e);
    throw e;
  }
}

/** ログアウト */
async function logout() {
  await signOut(auth);
}

/** ユーザードキュメントを確保（初回登録） */
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      displayName: user.displayName || "先生",
      email:       user.email,
      photoURL:    user.photoURL || null,
      role:        "user",       // "user" | "admin"
      banned:      false,
      createdAt:   serverTimestamp()
    });
  }
}

/** ユーザー情報をFirestoreから取得 */
async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * プロフィール（ニックネーム・アイコン絵文字）を更新する
 * @param {string} uid
 * @param {object} profile - { displayName, iconEmoji }
 */
async function updateUserProfile(uid, profile) {
  await updateDoc(doc(db, "users", uid), {
    displayName: profile.displayName,
    iconEmoji:   profile.iconEmoji || null,
    updatedAt:   serverTimestamp()
  });
}

/** 現在のユーザーが admin かどうか */
async function isAdmin(uid) {
  const u = await getUserDoc(uid);
  return u && u.role === "admin" && !u.banned;
}

// =============================================
// アプリ (apps コレクション) ヘルパー
// =============================================

/**
 * アプリ一覧取得
 * @param {object} opts - { tags, sort, pageSize, lastDoc, search, offlineOnly }
 */
async function getApps(opts = {}) {
  const {
    tags        = [],
    sort        = "createdAt",
    pageSize    = 12,
    lastDoc     = null,
    search      = "",
    offlineOnly = false   // true の場合 offlineSupport===true のアプリのみ取得
  } = opts;

  let q = query(
    collection(db, "apps"),
    where("status", "==", "public")
  );

  // オフラインフィルター（tags フィルターとの併用不可のため、offlineOnly 優先）
  if (offlineOnly) {
    q = query(q, where("offlineSupport", "==", true));
  } else if (tags.length > 0) {
    q = query(q, where("tags", "array-contains-any", tags));
  }

  q = query(q, orderBy(sort === "popular" ? "likeCount" : "createdAt", "desc"), limit(pageSize));
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return { docs, lastDoc: snap.docs[snap.docs.length - 1] || null };
}

/**
 * ピックアップアプリ取得
 */
async function getPickupApps() {
  const q = query(
    collection(db, "apps"),
    where("status", "==", "public"),
    where("pickup", "==", true),
    orderBy("pickupOrder", "asc"),
    limit(6)
  );
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return docs;
}

/** アプリ単件取得 */
async function getApp(appId) {
  const snap = await getDoc(doc(db, "apps", appId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** 自分の投稿アプリ一覧 */
async function getMyApps(uid) {
  const q = query(
    collection(db, "apps"),
    where("authorUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return docs;
}

/**
 * アプリを投稿する
 * @param {object} data - フォームデータ
 * @param {File|null} htmlFile - HTMLファイル（任意）
 */
async function submitApp(data, htmlFile = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  let htmlFileUrl = null;
  if (htmlFile) {
    const storageRef = ref(storage, `apps/${user.uid}/${Date.now()}_${htmlFile.name}`);
    await uploadBytes(storageRef, htmlFile);
    htmlFileUrl = await getDownloadURL(storageRef);
  }

  const docRef = await addDoc(collection(db, "apps"), {
    ...data,
    htmlFileUrl,
    authorUid:   user.uid,
    authorName:  user.displayName || "先生",
    authorPhoto: user.photoURL || null,
    status:      "public",
    pickup:      false,
    pickupOrder: 999,
    likeCount:   0,
    viewCount:   0,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp()
  });
  return docRef.id;
}

/** アプリを更新する */
async function updateApp(appId, data, htmlFile = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");

  let htmlFileUrl = data.htmlFileUrl || null;
  if (htmlFile) {
    const storageRef = ref(storage, `apps/${user.uid}/${Date.now()}_${htmlFile.name}`);
    await uploadBytes(storageRef, htmlFile);
    htmlFileUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(doc(db, "apps", appId), {
    ...data,
    htmlFileUrl,
    updatedAt: serverTimestamp()
  });
}

/** アプリを削除する（ソフト削除：status="deleted"） */
async function deleteApp(appId) {
  await updateDoc(doc(db, "apps", appId), {
    status: "deleted",
    updatedAt: serverTimestamp()
  });
}

/** 閲覧数カウントアップ */
async function incrementView(appId) {
  await updateDoc(doc(db, "apps", appId), { viewCount: increment(1) });
}

/** いいね */
async function toggleLike(appId, uid) {
  const likeRef = doc(db, "apps", appId, "likes", uid);
  const snap = await getDoc(likeRef);
  if (snap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, "apps", appId), { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
    await updateDoc(doc(db, "apps", appId), { likeCount: increment(1) });
    return true;
  }
}

async function hasLiked(appId, uid) {
  const snap = await getDoc(doc(db, "apps", appId, "likes", uid));
  return snap.exists();
}

// =============================================
// お知らせ (notices コレクション) ヘルパー
// =============================================
async function getNotices() {
  const q = query(
    collection(db, "notices"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(3)
  );
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return docs;
}

async function addNotice(data) {
  await addDoc(collection(db, "notices"), {
    ...data,
    active: true,
    createdAt: serverTimestamp()
  });
}

async function deleteNotice(noticeId) {
  await updateDoc(doc(db, "notices", noticeId), { active: false });
}

// =============================================
// 管理者用
// =============================================
async function getAllAppsAdmin() {
  const q = query(collection(db, "apps"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return docs;
}

async function getAllUsersAdmin() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
  return docs;
}

async function banUser(uid) {
  await updateDoc(doc(db, "users", uid), { banned: true });
}

async function unbanUser(uid) {
  await updateDoc(doc(db, "users", uid), { banned: false });
}

async function forceDeleteApp(appId) {
  await updateDoc(doc(db, "apps", appId), { status: "deleted" });
}

async function setPickup(appId, pickup, pickupOrder = 999) {
  await updateDoc(doc(db, "apps", appId), { pickup, pickupOrder });
}

// =============================================
// エクスポート（グローバル公開）
// =============================================
window.FB = {
  auth, db, storage,
  loginWithGoogle, logout,
  getUserDoc, isAdmin, updateUserProfile,
  getApps, getPickupApps, getApp, getMyApps,
  submitApp, updateApp, deleteApp,
  incrementView, toggleLike, hasLiked,
  getNotices, addNotice, deleteNotice,
  getAllAppsAdmin, getAllUsersAdmin,
  banUser, unbanUser, forceDeleteApp, setPickup,
  onAuthStateChanged
};

export {
  auth, db, storage,
  loginWithGoogle, logout,
  getUserDoc, isAdmin, updateUserProfile,
  getApps, getPickupApps, getApp, getMyApps,
  submitApp, updateApp, deleteApp,
  incrementView, toggleLike, hasLiked,
  getNotices, addNotice, deleteNotice,
  getAllAppsAdmin, getAllUsersAdmin,
  banUser, unbanUser, forceDeleteApp, setPickup,
  onAuthStateChanged
};
