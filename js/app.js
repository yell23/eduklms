/* =========================================================
   EDUBOOK LMS — APPLICATION LOGIC
   Vanilla JS. State lives in localStorage under "edubook_db".
   Routing is hash-based (#/dashboard, #/subject/ict10, ...).
========================================================= */

console.log("EduBook app.js build: quiz-double-advance-fix-2 (stopPropagation)");

const DB_KEY = "edubook_db";
const SESSION_KEY = "edubook_session";
let DB = null;
let quizState = null;   // transient in-progress quiz attempt
let readerState = null; // transient booklet reader state

/* ---------------- NAV ICON PATHS ---------------- */
const NAV_ICONS = {
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24"><path d="M21 3L3 10l7 3m11-10l-1 11M10 13l2 7"/><path d="M3 10v7"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M9 11h6M9 15h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M8 17V10M13 17V6M18 17v-4"/></svg>',
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.5 7.2L12 18.1 5.5 21.7 7 14.5l-5.3-5 7.2-.9L12 2z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v13m0 0l-4-4m4 4l4-4"/><path d="M4 19h16"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.33 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.33 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.87.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.33-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.51 1z"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  building: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/></svg>',
  report: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6"/></svg>',
  logoutIcon: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>'
};

/* =========================================================
   PERSISTENCE
========================================================= */
function seedIfNeeded() {
  const existing = localStorage.getItem(DB_KEY);
  if (existing) {
    try {
      DB = JSON.parse(existing);
    } catch (e) {
      DB = buildFreshDB();
    }
  } else {
    DB = buildFreshDB();
  }
  if (!DB.customSubjects) DB.customSubjects = {};
  if (!DB.customModules) DB.customModules = {};
  if (!DB.customQuizzes) DB.customQuizzes = {};
  if (DB.customSubjects.ttl && !DB.customSubjects.ttl.coverImage) {
    DB.customSubjects.ttl.coverImage = "assets/ttl_cover.png";
  }
  if (DB.customModules["m-ttl-1"] && !DB.customModules["m-ttl-1"].coverImage) {
    DB.customModules["m-ttl-1"].coverImage = "assets/ttl_cover.png";
    if (DB.customModules["m-ttl-1"].pages && DB.customModules["m-ttl-1"].pages[0]) {
      DB.customModules["m-ttl-1"].pages[0].coverImage = "assets/ttl_cover.png";
    }
  }
  Object.keys(DB.perUser || {}).forEach(email => {
    const defaults = {
      progress: {}, completedModules: [], quizResults: {}, downloads: {},
      bookmarksOrder: [],
      settings: { simulateOffline: false, notifications: true, language: "English" },
      notifications: [],
      unreadNotif: 0,
      seenAnnouncements: [],
      shortAnswers: {},
      submissions: {}
    };
    Object.keys(defaults).forEach((key) => {
      if (DB.perUser[email][key] === undefined) DB.perUser[email][key] = defaults[key];
    });
  });
  persist();
}

function buildFreshDB() {
  const now = Date.now();
  const mk = (email) => ({
    progress: {}, completedModules: [], quizResults: {}, downloads: {},
    bookmarksOrder: [],
    settings: { simulateOffline: false, notifications: true, language: "English" },
    notifications: [],
    unreadNotif: 0,
    seenAnnouncements: [],
    shortAnswers: {},
    submissions: {}
  });
  return {
    theme: "light",
    connection: "online",
    customSubjects: {},
    customModules: {},
    customQuizzes: {},
    perUser: {
      "student@edubook.test": mk("student@edubook.test"),
      "teacher@edubook.test": mk("teacher@edubook.test"),
      "admin@edubook.test": mk("admin@edubook.test")
    }
  };
}

function allSubjects() {
  const custom = (DB && DB.customSubjects) || {};
  return { ...SEED.subjects, ...custom };
}
function allModules() {
  const custom = (DB && DB.customModules) || {};
  return { ...SEED.modules, ...custom };
}
function allQuizzes() {
  const custom = (DB && DB.customQuizzes) || {};
  return { ...SEED.quizzes, ...custom };
}

let _lastPushedCatalogJSON = null;
let _lastPushedStudentStatsJSON = null;

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  } catch (e) {
    console.error('Persist FAILED — storage quota exceeded:', e);
    toast("Save failed: Data too large for storage. Remove large video files.", "error");
    return;
  }
  // Best-effort background sync to Supabase — debounced, never blocks the UI,
  // silently skipped when offline or not configured (see js/supabase-client.js).
  // Only push the shared catalog when it actually changed: persist() is
  // called for lots of things unrelated to the catalog (progress, quiz
  // answers, settings), and every push triggers a Realtime event that
  // echoes back to this same tab — pushing unchanged data just spams the
  // "may bagong laman" toast for no reason.
  if (typeof pushSharedStateSupabase === "function") {
    const catalogSnapshot = {
      customSubjects: DB.customSubjects, customModules: DB.customModules, customQuizzes: DB.customQuizzes
    };
    const catalogJSON = JSON.stringify(catalogSnapshot);
    if (catalogJSON !== _lastPushedCatalogJSON) {
      _lastPushedCatalogJSON = catalogJSON;
      pushSharedStateSupabase(catalogSnapshot);
    }
  }
  if (typeof pushUserStateSupabase === "function") {
    const u = currentUser();
    if (u && DB.perUser[u.email]) pushUserStateSupabase(u.email, DB.perUser[u.email]);
  }
  // Keep this student's teacher_students row (avg score / progress / per-module
  // status) in sync, so a teacher on another device sees live numbers instead
  // of the static 0/0 the row was created with.
  if (typeof pushTeacherStudentStatsSupabase === "function") {
    const u = currentUser();
    const student = u && SEED.teacherStudents.find(s => s.email === u.email);
    if (student) {
      const stats = liveStudentStats(student);
      const moduleProgress = {};
      Object.keys(allModules()).forEach(mid => {
        moduleProgress[mid] = getTeacherStudentModuleStatus(student, mid);
      });
      const payload = { avgScore: stats.avgScore, progress: stats.progress, moduleProgress };
      const payloadJSON = JSON.stringify(payload);
      if (payloadJSON !== _lastPushedStudentStatsJSON) {
        _lastPushedStudentStatsJSON = payloadJSON;
        pushTeacherStudentStatsSupabase(student.id, payload);
      }
    }
  }
}

function currentUser() {
  const email = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  const acct = SEED.users[email];
  if (!acct) return null;
  return acct;
}
function userData() {
  const u = currentUser();
  if (!u) return null;
  if (!DB.perUser[u.email]) {
    DB.perUser[u.email] = {};
  }
  // Defensively fill in any missing keys (self-heals a per-user record that
  // was ever replaced by an incomplete/older cloud snapshot — see doLogin).
  // Every render function below assumes these keys exist, so a missing key
  // here previously caused a hard crash and a fully blank page.
  const defaults = {
    progress: {}, completedModules: [], quizResults: {}, downloads: {},
    bookmarksOrder: [],
    settings: { simulateOffline: false, notifications: true, language: "English" },
    notifications: [],
    unreadNotif: 0,
    seenAnnouncements: [],
    shortAnswers: {},
    submissions: {}
  };
  let healed = false;
  Object.keys(defaults).forEach((key) => {
    if (DB.perUser[u.email][key] === undefined) {
      DB.perUser[u.email][key] = defaults[key];
      healed = true;
    }
  });
  if (healed) persist();
  return DB.perUser[u.email];
}

function getTeacherStudentModuleStatus(student, moduleId) {
  if (student.email && DB.perUser[student.email]) {
    const ud = DB.perUser[student.email];
    const p = ud.progress[moduleId];
    if (!p) return { status: "not-started", score: null };
    if (p.completed) return { status: "complete", score: ud.quizResults[moduleId]?.percentage || null };
    if (p.currentPage > 0) return { status: "in-progress", score: null };
    return { status: "not-started", score: null };
  }
  return student.moduleProgress?.[moduleId] || { status: "not-started", score: null };
}

// Computes live progress % and avgScore for a student from their actual DB.perUser data.
// Falls back to the static SEED values when the student has no perUser entry (e.g. Supabase-only rows).
function liveStudentStats(student) {
  const ud = student.email && DB.perUser[student.email];
  if (!ud) return { progress: student.progress || 0, avgScore: student.avgScore || 0 };

  // Progress: % of all modules across all subjects that are marked completed
  const allMods = Object.values(allModules());
  const totalMods = allMods.length;
  const doneMods = allMods.filter(m => ud.progress[m.id]?.completed).length;
  const progress = totalMods ? Math.round((doneMods / totalMods) * 100) : 0;

  // avgScore: average of all quiz result percentages
  const results = Object.values(ud.quizResults || {});
  const avgScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;

  return { progress, avgScore };
}


/* =========================================================
   AUTH
========================================================= */
async function attemptLogin(email, password, remember) {
  // Try Supabase first (works across devices/browsers). Falls back to the
  // bundled demo accounts in data.js when offline or not configured yet —
  // this is what keeps the login screen usable with no internet at all.
  let acct = null;
  if (typeof verifyLoginSupabase === "function") {
    const result = await verifyLoginSupabase(email, password);
    if (result.ok) {
      acct = result.user;
      SEED.users[email] = { ...SEED.users[email], ...acct, password }; // keep local mirror in sync
    }
  }
  if (!acct) {
    const local = SEED.users[email];
    if (!local || local.password !== password) return false;
    acct = local;
  }
  if (remember) localStorage.setItem(SESSION_KEY, email);
  else sessionStorage.setItem(SESSION_KEY, email);

  // Pull this user's cloud progress ONLY if this device has no local copy yet
  // (brand-new device/browser). If local progress already exists here, it stays
  // authoritative — a stale/older cloud snapshot (e.g. from a push that hadn't
  // finished syncing yet) must never wipe out newer local progress. This matches
  // the "local wins on conflict" rule already used for shared_state.
  if (typeof fetchUserStateSupabase === "function" && !DB.perUser[email]) {
    const cloudState = await fetchUserStateSupabase(email);
    if (cloudState) { DB.perUser[email] = cloudState; persist(); }
  }
  return true;
}
function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  location.hash = "";
  showLoginScreen();
}

// REALTIME: this user's own progress/quiz-results/downloads/settings,
// synced live across their own devices (e.g. phone + laptop open at once).
// Same "only apply if actually different" guard as the shared_state
// subscription, so this tab's own debounced pushUserStateSupabase writes
// don't echo back into a pointless re-render.
function wireUserStateRealtime(email) {
  if (typeof subscribeUserStateSupabase !== "function") return;
  subscribeUserStateSupabase(email, (remoteState) => {
    if (JSON.stringify(remoteState) === JSON.stringify(DB.perUser[email])) return;
    DB.perUser[email] = remoteState;
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
    route();
  });
}

/* =========================================================
   BOOT / SCREEN SWITCH
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  // Try Supabase for the course catalog first; on any failure (offline, not
  // configured, timeout) this silently returns null and SEED just keeps the
  // data.js content that's already loaded — same offline-first behavior as before.
  if (typeof fetchCatalogFromSupabase === "function") {
    const catalog = await fetchCatalogFromSupabase();
    if (catalog) {
      Object.assign(SEED.subjects, catalog.subjects);
      Object.assign(SEED.modules, catalog.modules);
      Object.assign(SEED.quizzes, catalog.quizzes);
      if (catalog.assignments.length) SEED.assignments = catalog.assignments;
      if (catalog.announcements.length) SEED.announcements = catalog.announcements;
      if (catalog.teacherStudents.length) SEED.teacherStudents = catalog.teacherStudents;
    }
  }

  seedIfNeeded();

  // Merge any teacher/admin-created content that's been synced to Supabase
  // from another device/browser. Local (this device's localStorage) wins on
  // any key conflict — it's always at least as fresh as what's already in
  // Supabase, since every local edit is written to localStorage synchronously
  // while the Supabase push can lag behind (debounced, or in flight when the
  // page reloads). Remote is only used to fill in keys this device doesn't
  // have yet, so cross-device sync for genuinely new content still works.
  if (typeof fetchSharedStateSupabase === "function") {
    const shared = await fetchSharedStateSupabase();
    if (shared) {
      let changed = false;
      ["customSubjects", "customModules", "customQuizzes"].forEach((key) => {
        Object.keys(shared[key] || {}).forEach((id) => {
          if (!(id in DB[key])) {
            DB[key][id] = shared[key][id];
            changed = true;
          }
        });
      });
      if (changed) persist();
    }
  }

  applyTheme(DB.theme || "light");
  wireNetworkListeners();
  wireLoginScreen();
  wireAppShell();
  updateStatusPill();

  // REALTIME: listen for subjects/modules/quizzes added or edited by anyone
  // else (any device, any tab). No reload needed — merges straight into DB
  // and re-renders whatever screen is currently open.
  if (typeof subscribeSharedStateSupabase === "function") {
    subscribeSharedStateSupabase((sharedData) => {
      let changed = false;
      ["customSubjects", "customModules", "customQuizzes"].forEach((key) => {
        if (sharedData[key] && JSON.stringify(sharedData[key]) !== JSON.stringify(DB[key])) {
          Object.assign(DB[key], sharedData[key]);
          changed = true;
        }
      });
      if (changed) {
        // Save locally WITHOUT re-pushing to Supabase (we just received this
        // from Supabase — pushing it back would just be a harmless but
        // pointless echo, so skip straight to localStorage here).
        localStorage.setItem(DB_KEY, JSON.stringify(DB));
        route();
        if (typeof toast === "function") toast("Na-update ang content — may bagong laman.", "info");
      }
    });
  }

  // REALTIME: users table — reflect accounts created/edited/deleted by
  // another admin/device (e.g. via Manage Users) without a manual refresh.
  if (typeof subscribeUsersSupabase === "function") {
    subscribeUsersSupabase((payload) => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
      if (payload.eventType === "DELETE") {
        const oldEmail = payload.old && payload.old.email;
        if (oldEmail && SEED.users[oldEmail]) delete SEED.users[oldEmail];
      } else if (row && row.email) {
        SEED.users[row.email] = {
          email: row.email, password: row.password, role: row.role, id: row.user_id,
          name: row.name, firstName: row.first_name, grade: row.grade, section: row.section,
          department: row.department, title: row.title, subjects: row.subjects
        };
      }
      route();
      if (typeof toast === "function") toast("Na-update ang user accounts — may bagong laman.", "info");
    });
  }

  // REALTIME: teacher_students table — reflect student roster/progress
  // changes made elsewhere so the admin/teacher panels stay live.
  if (typeof subscribeTeacherStudentsSupabase === "function") {
    subscribeTeacherStudentsSupabase((payload) => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
      if (payload.eventType === "DELETE") {
        const oldId = payload.old && payload.old.id;
        if (oldId) SEED.teacherStudents = SEED.teacherStudents.filter(s => s.id !== oldId);
      } else if (row && row.id) {
        const mapped = {
          id: row.id, name: row.name, section: row.section, avgScore: row.avg_score,
          progress: row.progress, email: row.email, moduleProgress: row.module_progress
        };
        const idx = SEED.teacherStudents.findIndex(s => s.id === row.id);
        if (idx >= 0) SEED.teacherStudents[idx] = mapped;
        else SEED.teacherStudents.push(mapped);
      }
      route();
      if (typeof toast === "function") toast("Na-update ang student roster — may bagong laman.", "info");
    });
  }

  // REALTIME: assignments — teacher/admin adds, edits, or deletes an
  // assignment (or a student's submission flips its status) on another
  // device/tab, and every open student/teacher view reflects it live.
  if (typeof subscribeAssignmentsSupabase === "function") {
    subscribeAssignmentsSupabase((payload) => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
      if (payload.eventType === "DELETE") {
        const oldId = payload.old && payload.old.id;
        if (oldId) SEED.assignments = SEED.assignments.filter(a => a.id !== oldId);
      } else if (row && row.id) {
        const idx = SEED.assignments.findIndex(a => a.id === row.id);
        const existing = idx >= 0 ? SEED.assignments[idx] : {};
        const mapped = {
          ...existing, // keeps `description`, which isn't stored in Supabase yet
          id: row.id, subjectId: row.subject_id, title: row.title, due: row.due,
          status: row.status, points: row.points, score: row.score
        };
        if (idx >= 0) SEED.assignments[idx] = mapped;
        else SEED.assignments.push(mapped);
      }
      route();
      if (typeof toast === "function") toast("Na-update ang assignments — may bagong laman.", "info");
    });
  }

  // REALTIME: announcements — same idea, for the announcements feed.
  if (typeof subscribeAnnouncementsSupabase === "function") {
    subscribeAnnouncementsSupabase((payload) => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : null;
      if (payload.eventType === "DELETE") {
        const oldId = payload.old && payload.old.id;
        if (oldId) SEED.announcements = SEED.announcements.filter(a => a.id !== oldId);
      } else if (row && row.id) {
        const mapped = {
          id: row.id, subjectId: row.subject_id, type: row.type, title: row.title, body: row.body,
          author: row.author, date: Number(row.occurred_at), pinned: row.pinned
        };
        const idx = SEED.announcements.findIndex(a => a.id === row.id);
        if (idx >= 0) SEED.announcements[idx] = mapped;
        else SEED.announcements.unshift(mapped);
      }
      route();
      if (typeof toast === "function") toast("Na-update ang announcements — may bagong laman.", "info");
    });
  }

  // Check if session returned from Google OAuth redirect
  if (typeof checkAuthSessionSupabase === "function") {
    const googleUser = await checkAuthSessionSupabase();
    if (googleUser) {
      if (!SEED.users[googleUser.email]) {
        SEED.users[googleUser.email] = googleUser;
        if (typeof createUserSupabase === "function") {
          createUserSupabase(googleUser);
        }
      }
      if (!SEED.teacherStudents.find(s => s.email === googleUser.email)) {
        SEED.teacherStudents.push({
          id: googleUser.id,
          name: googleUser.name,
          section: googleUser.section,
          avgScore: 0,
          progress: 0,
          email: googleUser.email,
          moduleProgress: {}
        });
      }
      sessionStorage.setItem(SESSION_KEY, googleUser.email);
      // Same "local wins" guard as the regular login path above.
      if (typeof fetchUserStateSupabase === "function" && !DB.perUser[googleUser.email]) {
        const cloudState = await fetchUserStateSupabase(googleUser.email);
        if (cloudState) { DB.perUser[googleUser.email] = cloudState; persist(); }
      }
      showAppScreen();
      wireUserStateRealtime(googleUser.email);
      location.hash = "#/dashboard";
      route();
      toast(`Welcome, ${googleUser.firstName}! 🎉`, "success");
      return;
    }
  }

  const user = currentUser();
  if (user) {
    // Already-logged-in session (remembered device) — only pull cloud progress
    // if this device somehow has no local copy yet. Local always wins once it
    // exists, so a page refresh can never wipe out progress made moments ago
    // that hasn't finished syncing to Supabase (800ms debounce + network lag).
    if (typeof fetchUserStateSupabase === "function" && !DB.perUser[user.email]) {
      const cloudState = await fetchUserStateSupabase(user.email);
      if (cloudState) { DB.perUser[user.email] = cloudState; persist(); }
    }
    showAppScreen();
    wireUserStateRealtime(user.email);
    route();
  }
  else { showLoginScreen(); }

  window.addEventListener("hashchange", route);
});

function showLoginScreen() {
  document.getElementById("screen-login").hidden = false;
  document.getElementById("app-shell").hidden = true;
}
function showAppScreen() {
  document.getElementById("screen-login").hidden = true;
  document.getElementById("app-shell").hidden = false;
  buildSidebar();
  buildBottomNav();
  renderProfileWidgets();
  renderNotifications();
}

/* =========================================================
   LOGIN & SIGN UP SCREEN WIRING
========================================================= */
function wireLoginScreen() {
  document.getElementById("theme-toggle-login").addEventListener("click", toggleTheme);

  // Switch between Login and Sign Up forms
  const linkShowSignup = document.getElementById("link-show-signup");
  const linkShowLogin = document.getElementById("link-show-login");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  if (linkShowSignup) {
    linkShowSignup.addEventListener("click", () => {
      loginForm.hidden = true;
      signupForm.hidden = false;
      document.getElementById("login-error").hidden = true;
      const signupErr = document.getElementById("signup-error");
      if (signupErr) signupErr.hidden = true;
    });
  }

  if (linkShowLogin) {
    linkShowLogin.addEventListener("click", () => {
      signupForm.hidden = true;
      loginForm.hidden = false;
      document.getElementById("login-error").hidden = true;
      const signupErr = document.getElementById("signup-error");
      if (signupErr) signupErr.hidden = true;
    });
  }

  // Google OAuth button handlers
  const handleGoogleAuth = async () => {
    if (typeof signInWithGoogleSupabase === "function") {
      toast("Connecting to Google...", "info");
      const res = await signInWithGoogleSupabase();
      if (!res.ok) {
        toast(res.error || "Google sign-in is unavailable offline.", "warning");
      }
    } else {
      toast("Google sign-in requires Supabase configuration.", "warning");
    }
  };

  const btnGoogleLogin = document.getElementById("btn-google-login");
  const btnGoogleSignup = document.getElementById("btn-google-signup");
  if (btnGoogleLogin) btnGoogleLogin.addEventListener("click", handleGoogleAuth);
  if (btnGoogleSignup) btnGoogleSignup.addEventListener("click", handleGoogleAuth);

  // Password visibility toggles
  document.getElementById("toggle-password").addEventListener("click", () => {
    const input = document.getElementById("login-password");
    input.type = input.type === "text" ? "password" : "text";
  });

  const toggleSignupPw = document.getElementById("toggle-signup-password");
  if (toggleSignupPw) {
    toggleSignupPw.addEventListener("click", () => {
      const input = document.getElementById("signup-password");
      input.type = input.type === "text" ? "password" : "text";
    });
  }

  // Login Form Submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const pw = document.getElementById("login-password").value;
    const remember = document.getElementById("remember-me").checked;
    const submitBtn = e.target.querySelector("button[type=submit]");
    if (submitBtn) submitBtn.disabled = true;
    const ok = await attemptLogin(email, pw, remember);
    if (submitBtn) submitBtn.disabled = false;
    const errBox = document.getElementById("login-error");
    if (!ok) {
      errBox.hidden = false;
      errBox.textContent = "Invalid email or password. Please check your credentials and try again.";
      return;
    }
    errBox.hidden = true;
    showAppScreen();
    wireUserStateRealtime(email);
    const role = SEED.users[email].role;
    location.hash = role === "teacher" ? "#/t-dashboard" : role === "admin" ? "#/a-dashboard" : "#/dashboard";
    route();
  });

  // Student Sign Up Form Submission
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signup-name").value.trim();
      const grade = document.getElementById("signup-grade").value.trim() || "Grade 10";
      const section = document.getElementById("signup-section").value.trim() || "Einstein";
      const email = document.getElementById("signup-email").value.trim().toLowerCase();
      const pw = document.getElementById("signup-password").value;
      const errBox = document.getElementById("signup-error");
      const submitBtn = signupForm.querySelector("button[type=submit]");

      if (SEED.users[email]) {
        errBox.hidden = false;
        errBox.textContent = "An account with this email already exists. Please sign in instead.";
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      const newStudent = {
        email,
        password: pw,
        role: "student",
        id: `STU-${Date.now().toString().slice(-6)}`,
        name,
        firstName: name.split(" ")[0] || name,
        grade,
        section,
        subjects: Object.keys(allSubjects())
      };

      // Add to local catalog
      SEED.users[email] = newStudent;
      SEED.teacherStudents.push({
        id: newStudent.id,
        name: newStudent.name,
        section: newStudent.section,
        avgScore: 0,
        progress: 0,
        email: newStudent.email,
        moduleProgress: {}
      });

      // Save to Supabase
      if (typeof createUserSupabase === "function") {
        await createUserSupabase(newStudent);
      }

      // Log in session
      localStorage.setItem(SESSION_KEY, email);
      userData(); // Initialize perUser state
      persist();

      if (submitBtn) submitBtn.disabled = false;
      errBox.hidden = true;
      showAppScreen();
      location.hash = "#/dashboard";
      route();
      toast(`Account created! Welcome to EduBook, ${newStudent.firstName}! 🎉`, "success");
    });
  }

  document.getElementById("forgot-link").addEventListener("click", (e) => {
    e.preventDefault();
    toast("Please contact your school administrator or teacher to reset your password.", "info");
  });
}

