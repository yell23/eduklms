/* =========================================================
   EDUBOOK LMS — SUPABASE INTEGRATION LAYER
   This file is the ONLY place that talks to Supabase. It never
   touches the DOM. app.js calls the functions below and falls
   back to the original localStorage/data.js behavior whenever
   Supabase isn't reachable (no config, offline, etc.) — this is
   what keeps the app's offline-ready pitch intact.
========================================================= */

// ---- 1. FILL THESE IN from your Supabase project (Settings > API) ----
const SUPABASE_RAW_URL = "https://rtprmnoulwrknnmaoudv.supabase.co/rest/v1/";
const SUPABASE_URL = SUPABASE_RAW_URL.replace(/\/rest\/v1\/?$/, "");
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cHJtbm91bHdya25ubWFvdWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzczODgsImV4cCI6MjEwMzY1MzM4OH0._0TjHeDOd102E814k-MJgpzsMJwd_XluJ7yja-sOrpM";
// -----------------------------------------------------------------------

let _client = null;
function getClient() {
  if (_client) return _client;
  if (typeof window.supabase === "undefined") return null; // CDN script not loaded
  if (SUPABASE_URL.includes("YOUR-PROJECT-REF") || SUPABASE_ANON_KEY.includes("YOUR-ANON")) {
    return null; // not configured yet — caller falls back to offline mode
  }
  _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// Small helper: race any promise against a timeout so a dead/slow network
// never hangs the app shell — this is what preserves "offline-ready".
function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("supabase-timeout")), ms))
  ]);
}

/* =========================================================
   CATALOG (subjects/modules/quizzes/assignments/announcements)
   Fetched once at boot. Returns null on any failure so app.js
   can fall back to the bundled data.js SEED object.
========================================================= */
async function fetchCatalogFromSupabase() {
  const sb = getClient();
  if (!sb) return null;
  try {
    const [subjects, modules, quizzes, assignments, announcements, teacherStudents] = await withTimeout(
      Promise.all([
        sb.from("subjects").select("*"),
        sb.from("modules").select("*"),
        sb.from("quizzes").select("*"),
        sb.from("assignments").select("*"),
        sb.from("announcements").select("*"),
        sb.from("teacher_students").select("*")
      ])
    );
    const anyError = [subjects, modules, quizzes, assignments, announcements, teacherStudents]
      .find(r => r.error);
    if (anyError) { console.warn("Supabase catalog fetch error:", anyError.error); return null; }

    const bySubjects = {}, byModules = {}, byQuizzes = {};
    subjects.data.forEach(s => bySubjects[s.id] = {
      id: s.id, name: s.name, teacher: s.teacher, color: s.color, initial: s.initial,
      description: s.description, objectives: s.objectives, moduleIds: s.module_ids
    });
    modules.data.forEach(m => byModules[m.id] = {
      id: m.id, subjectId: m.subject_id, number: m.number, title: m.title,
      description: m.description, readingMins: m.reading_mins, quizId: m.quiz_id,
      steps: m.steps, pages: m.pages
    });
    quizzes.data.forEach(q => byQuizzes[q.id] = {
      id: q.id, moduleId: q.module_id, subjectId: q.subject_id, title: q.title, questions: q.questions
    });

    return {
      subjects: bySubjects,
      modules: byModules,
      quizzes: byQuizzes,
      assignments: assignments.data.map(a => ({
        id: a.id, subjectId: a.subject_id, title: a.title, due: a.due,
        status: a.status, points: a.points, score: a.score
      })),
      announcements: announcements.data.map(a => ({
        id: a.id, subjectId: a.subject_id, type: a.type, title: a.title, body: a.body,
        author: a.author, date: Number(a.occurred_at), pinned: a.pinned
      })),
      teacherStudents: teacherStudents.data.map(t => ({
        id: t.id, name: t.name, section: t.section, avgScore: t.avg_score,
        progress: t.progress, email: t.email, moduleProgress: t.module_progress
      }))
    };
  } catch (e) {
    console.warn("Supabase catalog fetch failed, using offline data:", e.message);
    return null;
  }
}

