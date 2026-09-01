# EduBook LMS — Supabase + Netlify Setup

## Paano gumagana ngayon

Hindi na pure-localStorage lang ang app. Course content (subjects, modules,
quizzes, assignments, announcements) at student progress ay pwede nang
manggaling sa Supabase — pero **kung walang internet o hindi pa naka-configure
ang Supabase, babalik lang siya sa dating behavior** (bundled data.js +
localStorage). Wala kang masisira kahit hindi mo pa i-setup ang Supabase —
gagana pa rin siya gaya ng dati.

Ang `js/supabase-client.js` lang ang may alam tungkol kay Supabase — walang
ibang file na nag-a-assume na naka-configure na ito.

## 1. Gumawa ng Supabase project

1. Pumunta sa [supabase.com](https://supabase.com) → New Project.
2. Sa **SQL Editor**, i-run ito nang sunod-sunod (paste tapos Run):
   - `supabase-schema.sql` (gumagawa ng mga tables)
   - `seed-data.sql` (nilalagyan ng laman — subjects/modules/quizzes/users galing sa data.js)
   - `rls-policies.sql` (security rules + yung `verify_login` function)
3. Sa **Settings → API**, kunin ang:
   - **Project URL**
   - **anon public key**

## 2. I-configure ang app

Buksan ang `js/supabase-client.js`, palitan ang dalawang linya sa itaas:

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
```

Palitan ng actual values mo. `anon` key lang ito (public, safe ilagay sa
client-side code — hindi ito yung `service_role` key, huwag yun gagamitin dito).

## 3. I-deploy sa Netlify

Walang build step — static files lang ito. Pwede mong i-drag-and-drop yung
buong folder sa [app.netlify.com/drop](https://app.netlify.com/drop), o
i-connect via Git. Wala nang ibang setup — gagana na.

## Mahalagang alintuntunin (paki-basa)

- **Demo passwords are plaintext**, kagaya ng dati sa data.js. Okay lang ito
  para sa school prototype na may fixed demo accounts (student/teacher/admin),
  pero HUWAG ito gamitin as-is kung magdadagdag ka ng totoong accounts na may
  sensitive na password — sa totoong deployment, gamitin ang Supabase Auth
  imbes na custom `users` table.
- **Offline behavior**: nag-a-attempt ang app na kumonekta sa Supabase sa
  boot (may 6-second timeout). Kapag walang internet o hindi pa na-configure,
  bumabalik siya sa demo data + localStorage — parang wala lang, gaya ng
  orihinal na design mo.
- **Sync direction**: kapag naka-log in, pino-pull ang cloud progress
  (`user_state` row) papasok sa app; every save (`persist()`) ay
  nagpa-push pabalik sa Supabase sa background (may 800ms debounce) — hindi
  ito humaharang sa UI.
- **Manage Users panel**: naka-sync na rin ngayon ang add/edit/delete ng user
  accounts sa Supabase `users` table (hindi na local-only). Pag pinalitan mo
  yung email ng isang user, kinokopya muna nito yung `user_state` progress
  niya papunta sa bagong email bago tanggalin yung lumang row, para walang
  mawawalang progress.
- **RLS note**: dahil walang real login-session (walang Supabase Auth),
  bukas ang `user_state` table sa sinumang may anon key — parehas lang ng
  trust level ng dating localStorage (kahit sino sa browser mo pwede mag-edit).
  Para sa totoong multi-user na deployment na may privacy requirements,
  gamitin ang Supabase Auth + tamang RLS (`auth.uid()`-based policies) imbes
  nito.