/* =========================================================
   APP SHELL WIRING (topbar, sidebar, dropdowns)
========================================================= */
function wireAppShell() {
  document.getElementById("theme-toggle-app").addEventListener("click", toggleTheme);
  document.getElementById("sidebar-open").addEventListener("click", () => toggleSidebar(true));
  document.getElementById("sidebar-close").addEventListener("click", () => toggleSidebar(false));
  document.getElementById("sidebar-overlay").addEventListener("click", () => toggleSidebar(false));
  document.getElementById("logout-btn").addEventListener("click", doLogout);
  document.getElementById("profile-logout").addEventListener("click", doLogout);

  document.getElementById("notif-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel("notif-panel");
    const ud = userData();
    if (ud) { ud.unreadNotif = 0; persist(); renderNotifications(); }
  });
  document.getElementById("profile-btn").addEventListener("click", (e) => {
    e.stopPropagation(); togglePanel("profile-panel");
  });
  document.addEventListener("click", () => { closeAllPanels(); });

  document.getElementById("status-pill").addEventListener("click", () => {
    location.hash = SEED.users[currentUser().email].role === "student" ? "#/settings" : (SEED.users[currentUser().email].role === "teacher" ? "#/t-settings" : "#/a-settings");
  });

  // Modal event listeners
  document.querySelectorAll('[data-action="close-modals"]').forEach(btn => {
    btn.addEventListener("click", closeAllModals);
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  const formSubject = document.getElementById("form-create-subject");
  if (formSubject) formSubject.addEventListener("submit", handleCreateSubjectSubmit);

  const formModule = document.getElementById("form-create-module");
  if (formModule) formModule.addEventListener("submit", handleCreateModuleSubmit);

  const formAnnouncement = document.getElementById("form-create-announcement");
  if (formAnnouncement) formAnnouncement.addEventListener("submit", handleCreateAnnouncementSubmit);

  const formAssignment = document.getElementById("form-create-assignment");
  if (formAssignment) formAssignment.addEventListener("submit", handleCreateAssignmentSubmit);

  const formSubmitAssignment = document.getElementById("form-submit-assignment");
  if (formSubmitAssignment) formSubmitAssignment.addEventListener("submit", handleSubmitAssignmentSubmit);

  const submitAsgFileInput = document.getElementById("submit-asg-file");
  if (submitAsgFileInput) submitAsgFileInput.addEventListener("change", () => {
    const f = submitAsgFileInput.files && submitAsgFileInput.files[0];
    document.getElementById("submit-asg-filename").textContent = f ? `Selected: ${f.name} (${(f.size / 1024).toFixed(0)} KB)` : "";
  });

  const subjCoverFileInput = document.getElementById("subj-cover-file");
  if (subjCoverFileInput) subjCoverFileInput.addEventListener("change", () => {
    const f = subjCoverFileInput.files && subjCoverFileInput.files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById("subj-cover").value = reader.result;
        toast("Subject cover image loaded!", "success");
      };
      reader.readAsDataURL(f);
    }
  });

  const modCoverFileInput = document.getElementById("mod-cover-file");
  if (modCoverFileInput) modCoverFileInput.addEventListener("change", () => {
    const f = modCoverFileInput.files && modCoverFileInput.files[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById("mod-cover").value = reader.result;
        toast("Module cover image loaded!", "success");
      };
      reader.readAsDataURL(f);
    }
  });

  const formUser = document.getElementById("form-edit-user");
  if (formUser) formUser.addEventListener("submit", handleEditUserSubmit);

  // Event delegation for all in-view interactions
  document.getElementById("view").addEventListener("click", handleViewClick);
  document.getElementById("view").addEventListener("change", handleViewChange);
  document.getElementById("view").addEventListener("input", handleViewInput);
  // Also catch clicks in modals (outside #view) — must exclude clicks that
  // originate inside #view, since those already bubble up and get handled
  // by the #view listener above; without this check, every click on a
  // data-action element inside #view fires handleViewClick TWICE (once per
  // listener), which double-advances things like quiz "Next"/"Previous".
  //
  // IMPORTANT: use e.composedPath() here, NOT element.contains(t)/closest().
  // Several #view actions (quiz-next, quiz-prev, quiz-select, and anything
  // that calls route()) replace #view's innerHTML *synchronously* inside
  // the #view listener above, which detaches the clicked element from the
  // DOM before this document-level listener runs. A live .contains(t)
  // check on a now-detached node always returns false, so this listener
  // would wrongly think the click happened "outside #view" and fire
  // handleViewClick(e) a second time on the very same event — e.g. one
  // click on quiz "Next" advanced the question index twice (Q1 -> Q3).
  // composedPath() is captured at dispatch time, before any handler runs,
  // so it still reflects the DOM as it was at the moment of the click.
  const viewEl = document.getElementById("view");
  document.addEventListener("click", (e) => {
    if (e.composedPath().includes(viewEl)) return; // already handled by the #view listener
    const t = e.target.closest("[data-action]");
    if (t) handleViewClick(e);
  });
  document.addEventListener("keydown", handleGlobalKeydown);
}

function handleViewInput(e) {
  if (e.target && e.target.id === "quiz-short-input" && quizState) {
    quizState.answers[quizState.index] = e.target.value;
    const submitBtn = document.querySelector('[data-action="quiz-submit"]');
    const nextBtn = document.querySelector('[data-action="quiz-next"]');
    const hasText = e.target.value.trim().length > 0;
    if (submitBtn) submitBtn.disabled = !hasText;
    if (nextBtn) nextBtn.disabled = !hasText;
  }
}

function togglePanel(id) {
  const panel = document.getElementById(id);
  const wasOpen = !panel.hidden;
  closeAllPanels();
  panel.hidden = wasOpen;
}
function closeAllPanels() {
  ["notif-panel", "profile-panel"].forEach(id => document.getElementById(id).hidden = true);
}
function toggleSidebar(open) {
  document.getElementById("sidebar").classList.toggle("open", open);
  document.getElementById("sidebar-overlay").classList.toggle("show", open);
}

/* =========================================================
   THEME
========================================================= */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme() {
  DB.theme = (DB.theme === "dark") ? "light" : "dark";
  applyTheme(DB.theme);
  persist();
  if (location.hash.startsWith("#/settings") || location.hash.startsWith("#/t-settings") || location.hash.startsWith("#/a-settings")) route();
}

/* =========================================================
   CONNECTION STATUS
========================================================= */

/* Show/hide the persistent amber banner at the top of the page.
   Called whenever real connectivity or the simulate-toggle changes. */
function updateOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;
  const reallyOffline = !navigator.onLine;
  const ud = userData();
  const simOffline = ud && ud.settings.simulateOffline;
  const shouldShow = reallyOffline || simOffline;

  if (shouldShow) {
    banner.hidden = false;
    document.body.classList.add("is-offline");
    if (simOffline && !reallyOffline) {
      banner.querySelector("span").textContent =
        "Simulated offline mode — downloaded modules still work.";
    } else {
      banner.querySelector("span").textContent =
        "You're offline — downloaded modules and your progress still work normally.";
    }
  } else {
    banner.hidden = true;
    document.body.classList.remove("is-offline");
  }
}

function updateStatusPill() {
  const pill = document.getElementById("status-pill");
  if (!pill) return;
  const ud = userData();
  const simOffline = ud && ud.settings.simulateOffline;
  const reallyOffline = !navigator.onLine;
  const isOffline = simOffline || reallyOffline;
  const state = isOffline ? "offline" : (DB.connection || "online");
  pill.className = "status-pill " + state;
  const label = state === "offline" ? "Offline" : state === "syncing" ? "Syncing…" : "Online";
  pill.innerHTML = `<span class="dot"></span>${label}`;
  updateOfflineBanner();
}

/* Wire up window online/offline events once. Called from DOMContentLoaded. */
function wireNetworkListeners() {
  window.addEventListener("offline", () => {
    DB.connection = "offline";
    updateStatusPill();
    // Show a toast only if the app shell is visible (user is logged in)
    if (!document.getElementById("app-shell").hidden) {
      toast("Connection lost. The app is running offline — your progress is saved locally.", "warning");
    }
  });

  window.addEventListener("online", () => {
    DB.connection = "online";
    updateStatusPill();
    if (!document.getElementById("app-shell").hidden) {
      simulateSyncWithMessage();
    }
  });

  // Reflect current state immediately on boot (in case page loads while offline)
  if (!navigator.onLine) {
    DB.connection = "offline";
  }
  updateOfflineBanner();
}

function simulateSync() {
  DB.connection = "syncing";
  updateStatusPill();
  setTimeout(() => { DB.connection = "online"; updateStatusPill(); }, 1200);
}
function simulateSyncWithMessage() {
  DB.connection = "syncing";
  updateStatusPill();
  toast("Synchronizing Progress… please wait.", "info");
  setTimeout(() => {
    DB.connection = "online";
    updateStatusPill();
    toast("Progress Successfully Synchronized ✓", "success");
  }, 2000);
}

/* =========================================================
   SIDEBAR / BOTTOM NAV
========================================================= */
function navConfigFor(role) {
  if (role === "teacher") {
    return [
      {
        label: "", items: [
          { icon: "grid", label: "Dashboard", hash: "#/t-dashboard" },
          { icon: "book", label: "My Subjects", hash: "#/t-subjects" },
          { icon: "users", label: "Students", hash: "#/t-students" },
          { icon: "megaphone", label: "Announcements", hash: "#/t-announcements" },
          { icon: "quiz", label: "Quizzes", hash: "#/t-quizzes" },
          { icon: "clipboard", label: "Assignments", hash: "#/t-assignments" },
          { icon: "chart", label: "Grades", hash: "#/t-grades" },
          { icon: "report", label: "Reports", hash: "#/t-reports" },
        ]
      },
      { label: "", items: [{ icon: "gear", label: "Settings", hash: "#/t-settings" }] }
    ];
  }
  if (role === "admin") {
    return [
      {
        label: "", items: [
          { icon: "grid", label: "Dashboard", hash: "#/a-dashboard" },
          { icon: "users", label: "Users", hash: "#/a-users" },
          { icon: "profile", label: "Students", hash: "#/a-students" },
          { icon: "building", label: "Teachers", hash: "#/a-teachers" },
          { icon: "book", label: "Subjects", hash: "#/a-subjects" },
          { icon: "layers", label: "Courses", hash: "#/a-courses" },
        ]
      },
      { label: "", items: [{ icon: "gear", label: "System Settings", hash: "#/a-settings" }] }
    ];
  }
  return [
    {
      label: "", items: [
        { icon: "grid", label: "Dashboard", hash: "#/dashboard" },
        { icon: "book", label: "My Subjects", hash: "#/subjects" },
        { icon: "layers", label: "Modules", hash: "#/modules" },
        { icon: "megaphone", label: "Announcements", hash: "#/announcements" },
        { icon: "quiz", label: "Quizzes", hash: "#/quizzes" },
        { icon: "clipboard", label: "Assignments", hash: "#/assignments" },
      ]
    },
    {
      label: "Track", items: [
        { icon: "chart", label: "Grades", hash: "#/grades" },
        { icon: "target", label: "Progress", hash: "#/progress" },
        { icon: "star", label: "Bookmarks", hash: "#/bookmarks" },
        { icon: "download", label: "Downloads", hash: "#/downloads" },
      ]
    },
    { label: "", items: [{ icon: "gear", label: "Settings", hash: "#/settings" }] }
  ];
}

function buildSidebar() {
  const user = currentUser();
  const nav = navConfigFor(user.role);
  const navEl = document.getElementById("sidebar-nav");
  navEl.innerHTML = nav.map(group => `
    ${group.label ? `<div class="nav-section-label">${group.label}</div>` : ""}
    ${group.items.map(item => `
      <a href="${item.hash}" class="nav-item" data-hash="${item.hash}">
        ${NAV_ICONS[item.icon]}<span>${item.label}</span>
      </a>`).join("")}
  `).join("");
  navEl.querySelectorAll(".nav-item").forEach(a => a.addEventListener("click", () => toggleSidebar(false)));
}

function buildBottomNav() {
  const user = currentUser();
  const items = user.role === "student"
    ? [{ icon: "grid", label: "Home", hash: "#/dashboard" }, { icon: "book", label: "Subjects", hash: "#/subjects" }, { icon: "chart", label: "Grades", hash: "#/grades" }, { icon: "profile", label: "Profile", hash: "#/profile" }]
    : user.role === "teacher"
      ? [{ icon: "grid", label: "Home", hash: "#/t-dashboard" }, { icon: "users", label: "Students", hash: "#/t-students" }, { icon: "chart", label: "Grades", hash: "#/t-grades" }, { icon: "profile", label: "Profile", hash: "#/profile" }]
      : [{ icon: "grid", label: "Home", hash: "#/a-dashboard" }, { icon: "users", label: "Users", hash: "#/a-users" }, { icon: "book", label: "Subjects", hash: "#/a-subjects" }, { icon: "profile", label: "Profile", hash: "#/profile" }];
  const el = document.getElementById("bottom-nav");
  el.classList.add("show");
  el.innerHTML = items.map(i => `<a href="${i.hash}" class="bottom-nav-item" data-hash="${i.hash}">${NAV_ICONS[i.icon]}<span>${i.label}</span></a>`).join("");
}

function updateActiveNav() {
  const h = location.hash || "#/dashboard";
  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach(a => {
    a.classList.toggle("active", h.indexOf(a.dataset.hash) === 0);
  });
}

function renderProfileWidgets() {
  const user = currentUser();
  document.getElementById("topbar-avatar").textContent = initials(user.name);
  document.getElementById("topbar-avatar").style.background = "linear-gradient(150deg, var(--primary), var(--secondary))";
  document.getElementById("topbar-avatar").style.color = "#fff";
  document.getElementById("topbar-avatar").style.display = "flex";
  document.getElementById("topbar-avatar").style.alignItems = "center";
  document.getElementById("topbar-avatar").style.justifyContent = "center";
  document.getElementById("topbar-avatar").style.fontWeight = "700";
  document.getElementById("topbar-avatar").style.fontSize = "12.5px";
  document.getElementById("topbar-avatar").style.borderRadius = "50%";
  document.getElementById("topbar-name").textContent = user.firstName;
}

function renderNotifications() {
  const ud = userData();
  const badge = document.getElementById("notif-badge");
  badge.hidden = !ud || !ud.unreadNotif;
  const list = document.getElementById("notif-list");
  if (!ud || !ud.notifications.length) {
    list.innerHTML = `<div class="empty-state" style="padding:30px 16px;"><p>No notifications yet.</p></div>`;
    return;
  }
  list.innerHTML = ud.notifications.map(n => `
    <div class="notif-item">
      <span class="notif-icon">${svgIcon(n.icon)}</span>
      <div><p>${n.text}</p><div class="notif-time">${timeAgo(n.time)}</div></div>
    </div>
  `).join("");
}

function initials(name) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1].split('&')[0];
  }
  return null;
}

/* =========================================================
   TOASTS
========================================================= */
function toast(msg, type = "info") {
  const host = document.getElementById("toast-host");
  const div = document.createElement("div");
  div.className = "toast " + type;
  const icon = type === "success" ? ICONS.check : type === "warning" ? ICONS.clock : ICONS.bell;
  div.innerHTML = `${icon}<span>${msg}</span>`;
  host.appendChild(div);
  setTimeout(() => {
    div.style.animation = "toast-out .25s ease forwards";
    setTimeout(() => div.remove(), 250);
  }, 3200);
}

/* =========================================================
   ROUTER
========================================================= */
function route() {
  closeAllPanels();
  const user = currentUser();
  if (!user) { showLoginScreen(); return; }

  updateActiveNav();
  document.getElementById("view").classList.remove("reader-mode");

  const hash = location.hash || (user.role === "teacher" ? "#/t-dashboard" : user.role === "admin" ? "#/a-dashboard" : "#/dashboard");
  const parts = hash.replace("#/", "").split("/");
  const page = parts[0], arg = parts[1];
  const view = document.getElementById("view");

  const routes = {
    "dashboard": renderStudentDashboard,
    "subjects": renderSubjectsList,
    "subject": () => renderSubjectDetail(arg),
    "modules": renderAllModules,
    "module": () => { renderModuleReader(arg); return; },
    "quizzes": renderQuizzesList,
    "quiz": () => renderQuizAttempt(arg),
    "quiz-result": () => renderQuizResult(arg),
    "assignments": renderAssignments,
    "grades": renderGrades,
    "progress": renderProgressPage,
    "bookmarks": renderBookmarks,
    "downloads": renderDownloads,
    "settings": renderSettings,
    "profile": renderProfile,
    "announcements": renderAnnouncements,

    "t-dashboard": renderTeacherDashboard,
    "t-subjects": renderTeacherSubjects,
    "t-subject": () => renderTeacherSubjectDetail(arg),
    "t-students": renderTeacherStudents,
    "t-announcements": renderTeacherAnnouncements,
    "t-quizzes": renderTeacherQuizzes,
    "t-assignments": renderTeacherAssignments,
    "t-grades": renderTeacherGrades,
    "t-reports": renderTeacherReports,
    "t-settings": renderSettings,

    "a-dashboard": renderAdminDashboard,
    "a-users": renderAdminUsers,
    "a-students": renderAdminStudents,
    "a-teachers": renderAdminTeachers,
    "a-subjects": renderAdminSubjects,
    "a-courses": renderAdminCourses,
    "a-settings": renderSettings,
  };

  const fn = routes[page];
  if (page === "module") {
    view.classList.add("reader-mode");
    renderModuleReader(arg);
    return;
  }
  if (fn) { view.innerHTML = ""; view.appendChild(fragFromHTML(`<div class="page-fade">${fn()}</div>`)); }
  else { view.innerHTML = `<div class="empty-state"><h3>Page not found</h3><p>Try the navigation on the left.</p></div>`; }
  window.scrollTo(0, 0);
}

function fragFromHTML(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content;
}

/* =========================================================
   EVENT DELEGATION — clicks & changes inside #view
========================================================= */
function handleViewClick(e) {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  // Belt-and-suspenders fix: stop this click from bubbling any further once
  // we know #view is going to handle it. This makes it IMPOSSIBLE for the
  // document-level listener in wireAppShell() to also see this same click,
  // no matter what — it doesn't depend on checking the DOM after the fact,
  // so it can't be fooled by #view's innerHTML being replaced mid-click
  // (which is what caused quiz "Next" to jump 2 questions at a time before).
  e.stopPropagation();
  const action = t.dataset.action;
  const id = t.dataset.id;

  const actions = {
    "open-subject": () => location.hash = `#/subject/${id}`,
    "open-module": () => location.hash = `#/module/${id}`,
    "open-quiz": () => location.hash = `#/quiz/${id}`,
    "retry-quiz": () => location.hash = `#/quiz/${id}`,
    "download-module": () => downloadModule(id, t),
    "remove-download": () => removeDownload(id),
    "toggle-bookmark-row": () => { toggleBookmarkFromList(id); },
    "reader-back": () => { const m = allModules()[readerState.moduleId]; location.hash = `#/subject/${m ? m.subjectId : ''}`; },
    "reader-prev": () => turnPage(-1),
    "reader-next": () => turnPage(1),
    "reader-toc-toggle": () => toggleToc(),
    "reader-jump": () => { jumpToPage(parseInt(t.dataset.page, 10)); toggleToc(false); },
    "reader-bookmark": () => toggleReaderBookmark(),
    "reader-download": () => downloadModule(readerState.moduleId, t),
    "reader-mark-complete": () => markModuleComplete(readerState.moduleId),
    "reader-start-quiz": () => { const m = allModules()[readerState.moduleId]; location.hash = `#/quiz/${m ? m.quizId : ''}`; },
    "quiz-select": () => selectQuizAnswer(parseInt(t.dataset.idx, 10)),
    "quiz-prev": () => stepQuiz(-1),
    "quiz-next": () => stepQuiz(1),
    "quiz-submit": () => submitQuiz(),
    "open-modal-subject": () => openSubjectModal(),
    "open-modal-module": () => openModuleModal(id),
    "open-modal-module-new": () => openModuleModal(null, t.dataset.subjectId),
    "close-modals": () => closeAllModals(),
    "filter-matrix": () => {
      const container = document.getElementById("matrix-container");
      if (container) container.innerHTML = renderTeacherModuleMatrix(id);
    },
    "return-assignment": () => returnAssignment(t.dataset.studentEmail, t.dataset.assignmentId),
    "delete-subject": () => deleteSubject(id),
    "delete-module": () => deleteModule(id),
    "open-modal-announcement": () => openAnnouncementModal(id),
    "open-modal-assignment": () => openAssignmentModal(id),
    "open-modal-submit-assignment": () => openSubmitAssignmentModal(id),
    "open-modal-view-submissions": () => openViewSubmissionsModal(id),
    "save-assignment-score": () => saveAssignmentScore(t.dataset.assignmentId, document.querySelector(`input[data-student-email="${t.dataset.studentEmail}"][data-assignment-id="${t.dataset.assignmentId}"]`)),
    "delete-announcement": () => deleteAnnouncement(id),
    "delete-assignment": () => deleteAssignment(id),
    "edit-announcement": () => openAnnouncementModal(id),
    "edit-assignment": () => openAssignmentModal(id),
    "view-student": () => viewStudentDetail(id),
    "edit-user": () => editAdminUser(id),
    "delete-user": () => deleteUser(id),
    "clear-downloads": () => clearUserDownloads(),
    "open-modal-user": () => openUserModal(),
    "open-modal-student": () => toast("Use the Students tab (#/a-students) to manage students. Add via teacher accounts.", "info"),
    "open-modal-teacher": () => toast("Teachers are managed via user accounts. Add a user with role 'Teacher'.", "info"),
    "open-modal-course": () => toast("Courses are based on subject groupings. Manage via Subjects tab.", "info"),
    "view-course": () => toast("Course details: View course structure in Subjects tab.", "info"),
  };
  if (actions[action]) actions[action]();
}