/* =========================================================
   AUTH
   verify_login is a SECURITY DEFINER function server-side, so
   the anon key can check a password without ever being able to
   SELECT the users table directly (see rls-policies.sql).
========================================================= */
async function verifyLoginSupabase(email, password) {
  const sb = getClient();
  if (!sb) return { ok: false, reason: "offline" };
  try {
    const { data, error } = await withTimeout(sb.rpc("verify_login", { p_email: email, p_password: password }));
    if (error) return { ok: false, reason: "error" };
    if (!data || data.length === 0) return { ok: false, reason: "no-match" };
    const row = data[0];
    return {
      ok: true,
      user: {
        email: row.email, role: row.role, id: row.user_id, name: row.name,
        firstName: row.first_name, grade: row.grade, section: row.section,
        department: row.department, title: row.title, subjects: row.subjects
      }
    };
  } catch (e) {
    return { ok: false, reason: "offline" };
  }
}

/* =========================================================
   PER-USER STATE (progress, quiz results, downloads, settings...)
   Mirrors what used to be DB.perUser[email].
========================================================= */
async function fetchUserStateSupabase(email) {
  const sb = getClient();
  if (!sb) return null;
  try {
    const { data, error } = await withTimeout(sb.from("user_state").select("data").eq("email", email).maybeSingle());
    if (error || !data) return null;
    return data.data;
  } catch (e) { return null; }
}

let _userStatePushTimer = null;
function pushUserStateSupabase(email, stateObj) {
  const sb = getClient();
  if (!sb) return; // offline — localStorage already has it, nothing more to do
  clearTimeout(_userStatePushTimer);
  _userStatePushTimer = setTimeout(async () => {
    try {
      await sb.from("user_state").upsert({ email, data: stateObj, updated_at: new Date().toISOString() });
    } catch (e) { console.warn("Background sync to Supabase failed (will retry on next change):", e.message); }
  }, 800); // debounce so rapid page-turns don't spam the network
}