function handleViewChange(e) {
  const t = e.target.closest("[data-toggle]");
  if (!t) return;
  const key = t.dataset.toggle;
  const ud = userData();
  if (key === "simulateOffline") {
    ud.settings.simulateOffline = t.checked;
    persist(); updateStatusPill();
    if (t.checked) {
      toast("Offline mode simulated. Downloaded modules still work.", "warning");
    } else {
      simulateSyncWithMessage();
    }
  }
  if (key === "notifications") { ud.settings.notifications = t.checked; persist(); }
  if (key === "theme-light") { DB.theme = "light"; applyTheme("light"); persist(); route(); }
  if (key === "theme-dark") { DB.theme = "dark"; applyTheme("dark"); persist(); route(); }
}

function handleGlobalKeydown(e) {
  if (!readerState) return;
  if (!location.hash.startsWith("#/module/")) return;
  if (e.key === "ArrowRight") turnPage(1);
  if (e.key === "ArrowLeft") turnPage(-1);
  if (e.key === "Escape") toggleToc(false);
}

/* =========================================================
   DELETE OPERATIONS
========================================================= */
function deleteSubject(subjectId) {
  const subject = allSubjects()[subjectId];
  if (!subject) return;

  const moduleIds = subject.moduleIds || [];

  delete DB.customSubjects[subjectId];

  moduleIds.forEach(modId => {
    delete DB.customModules[modId];
    const quiz = allQuizzes()[modId];
    if (quiz) delete DB.customQuizzes[quiz.id];
  });

  Object.values(DB.perUser).forEach(ud => {
    moduleIds.forEach(modId => {
      delete ud.progress[modId];
      delete ud.quizResults[modId];
      delete ud.downloads[modId];
      const bookmarkIdx = ud.bookmarksOrder?.indexOf(modId);
      if (bookmarkIdx > -1) ud.bookmarksOrder.splice(bookmarkIdx, 1);
    });
    ud.completedModules = (ud.completedModules || []).filter(m => !moduleIds.includes(m));
  });

  persist();
  closeAllModals();
  route();
}

function handleCreateAnnouncementSubmit(e) {
  e.preventDefault();
  const subjectId = document.getElementById("ann-subject").value;
  const type = document.getElementById("ann-type").value;
  const title = document.getElementById("ann-title").value.trim();
  const body = document.getElementById("ann-body").value.trim();
  const pinned = document.getElementById("ann-pinned").checked;
  const user = currentUser();

  if (!subjectId || !title || !body) return;

  const isEditing = !!editingAnnouncementId;

  if (isEditing) {
    const idx = SEED.announcements.findIndex(a => a.id === editingAnnouncementId);
    if (idx !== -1) {
      SEED.announcements[idx] = {
        ...SEED.announcements[idx],
        subjectId,
        type,
        title,
        body,
        pinned,
        author: user.name,
        date: Date.now()
      };
      if (typeof updateAnnouncementSupabase === "function") updateAnnouncementSupabase(SEED.announcements[idx]);
      toast(`Announcement "${title}" updated!`, "success");
    }
  } else {
    const newAnn = {
      id: `ann-${Date.now()}`,
      subjectId,
      type,
      title,
      body,
      author: user.name,
      date: Date.now(),
      pinned
    };
    SEED.announcements.unshift(newAnn);
    if (typeof createAnnouncementSupabase === "function") createAnnouncementSupabase(newAnn);
    toast(`Announcement "${title}" posted!`, "success");
  }

  persist();
  closeAllModals();
  route();
}

function handleCreateAssignmentSubmit(e) {
  e.preventDefault();
  const subjectId = document.getElementById("asg-subject").value;
  const title = document.getElementById("asg-title").value.trim();
  const desc = document.getElementById("asg-desc").value.trim();
  const due = document.getElementById("asg-due").value;
  const points = parseInt(document.getElementById("asg-points").value, 10) || 20;
  const status = document.getElementById("asg-status").value;

  if (!subjectId || !title || !due) return;

  const isEditing = !!editingAssignmentId;

  if (isEditing) {
    const idx = SEED.assignments.findIndex(a => a.id === editingAssignmentId);
    if (idx !== -1) {
      SEED.assignments[idx] = {
        ...SEED.assignments[idx],
        subjectId,
        title,
        description: desc,
        due,
        points,
        status
      };
      if (typeof updateAssignmentSupabase === "function") updateAssignmentSupabase(SEED.assignments[idx]);
      toast(`Assignment "${title}" updated!`, "success");
    }
  } else {
    const newAsg = {
      id: `a-${Date.now()}`,
      subjectId,
      title,
      description: desc,
      due,
      points,
      status
    };
    SEED.assignments.push(newAsg);
    if (typeof createAssignmentSupabase === "function") createAssignmentSupabase(newAsg);
    toast(`Assignment "${title}" created!`, "success");
  }

  persist();
  closeAllModals();
  route();
}

function handleEditUserSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById("user-edit-id").value;
  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const role = document.getElementById("user-role").value;
  const password = document.getElementById("user-password").value;
  const extra = document.getElementById("user-extra").value.trim();

  if (!name || !email || !role) return;

  const isEditing = !!editingUserId;

  if (isEditing) {
    // Update existing user
    if (SEED.users[editingUserId]) {
      const oldEmail = editingUserId;
      const user = SEED.users[oldEmail];

      // If email changed, update the key
      if (email !== oldEmail) {
        delete SEED.users[oldEmail];
        user.email = email;
        SEED.users[email] = user;

        // Update session if it's the current user
        const sessionKey = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (sessionKey === oldEmail) {
          if (sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, email);
          if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, email);
        }
        // Update perUser data key
        if (DB.perUser[oldEmail]) {
          DB.perUser[email] = DB.perUser[oldEmail];
          delete DB.perUser[oldEmail];
        }
      } else {
        user.email = email;
      }

      user.name = name;
      user.role = role;
      if (password) user.password = password;
      if (extra) user.extra = extra;

      // Update firstName from name
      user.firstName = name.split(" ")[0];

      if (typeof renameUserEmailSupabase === "function") {
        if (email !== oldEmail) renameUserEmailSupabase(oldEmail, email, user);
        else updateUserSupabase(email, user);
      }
      toast(`User "${name}" updated!`, "success");
    } else {
      // Update student in teacherStudents
      const idx = SEED.teacherStudents.findIndex(s => s.id === editingUserId);
      if (idx !== -1) {
        SEED.teacherStudents[idx].name = name;
        // Note: email/role changes for students would need more handling
        toast(`Student "${name}" updated!`, "success");
      }
    }
  } else {
    // Create new user
    if (SEED.users[email]) {
      toast("A user with this email already exists.", "warning");
      return;
    }
    const newUser = {
      email,
      password: password || "password123",
      role,
      name,
      firstName: name.split(" ")[0],
      extra
    };
    // Add role-specific fields
    if (role === "student") {
      newUser.id = `STU-${Date.now().toString().slice(-6)}`;
      newUser.grade = "Grade 10";
      newUser.section = "Einstein";
      newUser.subjects = Object.keys(allSubjects());
    } else if (role === "teacher") {
      newUser.id = `TCH-${Date.now().toString().slice(-6)}`;
      newUser.department = "General";
      newUser.subjects = [];
    } else if (role === "admin") {
      newUser.id = `ADM-${Date.now().toString().slice(-4)}`;
      newUser.title = "System Administrator";
    }
    SEED.users[email] = newUser;
    if (typeof createUserSupabase === "function") createUserSupabase(newUser);
    toast(`User "${name}" created!`, "success");
  }

  persist();
  closeAllModals();
  route();
}

function deleteModule(moduleId) {
  const mod = allModules()[moduleId];
  if (!mod) return;

  const subject = allSubjects()[mod.subjectId];

  delete DB.customModules[moduleId];
  if (mod.quizId) delete DB.customQuizzes[mod.quizId];

  if (subject && subject.moduleIds) {
    subject.moduleIds = subject.moduleIds.filter(id => id !== moduleId);
  }

  Object.values(DB.perUser).forEach(ud => {
    delete ud.progress[moduleId];
    delete ud.quizResults[moduleId];
    delete ud.downloads[moduleId];
    const bookmarkIdx = ud.bookmarksOrder?.indexOf(moduleId);
    if (bookmarkIdx > -1) ud.bookmarksOrder.splice(bookmarkIdx, 1);
    ud.completedModules = (ud.completedModules || []).filter(m => m !== moduleId);
  });
  persist();
  closeAllModals();
  route();
}

function deleteAnnouncement(announcementId) {
  const idx = SEED.announcements.findIndex(a => a.id === announcementId);
  if (idx !== -1) {
    const title = SEED.announcements[idx].title;
    SEED.announcements.splice(idx, 1);
    if (typeof deleteAnnouncementSupabase === "function") deleteAnnouncementSupabase(announcementId);
    persist();
    toast(`Announcement "${title}" deleted.`, "success");
    route();
  }
}

const MAX_SUBMISSION_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SUBMISSION_EXT = [".pdf", ".doc", ".docx"];

function openSubmitAssignmentModal(assignmentId) {
  const a = SEED.assignments.find(x => x.id === assignmentId);
  if (!a) return;
  document.getElementById("submit-asg-id").value = assignmentId;
  document.getElementById("submit-asg-title").textContent = `Submit: ${a.title}`;
  document.getElementById("submit-asg-desc").textContent = a.description || "Upload your work as a PDF or Word document.";
  document.getElementById("submit-asg-file").value = "";
  document.getElementById("submit-asg-filename").textContent = "";
  document.getElementById("submit-asg-note").value = "";
  const modal = document.getElementById("modal-submit-assignment");
  modal.hidden = false;
}

function handleSubmitAssignmentSubmit(e) {
  e.preventDefault();
  const assignmentId = document.getElementById("submit-asg-id").value;
  const fileInput = document.getElementById("submit-asg-file");
  const note = document.getElementById("submit-asg-note").value.trim();
  const file = fileInput.files && fileInput.files[0];

  if (!file) { toast("Please choose a file to submit.", "error"); return; }

  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_SUBMISSION_EXT.includes(ext)) {
    toast("Only PDF, DOC, or DOCX files are allowed.", "error");
    return;
  }
  if (file.size > MAX_SUBMISSION_BYTES) {
    toast("File is too large. Please keep it under 5 MB.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const ud = userData();
    ud.submissions[assignmentId] = {
      fileName: file.name,
      fileType: file.type,
      fileData: reader.result, // base64 data URL
      note,
      submittedAt: Date.now()
    };
    const idx = SEED.assignments.findIndex(x => x.id === assignmentId);
    if (idx !== -1) {
      SEED.assignments[idx].status = "submitted";
      if (typeof updateAssignmentSupabase === "function") updateAssignmentSupabase(SEED.assignments[idx]);
    }
    persist();
    closeAllModals();
    toast("Assignment submitted!", "success");
    route();
  };
  reader.onerror = () => toast("Could not read that file. Please try again.", "error");
  reader.readAsDataURL(file);
}

function openViewSubmissionsModal(assignmentId) {
  const a = SEED.assignments.find(x => x.id === assignmentId);
  if (!a) return;
  document.getElementById("view-sub-title").textContent = `Submissions: ${a.title}`;
  const rows = Object.entries(DB.perUser || {})
    .map(([email, ud]) => ({ email, sub: (ud.submissions || {})[assignmentId] }))
    .filter(r => r.sub)
    .map(r => {
      const u = SEED.users[r.email];
      const name = u ? u.name : r.email;
      const existingScore = r.sub.score !== undefined ? r.sub.score : '';
      return `
        <div class="card" style="padding:12px 16px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
            <div>
              <strong>${name}</strong><br>
              <span class="field-hint">${r.sub.fileName} · submitted ${formatDate(new Date(r.sub.submittedAt).toISOString())}</span>
              ${r.sub.note ? `<div class="field-hint">Note: ${r.sub.note}</div>` : ""}
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <a class="btn btn-outline btn-sm" href="${r.sub.fileData}" download="${r.sub.fileName}">Download</a>
              <input type="number" min="0" max="${a.points}" placeholder="Score" value="${existingScore}" data-student-email="${r.email}" data-assignment-id="${assignmentId}" style="width:70px;" class="modal-select">
              <button class="btn btn-primary btn-sm" data-action="save-assignment-score" data-student-email="${r.email}" data-assignment-id="${assignmentId}">Save</button>
              <button class="btn btn-outline btn-sm" data-action="return-assignment" data-student-email="${r.email}" data-assignment-id="${assignmentId}" style="color:var(--danger); border-color:var(--danger);">Return</button>
            </div>
          </div>
        </div>`;
    }).join("");
  document.getElementById("view-sub-body").innerHTML = rows || `<p class="field-hint">No submissions yet.</p>`;
  document.getElementById("modal-view-submissions").hidden = false;
}

function saveAssignmentScore(assignmentId, scoreInputEl) {
  if (!scoreInputEl) { toast("Score input not found", "error"); return; }
  const studentEmail = scoreInputEl.dataset.studentEmail;
  const score = parseInt(scoreInputEl.value, 10);
  if (!studentEmail) { toast("Student email missing", "error"); return; }
  if (isNaN(score)) { toast("Invalid score", "error"); return; }

  const ud = DB.perUser[studentEmail];
  if (!ud || !ud.submissions || !ud.submissions[assignmentId]) { toast("Submission not found", "error"); return; }

  ud.submissions[assignmentId].score = score;
  persist();
  toast("Score saved!", "success");
  route();
}

function returnAssignment(studentEmail, assignmentId) {
  const ud = DB.perUser[studentEmail];
  if (!ud || !ud.submissions || !ud.submissions[assignmentId]) {
    toast("Submission not found", "error"); return;
  }
  if (!confirm("Return this submission? Student will need to resubmit.")) return;

  delete ud.submissions[assignmentId];
  persist();
  toast("Submission returned. Student can now resubmit.", "success");
  route();
}

function deleteAssignment(assignmentId) {
  const idx = SEED.assignments.findIndex(a => a.id === assignmentId);
  if (idx !== -1) {
    const title = SEED.assignments[idx].title;
    SEED.assignments.splice(idx, 1);
    if (typeof deleteAssignmentSupabase === "function") deleteAssignmentSupabase(assignmentId);
    persist();
    toast(`Assignment "${title}" deleted.`, "success");
    route();
  }
}

function clearUserDownloads() {
  const ud = userData();
  if (!ud || !Object.keys(ud.downloads).length) return;
  const count = Object.keys(ud.downloads).length;
  ud.downloads = {};
  persist();
  toast(`Cleared ${count} downloaded module(s).`, "success");
  route();
}

function deleteUser(userId) {
  const user = SEED.users[userId];
  if (user) {
    if (user.role === "admin") {
      toast("Cannot delete admin users.", "warning");
      return;
    }
    const name = user.name;
    delete SEED.users[userId];
    if (DB.perUser[userId]) delete DB.perUser[userId];
    persist();
    if (typeof deleteUserSupabase === "function") deleteUserSupabase(userId);
    toast(`User "${name}" deleted.`, "success");
    route();
    return;
  }

  const studentIdx = SEED.teacherStudents.findIndex(s => s.id === userId);
  if (studentIdx !== -1) {
    const name = SEED.teacherStudents[studentIdx].name;
    SEED.teacherStudents.splice(studentIdx, 1);
    persist();
    toast(`Student "${name}" deleted.`, "success");
    route();
    return;
  }

  toast("User not found.", "warning");
}

function viewStudentDetail(studentId) {
  const student = SEED.teacherStudents.find(s => s.id === studentId);
  if (!student) { toast("Student not found.", "warning"); return; }

  location.hash = `#/t-student/${studentId}`;
  route();
}

let editingUserId = null;
function openUserModal(userId = null) {
  const modal = document.getElementById("modal-user");
  if (!modal) return;

  editingUserId = userId;
  const isEditing = !!userId;

  // Find user in SEED.users or teacherStudents
  let user = null;
  if (isEditing) {
    user = SEED.users[userId];
    if (!user) {
      // Check teacherStudents
      const student = SEED.teacherStudents.find(s => s.id === userId);
      if (student) {
        user = {
          name: student.name,
          email: student.name.toLowerCase().replace(" ", ".") + "@edubook.test",
          role: "student",
          id: student.id,
          extra: `Section: ${student.section}, Avg: ${student.avgScore}%, Progress: ${student.progress}%`
        };
      }
    }
  }

  document.getElementById("user-edit-id").value = userId || "";
  document.getElementById("user-name").value = user?.name || "";
  document.getElementById("user-email").value = user?.email || "";
  document.getElementById("user-role").value = user?.role || "student";
  document.getElementById("user-password").value = "";
  document.getElementById("user-extra").value = user?.extra || "";

  document.querySelector("#modal-user h3").textContent = isEditing ? "Edit User" : "Add User";
  document.querySelector("#modal-user .modal-header p").textContent = isEditing ? "Update user details." : "Create a new user account.";
  document.querySelector("#form-edit-user button[type=submit]").textContent = isEditing ? "Save Changes" : "Create User";

  modal.hidden = false;
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.hidden = true);
  editingSubjectId = null;
  editingModuleId = null;
  editingAnnouncementId = null;
  editingAssignmentId = null;
  editingUserId = null;
  builderPages = [];
  builderQuestions = [];
}

function editAdminUser(userId) {
  openUserModal(userId);
}

/* =========================================================
   STUDENT: DASHBOARD
========================================================= */
function studentSubjects() {
  return Object.values(allSubjects());
}
function moduleProgressPct(subject) {
  const ud = userData();
  const mods = subject.moduleIds || [];
  if (!mods.length) return 0;
  // Each module contributes its own fraction: 1.0 if completed, or currentPage/totalPages if in-progress.
  const total = mods.reduce((sum, id) => {
    const p = ud.progress[id];
    if (!p) return sum;
    if (p.completed) return sum + 1;
    const mod = allModules()[id];
    const totalPages = mod ? Math.max(1, mod.pages.length - 1) : 1;
    return sum + Math.min((p.currentPage || 0) / totalPages, 0.99); // cap at 0.99 so only marking complete gives 100%
  }, 0);
  return Math.round((total / mods.length) * 100);
}

function overallStudentStats() {
  const ud = userData();
  const subjects = studentSubjects();
  let totalModules = 0, doneModules = 0;
  subjects.forEach(s => {
    const mods = s.moduleIds || [];
    totalModules += mods.length;
    doneModules += mods.filter(id => ud.progress[id]?.completed).length;
  });
  const results = Object.values(ud.quizResults);
  const avg = results.length ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length) : 0;
  const overallProgress = totalModules ? Math.round((doneModules / totalModules) * 100) : 0;
  return { totalSubjects: subjects.length, doneModules, totalModules, avg, overallProgress };
}

function renderStudentDashboard() {
  const user = currentUser();
  const ud = userData();
  const stats = overallStudentStats();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // continue learning: most recently read, not-completed module
  const inProgress = Object.entries(ud.progress).filter(([id, p]) => !p.completed).sort((a, b) => b[1].lastRead - a[1].lastRead)[0];
  const firstSub = studentSubjects()[0];
  const firstModId = firstSub && firstSub.moduleIds && firstSub.moduleIds[0];
  const contMod = inProgress ? allModules()[inProgress[0]] : (firstModId ? allModules()[firstModId] : null);
  const contSub = contMod ? allSubjects()[contMod.subjectId] : firstSub;
  const contPage = inProgress ? inProgress[1].currentPage : 0;
  const contPct = contMod ? Math.round((contPage / Math.max(1, contMod.pages.length - 1)) * 100) : 0;

  const upcoming = SEED.assignments.filter(a => a.status === "pending" && (user.subjects || []).includes(a.subjectId)).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 3);
  const recent = recentActivity();

  return `
    <div class="welcome-banner">
      <div>
        <h1>${greeting}, ${user.firstName}!</h1>
        <p>You're ${stats.overallProgress}% through this quarter's modules. Keep the streak going.</p>
      </div>
      ${contMod ? `<button class="btn btn-primary" data-action="open-module" data-id="${contMod.id}">Continue Reading</button>` : ''}
    </div>

    <div class="stat-grid">
      <div class="stat-tile"><div class="stat-label">Subjects</div><div class="stat-value">${stats.totalSubjects}</div><div class="stat-sub">Active in curriculum</div></div>
      <div class="stat-tile"><div class="stat-label">Modules Completed</div><div class="stat-value">${stats.doneModules}/${stats.totalModules}</div><div class="stat-sub">Across all subjects</div></div>
      <div class="stat-tile"><div class="stat-label">Quiz Average</div><div class="stat-value">${stats.avg}%</div><div class="stat-sub">${Object.keys(ud.quizResults).length} quizzes taken</div></div>
      <div class="stat-tile"><div class="stat-label">Overall Progress</div><div class="stat-value">${stats.overallProgress}%</div><div class="stat-sub">Modules completed</div></div>
    </div>

    ${contMod && contSub ? `
    <div class="section-heading"><h2>Continue Learning</h2></div>
    <div class="card continue-card">
      <div class="continue-thumb ${contSub.coverImage ? 'with-cover-img' : ''}" style="${contSub.coverImage ? `background-image:url('${contSub.coverImage}')` : `background:linear-gradient(155deg, ${contSub.color[0]}, ${contSub.color[1]})`}" data-initial="${contSub.initial}"></div>
      <div class="continue-info">
        <p class="eyebrow">${contSub.name}</p>
        <h3>${contMod.title}</h3>
        <p class="continue-meta">Page ${contPage + 1} of ${contMod.pages.length}</p>
        <div class="continue-progress">
          <div class="progress-track"><div class="progress-fill" style="width:${contPct}%"></div></div>
          <span>${contPct}%</span>
        </div>
      </div>
      <button class="btn btn-primary" data-action="open-module" data-id="${contMod.id}">Continue Reading</button>
    </div>` : ''}

    <div class="section-heading"><h2>My Subjects</h2><a href="#/subjects" class="link-more">View all →</a></div>
    <div class="subject-grid">
      ${studentSubjects().map(subjectCardHTML).join("")}
    </div>

    <div class="section-heading"><h2>Announcements</h2><a href="#/announcements" class="link-more">View all →</a></div>
    <div class="announcement-preview-list">
      ${announcementsForStudent().slice(0, 3).map(a => `
        <div class="card announcement-preview-card">
          <span class="ann-type-badge ann-type-${a.type}">${a.type === 'material' ? '📚 New Material' : a.type === 'deadline' ? '⏰ Deadline' : '📝 Quiz'}</span>
          ${a.pinned ? '<span class="ann-pinned-badge">📌 Pinned</span>' : ''}
          <div class="ann-preview-body">
            <strong>${a.title}</strong>
            <p>${a.body.substring(0, 110)}${a.body.length > 110 ? '…' : ''}</p>
          </div>
          <div class="ann-preview-meta">
            <span>${a.author}</span>
            <span>${timeAgo(a.date)}</span>
          </div>
        </div>`).join("")}
    </div>

    <div class="two-col">
      <div>
        <div class="section-heading"><h2>Upcoming</h2><a href="#/assignments" class="link-more">View all →</a></div>
        <div class="card list-card">
          ${upcoming.length ? upcoming.map(a => {
    const sub = allSubjects()[a.subjectId];
    return `
            <div class="list-row">
              <span class="list-row-icon" style="background:var(--amber-soft);color:var(--amber);">${svgIcon("clock")}</span>
              <div class="list-row-body"><p>${a.title}</p><span>${sub ? sub.name : a.subjectId} · Due ${formatDate(a.due)}</span></div>
              <span class="pill pill-warning">${a.points} pts</span>
            </div>`;
  }).join("") : `<div class="empty-state" style="padding:30px 16px;"><p>Nothing due soon. 🎉</p></div>`}
        </div>
      </div>
      <div>
        <div class="section-heading"><h2>Recent Activity</h2></div>
        <div class="card list-card">
          ${recent.length ? recent.map(r => `
            <div class="list-row">
              <span class="list-row-icon" style="background:${r.bg};color:${r.fg};">${svgIcon(r.icon)}</span>
              <div class="list-row-body"><p>${r.text}</p><span>${timeAgo(r.time)}</span></div>
            </div>`).join("") : `<div class="empty-state" style="padding:30px 16px;"><p>No activity yet — start a module!</p></div>`}
        </div>
      </div>
    </div>
  `;
}

function recentActivity() {
  const ud = userData();
  const items = [];
  Object.entries(ud.progress).forEach(([id, p]) => {
    const m = allModules()[id];
    if (p.completed && m) items.push({ time: p.lastRead, icon: "check", bg: "var(--accent-soft)", fg: "var(--accent)", text: `Completed module: ${m.title}` });
  });
  Object.entries(ud.quizResults).forEach(([id, r]) => {
    const q = allQuizzes()[id];
    if (q) items.push({ time: r.date, icon: "quiz", bg: "var(--primary-soft)", fg: "var(--primary)", text: `Took ${q.title} — scored ${r.percentage}%` });
  });
  Object.entries(ud.downloads).forEach(([id, d]) => {
    const m = allModules()[id];
    if (m) items.push({ time: d.date, icon: "download", bg: "var(--amber-soft)", fg: "var(--amber)", text: `Downloaded module: ${m.title}` });
  });
  return items.sort((a, b) => b.time - a.time).slice(0, 5);
}

function subjectCardHTML(subject) {
  if (!subject) return "";
  const pct = moduleProgressPct(subject);
  const mods = subject.moduleIds || [];
  const hasCover = !!subject.coverImage;
  const coverBg = hasCover ? `background-image:url('${subject.coverImage}')` : `background:linear-gradient(155deg, ${subject.color ? subject.color[0] : '#4338CA'}, ${subject.color ? subject.color[1] : '#7C3AED'})`;
  return `
    <div class="card subject-card">
      <div class="subject-cover ${hasCover ? 'with-cover-img' : ''}" style="${coverBg}">${hasCover ? '' : (subject.initial || 'ED')}</div>
      <div class="subject-card-body">
        <div class="subject-card-top">
          <div><h4>${subject.name}</h4><p class="subject-teacher">${subject.teacher}</p></div>
        </div>
        <div class="subject-meta-row">
          <span>${svgIcon("book")} ${mods.length} modules</span>
        </div>
        <div class="subject-card-progress">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
        <div style="margin-top:14px;"><button class="btn btn-secondary btn-sm btn-block" data-action="open-subject" data-id="${subject.id}">Continue</button></div>
      </div>
    </div>`;
}

function renderSubjectsList() {
  return `
    <div class="section-heading"><h2>My Subjects</h2></div>
    <div class="subject-grid">${studentSubjects().map(subjectCardHTML).join("")}</div>
  `;
}

function renderAllModules() {
  const ud = userData();
  const rows = studentSubjects().flatMap(s => (s.moduleIds || []).map(mid => ({ mod: allModules()[mid], subject: s })).filter(r => r.mod));
  return `
    <div class="section-heading"><h2>Modules</h2></div>
    <div class="module-list">
      ${rows.map(({ mod, subject }) => moduleCardHTML(mod, subject, ud)).join("")}
    </div>
  `;
}

/* =========================================================
   STUDENT: SUBJECT DETAIL
========================================================= */
function renderSubjectDetail(subjectId) {
  const subject = allSubjects()[subjectId];
  if (!subject) return `<div class="empty-state"><h3>Subject not found</h3><p><a href="#/subjects">Back to Subjects</a></p></div>`;
  const ud = userData();
  const pct = moduleProgressPct(subject);
  const mods = (subject.moduleIds || []).map(id => allModules()[id]).filter(Boolean);
  const heroStyle = subject.coverImage
    ? `background: linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%), url('${subject.coverImage}') center/cover no-repeat;`
    : `background:linear-gradient(120deg, ${subject.color[0]}, ${subject.color[1]})`;

  return `
    <div class="subject-hero" style="${heroStyle}">
      <div class="subject-hero-top">${svgIcon("book")} <span>${subject.teacher}</span></div>
      <h1>${subject.name}</h1>
      <p class="desc">${subject.description}</p>
      <div class="objectives-row">${(subject.objectives || []).map(o => `<span class="objective-chip">${o}</span>`).join("")}</div>
      <div class="subject-hero-progress">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span style="font-weight:700;">${pct}%</span>
      </div>
    </div>

    <div class="section-heading"><h2>Modules (${mods.length})</h2></div>
    <div class="module-list">
      ${mods.length ? mods.map(m => moduleCardHTML(m, subject, ud)).join("") : '<div class="empty-state"><p>No modules uploaded for this subject yet.</p></div>'}
    </div>
  `;
}

function moduleStatus(mod, ud) {
  const p = ud.progress[mod.id];
  if (p && p.completed) return "completed";
  if (p && p.currentPage > 0) return "in-progress";
  return "not-started";
}
function moduleStepsHTML(mod, ud) {
  if (!mod.steps || !mod.steps.length) return "";
  const progress = ud.progress[mod.id] || { currentPage: 0, completed: false };
  const totalSteps = mod.steps.length;
  const currentStepIdx = progress.completed ? totalSteps : Math.min(totalSteps - 1, Math.floor((progress.currentPage / Math.max(1, mod.pages.length - 1)) * totalSteps));

  return `
    <div class="module-steps-wrap">
      <div class="module-steps-label">
        <span>Lesson Checklist</span>
        <span>${progress.completed ? totalSteps : currentStepIdx}/${totalSteps} Steps</span>
      </div>
      <div class="module-steps-list">
        ${mod.steps.map((step, idx) => {
    const isDone = progress.completed || idx < currentStepIdx;
    const isCurrent = !progress.completed && idx === currentStepIdx;
    return `
            <div class="step-chip ${isDone ? 'done' : isCurrent ? 'current' : ''}">
              <span class="step-icon">${isDone ? '✓' : (idx + 1)}</span>
              <span class="step-text">${step}</span>
            </div>
          `;
  }).join("")}
      </div>
    </div>
  `;
}

function moduleCardHTML(mod, subject, ud) {
  const user = currentUser();
  const isTeacherOrAdmin = user && (user.role === "teacher" || user.role === "admin");
  const isCustom = !!(DB.customModules && DB.customModules[mod.id]);
  const status = moduleStatus(mod, ud);
  const isDownloaded = !!ud.downloads[mod.id];
  const statusPill = status === "completed" ? `<span class="pill pill-success">${svgIcon("check")} Completed</span>`
    : status === "in-progress" ? `<span class="pill pill-progress">In Progress</span>`
      : `<span class="pill pill-muted">Not Started</span>`;
  return `
    <div class="card module-card">
      <div class="module-num">${String(mod.number).padStart(2, "0")}</div>
      <div class="module-card-body">
        <h4>${mod.title}</h4>
        <p>${mod.description}</p>
        <div class="module-meta">
          <span>${svgIcon("clock")} ${mod.readingMins} min read</span>
          <span>${svgIcon("page")} ${mod.pages.length} pages</span>
          <span>${subject.name}</span>
          ${isDownloaded ? `<span>${svgIcon("download")} Downloaded</span>` : ""}
        </div>
        ${moduleStepsHTML(mod, ud)}
      </div>
      <div class="module-actions">
        ${statusPill}
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-action="download-module" data-id="${mod.id}" ${isDownloaded ? "disabled" : ""}>${isDownloaded ? "Downloaded" : "Download"}</button>
          <button class="btn btn-primary btn-sm" data-action="open-module" data-id="${mod.id}">${status === "not-started" ? "Open Module" : "Continue"}</button>
          ${isTeacherOrAdmin ? `<button class="btn btn-outline btn-sm" data-action="open-modal-module" data-id="${mod.id}">Edit</button>` : ''}
          ${isTeacherOrAdmin && isCustom ? `<button class="btn btn-danger btn-sm" data-action="delete-module" data-id="${mod.id}" onclick="return confirm('Delete module \"${mod.title}\" and its quiz?')">Delete</button>` : ''}
        </div>
      </div>
    </div>`;
}

function downloadModule(moduleId, btnEl) {
  const ud = userData();
  if (ud.downloads[moduleId]) return;
  ud.downloads[moduleId] = { date: Date.now() };
  persist();
  toast("Module downloaded for offline use.", "success");
  if (btnEl) { btnEl.textContent = "Downloaded"; btnEl.disabled = true; }
  route();
}
function removeDownload(moduleId) {
  const ud = userData();
  delete ud.downloads[moduleId];
  persist();
  toast("Removed from downloads.", "info");
  route();
}

/* =========================================================
   BOOKLET MODULE READER
========================================================= */
function renderModuleReader(moduleId) {
  const mod = allModules()[moduleId];
  if (!mod) {
    document.getElementById("view").innerHTML = `<div class="empty-state"><h3>Module not found</h3><p><a href="#/modules">Back to Modules</a></p></div>`;
    return;
  }
  const subject = allSubjects()[mod.subjectId] || { name: "Subject", color: ["#A31832", "#E0293F"] };
  const ud = userData();
  const isOffline = ud.settings.simulateOffline || !navigator.onLine;
  const isDownloaded = !!ud.downloads[moduleId];

  if (isOffline && !isDownloaded) {
    const offlineMsg = !navigator.onLine
      ? "You're offline. Download this module first while connected, or reconnect to access it."
      : "You're in simulated offline mode. Download this module first, or turn off Simulate Offline in Settings.";
    document.getElementById("view").innerHTML = `
      <div class="empty-state">
        ${svgIcon("download")}
        <h3>This module isn't available offline</h3>
        <p>${offlineMsg}</p>
        <div style="margin-top:16px; display:flex; gap:10px; justify-content:center;">
          <a href="#/subject/${mod.subjectId}" class="btn btn-outline">Back to Subject</a>
          <a href="#/settings" class="btn btn-primary">Go to Settings</a>
        </div>
      </div>`;
    return;
  }

  const saved = ud.progress[moduleId] || { currentPage: 0, completed: false, bookmarks: [], lastRead: Date.now() };
  readerState = { moduleId, page: Math.min(saved.currentPage || 0, mod.pages.length - 1), tocOpen: false };

  const view = document.getElementById("view");
  view.innerHTML = readerShellHTML(mod, subject);
  paintReaderPage(false);
}

function readerShellHTML(mod, subject) {
  return `
    <div class="reader-shell">
      <div class="reader-topbar">
        <button class="ghost-icon-btn" data-action="reader-back" aria-label="Back">
          <svg viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="reader-title">
          <p>${subject.name}</p>
          <h3>${mod.title}</h3>
        </div>
        <div class="reader-actions">
          <button class="status-pill ${(readerState && (userData().settings.simulateOffline || !navigator.onLine)) ? 'offline' : 'online'}" style="pointer-events:none;"><span class="dot"></span>${(userData().settings.simulateOffline || !navigator.onLine) ? "Offline" : "Online"}</button>
          <button class="ghost-icon-btn" id="reader-bookmark-btn" data-action="reader-bookmark" aria-label="Bookmark page">
            <svg viewBox="0 0 24 24"><path d="M19 21l-7-4-7 4V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button class="ghost-icon-btn" data-action="reader-download" aria-label="Download"><svg viewBox="0 0 24 24"><path d="M12 3v13m0 0l-4-4m4 4l4-4"/><path d="M4 19h16"/></svg></button>
          <button class="ghost-icon-btn" data-action="reader-toc-toggle" aria-label="Table of contents"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></button>
        </div>
      </div>

      <div class="reader-body">
        <div class="book-wrap">
          <div class="book-ribbon" id="book-ribbon"></div>
          <div class="book" id="book-el"></div>
        </div>
      </div>

      <div class="reader-bottom">
        <div class="reader-nav-btns">
          <button class="btn btn-outline btn-sm" data-action="reader-prev" id="prev-btn"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
        </div>
        <div class="reader-progress-track"><div class="progress-track"><div class="progress-fill" id="reader-progress-fill"></div></div></div>
        <span class="reader-page-label" id="reader-page-label"></span>
        <button class="btn btn-primary btn-sm" data-action="reader-mark-complete" id="mark-complete-btn" style="margin-left:12px;">✓ Mark Complete</button>
        <div class="reader-nav-btns">
          <button class="btn btn-outline btn-sm" data-action="reader-next" id="next-btn"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
        </div>
      </div>

      <div class="toc-drawer" id="toc-drawer">
        <div class="toc-drawer-header">Table of Contents</div>
        <div id="toc-list"></div>
      </div>
    </div>
  `;
}

function pageLabel(p) {
  const titles = { cover: "Cover", objectives: "Learning Objectives", lesson: p.heading, activity: "Activity", summary: "Summary", "quiz-page": "Quiz" };
  return p.heading || titles[p.type] || p.type;
}

function paintReaderPage(animateDir) {
  const mod = allModules()[readerState.moduleId];
  if (!mod) return;
  const p = mod.pages[readerState.page];
  const bookEl = document.getElementById("book-el");
  if (!bookEl || !p) return;
  const ud = userData();
  const saved = ud.progress[readerState.moduleId] || { bookmarks: [] };
  const isBookmarked = (saved.bookmarks || []).includes(readerState.page);
  const sub = allSubjects()[mod.subjectId] || { color: ["#A31832", "#E0293F"] };

  const hasCoverImg = p.type === 'cover' && (p.coverImage || mod.coverImage);
  const coverBg = hasCoverImg ? '#0f172a' : (p.type === 'cover' ? `linear-gradient(155deg, ${sub.color[0]}, ${sub.color[1]})` : 'var(--surface)');

  const html = `<div class="book-page ${p.type === 'cover' ? 'cover-page' : ''} ${hasCoverImg ? 'with-cover-img' : ''}" id="active-page" style="background:${coverBg}">
    ${pageInnerHTML(p, mod)}
    ${p.type !== 'cover' ? `<span class="page-num-badge">Page ${readerState.page + 1} of ${mod.pages.length}</span>` : ""}
  </div>`;

  bookEl.innerHTML = html;
  if (animateDir) {
    const el = document.getElementById("active-page");
    el.style.transform = animateDir > 0 ? "rotateY(70deg)" : "rotateY(-70deg)";
    el.style.opacity = "0";
    requestAnimationFrame(() => {
      el.style.transition = "transform .38s ease, opacity .38s ease";
      el.style.transform = "rotateY(0deg)";
      el.style.opacity = "1";
    });
  }

  document.getElementById("reader-page-label").textContent = `Page ${readerState.page + 1} of ${mod.pages.length}`;
  document.getElementById("reader-progress-fill").style.width = `${Math.round((readerState.page / (mod.pages.length - 1)) * 100)}%`;
  document.getElementById("prev-btn").disabled = readerState.page === 0;
  document.getElementById("next-btn").disabled = readerState.page === mod.pages.length - 1;
  document.getElementById("reader-bookmark-btn").classList.toggle("active", isBookmarked);

  const markCompleteBtn = document.getElementById("mark-complete-btn");
  const isLastPage = readerState.page === mod.pages.length - 1;
  if (markCompleteBtn) {
    markCompleteBtn.style.display = isLastPage ? "inline-flex" : "none";
    if (isLastPage && !saved.completed) {
      markCompleteBtn.textContent = "✓ Mark Complete";
      markCompleteBtn.classList.remove("btn-secondary");
      markCompleteBtn.classList.add("btn-primary");
      markCompleteBtn.disabled = false;
    } else if (isLastPage && saved.completed) {
      markCompleteBtn.textContent = "✓ Completed";
      markCompleteBtn.classList.remove("btn-primary");
      markCompleteBtn.classList.add("btn-secondary");
      markCompleteBtn.disabled = true;
    }
  }

  buildToc(mod);
  saveReaderProgress();
  wireSwipe();
}

function pageInnerHTML(p, mod) {
  const instructionsHTML = p.instructions && p.instructions.length
    ? `<div class="page-instructions">
        <div class="page-instructions-title">${svgIcon("quiz")} Instructions</div>
        <ol>${p.instructions.map(s => `<li>${s}</li>`).join("")}</ol>
       </div>` : "";

  if (p.type === "cover") {
    const coverImg = p.coverImage || mod.coverImage;
    if (coverImg) {
      return `
        <div class="reader-cover-img-wrap">
          <img src="${coverImg}" alt="${p.title}" class="reader-cover-full-img">
          <div class="reader-cover-img-overlay">
            <span>${mod.pages.length} pages · ${mod.readingMins} min read · Tap → to begin</span>
          </div>
        </div>
      `;
    }
    return `<div class="cover-icon">${svgIcon("book")}</div><h1>${p.title}</h1><p>${p.sub}</p>
      <div class="cover-meta"><span>${mod.pages.length} pages · ${mod.readingMins} min read</span><span>Tap → or swipe to begin</span></div>`;
  }
  if (p.type === "objectives") {
    return `<div class="page-eyebrow">Before you begin</div><div class="page-content"><h2>${p.heading}</h2><ul>${p.items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
  }
  if (p.type === "lesson") {
    return `<div class="page-eyebrow">Lesson</div><div class="page-content"><h2>${p.heading}</h2>
      ${p.body.map(b => `<p>${b}</p>`).join("")}
      ${p.figure ? `<div class="page-figure">${svgIcon("book")}<span>${p.figure}</span></div>` : ""}
      ${p.note ? `<div class="page-note"><strong>Note:</strong> ${p.note}</div>` : ""}
      ${p.example ? `<div class="page-example"><strong>Example:</strong><br>${p.example.replace(/\n/g, "<br>")}</div>` : ""}
    </div>`;
  }
  if (p.type === "activity") {
    return `<div class="page-eyebrow">Activity</div><div class="page-content"><h2>${p.heading}</h2>
      ${instructionsHTML}
      ${p.body.map(b => `<p>${b}</p>`).join("")}
    </div>`;
  }
  if (p.type === "summary") {
    return `<div class="page-eyebrow">Summary</div><div class="page-content"><h2>${p.heading}</h2><ul>${p.items.map(i => `<li>${i}</li>`).join("")}</ul></div>`;
  }
  if (p.type === "quiz-page") {
    return `<div class="page-eyebrow">Assessment</div><div class="page-content"><h2>${p.heading}</h2>
      ${instructionsHTML}
      ${p.body.map(b => `<p>${b}</p>`).join("")}
      <button class="btn btn-primary" data-action="reader-start-quiz" style="margin-top:14px;">Take Quiz →</button>
      <div style="margin-top:14px;"><button class="btn btn-outline btn-sm" data-action="reader-mark-complete">Mark Module as Complete</button></div>
    </div>`;
  }
  /* ---- Feature 4: New material types ---- */
  if (p.type === "presentation") {
    const slideCount = p.slides.length;
    return `<div class="page-eyebrow">${svgIcon("slides")} Presentation</div>
      <div class="page-content">
        <h2>${p.heading}</h2>
        <div class="presentation-wrap" id="pres-wrap">
          <div class="presentation-slides" id="pres-slides">
            ${p.slides.map((s, i) => `<div class="pres-slide ${i === 0 ? 'active' : ''}" data-slide="${i}"><div class="pres-slide-num">Slide ${i + 1} of ${slideCount}</div><p>${s}</p></div>`).join("")}
          </div>
          <div class="pres-nav">
            <button class="btn btn-outline btn-sm" onclick="presNav(-1)">← Prev</button>
            <span class="pres-counter" id="pres-counter">1 / ${slideCount}</span>
            <button class="btn btn-outline btn-sm" onclick="presNav(1)">Next →</button>
          </div>
        </div>
      </div>`;
  }
  if (p.type === "video") {
    const hasRealVideo = p.videoUrl && (p.videoUrl.startsWith("data:video") || p.videoUrl.endsWith(".mp4") || p.videoUrl.includes("blob:"));
    const isYouTube = p.videoUrl && (p.videoUrl.includes("youtube.com") || p.videoUrl.includes("youtu.be"));
    let playerHTML = "";

    if (hasRealVideo) {
      playerHTML = `<video src="${p.videoUrl}" controls class="real-video-player" style="width:100%; border-radius:12px; margin-top:12px; max-height:240px; background:#000;"></video>`;
    } else if (isYouTube) {
      const ytId = extractYouTubeId(p.videoUrl);
      if (ytId) {
        playerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%; aspect-ratio:16/9; border-radius:12px; margin-top:12px;" onerror="this.onerror=null;this.outerHTML='<div class=\\'video-player-placeholder\\' style=\\'border:2px solid var(--danger);\\'><div class=\\'video-play-btn\\' style=\\'background:var(--danger);\\'>${svgIcon('play')}</div><div class=\\'video-label\\'>Cannot Embed This Video</div><div class=\\'video-note\\'>The video owner has disabled embedding. <a href=\\'https://www.youtube.com/watch?v=${ytId}\\' target=\\'_blank\\' style=\\'color:var(--primary);\\'>Watch on YouTube →</a></div></div>';"></iframe>`;
      } else {
        playerHTML = `
          <div class="video-player-placeholder" style="border:2px solid var(--danger);">
            <div class="video-play-btn" style="background:var(--danger);">${svgIcon("play")}</div>
            <div class="video-label">Invalid YouTube URL</div>
            <div class="video-note">Could not extract video ID from: ${p.videoUrl}</div>
          </div>
        `;
      }
    } else {
      playerHTML = `
        <div class="video-player-placeholder">
          <div class="video-play-btn">${svgIcon("play")}</div>
          <div class="video-label">${p.heading}</div>
          <div class="video-note">${p.videoUrl ? `File / Source: ${p.videoUrl.substring(0, 35)}...` : 'Video Attached'}</div>
        </div>
      `;
    }

    return `<div class="page-eyebrow">${svgIcon("play")} Video Lesson</div>
      <div class="page-content">
        <h2>${p.heading}</h2>
        ${playerHTML}
        ${p.description ? `<p class="video-description">${p.description}</p>` : ""}
      </div>`;
  }
  if (p.type === "image-gallery") {
    return `<div class="page-eyebrow">${svgIcon("image")} Gallery & Visual Aids</div>
      <div class="page-content">
        <h2>${p.heading}</h2>
        <div class="image-gallery-grid">
          ${p.images.map(img => `
            <div class="gallery-img-card">
              ${img.src ? `<img src="${img.src}" class="gallery-real-img" alt="${img.caption}" style="max-height:120px; width:100%; object-fit:contain; border-radius:8px;">` : `<div class="gallery-img-emoji">${img.emoji || '🖼️'}</div>`}
              <div class="gallery-img-caption">${img.caption}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }
  if (p.type === "pdf") {
    const pdfUrl = p.pdfUrl || "";
    const isDataUrl = pdfUrl.startsWith("data:");
    const viewerId = `pdf-viewer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return `<div class="page-eyebrow">📄 PDF Document</div>
      <div class="page-content">
        <h2>${p.heading}</h2>
        <div class="pdf-document-card">
          <div class="pdf-icon-wrap">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M10 12h4M10 16h4"/></svg>
          </div>
          <div class="pdf-card-info">
            <h4>${p.heading}</h4>
            <p>${p.description || "Official course reading material and document."}</p>
            <span class="pill pill-muted">${p.pageCount || '5'} Pages · PDF Document</span>
          </div>
          <div class="pdf-card-actions">
            ${pdfUrl ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="togglePdfViewer('${viewerId}', '${pdfUrl.replace(/'/g, "\\'")}')">
                ${isDataUrl ? '📄 View PDF Inline' : '📄 Open PDF ↗'}
              </button>
            ` : `<button type="button" class="btn btn-outline btn-sm" onclick="toast('No PDF file attached.', 'info')">Open PDF ↗</button>`}
          </div>
        </div>
        <div id="${viewerId}" class="pdf-inline-viewer" style="display:none; margin-top:16px;">
          <div class="pdf-viewer-header">
            <span>${p.heading}</span>
            <button type="button" class="ghost-icon-btn btn-sm" onclick="togglePdfViewer('${viewerId}')" aria-label="Close PDF">✕</button>
          </div>
          <div class="pdf-viewer-frame">
            ${pdfUrl ? `<iframe src="${pdfUrl}" title="${p.heading}" style="width:100%; height:500px; border:none; border-radius:8px;"></iframe>` : ''}
          </div>
        </div>
        ${p.body && p.body.length ? `<div class="pdf-preview-text"><strong>Document Overview:</strong><p>${p.body.join("</p><p>")}</p></div>` : ""}
      </div>`;
  }
  return "";
}