async function pushUserStateSupabaseImmediate(email, stateObj) {
  const sb = getClient();
  if (!sb) return;
  clearTimeout(_userStatePushTimer);
  try {
    await sb.from("user_state").upsert({ email, data: stateObj, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("Immediate user_state sync failed:", e.message);
  }
}


/* =========================================================
   USER ACCOUNTS (admin "Manage Users" panel — create/update/
   delete rows in the `users` table). Best-effort, mirrors the
   same fire-and-forget pattern as pushUserStateSupabase above:
   the local SEED.users copy is always the source of truth for
   rendering, this just keeps the cloud copy in step with it.
========================================================= */
function _userToRow(u) {
  return {
    email: u.email, password: u.password, role: u.role, user_id: u.id,
    name: u.name, first_name: u.firstName, grade: u.grade || null,
    section: u.section || null, department: u.department || null,
    title: u.title || null, subjects: u.subjects || []
  };
}

async function signInWithGoogleSupabase() {
  const sb = getClient();
  if (!sb) return { ok: false, error: "Offline mode. Google sign-in requires an internet connection." };
  try {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkAuthSessionSupabase() {
  const sb = getClient();
  if (!sb) return null;
  try {
    const { data, error } = await withTimeout(sb.auth.getSession(), 3000);
    if (error || !data || !data.session || !data.session.user) return null;
    const u = data.session.user;
    const email = u.email;
    const fullName = u.user_metadata?.full_name || u.user_metadata?.name || email.split("@")[0];
    const firstName = fullName.split(" ")[0];
    return {
      email,
      name: fullName,
      firstName,
      role: "student",
      id: `STU-${Date.now().toString().slice(-6)}`,
      grade: "Grade 10",
      section: "Einstein",
      subjects: ["ttl"]
    };
  } catch (e) {
    return null;
  }
}

async function createUserSupabase(userObj) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("users").insert(_userToRow(userObj));
    if (error) console.warn("Supabase: failed to create user", error);

    // If student, also enroll in teacher_students catalog table
    if (userObj.role === "student") {
      await sb.from("teacher_students").upsert({
        id: userObj.id || `STU-${Date.now().toString().slice(-6)}`,
        name: userObj.name,
        section: userObj.section || "Einstein",
        avg_score: 0,
        progress: 0,
        email: userObj.email,
        module_progress: {}
      });
    }
  } catch (e) { console.warn("Supabase: failed to create user", e.message); }
}

async function updateUserSupabase(email, userObj) {
  const sb = getClient();
  if (!sb) return;
  try {
    const row = _userToRow(userObj);
    delete row.email; // not changing the key here — see renameUserEmailSupabase for that
    const { error } = await sb.from("users").update(row).eq("email", email);
    if (error) console.warn("Supabase: failed to update user", error);
  } catch (e) { console.warn("Supabase: failed to update user", e.message); }
}

// Email is the primary key, so changing it needs its own path: copy the
// user's progress row forward under the new email first, insert the new
// users row, then delete the old one (its user_state row cascades away,
// but we've already carried it forward so nothing is lost).
async function renameUserEmailSupabase(oldEmail, newEmail, userObj) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { data: oldState } = await sb.from("user_state").select("data").eq("email", oldEmail).maybeSingle();
    const { error: insertErr } = await sb.from("users").insert(_userToRow(userObj));
    if (insertErr) { console.warn("Supabase: failed to rename user (insert)", insertErr); return; }
    if (oldState && oldState.data) {
      await sb.from("user_state").upsert({ email: newEmail, data: oldState.data, updated_at: new Date().toISOString() });
    }
    const { error: delErr } = await sb.from("users").delete().eq("email", oldEmail);
    if (delErr) console.warn("Supabase: failed to remove old email after rename", delErr);
  } catch (e) { console.warn("Supabase: failed to rename user", e.message); }
}

async function deleteUserSupabase(email) {
  const sb = getClient();
  if (!sb) return;
  try {
    // user_state has ON DELETE CASCADE on this FK, so its row goes too.
    const { error } = await sb.from("users").delete().eq("email", email);
    if (error) console.warn("Supabase: failed to delete user", error);
  } catch (e) { console.warn("Supabase: failed to delete user", e.message); }
}

// Pushes a student's live avg score / overall progress / per-module status
// to their teacher_students row. Without this, a teacher on another device
// only ever sees the static 0/0 values from account creation — the row is
// otherwise never updated after a student actually takes quizzes/reads
// modules, since that activity normally only touches that student's own
// user_state row. Debounced like the other background syncs.
let _studentStatsPushTimer = null;
function pushTeacherStudentStatsSupabase(id, statsObj) {
  const sb = getClient();
  if (!sb) return;
  clearTimeout(_studentStatsPushTimer);
  _studentStatsPushTimer = setTimeout(async () => {
    try {
      await sb.from("teacher_students").update({
        avg_score: statsObj.avgScore, progress: statsObj.progress, module_progress: statsObj.moduleProgress
      }).eq("id", id);
    } catch (e) { console.warn("Background student-stats sync to Supabase failed:", e.message); }
  }, 800);
}

async function pushTeacherStudentStatsSupabaseImmediate(id, statsObj) {
  const sb = getClient();
  if (!sb) return;
  clearTimeout(_studentStatsPushTimer);
  try {
    await sb.from("teacher_students").update({
      avg_score: statsObj.avgScore, progress: statsObj.progress, module_progress: statsObj.moduleProgress
    }).eq("id", id);
  } catch (e) {
    console.warn("Immediate student-stats sync failed:", e.message);
  }
}