/* Presentation slide navigation (called inline from onclick) */
let presCurrentSlide = 0;
function presNav(dir) {
  const slides = document.querySelectorAll(".pres-slide");
  if (!slides.length) return;
  slides[presCurrentSlide].classList.remove("active");
  presCurrentSlide = Math.max(0, Math.min(slides.length - 1, presCurrentSlide + dir));
  slides[presCurrentSlide].classList.add("active");
  const counter = document.getElementById("pres-counter");
  if (counter) counter.textContent = `${presCurrentSlide + 1} / ${slides.length}`;
}

function buildToc(mod) {
  const list = document.getElementById("toc-list");
  if (!list) return;
  list.innerHTML = mod.pages.map((p, i) => `
    <div class="toc-item ${i === readerState.page ? 'current' : ''}" data-action="reader-jump" data-page="${i}">
      <span class="toc-num">${String(i + 1).padStart(2, "0")}</span><span>${pageLabel(p)}</span>
    </div>`).join("");
}

function toggleToc(force) {
  const drawer = document.getElementById("toc-drawer");
  if (!drawer) return;
  readerState.tocOpen = force !== undefined ? force : !readerState.tocOpen;
  drawer.classList.toggle("open", readerState.tocOpen);
}

function togglePdfViewer(viewerId, pdfUrl) {
  const viewer = document.getElementById(viewerId);
  if (!viewer) return;
  const isOpen = viewer.style.display !== "none";
  viewer.style.display = isOpen ? "none" : "block";
  if (!isOpen && pdfUrl && !viewer.dataset.loaded) {
    const frame = viewer.querySelector(".pdf-viewer-frame");
    if (frame && !frame.innerHTML.trim()) {
      frame.innerHTML = `<iframe src="${pdfUrl}" title="PDF Document" style="width:100%; height:500px; border:none; border-radius:8px;"></iframe>`;
    }
    viewer.dataset.loaded = "true";
  }
}

function turnPage(dir) {
  const mod = allModules()[readerState.moduleId];
  if (!mod) return;
  const next = readerState.page + dir;
  if (next < 0 || next > mod.pages.length - 1) return;
  const el = document.getElementById("active-page");
  if (el) {
    el.classList.add(dir > 0 ? "turning-next" : "turning-prev");
    setTimeout(() => {
      readerState.page = next;
      paintReaderPage(dir);
    }, 260);
  } else {
    readerState.page = next;
    paintReaderPage(dir);
  }
}
function jumpToPage(p) {
  readerState.page = p;
  paintReaderPage(false);
}

function saveReaderProgress() {
  const ud = userData();
  const existing = ud.progress[readerState.moduleId] || { bookmarks: [], completed: false };
  ud.progress[readerState.moduleId] = { ...existing, currentPage: readerState.page, lastRead: Date.now() };
  persist();
}

function toggleReaderBookmark() {
  const ud = userData();
  const existing = ud.progress[readerState.moduleId] || { currentPage: 0, bookmarks: [], completed: false };
  existing.bookmarks = existing.bookmarks || [];
  const idx = existing.bookmarks.indexOf(readerState.page);
  if (idx >= 0) { existing.bookmarks.splice(idx, 1); toast("Bookmark removed.", "info"); }
  else { existing.bookmarks.push(readerState.page); toast("Page bookmarked.", "success"); }
  ud.progress[readerState.moduleId] = existing;
  persist();
  document.getElementById("reader-bookmark-btn").classList.toggle("active", idx < 0);
}

function toggleBookmarkFromList(moduleId) {
  const ud = userData();
  const existing = ud.progress[moduleId] || { currentPage: 0, bookmarks: [], completed: false };
  existing.bookmarks = existing.bookmarks || [];
  if (!existing.bookmarks.includes(0)) {
    existing.bookmarks.push(0);
    toast("Module bookmarked.", "success");
  } else {
    const idx = existing.bookmarks.indexOf(0);
    existing.bookmarks.splice(idx, 1);
    toast("Bookmark removed.", "info");
  }
  ud.progress[moduleId] = existing;
  persist();
  route();
}

function markModuleComplete(moduleId) {
  const ud = userData();
  const existing = ud.progress[moduleId] || { currentPage: 0, bookmarks: [] };
  existing.completed = true;
  existing.lastRead = Date.now();
  ud.progress[moduleId] = existing;
  if (!ud.completedModules.includes(moduleId)) ud.completedModules.push(moduleId);
  persist();
  toast("Module marked as complete!", "success");
}

/* Swipe support */
function wireSwipe() {
  const book = document.getElementById("book-el");
  if (!book || book.dataset.swipeWired) return;
  book.dataset.swipeWired = "1";
  let startX = null;
  book.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  book.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) turnPage(dx < 0 ? 1 : -1);
    startX = null;
  }, { passive: true });
}

/* =========================================================
   QUIZZES
========================================================= */
function renderQuizzesList() {
  const ud = userData();
  const quizIds = studentSubjects().flatMap(s => (s.moduleIds || []).map(mid => (allModules()[mid] || {}).quizId).filter(Boolean));
  return `
    <div class="section-heading"><h2>Quizzes</h2></div>
    <div class="module-list">
      ${quizIds.map(qid => {
    const quiz = allQuizzes()[qid];
    if (!quiz) return "";
    const mod = allModules()[quiz.moduleId];
    const subject = allSubjects()[quiz.subjectId] || { name: "Subject" };
    const result = ud.quizResults[qid];
    return `
        <div class="card module-card">
          <div class="module-num">${svgIcon("quiz")}</div>
          <div class="module-card-body">
            <h4>${quiz.title}</h4>
            <p>${subject.name} · ${quiz.questions.length} items</p>
          </div>
          <div class="module-actions">
            ${result ? `<span class="pill ${result.passed ? 'pill-success' : 'pill-danger'}">${result.percentage}% · ${result.passed ? 'Passed' : 'Failed'}</span>` : `<span class="pill pill-muted">Not attempted</span>`}
            <button class="btn ${result ? 'btn-outline' : 'btn-primary'} btn-sm" data-action="open-quiz" data-id="${qid}">${result ? 'Retry' : 'Start Quiz'}</button>
          </div>
        </div>`;
  }).filter(Boolean).join("")}
    </div>
  `;
}

function renderQuizAttempt(quizId) {
  const quiz = allQuizzes()[quizId];
  if (!quiz) return `<div class="empty-state"><h3>Quiz not found</h3><p><a href="#/quizzes">Back to Quizzes</a></p></div>`;
  quizState = { quizId, index: 0, answers: new Array(quiz.questions.length).fill(null), submitted: false };
  return quizQuestionHTML();
}

function quizQuestionHTML() {
  const quiz = allQuizzes()[quizState.quizId];
  if (!quiz) return "";
  const q = quiz.questions[quizState.index];
  const letters = ["A", "B", "C", "D"];
  const selected = quizState.answers[quizState.index];

  let optionsHTML = "";
  if (q.type === "short") {
    optionsHTML = `
      <div class="quiz-short-answer-wrap">
        <label for="quiz-short-input" class="quiz-short-label">Type your written answer below:</label>
        <textarea id="quiz-short-input" class="quiz-short-textarea" placeholder="Write your explanation or answer here..." rows="4">${selected || ""}</textarea>
        <p class="quiz-short-hint">💡 Short answer questions will be submitted directly to your teacher for review.</p>
      </div>
    `;
  } else {
    optionsHTML = `
      <div class="quiz-options">
        ${q.choices.map((c, i) => `
          <button class="quiz-option ${selected === i ? 'selected' : ''}" data-action="quiz-select" data-idx="${i}">
            <span class="quiz-option-letter">${q.type === 'tf' ? (i === 0 ? 'T' : 'F') : letters[i]}</span>${c}
          </button>`).join("")}
      </div>
    `;
  }

  const isAnswered = q.type === "short" ? (selected && String(selected).trim().length > 0) : (selected !== null && selected !== undefined);

  return `
    <div class="quiz-shell">
      <div class="quiz-progress-row">
        <span>Q${quizState.index + 1}/${quiz.questions.length}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round(((quizState.index + 1) / quiz.questions.length) * 100)}%"></div></div>
      </div>
      <div class="card quiz-q-card">
        <div class="quiz-q-eyebrow">${quiz.title} · ${q.type === 'short' ? 'Written / Short Answer' : q.type === 'tf' ? 'True or False' : 'Multiple Choice'}</div>
        <div class="quiz-q-text">${q.q}</div>
        ${optionsHTML}
      </div>
      <div class="quiz-nav-row">
        <button class="btn btn-outline" data-action="quiz-prev" ${quizState.index === 0 ? "disabled" : ""}>Previous</button>
        ${quizState.index === quiz.questions.length - 1
      ? `<button class="btn btn-primary" data-action="quiz-submit" ${!isAnswered ? "disabled" : ""}>Submit Quiz</button>`
      : `<button class="btn btn-primary" data-action="quiz-next" ${!isAnswered ? "disabled" : ""}>Next</button>`}
      </div>
    </div>
  `;
}

function selectQuizAnswer(idx) {
  quizState.answers[quizState.index] = idx;
  document.getElementById("view").innerHTML = `<div class="page-fade">${quizQuestionHTML()}</div>`;
}
function stepQuiz(dir) {
  const quiz = allQuizzes()[quizState.quizId];
  const next = quizState.index + dir;
  if (next < 0 || next > quiz.questions.length - 1) return;
  quizState.index = next;
  document.getElementById("view").innerHTML = `<div class="page-fade">${quizQuestionHTML()}</div>`;
}
function submitQuiz() {
  const quiz = allQuizzes()[quizState.quizId];
  let correct = 0;
  let scorableTotal = 0;
  let shortAnswerCount = 0;

  quiz.questions.forEach((q, i) => {
    if (q.type === "short") {
      shortAnswerCount++;
    } else {
      scorableTotal++;
      if (quizState.answers[i] === q.answer) correct++;
    }
  });

  const percentage = scorableTotal > 0 ? Math.round((correct / scorableTotal) * 100) : 100;
  const passed = percentage >= 60;
  const ud = userData();
  ud.quizResults[quiz.id] = {
    score: correct,
    total: scorableTotal,
    shortCount: shortAnswerCount,
    percentage,
    passed,
    date: Date.now(),
    answers: [...quizState.answers]
  };
  markModuleComplete(quiz.moduleId);
  persist();
  location.hash = `#/quiz-result/${quiz.id}`;
}