/* =========================================================
   REALTIME — users & teacher_students
   These tables aren't part of shared_state (they're their own
   tables, not a single JSON blob), so they get their own
   channels. Lets the admin panel (Manage Users / Students)
   reflect changes made by another admin/device without a
   manual refresh — same idea as subscribeSharedStateSupabase.
========================================================= */
let _usersChannel = null;
function subscribeUsersSupabase(onRemoteChange) {
  const sb = getClient();
  if (!sb) return null;
  if (_usersChannel) return _usersChannel;

  _usersChannel = sb
    .channel("users_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      (payload) => onRemoteChange(payload)
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime: users subscription failed (" + status + ")");
      }
    });

  return _usersChannel;
}

let _teacherStudentsChannel = null;
function subscribeTeacherStudentsSupabase(onRemoteChange) {
  const sb = getClient();
  if (!sb) return null;
  if (_teacherStudentsChannel) return _teacherStudentsChannel;

  _teacherStudentsChannel = sb
    .channel("teacher_students_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teacher_students" },
      (payload) => onRemoteChange(payload)
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime: teacher_students subscription failed (" + status + ")");
      }
    });

  return _teacherStudentsChannel;
}

/* =========================================================
   ASSIGNMENTS — create/update/delete + realtime.
   Note: the `assignments` table (see supabase-schema.sql) has no
   `description` column yet, so that field stays local-only until
   the schema is migrated to add it:
     alter table assignments add column if not exists description text;
========================================================= */
function _assignmentToRow(a) {
  return {
    id: a.id, subject_id: a.subjectId, title: a.title, due: a.due,
    status: a.status, points: a.points, score: a.score !== undefined ? a.score : null
  };
}
async function createAssignmentSupabase(a) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("assignments").insert(_assignmentToRow(a));
    if (error) console.warn("Supabase: failed to create assignment", error);
  } catch (e) { console.warn("Supabase: failed to create assignment", e.message); }
}
async function updateAssignmentSupabase(a) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("assignments").update(_assignmentToRow(a)).eq("id", a.id);
    if (error) console.warn("Supabase: failed to update assignment", error);
  } catch (e) { console.warn("Supabase: failed to update assignment", e.message); }
}
async function deleteAssignmentSupabase(id) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("assignments").delete().eq("id", id);
    if (error) console.warn("Supabase: failed to delete assignment", error);
  } catch (e) { console.warn("Supabase: failed to delete assignment", e.message); }
}

let _assignmentsChannel = null;
function subscribeAssignmentsSupabase(onRemoteChange) {
  const sb = getClient();
  if (!sb) return null;
  if (_assignmentsChannel) return _assignmentsChannel;

  _assignmentsChannel = sb
    .channel("assignments_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "assignments" },
      (payload) => onRemoteChange(payload)
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime: assignments subscription failed (" + status + ")");
      }
    });

  return _assignmentsChannel;
}

/* =========================================================
   ANNOUNCEMENTS — create/update/delete + realtime.
========================================================= */
function _announcementToRow(a) {
  return {
    id: a.id, subject_id: a.subjectId, type: a.type, title: a.title, body: a.body,
    author: a.author, occurred_at: a.date, pinned: a.pinned
  };
}
async function createAnnouncementSupabase(a) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("announcements").insert(_announcementToRow(a));
    if (error) console.warn("Supabase: failed to create announcement", error);
  } catch (e) { console.warn("Supabase: failed to create announcement", e.message); }
}
async function updateAnnouncementSupabase(a) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("announcements").update(_announcementToRow(a)).eq("id", a.id);
    if (error) console.warn("Supabase: failed to update announcement", error);
  } catch (e) { console.warn("Supabase: failed to update announcement", e.message); }
}
async function deleteAnnouncementSupabase(id) {
  const sb = getClient();
  if (!sb) return;
  try {
    const { error } = await sb.from("announcements").delete().eq("id", id);
    if (error) console.warn("Supabase: failed to delete announcement", error);
  } catch (e) { console.warn("Supabase: failed to delete announcement", e.message); }
}

let _announcementsChannel = null;
function subscribeAnnouncementsSupabase(onRemoteChange) {
  const sb = getClient();
  if (!sb) return null;
  if (_announcementsChannel) return _announcementsChannel;

  _announcementsChannel = sb
    .channel("announcements_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcements" },
      (payload) => onRemoteChange(payload)
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime: announcements subscription failed (" + status + ")");
      }
    });

  return _announcementsChannel;
}
async function fetchSharedStateSupabase() {
  const sb = getClient();
  if (!sb) return null;
  try {
    const { data, error } = await withTimeout(sb.from("shared_state").select("data").eq("id", "global").maybeSingle());
    if (error || !data) return null;
    return data.data;
  } catch (e) { return null; }
}

let _sharedStatePushTimer = null;
function pushSharedStateSupabase(stateObj) {
  const sb = getClient();
  if (!sb) return;
  clearTimeout(_sharedStatePushTimer);
  _sharedStatePushTimer = setTimeout(async () => {
    try {
      await sb.from("shared_state").upsert({ id: "global", data: stateObj, updated_at: new Date().toISOString() });
    } catch (e) { console.warn("Background sync to Supabase failed (will retry on next change):", e.message); }
  }, 800);
}

// Same as above but fires right away, no debounce — used right after an
// explicit "Save" in the module/subject/quiz editor, where waiting 800ms
// risks losing the race against the user immediately refreshing the page.
async function pushSharedStateSupabaseImmediate(stateObj) {
  const sb = getClient();
  if (!sb) return;
  clearTimeout(_sharedStatePushTimer); // don't let a stale debounced push fire later and clobber this
  try {
    await sb.from("shared_state").upsert({ id: "global", data: stateObj, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn("Immediate sync to Supabase failed:", e.message);
  }
}

/* =========================================================
   REALTIME — live sync across all open browsers/devices.
   Whenever any teacher/admin adds or edits a subject/module/
   quiz (which lands in shared_state via pushSharedStateSupabase
   above), every OTHER open tab gets pushed the new row instantly
   over a websocket — no reload, no polling.

   Requires Realtime to be turned on for this table in Supabase:
     alter publication supabase_realtime add table shared_state;
   (see SUPABASE-SETUP.md)
========================================================= */
let _sharedStateChannel = null;
function subscribeSharedStateSupabase(onRemoteChange) {
  const sb = getClient();
  if (!sb) return null; // offline / not configured — no realtime, that's fine
  if (_sharedStateChannel) return _sharedStateChannel; // already subscribed once

  _sharedStateChannel = sb
    .channel("shared_state_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_state", filter: "id=eq.global" },
      (payload) => {
        const row = payload.new;
        if (row && row.data) onRemoteChange(row.data);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") console.log("Realtime: listening for shared content changes");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime: shared_state subscription failed (" + status + ") — falls back to load-time sync only");
      }
    });

  return _sharedStateChannel;
}

/* Same idea for a single logged-in user's own progress row — lets a
   student who has the app open on two devices (e.g. phone + laptop)
   see progress/downloads/settings sync live between them. Optional:
   only called if app.js wires it up for the current session. */
let _userStateChannel = null;
function subscribeUserStateSupabase(email, onRemoteChange) {
  const sb = getClient();
  if (!sb) return null;
  if (_userStateChannel) { sb.removeChannel(_userStateChannel); _userStateChannel = null; }

  _userStateChannel = sb
    .channel("user_state_changes_" + email)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_state", filter: `email=eq.${email}` },
      (payload) => {
        const row = payload.new;
        if (row && row.data) onRemoteChange(row.data);
      }
    )
    .subscribe();

  return _userStateChannel;
}