function renderQuizResult(quizId) {
  const quiz = SEED.quizzes[quizId];
  const ud = userData();
  const result = ud.quizResults[quizId];
  if (!result) { location.hash = `#/quiz/${quizId}`; return ""; }
  const circumference = 2 * Math.PI * 60;
  const dash = circumference * (result.percentage / 100);
  const color = result.passed ? "var(--accent)" : "var(--danger)";

  return `
    <div class="quiz-shell">
      <div class="card quiz-result-card">
        <div class="quiz-result-ring">
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="60" stroke="var(--border)" stroke-width="10" fill="none"/>
            <circle cx="70" cy="70" r="60" stroke="${color}" stroke-width="10" fill="none"
              stroke-dasharray="${dash} ${circumference}" stroke-linecap="round"/>
          </svg>
          <span class="pct">${result.percentage}%</span>
          <span class="of">${result.score}/${result.total} correct</span>
        </div>
        <h3>${result.passed ? "Nice work — you passed!" : "Keep practicing!"}</h3>
        <p style="color:var(--text-muted); margin-top:6px; font-size:13.5px;">${quiz.title}</p>
        <div class="quiz-result-stats">
          <div class="quiz-result-stat"><div class="n">${result.score}</div><div class="l">Auto-Graded</div></div>
          <div class="quiz-result-stat"><div class="n">${result.shortCount || 0}</div><div class="l">For Review</div></div>
          <div class="quiz-result-stat"><div class="n">${result.passed ? "Passed" : "Failed"}</div><div class="l">Status</div></div>
        </div>

        <div class="quiz-review">
          ${quiz.questions.map((q, i) => {
    if (q.type === "short") {
      const ans = result.answers[i] || "(No answer provided)";
      return `<div class="quiz-review-item short-review">
                ${svgIcon("clipboard")}
                <div style="flex:1;">
                  <strong>Q${i + 1}. (Written Question)</strong> ${q.q}<br>
                  <div class="short-answer-response"><strong>Your Answer:</strong> "${ans}"</div>
                  <span class="pill pill-warning" style="margin-top:6px; display:inline-block;">Submitted for Teacher Review</span>
                </div>
              </div>`;
    }
    const ok = result.answers[i] === q.answer;
    return `<div class="quiz-review-item ${ok ? 'ok' : 'bad'}">${svgIcon(ok ? "check" : "quiz")}
              <div><strong>Q${i + 1}.</strong> ${q.q}<br><span style="color:var(--text-muted);">Correct answer: ${q.choices[q.answer]}</span></div>
            </div>`;
  }).join("")}
        </div>

        <div style="display:flex; gap:10px; justify-content:center; margin-top:26px;">
          <a href="#/subject/${quiz.subjectId}" class="btn btn-outline">Back to Subject</a>
          <button class="btn btn-primary" data-action="retry-quiz" data-id="${quiz.id}">Retry Quiz</button>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================
   ASSIGNMENTS / GRADES / PROGRESS / BOOKMARKS / DOWNLOADS
========================================================= */
function renderAssignments() {
  const user = currentUser();
  const ud = userData();
  const items = SEED.assignments.filter(a => user.subjects.includes(a.subjectId) && SEED.subjects[a.subjectId]);
  return `
    <div class="section-heading"><h2>Assignments</h2></div>
    <div class="card table-card">
      <table>
        <thead><tr><th>Assignment</th><th>Subject</th><th>Due</th><th>Points</th><th>Status</th><th>Score</th><th></th></tr></thead>
        <tbody>
          ${items.map(a => {
    const mySub = (ud.submissions || {})[a.id];
    const scoreDisplay = mySub && mySub.score !== undefined ? `${mySub.score}/${a.points}` : a.points;
    return `
            <tr>
              <td>${a.title}</td>
              <td>${SEED.subjects[a.subjectId].name}</td>
              <td class="num">${formatDate(a.due)}</td>
              <td class="num">${scoreDisplay}</td>
              <td>${mySub ? `<span class="pill pill-success">Submitted</span>` : `<span class="pill pill-warning">Pending</span>`}</td>
              <td>${mySub && mySub.score !== undefined ? `<span class="pill pill-success">${Math.round((mySub.score / a.points) * 100)}%</span>` : `<span class="pill pill-muted">—</span>`}</td>
              <td>
                <button class="btn btn-outline btn-sm" data-action="open-modal-submit-assignment" data-id="${a.id}">${mySub ? "Resubmit" : "Submit"}</button>
                ${mySub ? `<a class="btn btn-danger btn-sm" style="margin-left:8px;" href="${mySub.fileData}" download="${mySub.fileName}">Download</a>` : ""}
              </td>
            </tr>`;
  }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderGrades() {
  const ud = userData();
  const user = currentUser();
  const quizRows = Object.entries(ud.quizResults).map(([qid, r]) => {
    const quiz = SEED.quizzes[qid];
    if (!quiz) return null;
    const subj = SEED.subjects[quiz.subjectId];
    if (!subj) return null;
    return { subject: subj.name, activity: quiz.title, score: r.score, total: r.total, pct: r.percentage, status: r.passed ? "Passed" : "Failed" };
  }).filter(Boolean);
  const assignRows = SEED.assignments.filter(a => user.subjects.includes(a.subjectId)).map(a => {
    const mySub = (ud.submissions || {})[a.id];
    if (!mySub) return null;
    const subj = SEED.subjects[a.subjectId];
    if (!subj) return null;
    const score = mySub.score !== undefined ? mySub.score : null;
    const total = a.points;
    const pct = score !== null ? Math.round((score / total) * 100) : null;
    return { subject: subj.name, activity: a.title, score, total, pct, status: score !== null ? "Graded" : "Submitted" };
  }).filter(Boolean);
  const rows = [...quizRows, ...assignRows];
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.pct || 0), 0) / rows.length) : 0;

  return `
    <div class="section-heading"><h2>Grades</h2></div>
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-tile"><div class="stat-label">Overall Average</div><div class="stat-value">${avg}%</div></div>
      <div class="stat-tile"><div class="stat-label">Activities Recorded</div><div class="stat-value">${rows.length}</div></div>
      <div class="stat-tile"><div class="stat-label">Quizzes Passed</div><div class="stat-value">${quizRows.filter(r => r.status === "Passed").length}/${quizRows.length}</div></div>
    </div>
    <div class="card table-card" style="margin-top:20px;">
      <table>
        <thead><tr><th>Subject</th><th>Activity</th><th>Score</th><th>Percentage</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(r => `
            <tr>
              <td>${r.subject}</td><td>${r.activity}</td>
              <td class="num">${r.score !== null ? `${r.score}/${r.total}` : '—'}</td>
              <td class="num">${r.pct !== null ? r.pct + '%' : '—'}</td>
              <td>${r.status === "Failed" ? `<span class="pill pill-danger">${r.status}</span>` : r.status === "Graded" ? `<span class="pill pill-success">${r.status}</span>` : `<span class="pill pill-warning">${r.status}</span>`}</td>
            </tr>`).join("") : `<tr><td colspan="5"><div class="empty-state"><p>No grades recorded yet.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderProgressPage() {
  const ud = userData();
  const stats = overallStudentStats();
  const subjects = studentSubjects();
  const ring = (pct, label, color) => {
    const c = 2 * Math.PI * 50;
    return `<div class="card ring-card">
      <div class="ring-wrap"><svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" stroke="var(--border)" stroke-width="10" fill="none"/>
        <circle cx="60" cy="60" r="50" stroke="${color}" stroke-width="10" fill="none" stroke-dasharray="${c * (pct / 100)} ${c}" stroke-linecap="round"/>
      </svg><span class="ring-label">${pct}%</span></div>
      <p style="font-weight:600; font-size:13.5px;">${label}</p>
    </div>`;
  };
  return `
    <div class="section-heading"><h2>Progress</h2></div>
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      ${ring(stats.overallProgress, "Overall Progress", "var(--primary)")}
      ${ring(stats.avg, "Quiz Performance", "var(--accent)")}
      ${ring(Math.round((Object.keys(ud.progress).length / studentSubjects().reduce((n, s) => n + s.moduleIds.length, 0)) * 100), "Reading Activity", "var(--amber)")}
    </div>

    <div class="section-heading"><h2>Progress by Subject</h2></div>
    <div class="card" style="padding:24px;">
      <div class="bar-chart">
        ${subjects.map(s => {
    const pct = moduleProgressPct(s);
    return `<div class="bar-col"><div class="bar-val">${pct}%</div><div class="bar" style="height:${Math.max(pct, 4)}%; background:linear-gradient(180deg, ${s.color[0]}, ${s.color[1]});"></div><div class="bar-lbl">${s.name.split(" ")[0]}</div></div>`;
  }).join("")}
      </div>
    </div>
  `;
}

function renderBookmarks() {
  const ud = userData();
  const rows = [];
  Object.entries(ud.progress).forEach(([mid, p]) => {
    (p.bookmarks || []).forEach(page => rows.push({ mid, page }));
  });
  const validRows = rows.filter(r => SEED.modules[r.mid] && SEED.subjects[SEED.modules[r.mid].subjectId]);
  return `
    <div class="section-heading"><h2>Bookmarks</h2></div>
    ${validRows.length ? `<div class="module-list">${validRows.map(r => {
    const mod = SEED.modules[r.mid];
    const subject = SEED.subjects[mod.subjectId];
    return `<div class="card module-card">
        <div class="module-num">${svgIcon("book")}</div>
        <div class="module-card-body"><h4>${mod.title}</h4><p>${subject.name} · Page ${r.page + 1} of ${mod.pages.length}</p></div>
        <div class="module-actions"><button class="btn btn-primary btn-sm" data-action="open-module" data-id="${mod.id}">Open Page</button></div>
      </div>`;
  }).join("")}</div>` : `<div class="empty-state">${svgIcon("book")}<h3>No bookmarks yet</h3><p>Bookmark a page inside the booklet reader to find it here.</p></div>`}
  `;
}

function renderDownloads() {
  const ud = userData();
  const entries = Object.entries(ud.downloads).filter(([mid]) => SEED.modules[mid] && SEED.subjects[SEED.modules[mid].subjectId]);
  return `
    <div class="section-heading"><h2>Downloads</h2></div>
    <div class="kv-note">${svgIcon("download")} Downloaded modules stay available even when Offline Mode is simulated in Settings.</div>
    ${entries.length ? `<div class="card list-card">${entries.map(([mid, d]) => {
    const mod = SEED.modules[mid];
    const subject = SEED.subjects[mod.subjectId];
    return `<div class="download-row">
        <span class="list-row-icon" style="background:var(--amber-soft); color:var(--amber);">${svgIcon("download")}</span>
        <div class="list-row-body" style="flex:1;"><p>${mod.title}</p><span>${subject.name} · Downloaded ${formatDate(d.date)}</span></div>
        <span class="pill pill-success">Available offline</span>
        <button class="btn btn-outline btn-sm" data-action="remove-download" data-id="${mid}">Remove</button>
      </div>`;
  }).join("")}</div>` : `<div class="empty-state">${svgIcon("download")}<h3>No downloads yet</h3><p>Download a module from its subject page to read it offline.</p></div>`}
  `;
}

/* =========================================================
   SETTINGS / PROFILE (shared across roles)
========================================================= */
function renderSettings() {
  const ud = userData();
  const theme = DB.theme || "light";
  return `
    <div class="section-heading"><h2>Settings</h2></div>

    <div class="card settings-block">
      <h3>Appearance</h3>
      <div class="theme-choice-row">
        <label class="theme-choice ${theme === 'light' ? 'active' : ''}"><input type="radio" name="theme" data-toggle="theme-light" ${theme === 'light' ? 'checked' : ''} style="display:none;">☀️ Light Mode</label>
        <label class="theme-choice ${theme === 'dark' ? 'active' : ''}"><input type="radio" name="theme" data-toggle="theme-dark" ${theme === 'dark' ? 'checked' : ''} style="display:none;">🌙 Dark Mode</label>
      </div>
    </div>

    <div class="card settings-block">
      <h3>Offline</h3>
      <div class="settings-row">
        <div><div class="settings-row-label">Simulate Offline Mode</div><div class="settings-row-desc">Preview how the app behaves without a connection. Downloaded modules keep working.</div></div>
        <label class="switch"><input type="checkbox" data-toggle="simulateOffline" ${ud.settings.simulateOffline ? "checked" : ""}><span class="switch-track"></span></label>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-label">Storage status</div><div class="settings-row-desc">${Object.keys(ud.downloads).length} module(s) downloaded, saved in this browser's local storage.</div></div>
        ${Object.keys(ud.downloads).length > 0 ? `<button class="btn btn-danger btn-sm" data-action="clear-downloads" onclick="return confirm('Clear all downloaded modules?')">Clear Downloads</button>` : ''}
      </div>
    </div>

    <div class="card settings-block">
      <h3>Preferences</h3>
      <div class="settings-row">
        <div><div class="settings-row-label">Notifications</div><div class="settings-row-desc">Receive alerts for new modules, deadlines, and grades.</div></div>
        <label class="switch"><input type="checkbox" data-toggle="notifications" ${ud.settings.notifications ? "checked" : ""}><span class="switch-track"></span></label>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-label">Language</div><div class="settings-row-desc">Interface language for this prototype.</div></div>
        <span class="pill pill-muted">${ud.settings.language}</span>
      </div>
    </div>
  `;
}

function renderProfile() {
  const user = currentUser();
  const ud = userData();
  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

  let statsBlock = "";
  if (user.role === "student") {
    const stats = overallStudentStats();
    statsBlock = `
      <div class="info-grid">
        <div class="card info-item"><div class="l">Subjects Enrolled</div><div class="v">${stats.totalSubjects}</div></div>
        <div class="card info-item"><div class="l">Modules Completed</div><div class="v">${stats.doneModules}/${stats.totalModules}</div></div>
        <div class="card info-item"><div class="l">Quiz Average</div><div class="v">${stats.avg}%</div></div>
        <div class="card info-item"><div class="l">Overall Progress</div><div class="v">${stats.overallProgress}%</div></div>
      </div>`;
  }

  return `
    <div class="section-heading"><h2>Profile</h2></div>
    <div class="card profile-header">
      <span class="avatar avatar-lg">${initials(user.name)}</span>
      <div class="profile-header-info">
        <h2>${user.name}</h2>
        <p>${user.email}</p>
        <div class="profile-tags">
          <span class="pill pill-progress">${roleLabel}</span>
          ${user.grade ? `<span class="pill pill-muted">${user.grade} · ${user.section}</span>` : ""}
          ${user.department ? `<span class="pill pill-muted">${user.department}</span>` : ""}
          ${user.title ? `<span class="pill pill-muted">${user.title}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="info-grid" style="margin-top:16px;">
      <div class="card info-item"><div class="l">${user.role === "student" ? "Student ID" : user.role === "teacher" ? "Employee ID" : "Admin ID"}</div><div class="v">${user.id}</div></div>
      <div class="card info-item"><div class="l">Email</div><div class="v">${user.email}</div></div>
    </div>
    ${statsBlock}
  `;
}

/* =========================================================
   ANNOUNCEMENTS (STUDENT & TEACHER)
========================================================= */
function announcementsForStudent() {
  const user = currentUser();
  const subIds = user.subjects || [];
  return (SEED.announcements || []).filter(a => subIds.includes(a.subjectId)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date - a.date);
}

function renderAnnouncements() {
  const list = announcementsForStudent();
  return `
    <div class="section-heading"><h2>Announcements</h2></div>
    <p style="color:var(--text-muted); margin-bottom:20px; font-size:14px;">Updates, deadline reminders, and new learning materials posted by your teachers.</p>
    <div class="announcement-list">
      ${list.length ? list.map(a => `
        <div class="card announcement-card ${a.pinned ? 'pinned' : ''}">
          <div class="announcement-card-header">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span class="ann-type-badge ann-type-${a.type}">${a.type === 'material' ? '📚 New Material' : a.type === 'deadline' ? '⏰ Deadline' : '📝 Quiz Schedule'}</span>
              <span class="pill pill-muted">${SEED.subjects[a.subjectId]?.name || a.subjectId}</span>
              ${a.pinned ? '<span class="ann-pinned-badge">📌 Pinned</span>' : ''}
            </div>
            <span class="announcement-date">${formatDate(a.date)} (${timeAgo(a.date)})</span>
          </div>
          <h3 class="announcement-title">${a.title}</h3>
          <p class="announcement-body">${a.body}</p>
          <div class="announcement-footer">
            <div class="announcement-author">
              <span class="avatar avatar-sm">${initials(a.author)}</span>
              <span><strong>${a.author}</strong> · Teacher</span>
            </div>
            ${a.type === 'material' ? `<button class="btn btn-outline btn-sm" data-action="open-subject" data-id="${a.subjectId}">Open Subject</button>` : ''}
          </div>
        </div>
      `).join("") : `<div class="empty-state">${svgIcon("megaphone")}<h3>No announcements yet</h3><p>Your teachers haven't posted any updates yet.</p></div>`}
    </div>
  `;
}

function renderTeacherAnnouncements() {
  const user = currentUser();
  const subIds = user.subjects || [];
  const list = (SEED.announcements || []).filter(a => subIds.includes(a.subjectId)).sort((a, b) => b.date - a.date);
  return `
    <div class="section-heading">
      <h2>Announcements</h2>
      <button class="btn btn-primary btn-sm" data-action="open-modal-announcement">+ Post Announcement</button>
    </div>
    <p style="color:var(--text-muted); margin-bottom:20px; font-size:14px;">Manage class announcements, quiz schedules, and learning material updates for your students.</p>
    <div class="announcement-list">
      ${list.map(a => `
        <div class="card announcement-card ${a.pinned ? 'pinned' : ''}">
          <div class="announcement-card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="ann-type-badge ann-type-${a.type}">${a.type === 'material' ? '📚 New Material' : a.type === 'deadline' ? '⏰ Deadline' : '📝 Quiz Schedule'}</span>
              <span class="pill pill-muted">${allSubjects()[a.subjectId]?.name || a.subjectId}</span>
              ${a.pinned ? '<span class="ann-pinned-badge">📌 Pinned</span>' : ''}
            </div>
            <span class="announcement-date">${formatDate(a.date)}</span>
          </div>
          <h3 class="announcement-title">${a.title}</h3>
          <p class="announcement-body">${a.body}</p>
          <div class="announcement-footer">
            <span style="font-size:12.5px; color:var(--text-muted);">Posted by ${a.author}</span>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-outline btn-sm" data-action="edit-announcement" data-id="${a.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete-announcement" data-id="${a.id}" onclick="return confirm('Delete this announcement?')">Delete</button>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================================================
   TEACHER VIEWS
========================================================= */
function teacherSubjects() {
  return Object.values(allSubjects());
}
function renderTeacherDashboard() {
  const user = currentUser();
  const students = SEED.teacherStudents.map(s => ({ ...s, ...liveStudentStats(s) }));
  const avgClass = students.length ? Math.round(students.reduce((s, x) => s + x.avgScore, 0) / students.length) : 0;
  return `
    <div class="welcome-banner">
      <div><h1>Welcome back, ${user.firstName}!</h1><p>Here's how your classes are doing this week.</p></div>
      <a href="#/t-students" class="btn btn-primary">View Students</a>
    </div>
    <div class="stat-grid">
      <div class="stat-tile"><div class="stat-label">Total Students</div><div class="stat-value">${students.length}</div></div>
      <div class="stat-tile"><div class="stat-label">Active Subjects</div><div class="stat-value">${teacherSubjects().length}</div></div>
      <div class="stat-tile"><div class="stat-label">Pending Submissions</div><div class="stat-value">${SEED.assignments.filter(a => a.status === 'pending').length}</div></div>
      <div class="stat-tile"><div class="stat-label">Class Average</div><div class="stat-value">${avgClass}%</div></div>
    </div>
    <div class="section-heading"><h2>My Subjects</h2></div>
    <div class="subject-grid">
      ${teacherSubjects().map(s => {
    const hasCover = !!s.coverImage;
    const coverBg = hasCover ? `background-image:url('${s.coverImage}')` : `background:linear-gradient(155deg, ${s.color[0]}, ${s.color[1]})`;
    return `
        <div class="card subject-card">
          <div class="subject-cover ${hasCover ? 'with-cover-img' : ''}" style="${coverBg}">${hasCover ? '' : s.initial}</div>
          <div class="subject-card-body">
            <div class="subject-card-top"><div><h4>${s.name}</h4><p class="subject-teacher">${s.moduleIds.length} modules</p></div></div>
            <div style="margin-top:14px;"><button class="btn btn-secondary btn-sm btn-block" data-action="open-subject" data-id="${s.id}">Manage</button></div>
          </div>
        </div>`;
  }).join("")}
    </div>
    <div class="section-heading"><h2>Top Students</h2></div>
    <div class="card table-card">
      <table><thead><tr><th>Student</th><th>Section</th><th>Avg. Score</th><th>Progress</th></tr></thead>
      <tbody>${[...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5).map(s => `
        <tr><td>${s.name}</td><td>${s.section}</td><td class="num">${s.avgScore}%</td><td class="num">${s.progress}%</td></tr>`).join("")}</tbody></table>
    </div>
  `;
}

function renderTeacherSubjects() {
  const customSubjects = DB.customSubjects || {};
  return `
    <div class="section-heading">
      <h2>My Subjects</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" data-action="open-modal-subject">+ Add Subject</button>
        <button class="btn btn-secondary btn-sm" data-action="open-modal-module-new">+ Upload / Create Module</button>
      </div>
    </div>
    <div class="subject-grid">
      ${teacherSubjects().map(s => {
    const isCustom = !!customSubjects[s.id];
    const hasCover = !!s.coverImage;
    const coverBg = hasCover ? `background-image:url('${s.coverImage}')` : `background:linear-gradient(155deg, ${s.color[0]}, ${s.color[1]})`;
    return `
        <div class="card subject-card">
          <div class="subject-cover ${hasCover ? 'with-cover-img' : ''}" style="${coverBg}">${hasCover ? '' : s.initial}</div>
          <div class="subject-card-body">
            <div class="subject-card-top"><div><h4>${s.name}</h4><p class="subject-teacher">${s.moduleIds.length} modules · ${s.teacher}</p></div></div>
            <div style="margin-top:14px; display:flex; gap:8px;">
              <button class="btn btn-outline btn-sm btn-block" data-action="open-modal-module-new" data-subject-id="${s.id}">+ Add Module</button>
              <button class="btn btn-secondary btn-sm btn-block" data-action="open-subject" data-id="${s.id}">View Subject</button>
            </div>
            ${isCustom ? `<div style="margin-top:10px; display:flex; gap:8px;">
              <button class="btn btn-danger btn-sm btn-block" data-action="delete-subject" data-id="${s.id}" onclick="return confirm('Delete subject \"${s.name}\" and all its modules? This cannot be undone.')">Delete Subject</button>
            </div>` : ''}
          </div>
        </div>`;
  }).join("")}
    </div>
  `;
}

function renderTeacherSubjectDetail(subjectId) {
  const subject = allSubjects()[subjectId];
  if (!subject) return `<div class="empty-state"><h3>Subject not found</h3><p><a href="#/t-subjects">Back to Subjects</a></p></div>`;
  const mods = (subject.moduleIds || []).map(id => allModules()[id]).filter(Boolean);

  return `
    <div class="subject-hero" style="background:linear-gradient(120deg, ${subject.color[0]}, ${subject.color[1]})">
      <div class="subject-hero-top">${svgIcon("book")} <span>${subject.teacher}</span></div>
      <h1>${subject.name}</h1>
      <p class="desc">${subject.description}</p>
      <div class="objectives-row">${(subject.objectives || []).map(o => `<span class="objective-chip">${o}</span>`).join("")}</div>
    </div>

    <div class="section-heading">
      <h2>Modules (${mods.length})</h2>
      <button class="btn btn-primary btn-sm" data-action="open-modal-module-new" data-subject-id="${subjectId}">+ Add Module</button>
    </div>
    <div class="module-list">
      ${mods.length ? mods.map(m => teacherModuleCardHTML(m, subject)).join("") : '<div class="empty-state"><p>No modules uploaded for this subject yet.</p></div>'}
    </div>
  `;
}

function teacherModuleCardHTML(mod, subject) {
  const isCustom = !!(DB.customModules && DB.customModules[mod.id]);
  return `
    <div class="card module-card">
      <div class="module-num">${String(mod.number).padStart(2, "0")}</div>
      <div class="module-card-body">
        <h4>${mod.title}</h4>
        <p>${mod.description}</p>
        <div class="module-meta">
          <span>${svgIcon("clock")} ${mod.readingMins} min read</span>
          <span>${svgIcon("page")} ${mod.pages.length} pages</span>
          <span>${svgIcon("quiz")} ${mod.quizId ? allQuizzes()[mod.quizId]?.questions.length || 0 : 0} questions</span>
        </div>
      </div>
      <div class="module-actions">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-action="open-quiz" data-id="${mod.quizId}">Preview Quiz</button>
          <button class="btn btn-secondary btn-sm" data-action="open-module" data-id="${mod.id}">View Module</button>
          <button class="btn btn-outline btn-sm" data-action="open-modal-module" data-id="${mod.id}">Edit</button>
          ${isCustom ? `<button class="btn btn-danger btn-sm" data-action="delete-module" data-id="${mod.id}" onclick="return confirm('Delete module \"${mod.title}\" and its quiz?')">Delete</button>` : ''}
        </div>
      </div>
    </div>`;
}

function renderTeacherStudents() {
  return `
    <div class="section-heading"><h2>Students</h2></div>
    <div class="card table-card">
      <table><thead><tr><th>Student</th><th>ID</th><th>Section</th><th>Avg. Score</th><th>Progress</th><th></th></tr></thead>
      <tbody>${SEED.teacherStudents.map(s => {
    const ls = liveStudentStats(s); return `
        <tr><td>${s.name}</td><td class="num">${s.id}</td><td>${s.section}</td><td class="num">${ls.avgScore}%</td><td class="num">${ls.progress}%</td>
        <td><button class="btn btn-outline btn-sm" data-action="view-student" data-id="${s.id}">View</button></td></tr>`;
  }).join("")}</tbody></table>
    </div>
  `;
}

function renderTeacherQuizzes() {
  const quizIds = teacherSubjects().flatMap(s => s.moduleIds.map(mid => (allModules()[mid] || {}).quizId).filter(Boolean));
  return `
    <div class="section-heading"><h2>Quizzes</h2><button class="btn btn-primary btn-sm" data-action="open-modal-module">+ Create Module / Quiz</button></div>
    <div class="card table-card">
      <table><thead><tr><th>Quiz</th><th>Subject</th><th>Items</th><th></th></tr></thead>
      <tbody>${quizIds.map(qid => {
    const q = allQuizzes()[qid]; if (!q) return ""; const mod = allModules()[q.moduleId]; return `
        <tr><td>${q.title}</td><td>${(allSubjects()[q.subjectId] || {}).name || q.subjectId}</td><td class="num">${q.questions.length}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-action="open-quiz" data-id="${q.id}">Preview</button>
          ${mod ? `<button class="btn btn-outline btn-sm" data-action="open-modal-module" data-id="${mod.id}">Edit Quiz</button>` : ''}
        </td></tr>`;
  }).join("")}</tbody></table>
    </div>
  `;
}

function renderTeacherAssignments() {
  const submissionCount = (assignmentId) => Object.values(DB.perUser || {}).filter(ud => (ud.submissions || {})[assignmentId]).length;
  const gradedCount = (assignmentId) => Object.values(DB.perUser || {}).filter(ud => (ud.submissions || {})[assignmentId]?.score !== undefined).length;
  const totalStudents = Object.values(DB.perUser || {}).filter(ud => SEED.users[ud.email]?.role === "student").length || 1;
  return `
    <div class="section-heading"><h2>Assignments</h2><button class="btn btn-primary btn-sm" data-action="open-modal-assignment">+ New Assignment</button></div>
    <div class="card table-card">
      <table><thead><tr><th>Assignment</th><th>Subject</th><th>Due</th><th>Points</th><th>Submitted</th><th>Graded</th><th></th></tr></thead>
      <tbody>${SEED.assignments.map(a => {
    const subCount = submissionCount(a.id);
    const graded = gradedCount(a.id);
    return `
        <tr><td>${a.title}</td><td>${(allSubjects()[a.subjectId] || {}).name || a.subjectId}</td><td class="num">${formatDate(a.due)}</td><td class="num">${a.points}</td>
        <td><span class="pill pill-progress">${subCount}/${totalStudents} submitted</span></td>
        <td><span class="pill ${graded > 0 ? 'pill-success' : 'pill-muted'}">${graded}/${subCount} graded</span></td>
        <td><button class="btn btn-outline btn-sm" data-action="open-modal-view-submissions" data-id="${a.id}">View & Grade</button></td>
        <td><button class="btn btn-outline btn-sm" data-action="edit-assignment" data-id="${a.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete-assignment" data-id="${a.id}" onclick="return confirm('Delete this assignment?')">Delete</button></td></tr>`;
  }).join("")}</tbody></table>
    </div>
  `;
}

function renderTeacherModuleMatrix(subjectId = "sci10") {
  const students = SEED.teacherStudents;
  const subject = allSubjects()[subjectId] || allSubjects()["sci10"] || Object.values(allSubjects())[0];
  if (!subject) return "";
  const modules = subject.moduleIds.map(mid => allModules()[mid]).filter(Boolean);

  return `
    <div class="matrix-card card">
      <div class="matrix-header">
        <div>
          <h3>Per-Student Module Progress Matrix</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Detailed completion breakdown per module for ${subject.name}</p>
        </div>
        <div class="matrix-filter-buttons">
          ${teacherSubjects().map(s => `
            <button class="btn btn-sm ${s.id === subjectId ? 'btn-primary' : 'btn-outline'}" data-action="filter-matrix" data-id="${s.id}">
              ${s.name}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="table-responsive">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Section</th>
              ${modules.map(m => `<th>Mod ${m.number}: ${m.title.length > 20 ? m.title.substring(0, 20) + '…' : m.title}</th>`).join("")}
              <th>Overall Score</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
    return `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.section}</td>
                  ${modules.map(m => {
      const prog = getTeacherStudentModuleStatus(s, m.id);
      const st = prog.status;
      const score = prog.score ? `${prog.score}%` : "";
      const badge = st === "complete"
        ? `<span class="cell-badge cell-complete">✓ Complete ${score ? `(${score})` : ''}</span>`
        : st === "in-progress"
          ? `<span class="cell-badge cell-progress">⏳ In Progress</span>`
          : `<span class="cell-badge cell-not-started">— Not Started</span>`;
      return `<td>${badge}</td>`;
    }).join("")}
                  <td class="num"><strong>${liveStudentStats(s).avgScore}%</strong></td>
                </tr>
              `;
  }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTeacherGrades() {
  const students = Object.entries(DB.perUser || {})
    .filter(([email, ud]) => SEED.users[email]?.role === "student")
    .map(([email, ud]) => {
      const user = SEED.users[email];
      // Collect quiz results
      const quizResults = Object.entries(ud.quizResults || {}).map(([qid, r]) => ({
        subject: (allQuizzes()[qid]?.subjectId && allSubjects()[allQuizzes()[qid].subjectId]?.name) || "Quiz",
        activity: allQuizzes()[qid]?.title || qid,
        score: r.score,
        total: r.total,
        pct: r.percentage,
        type: "quiz"
      }));
      // Collect assignment grades
      const assignResults = Object.entries(ud.submissions || {})
        .filter(([aid, sub]) => sub.score !== undefined)
        .map(([aid, sub]) => {
          const a = SEED.assignments.find(x => x.id === aid);
          return {
            subject: a ? (allSubjects()[a.subjectId]?.name || "Assignment") : "Assignment",
            activity: a?.title || aid,
            score: sub.score,
            total: a?.points || 0,
            pct: a?.points ? Math.round((sub.score / a.points) * 100) : 0,
            type: "assignment"
          };
        });
      const allResults = [...quizResults, ...assignResults];
      const avg = allResults.length ? Math.round(allResults.reduce((s, r) => s + r.pct, 0) / allResults.length) : 0;
      return { email, name: user?.name || email, section: user?.section || "N/A", results: allResults, avg };
    });

  const firstSubId = teacherSubjects()[0]?.id || "sci10";
  return `
    <div class="section-heading"><h2>Class Grades & Module Progress</h2></div>
    
    <div class="section-heading" style="margin-bottom:10px;"><h3>Grades by Student</h3></div>
    <div class="card table-card">
      <table><thead><tr><th>Student</th><th>Section</th><th>Avg Score</th><th>Activities</th></tr></thead>
      <tbody>${students.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.section}</td>
          <td class="num"><strong>${s.avg}%</strong></td>
          <td>${s.results.map(r => `<span class="pill ${r.type === 'quiz' ? 'pill-progress' : 'pill-success'}">${r.activity}: ${r.score}/${r.total} (${r.pct}%)</span>`).join(" ") || `<span class="field-hint">No grades yet</span>`}</td>
        </tr>`).join("")}</tbody></table>
    </div>

    <div id="matrix-container" style="margin-top:30px;">
      ${renderTeacherModuleMatrix(firstSubId)}
    </div>
  `;
}

function renderTeacherReports() {
  const students = SEED.teacherStudents.map(s => ({ ...s, ...liveStudentStats(s) }));
  const avg = students.length ? Math.round(students.reduce((s, x) => s + x.avgScore, 0) / students.length) : 0;
  const firstSubId = teacherSubjects()[0]?.id || "sci10";
  return `
    <div class="section-heading"><h2>Class Performance Reports</h2></div>
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-tile"><div class="stat-label">Class Average</div><div class="stat-value">${avg}%</div></div>
      <div class="stat-tile"><div class="stat-label">On Track</div><div class="stat-value">${students.filter(s => s.progress >= 60).length}/${students.length}</div></div>
      <div class="stat-tile"><div class="stat-label">Needs Attention</div><div class="stat-value">${students.filter(s => s.avgScore < 75).length}</div></div>
    </div>
    <div class="card" style="padding:24px; margin-top:20px;">
      <div class="section-heading" style="margin-top:0;"><h3>Student Score Distribution</h3></div>
      <div class="bar-chart">
        ${students.map(s => `<div class="bar-col"><div class="bar-val">${s.avgScore}%</div><div class="bar" style="height:${s.avgScore}%;"></div><div class="bar-lbl">${s.name.split(" ")[0]}</div></div>`).join("")}
      </div>
    </div>

    <div class="section-heading" style="margin-top:30px;"><h2>Module Completion Matrix</h2></div>
    <div id="matrix-container">
      ${renderTeacherModuleMatrix(firstSubId)}
    </div>
  `;
}

/* =========================================================
   ADMIN VIEWS
========================================================= */
function renderAdminDashboard() {
  const user = currentUser();
  return `
    <div class="welcome-banner">
      <div><h1>Welcome, ${user.firstName}</h1><p>System overview for EduBook LMS.</p></div>
    </div>
    <div class="stat-grid">
      <div class="stat-tile"><div class="stat-label">Total Students</div><div class="stat-value">${SEED.teacherStudents.length}</div></div>
      <div class="stat-tile"><div class="stat-label">Total Teachers</div><div class="stat-value">2</div></div>
      <div class="stat-tile"><div class="stat-label">Total Subjects</div><div class="stat-value">${Object.keys(allSubjects()).length}</div></div>
      <div class="stat-tile"><div class="stat-label">Total Modules</div><div class="stat-value">${Object.keys(allModules()).length}</div></div>
    </div>
    <div class="section-heading"><h2>System Activity</h2></div>
    <div class="card list-card">
      <div class="list-row"><span class="list-row-icon" style="background:var(--accent-soft); color:var(--accent);">${svgIcon("check")}</span><div class="list-row-body"><p>Maria Santos published Module 3 — ICT 10</p><span>2 hours ago</span></div></div>
      <div class="list-row"><span class="list-row-icon" style="background:var(--primary-soft); color:var(--primary);">${svgIcon("quiz")}</span><div class="list-row-body"><p>18 students completed the Science 10 quarterly quiz</p><span>5 hours ago</span></div></div>
      <div class="list-row"><span class="list-row-icon" style="background:var(--amber-soft); color:var(--amber);">${svgIcon("bell")}</span><div class="list-row-body"><p>New teacher account requested: Leonardo Reyes</p><span>1 day ago</span></div></div>
    </div>
  `;
}

function renderAdminUsers() {
  const rows = [
    ...Object.values(SEED.users).map(u => ({ name: u.name, email: u.email, role: u.role[0].toUpperCase() + u.role.slice(1), id: u.email })),
    ...SEED.teacherStudents.slice(1).map(s => ({ name: s.name, email: s.name.toLowerCase().replace(" ", ".") + "@edubook.test", role: "Student", id: s.id }))
  ];
  return adminTableView("Users", ["Name", "Email", "Role", "Actions"], rows.map(r => `<td>${r.name}</td><td>${r.email}</td><td><span class="pill pill-muted">${r.role}</span></td><td><button class="btn btn-outline btn-sm" data-action="edit-user" data-id="${r.id}">Edit</button> <button class="btn btn-danger btn-sm" data-action="delete-user" data-id="${r.id}" onclick="return confirm('Delete user \"${r.name}\"?')">Delete</button></td>`), "+ Add User");
}
function renderAdminStudents() {
  const rows = SEED.teacherStudents.map(s => ({ ...s, ...liveStudentStats(s) }));
  return adminTableView("Students", ["Name", "ID", "Section", "Avg. Score", "Progress", "Actions"], rows.map(s => `<td>${s.name}</td><td class="num">${s.id}</td><td>${s.section}</td><td class="num">${s.avgScore}%</td><td class="num">${s.progress}%</td><td><button class="btn btn-outline btn-sm" data-action="view-student" data-id="${s.id}">View</button></td>`), "+ Add Student");
}
function renderAdminTeachers() {
  const rows = [
    { name: "Maria Santos", email: "teacher@edubook.test", dept: "Science & Technology", subjects: "Science 10, ICT 10" },
    { name: "Leonardo Reyes", email: "leonardo.reyes@edubook.test", dept: "Mathematics", subjects: "Mathematics 10" },
    { name: "Carmela Villanueva", email: "carmela.villanueva@edubook.test", dept: "Languages", subjects: "English 10" }
  ];
  return adminTableView("Teachers", ["Name", "Email", "Department", "Subjects", "Actions"], rows.map(t => `<td>${t.name}</td><td>${t.email}</td><td>${t.dept}</td><td>${t.subjects}</td><td><button class="btn btn-outline btn-sm" data-action="edit-user" data-id="${t.email}">Edit</button></td>`), "+ Add Teacher");
}
function renderAdminSubjects() {
  const customSubjects = DB.customSubjects || {};
  const rows = Object.values(allSubjects());
  return adminTableView("Subjects", ["Subject", "Teacher", "Modules", "Actions"], rows.map(s => {
    const isCustom = !!customSubjects[s.id];
    return `<td>${s.name}</td><td>${s.teacher}</td><td class="num">${s.moduleIds.length}</td><td>${isCustom ? `<button class="btn btn-danger btn-sm" data-action="delete-subject" data-id="${s.id}" onclick="return confirm('Delete subject \"${s.name}\" and all its modules?')">Delete</button>` : ''}</td>`;
  }), "+ Add Subject");
}
function renderAdminCourses() {
  const rows = [
    { name: "Grade 10 — Full Curriculum", subjects: Object.keys(allSubjects()).length, students: SEED.teacherStudents.length, id: "course-gr10" }
  ];
  return adminTableView("Courses", ["Course", "Subjects", "Enrolled Students", "Actions"], rows.map(c => `<td>${c.name}</td><td class="num">${c.subjects}</td><td class="num">${c.students}</td><td><button class="btn btn-outline btn-sm" data-action="view-course" data-id="${c.id}">View</button></td>`), "+ Add Course");
}
function adminTableView(title, headers, rowCells, addLabel) {
  const actionMap = {
    'Users': 'open-modal-user',
    'Students': 'open-modal-student',
    'Teachers': 'open-modal-teacher',
    'Courses': 'open-modal-course',
    'Subjects': 'open-modal-subject'
  };
  const action = actionMap[title] || 'mock-action';
  return `
    <div class="section-heading"><h2>${title}</h2><button class="btn btn-primary btn-sm" data-action="${action}">${addLabel}</button></div>
    <div class="card table-card">
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rowCells.map(c => `<tr>${c}</tr>`).join("")}</tbody>
      </table>
    </div>`;
}

/* =========================================================
   SUBJECT & MULTI-MATERIAL MODULE CREATOR / UPLOADER LOGIC
========================================================= */
let builderPages = [];
let builderQuestions = [];
let editingSubjectId = null;
let editingModuleId = null;

function openSubjectModal(subjectId = null) {
  const user = currentUser();
  const modal = document.getElementById("modal-subject");
  if (!modal) return;

  editingSubjectId = subjectId;
  const isEditing = !!subjectId;
  const subject = isEditing ? allSubjects()[subjectId] : null;

  document.getElementById("subj-name").value = subject?.name || "";
  document.getElementById("subj-code").value = subject?.id || "";
  document.getElementById("subj-teacher").value = subject?.teacher || (user ? user.name : "Maria Santos");
  document.getElementById("subj-desc").value = subject?.description || "";
  document.getElementById("subj-objectives").value = subject?.objectives?.join(", ") || "";
  const subjCoverEl = document.getElementById("subj-cover");
  if (subjCoverEl) subjCoverEl.value = subject?.coverImage || "";

  // Set color radio
  const colorVal = subject?.color ? subject.color.join(",") : "#A31832,#E0293F";
  document.querySelectorAll('input[name="subj-color"]').forEach(r => {
    r.checked = r.value === colorVal;
    r.parentElement.classList.toggle("active", r.checked);
  });

  document.querySelector("#modal-subject h3").textContent = isEditing ? "Edit Subject" : "Create New Subject";
  document.querySelector("#modal-subject .modal-header p").textContent = isEditing ? "Update subject details." : "Add a new subject to the curriculum with custom color and objectives.";
  document.querySelector("#form-create-subject button[type=submit]").textContent = isEditing ? "Save Changes" : "Create Subject";

  modal.hidden = false;
}

let editingAnnouncementId = null;
function openAnnouncementModal(announcementId = null) {
  const user = currentUser();
  const modal = document.getElementById("modal-announcement");
  if (!modal) return;

  editingAnnouncementId = announcementId;
  const isEditing = !!announcementId;
  const announcement = isEditing ? SEED.announcements.find(a => a.id === announcementId) : null;

  const select = document.getElementById("ann-subject");
  const subjects = teacherSubjects();
  select.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === announcement?.subjectId ? "selected" : ""}>${s.name}</option>`).join("");

  if (isEditing && announcement) {
    document.getElementById("ann-title").value = announcement.title;
    document.getElementById("ann-body").value = announcement.body;
    document.getElementById("ann-type").value = announcement.type;
    document.getElementById("ann-pinned").checked = announcement.pinned || false;
  } else {
    document.getElementById("ann-title").value = "";
    document.getElementById("ann-body").value = "";
    document.getElementById("ann-type").value = "material";
    document.getElementById("ann-pinned").checked = false;
    if (subjects.length) select.value = subjects[0].id;
  }

  document.querySelector("#modal-announcement h3").textContent = isEditing ? "Edit Announcement" : "Create Announcement";
  document.querySelector("#modal-announcement .modal-header p").textContent = isEditing ? "Update the announcement." : "Post an announcement to your subjects.";
  document.querySelector("#form-create-announcement button[type=submit]").textContent = isEditing ? "Save Changes" : "Post Announcement";

  modal.hidden = false;
}

let editingAssignmentId = null;
function openAssignmentModal(assignmentId = null) {
  const user = currentUser();
  const modal = document.getElementById("modal-assignment");
  if (!modal) return;

  editingAssignmentId = assignmentId;
  const isEditing = !!assignmentId;
  const assignment = isEditing ? SEED.assignments.find(a => a.id === assignmentId) : null;

  const select = document.getElementById("asg-subject");
  const subjects = teacherSubjects();
  select.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === assignment?.subjectId ? "selected" : ""}>${s.name}</option>`).join("");

  if (isEditing && assignment) {
    document.getElementById("asg-title").value = assignment.title;
    document.getElementById("asg-desc").value = assignment.description || "";
    document.getElementById("asg-due").value = assignment.due;
    document.getElementById("asg-points").value = assignment.points || 20;
    document.getElementById("asg-status").value = assignment.status || "pending";
  } else {
    document.getElementById("asg-title").value = "";
    document.getElementById("asg-desc").value = "";
    document.getElementById("asg-due").value = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    document.getElementById("asg-points").value = 20;
    document.getElementById("asg-status").value = "pending";
    if (subjects.length) select.value = subjects[0].id;
  }

  document.querySelector("#modal-assignment h3").textContent = isEditing ? "Edit Assignment" : "Create Assignment";
  document.querySelector("#modal-assignment .modal-header p").textContent = isEditing ? "Update the assignment." : "Create a new assignment for students.";
  document.querySelector("#form-create-assignment button[type=submit]").textContent = isEditing ? "Save Changes" : "Create Assignment";

  modal.hidden = false;
}

function openModuleModal(moduleId = null, preselectedSubjectId = null) {
  const modal = document.getElementById("modal-module");
  if (!modal) return;

  editingModuleId = moduleId;
  const isEditing = !!moduleId;
  const module = isEditing ? allModules()[moduleId] : null;
  const subjectId = module?.subjectId || preselectedSubjectId;

  const select = document.getElementById("mod-subject");
  const subjects = Object.values(allSubjects());
  select.innerHTML = subjects.map(s => `<option value="${s.id}" ${s.id === subjectId ? "selected" : ""}>${s.name} (${s.id})</option>`).join("");

  if (isEditing && module) {
    document.getElementById("mod-title").value = module.title;
    document.getElementById("mod-desc").value = module.description;
    document.getElementById("mod-objectives").value = module.steps?.join(", ") || "";
    document.getElementById("mod-mins").value = module.readingMins || 15;
    document.getElementById("mod-number").value = module.number;
    const modCoverEl = document.getElementById("mod-cover");
    if (modCoverEl) modCoverEl.value = module.coverImage || "";

    // Load existing pages into builder
    builderPages = [];
    builderQuestions = [];
    document.getElementById("module-pages-builder-list").innerHTML = "";
    document.getElementById("module-quiz-builder-list").innerHTML = "";

    (module.pages || []).forEach((page, idx) => {
      addPageItem(page.type, page);
    });
    (allQuizzes()[module.quizId]?.questions || []).forEach((q, idx) => {
      addQuizQuestionItem(q);
    });
  } else {
    document.getElementById("mod-title").value = "";
    document.getElementById("mod-desc").value = "";
    document.getElementById("mod-objectives").value = "";
    document.getElementById("mod-mins").value = 15;

    const curSub = allSubjects()[select.value];
    document.getElementById("mod-number").value = curSub ? (curSub.moduleIds.length + 1) : 1;
    select.onchange = () => {
      const s = allSubjects()[select.value];
      if (s) document.getElementById("mod-number").value = s.moduleIds.length + 1;
    };

    builderPages = [];
    builderQuestions = [];
    document.getElementById("module-pages-builder-list").innerHTML = "";
    document.getElementById("module-quiz-builder-list").innerHTML = "";
    addPageItem("lesson");
  }

  document.querySelector("#modal-module h3").textContent = isEditing ? "Edit Module" : "Create / Upload Module";
  document.querySelector("#modal-module .modal-header p").textContent = isEditing ? "Update module content, materials, and quiz." : "Build an interactive booklet with text, PDF documents, PowerPoint slides, video lessons, images, and quizzes.";
  document.querySelector("#form-create-module button[type=submit]").textContent = isEditing ? "Save Changes" : "Save & Publish Module";

  modal.hidden = false;
}

function addPageItem(type, existingPage = null) {
  const list = document.getElementById("module-pages-builder-list");
  if (!list) return;
  const pageIdx = existingPage?.id || (Date.now() + Math.floor(Math.random() * 1000));
  builderPages.push({ id: pageIdx, type });

  const card = document.createElement("div");
  card.className = "builder-item-card";
  card.id = `builder-page-${pageIdx}`;

  let fieldsHTML = "";
  if (type === "lesson") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-progress">📖 Text Lesson Page</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <div class="file-upload-box">
        <label class="btn btn-outline btn-sm file-upload-btn">
          📁 Choose File from Computer (.txt / .doc / .md)
          <input type="file" accept=".txt,.md,.doc,.docx" style="display:none;" onchange="handleLocalFile(this, 'text')">
        </label>
        <span class="file-upload-note">or type lesson content below:</span>
      </div>
      <label class="field">
        <span>Lesson Heading *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Fundamental Concepts" value="${existingPage?.heading || ''}" required>
      </label>
      <label class="field">
        <span>Lesson Content / Body Paragraphs (Press enter for new paragraphs) *</span>
        <textarea class="bp-body" rows="4" placeholder="Write or paste your lesson content here..." required>${(existingPage?.body || []).join("\n")}</textarea>
      </label>
      <label class="field">
        <span>Note / Tip (Optional)</span>
        <input type="text" class="bp-note" placeholder="e.g. Tip: Remember this key formula for your exams." value="${existingPage?.note || ''}">
      </label>
    `;
  } else if (type === "pdf") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-danger">📄 PDF Document</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <div class="file-upload-box">
        <label class="btn btn-outline btn-sm file-upload-btn" style="border-color:#DC2626; color:#DC2626;">
          📁 Choose PDF from Computer (.pdf)
          <input type="file" accept=".pdf" style="display:none;" onchange="handleLocalFile(this, 'pdf')">
        </label>
        <span class="file-upload-note">or enter PDF link:</span>
      </div>
      <label class="field">
        <span>Document Title *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Official Course Reading Material.pdf" value="${existingPage?.heading || ''}" required>
      </label>
      <div class="form-row-2">
        <label class="field">
          <span>PDF Link / File URL / Data</span>
          <input type="text" class="bp-pdf-url" placeholder="https://example.com/materials/handout.pdf" value="${existingPage?.pdfUrl || ''}">
        </label>
        <label class="field">
          <span>Page Count Estimate</span>
          <input type="number" class="bp-page-count" value="${existingPage?.pageCount || 6}" min="1">
        </label>
      </div>
      <label class="field">
        <span>Summary / Key Points in this PDF</span>
        <textarea class="bp-body" rows="2" placeholder="Brief summary of what students should read in this document...">${existingPage?.body?.[0] || ''}</textarea>
      </label>
    `;
  } else if (type === "presentation") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-warning">📑 PowerPoint / Slide Deck</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <div class="file-upload-box">
        <label class="btn btn-outline btn-sm file-upload-btn" style="border-color:#D97F0A; color:#D97F0A;">
          📁 Upload Slides File (.ppt / .pptx / .txt)
          <input type="file" accept=".ppt,.pptx,.txt" style="display:none;" onchange="handleLocalFile(this, 'ppt')">
        </label>
        <span class="file-upload-note">or write slides manually:</span>
      </div>
      <label class="field">
        <span>Presentation Title *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Review Slides: Chapter Key Takeaways" value="${existingPage?.heading || ''}" required>
      </label>
      <label class="field">
        <span>Slide Contents (Write 1 slide per line) *</span>
        <textarea class="bp-slides" rows="5" placeholder="Slide 1: Introduction and Key Objectives&#10;Slide 2: Main Principles and Definitions&#10;Slide 3: Real-World Applications and Examples&#10;Slide 4: Chapter Summary" required>${(existingPage?.slides || []).join("\n")}</textarea>
      </label>
    `;
  } else if (type === "video") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-success">🎬 Video Lesson</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <div class="file-upload-box">
        <label class="btn btn-outline btn-sm file-upload-btn" style="border-color:#059669; color:#059669;">
          📁 Choose Video File from Computer (.mp4 / .webm)
          <input type="file" accept="video/mp4,video/webm" style="display:none;" onchange="handleLocalFile(this, 'video')">
        </label>
        <span class="file-upload-note">or enter YouTube / Google Drive link:</span>
      </div>
      <label class="field">
        <span>Video Title *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Video Lecture: Laboratory Demonstration" value="${existingPage?.heading || ''}" required>
      </label>
      <label class="field">
        <span>Video URL / Embed Link / File Data</span>
        <input type="text" class="bp-video-url" placeholder="https://www.youtube.com/watch?v=..." value="${existingPage?.videoUrl || ''}">
      </label>
      <label class="field">
        <span>Video Description / Key Notes *</span>
        <textarea class="bp-body" rows="3" placeholder="Explain what concepts are demonstrated in this video lecture..." required>${existingPage?.description || ''}</textarea>
      </label>
    `;
  } else if (type === "image-gallery") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-muted">🖼️ Image Gallery & Diagrams</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <div class="file-upload-box">
        <label class="btn btn-outline btn-sm file-upload-btn">
          📁 Choose Images from Computer (Multi-select)
          <input type="file" accept="image/*" multiple style="display:none;" onchange="handleLocalFile(this, 'image')">
        </label>
        <span class="file-upload-note">or list diagram captions:</span>
      </div>
      <label class="field">
        <span>Gallery Heading *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Reference Diagrams & Illustrations" value="${existingPage?.heading || ''}" required>
      </label>
      <label class="field">
        <span>Gallery Items (Write 1 item per line with format: Emoji | Caption) *</span>
        <textarea class="bp-gallery" rows="4" placeholder="📊 | Chart: Regional Statistics&#10;🧬 | Diagram: Cellular Structure&#10;🔬 | Lab Apparatus Setup" required>${(existingPage?.images || []).map(i => `${i.emoji} | ${i.caption}`).join("\n")}</textarea>
      </label>
    `;
  } else if (type === "activity") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-progress">📝 Activity with Instructions</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <label class="field">
        <span>Activity Heading *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Hands-On Exercise: Analyze the Case Study" value="${existingPage?.heading || ''}" required>
      </label>
      <label class="field">
        <span>Step-by-Step Instructions (Write 1 step per line) *</span>
        <textarea class="bp-instructions" rows="4" placeholder="Step 1: Download the attached worksheet.&#10;Step 2: Answer parts A and B in complete sentences.&#10;Step 3: Submit your output during class." required>${(existingPage?.instructions || []).join("\n")}</textarea>
      </label>
      <label class="field">
        <span>Activity Overview / Objective</span>
        <input type="text" class="bp-body" placeholder="e.g. Apply the principles learned in this module." value="${existingPage?.body?.[0] || ''}">
      </label>
    `;
  } else if (type === "cover") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-primary">📕 Cover Page</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <label class="field">
        <span>Cover Title *</span>
        <input type="text" class="bp-heading" placeholder="e.g. Matter and Its Properties" value="${existingPage?.title || ''}" required>
      </label>
      <label class="field">
        <span>Subtitle *</span>
        <input type="text" class="bp-sub" placeholder="e.g. Module 1 · Science 10" value="${existingPage?.sub || ''}" required>
      </label>
    `;
  } else if (type === "objectives") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-warning">🎯 Learning Objectives</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <label class="field">
        <span>Section Heading *</span>
        <input type="text" class="bp-heading" placeholder="Learning Objectives" value="${existingPage?.heading || 'Learning Objectives'}" required>
      </label>
      <label class="field">
        <span>Objectives List (1 item per line) *</span>
        <textarea class="bp-objectives-list" rows="4" placeholder="Describe the states of matter&#10;Differentiate physical and chemical properties&#10;Give examples of physical and chemical changes" required>${(existingPage?.items || []).join("\n")}</textarea>
      </label>
    `;
  } else if (type === "summary") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-success">📋 Summary</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <label class="field">
        <span>Section Heading *</span>
        <input type="text" class="bp-heading" placeholder="Summary" value="${existingPage?.heading || 'Summary'}" required>
      </label>
      <label class="field">
        <span>Summary Points (1 item per line) *</span>
        <textarea class="bp-summary-list" rows="4" placeholder="Matter has three common states&#10;Physical properties don't change identity&#10;Chemical properties involve forming new substances" required>${(existingPage?.items || []).join("\n")}</textarea>
      </label>
    `;
  } else if (type === "quiz-page") {
    fieldsHTML = `
      <div class="builder-item-header">
        <span class="pill pill-danger">❓ Quiz Page</span>
        <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-page-${pageIdx}').remove()">✕</button>
      </div>
      <label class="field">
        <span>Heading *</span>
        <input type="text" class="bp-heading" placeholder="Ready for the Quiz?" value="${existingPage?.heading || 'Ready for the Quiz?'}" required>
      </label>
      <label class="field">
        <span>Instructions (1 step per line) *</span>
        <textarea class="bp-instructions" rows="4" placeholder="Read all questions carefully before answering.&#10;Choose the best answer for multiple-choice items.&#10;For True/False, remember that a statement is False if any part is incorrect." required>${(existingPage?.instructions || []).join("\n")}</textarea>
      </label>
      <label class="field">
        <span>Short Intro Text</span>
        <input type="text" class="bp-body" placeholder="Test your knowledge of matter and its properties." value="${existingPage?.body?.[0] || ''}">
      </label>
    `;
  }

  card.innerHTML = fieldsHTML;
  list.appendChild(card);
}

function handleLocalFile(input, type) {
  const file = input.files[0];
  if (!file) return;
  const card = input.closest(".builder-item-card");
  if (!card) return;

  const reader = new FileReader();

  if (type === "pdf") {
    const titleInput = card.querySelector(".bp-heading");
    if (titleInput && (!titleInput.value || titleInput.value.includes("Reading Material"))) {
      titleInput.value = file.name;
    }
    reader.onload = (e) => {
      const urlInput = card.querySelector(".bp-pdf-url");
      if (urlInput) {
        urlInput.value = e.target.result;
        urlInput.dataset.fileName = file.name;
      }
      toast(`PDF "${file.name}" loaded from your computer!`, "success");
    };
    reader.readAsDataURL(file);
  }
  else if (type === "video") {
    const titleInput = card.querySelector(".bp-heading");
    if (titleInput && (!titleInput.value || titleInput.value.includes("Video Lecture"))) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, "");
    }
    reader.onload = (e) => {
      const urlInput = card.querySelector(".bp-video-url");
      if (urlInput) {
        urlInput.value = e.target.result;
        urlInput.dataset.fileName = file.name;
      }
      toast(`Video "${file.name}" loaded from your computer!`, "success");
    };
    reader.readAsDataURL(file);
  }
  else if (type === "image") {
    const files = Array.from(input.files);
    const textarea = card.querySelector(".bp-gallery");
    const galleryItems = [];
    let loadedCount = 0;

    files.forEach((f) => {
      const imgReader = new FileReader();
      imgReader.onload = (e) => {
        galleryItems.push({ src: e.target.result, caption: f.name.replace(/\.[^/.]+$/, "") });
        loadedCount++;
        if (loadedCount === files.length) {
          card.dataset.customImages = JSON.stringify(galleryItems);
          if (textarea) textarea.value = files.map(f => `🖼️ | ${f.name.replace(/\.[^/.]+$/, "")}`).join("\n");
          toast(`${files.length} image(s) loaded from your computer!`, "success");
        }
      };
      imgReader.readAsDataURL(f);
    });
  }
  else if (type === "text" || type === "ppt") {
    reader.onload = (e) => {
      const text = e.target.result;
      if (type === "text") {
        const bodyTextarea = card.querySelector(".bp-body");
        if (bodyTextarea) bodyTextarea.value = text;
        const titleInput = card.querySelector(".bp-heading");
        if (titleInput && !titleInput.value) titleInput.value = file.name.replace(/\.[^/.]+$/, "");
      } else {
        const slidesTextarea = card.querySelector(".bp-slides");
        if (slidesTextarea) slidesTextarea.value = text;
        const titleInput = card.querySelector(".bp-heading");
        if (titleInput && !titleInput.value) titleInput.value = file.name.replace(/\.[^/.]+$/, "");
      }
      toast(`File "${file.name}" loaded from your computer!`, "success");
    };
    reader.readAsText(file);
  }
}

function addQuizQuestionItem(existingQ = null) {
  const list = document.getElementById("module-quiz-builder-list");
  if (!list) return;
  const qIdx = existingQ?.id || (Date.now() + Math.floor(Math.random() * 1000));
  builderQuestions.push({ id: qIdx });

  const card = document.createElement("div");
  card.className = "builder-item-card quiz-builder-card";
  card.id = `builder-q-${qIdx}`;

  const qType = existingQ?.type || "mc";
  const choices = existingQ?.choices || ["", "", "", ""];
  const answer = existingQ?.answer !== undefined ? existingQ.answer : 0;

  let choicesHTML = "";
  if (qType === "short") {
    choicesHTML = `<p class="quiz-short-hint">💡 Short answer questions allow students to write sentences and are submitted for teacher review.</p>`;
  } else if (qType === "tf") {
    choicesHTML = `
      <label class="field">
        <span>Correct Answer</span>
        <select class="bq-answer modal-select">
          <option value="0" ${answer === 0 ? "selected" : ""}>True</option>
          <option value="1" ${answer === 1 ? "selected" : ""}>False</option>
        </select>
      </label>
    `;
  } else {
    choicesHTML = `
      <div class="form-row-2">
        <label class="field"><span>Choice A *</span><input type="text" class="bq-choice-0" placeholder="Option A" value="${choices[0] || ''}" ${qType === "mc" ? "required" : ""}></label>
        <label class="field"><span>Choice B *</span><input type="text" class="bq-choice-1" placeholder="Option B" value="${choices[1] || ''}" ${qType === "mc" ? "required" : ""}></label>
      </div>
      <div class="form-row-2">
        <label class="field"><span>Choice C</span><input type="text" class="bq-choice-2" placeholder="Option C" value="${choices[2] || ''}"></label>
        <label class="field"><span>Choice D</span><input type="text" class="bq-choice-3" placeholder="Option D" value="${choices[3] || ''}"></label>
      </div>
      <label class="field">
        <span>Correct Answer</span>
        <select class="bq-answer modal-select">
          <option value="0" ${answer === 0 ? "selected" : ""}>Choice A</option>
          <option value="1" ${answer === 1 ? "selected" : ""}>Choice B</option>
          <option value="2" ${answer === 2 ? "selected" : ""}>Choice C</option>
          <option value="3" ${answer === 3 ? "selected" : ""}>Choice D</option>
        </select>
      </label>
    `;
  }

  card.innerHTML = `
    <div class="builder-item-header">
      <span class="pill pill-muted">Quiz Question</span>
      <button type="button" class="ghost-icon-btn btn-sm" onclick="document.getElementById('builder-q-${qIdx}').remove()">✕</button>
    </div>
    <div class="form-row-2">
      <label class="field" style="flex:2;">
        <span>Question Text *</span>
        <input type="text" class="bq-text" placeholder="Enter your question here..." value="${existingQ?.q || ''}" required>
      </label>
      <label class="field" style="flex:1;">
        <span>Type *</span>
        <select class="bq-type modal-select" onchange="toggleQTypeFields(this, 'bq-choices-${qIdx}')">
          <option value="mc" ${qType === "mc" ? "selected" : ""}>Multiple Choice</option>
          <option value="tf" ${qType === "tf" ? "selected" : ""}>True or False</option>
          <option value="short" ${qType === "short" ? "selected" : ""}>Written / Short Answer</option>
        </select>
      </label>
    </div>
    <div id="bq-choices-${qIdx}" class="bq-choices-wrap">
      ${choicesHTML}
    </div>
  `;
  list.appendChild(card);
}

function toggleQTypeFields(selectEl, wrapId) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  if (selectEl.value === "short") {
    wrap.innerHTML = `<p class="quiz-short-hint">💡 Short answer questions allow students to write sentences and are submitted for teacher review.</p>`;
  } else if (selectEl.value === "tf") {
    wrap.innerHTML = `
      <label class="field">
        <span>Correct Answer</span>
        <select class="bq-answer modal-select">
          <option value="0">True</option>
          <option value="1">False</option>
        </select>
      </label>
    `;
  } else {
    wrap.innerHTML = `
      <div class="form-row-2">
        <label class="field"><span>Choice A *</span><input type="text" class="bq-choice-0" placeholder="Option A"></label>
        <label class="field"><span>Choice B *</span><input type="text" class="bq-choice-1" placeholder="Option B"></label>
      </div>
      <div class="form-row-2">
        <label class="field"><span>Choice C</span><input type="text" class="bq-choice-2" placeholder="Option C"></label>
        <label class="field"><span>Choice D</span><input type="text" class="bq-choice-3" placeholder="Option D"></label>
      </div>
      <label class="field">
        <span>Correct Answer</span>
        <select class="bq-answer modal-select">
          <option value="0">Choice A</option>
          <option value="1">Choice B</option>
          <option value="2">Choice C</option>
          <option value="3">Choice D</option>
        </select>
      </label>
    `;
  }
}

async function handleCreateSubjectSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("subj-name").value.trim();
  const code = document.getElementById("subj-code").value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const teacher = document.getElementById("subj-teacher").value.trim();
  const desc = document.getElementById("subj-desc").value.trim();
  const rawObj = document.getElementById("subj-objectives").value.trim();
  const objectives = rawObj ? rawObj.split(",").map(o => o.trim()).filter(Boolean) : ["Master subject fundamentals", "Complete modules and assessments"];
  const colorRadio = document.querySelector('input[name="subj-color"]:checked');
  const color = colorRadio ? colorRadio.value.split(",") : ["#A31832", "#E0293F"];
  const coverImage = (document.getElementById("subj-cover")?.value || "").trim();

  const isEditing = !!editingSubjectId;
  const subjectId = editingSubjectId || code || `subj_${Date.now()}`;

  if (isEditing) {
    // Update existing subject
    const existingSubject = allSubjects()[editingSubjectId];
    if (existingSubject) {
      const subject = {
        ...existingSubject,
        name,
        teacher,
        color,
        coverImage: coverImage || existingSubject.coverImage || null,
        initial: (code.substring(0, 2) || name.substring(0, 2)).toUpperCase(),
        description: desc,
        objectives
      };

      DB.customSubjects = DB.customSubjects || {};

      // If ID changed, move it to the new key
      if (subjectId !== editingSubjectId) {
        delete DB.customSubjects[editingSubjectId];
        subject.id = subjectId;

        // Update module references
        (subject.moduleIds || []).forEach(modId => {
          const mod = allModules()[modId];
          if (mod) {
            DB.customModules = DB.customModules || {};
            DB.customModules[modId] = { ...mod, subjectId };
          }
        });
      }

      DB.customSubjects[subjectId] = subject;
    }
    toast(`Subject "${name}" successfully updated!`, "success");
  } else {
    // Create new subject
    const newSubject = {
      id: subjectId,
      name,
      teacher,
      color,
      coverImage: coverImage || null,
      initial: (code.substring(0, 2) || name.substring(0, 2)).toUpperCase(),
      description: desc,
      objectives,
      moduleIds: []
    };

    DB.customSubjects = DB.customSubjects || {};
    DB.customSubjects[subjectId] = newSubject;
    toast(`Subject "${name}" successfully created!`, "success");
  }

  persist();
  if (typeof pushSharedStateSupabaseImmediate === "function") {
    await pushSharedStateSupabaseImmediate({
      customSubjects: DB.customSubjects, customModules: DB.customModules, customQuizzes: DB.customQuizzes
    });
  }
  closeAllModals();
  route();
}

async function handleCreateModuleSubmit(e) {
  e.preventDefault();
  const subjectId = document.getElementById("mod-subject").value;
  const num = parseInt(document.getElementById("mod-number").value, 10) || 1;
  const mins = parseInt(document.getElementById("mod-mins").value, 10) || 15;
  const title = document.getElementById("mod-title").value.trim();
  const desc = document.getElementById("mod-desc").value.trim();
  const rawObj = document.getElementById("mod-objectives").value.trim();
  const objectives = rawObj ? rawObj.split(",").map(o => o.trim()).filter(Boolean) : ["Understand core concepts", "Complete activities and quizzes"];

  const subject = allSubjects()[subjectId];
  if (!subject) { toast("Subject not found.", "danger"); return; }

  const isEditing = !!editingModuleId;
  const modId = editingModuleId || `m-${subjectId}-${num}-${Date.now().toString().slice(-4)}`;
  const quizId = `q-${subjectId}-${num}-${Date.now().toString().slice(-4)}`;
  const modCoverImage = (document.getElementById("mod-cover")?.value || "").trim();

  const pages = [
    { type: "cover", title, sub: `Module ${num} · ${subject.name}`, coverImage: modCoverImage || null },
    { type: "objectives", heading: "Learning Objectives", items: objectives }
  ];

  const steps = ["Read Lesson Pages"];

  const cards = document.querySelectorAll("#module-pages-builder-list .builder-item-card");
  cards.forEach((card, cardIdx) => {
    const pageType = builderPages[cardIdx]?.type;
    const heading = (card.querySelector(".bp-heading")?.value || "").trim();
    const bodyText = (card.querySelector(".bp-body")?.value || "").trim();
    const note = (card.querySelector(".bp-note")?.value || "").trim();
    const pdfUrl = (card.querySelector(".bp-pdf-url")?.value || "").trim();
    const pageCount = parseInt(card.querySelector(".bp-page-count")?.value, 10) || 5;
    const slidesText = (card.querySelector(".bp-slides")?.value || "").trim();
    const videoUrl = (card.querySelector(".bp-video-url")?.value || "").trim();
    const galleryText = (card.querySelector(".bp-gallery")?.value || "").trim();
    const instructionsText = (card.querySelector(".bp-instructions")?.value || "").trim();
    const objectivesText = (card.querySelector(".bp-objectives-list")?.value || "").trim();
    const summaryText = (card.querySelector(".bp-summary-list")?.value || "").trim();
    const subText = (card.querySelector(".bp-sub")?.value || "").trim();
    const customImagesJSON = card.dataset.customImages;

    if (pageType === "cover" || card.querySelector(".bp-sub")) {
      pages.push({ type: "cover", title: heading || "Module", sub: subText || `Module ${num} · ${subject.name}` });
    } else if (pageType === "objectives" || card.querySelector(".bp-objectives-list")) {
      const items = objectivesText.split("\n").map(i => i.trim()).filter(Boolean);
      pages.push({ type: "objectives", heading: heading || "Learning Objectives", items });
      steps.push("Review Objectives");
    } else if (pageType === "summary" || card.querySelector(".bp-summary-list")) {
      const items = summaryText.split("\n").map(i => i.trim()).filter(Boolean);
      pages.push({ type: "summary", heading: heading || "Summary", items });
      steps.push("Review Summary");
    } else if (pageType === "quiz-page" || (card.querySelector(".bp-instructions") && !card.querySelector(".bp-note"))) {
      // quiz-page has instructions + body (input) but no note field; activity has note field
      const instructions = instructionsText.split("\n").map(i => i.trim()).filter(Boolean);
      pages.push({ type: "quiz-page", heading: heading || "Ready for the Quiz?", instructions, body: [bodyText || ""] });
      steps.push("Take Quiz");
    } else if (card.querySelector(".bp-slides")) {
      const slides = slidesText.split("\n").map(s => s.trim()).filter(Boolean);
      if (slides.length) {
        pages.push({ type: "presentation", heading: heading || "Review Presentation Slides", slides });
        steps.push("Review Slides");
      }
    } else if (card.querySelector(".bp-video-url") !== null) {
      pages.push({ type: "video", heading: heading || "Watch Video Lecture", videoUrl, description: bodyText });
      steps.push("Watch Video");
    } else if (card.querySelector(".bp-pdf-url") !== null) {
      const body = bodyText ? bodyText.split("\n").map(b => b.trim()).filter(Boolean) : [];
      pages.push({ type: "pdf", heading: heading || "Course Reading Material.pdf", pdfUrl, pageCount, body, description: bodyText });
      steps.push("Review PDF Material");
    } else if (customImagesJSON || card.querySelector(".bp-gallery")) {
      let items = [];
      if (customImagesJSON) {
        try { items = JSON.parse(customImagesJSON); } catch (e) { }
      }
      if (!items.length && galleryText) {
        items = galleryText.split("\n").map(line => {
          const parts = line.split("|").map(p => p.trim());
          return { emoji: parts[0] || "🖼️", caption: parts[1] || parts[0] || "Illustration" };
        }).filter(Boolean);
      }
      pages.push({ type: "image-gallery", heading: heading || "Reference Gallery", images: items });
      steps.push("Explore Gallery");
    } else if (card.querySelector(".bp-instructions")) {
      const instructions = instructionsText.split("\n").map(i => i.trim()).filter(Boolean);
      pages.push({ type: "activity", heading: heading || "Module Activity", instructions, body: [bodyText || "Complete the instructions above."] });
      steps.push("Complete Activity");
    } else {
      const body = bodyText ? bodyText.split("\n\n").map(p => p.trim()).filter(Boolean) : [bodyText];
      const pageObj = { type: "lesson", heading: heading || "Lesson", body };
      if (note) pageObj.note = note;
      pages.push(pageObj);
    }
  });

  const qCards = document.querySelectorAll("#module-quiz-builder-list .quiz-builder-card");
  const questions = [];
  qCards.forEach(qc => {
    const qText = (qc.querySelector(".bq-text")?.value || "").trim();
    const qType = qc.querySelector(".bq-type")?.value || "mc";
    if (!qText) return;

    if (qType === "short") {
      questions.push({ q: qText, type: "short" });
    } else if (qType === "tf") {
      const answer = parseInt(qc.querySelector(".bq-answer")?.value, 10) || 0;
      questions.push({ q: qText, choices: ["True", "False"], answer, type: "tf" });
    } else {
      const c0 = (qc.querySelector(".bq-choice-0")?.value || "Option A").trim();
      const c1 = (qc.querySelector(".bq-choice-1")?.value || "Option B").trim();
      const c2 = (qc.querySelector(".bq-choice-2")?.value || "Option C").trim();
      const c3 = (qc.querySelector(".bq-choice-3")?.value || "Option D").trim();
      const answer = parseInt(qc.querySelector(".bq-answer")?.value, 10) || 0;
      questions.push({ q: qText, choices: [c0, c1, c2, c3], answer, type: "mc" });
    }
  });

  if (questions.length) {
    pages.push({
      type: "quiz-page",
      heading: "Ready for the Quiz?",
      instructions: [
        "Read each item carefully before answering.",
        "Review your answers before clicking submit."
      ],
      body: [`You've completed Module ${num}. Test your knowledge with a ${questions.length}-item assessment.`]
    });
    steps.push("Take Quiz");

    DB.customQuizzes = DB.customQuizzes || {};
    DB.customQuizzes[quizId] = {
      id: quizId,
      moduleId: modId,
      subjectId,
      title: `Module ${num} Assessment: ${title}`,
      questions
    };
  }

  steps.push("Complete Lesson");

  if (isEditing) {
    // Update existing module
    const existingModule = allModules()[editingModuleId];
    if (existingModule) {
      // Preserve quiz ID if it exists
      const existingQuizId = existingModule.quizId;
      const oldSubjectId = existingModule.subjectId;

      // IMPORTANT: existingModule may be a direct reference into SEED.modules
      // (when editing one of the original bundled modules, not a
      // teacher/admin-created one). Mutating it in place only changes the
      // in-memory SEED copy for this tab/session — it's never written to
      // DB.customModules, so persist() has nothing new to save to
      // localStorage or push to Supabase, and the edit is lost on reload.
      // Always write the updated module into DB.customModules so the
      // override sticks and gets synced, regardless of where it originally
      // came from.
      const updatedModule = {
        ...existingModule,
        subjectId,
        number: num,
        title,
        description: desc,
        readingMins: mins,
        quizId: questions.length ? (existingQuizId || quizId) : null,
        steps,
        pages
      };
      DB.customModules = DB.customModules || {};
      DB.customModules[editingModuleId] = updatedModule;

      // Update quiz if questions changed
      if (questions.length && existingQuizId && DB.customQuizzes[existingQuizId]) {
        DB.customQuizzes[existingQuizId] = {
          ...DB.customQuizzes[existingQuizId],
          moduleId: modId,
          subjectId,
          title: `Module ${num} Assessment: ${title}`,
          questions
        };
      }

      // Move module to different subject if needed
      if (oldSubjectId !== subjectId) {
        const oldSubject = allSubjects()[oldSubjectId];
        if (oldSubject && oldSubject.moduleIds) {
          oldSubject.moduleIds = oldSubject.moduleIds.filter(id => id !== editingModuleId);
          if (DB.customSubjects && DB.customSubjects[oldSubjectId]) {
            DB.customSubjects[oldSubjectId].moduleIds = oldSubject.moduleIds;
          }
        }
      }
    }
    toast(`Module "${title}" successfully updated!`, "success");
  } else {
    // Create new module
    const newModule = {
      id: modId,
      subjectId,
      number: num,
      title,
      description: desc,
      readingMins: mins,
      quizId: questions.length ? quizId : null,
      steps,
      pages
    };

    DB.customModules = DB.customModules || {};
    DB.customModules[modId] = newModule;

    if (!subject.moduleIds.includes(modId)) {
      subject.moduleIds.push(modId);
      if (DB.customSubjects && DB.customSubjects[subjectId]) {
        DB.customSubjects[subjectId].moduleIds = subject.moduleIds;
      } else {
        DB.customSubjects = DB.customSubjects || {};
        DB.customSubjects[subjectId] = { ...subject };
      }
    }
    toast(`Module "${title}" successfully published!`, "success");
  }

  persist();
  if (typeof pushSharedStateSupabaseImmediate === "function") {
    await pushSharedStateSupabaseImmediate({
      customSubjects: DB.customSubjects, customModules: DB.customModules, customQuizzes: DB.customQuizzes
    });
  }
  closeAllModals();
  route();
}

/* =========================================================
   SERVICE WORKER REGISTRATION
   Activates the offline app-shell caching defined in
   service-worker.js. Must be served over http(s):// —
   this will not register when opened via file://.
========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((reg) => console.log("Service worker registered:", reg.scope))
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}