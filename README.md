# Violi

Web app για μέτρηση θερμίδων, μακρο, βιταμινών και μετάλλων, με AI ανάλυση φωτογραφίας πιάτου, σύνδεση με Garmin και Strava και social / gamification (levels, streaks, leaderboards, W/L).

> Nutrition tracking (MacroFactor-style adaptive targets + Cal AI-style photo logging) with Garmin/Strava sync and a social, game-like layer. Greek & English UI, dark/light theme, installable as a PWA.

## Τι κάνει

| | |
|---|---|
| **Καταγραφή φαγητού** | Αναζήτηση (ελληνική βάση ~125 τροφίμων + Open Food Facts + USDA), barcode (κάμερα ή πληκτρολόγηση), **AI φωτογραφία πιάτου**, **AI περιγραφή** («2 αυγά με φέτα…»), γρήγορη καταγραφή, δικά σου τρόφιμα, πρόσφατα & αγαπημένα |
| **Έτοιμα γεύματα** | Φτιάχνεις μια φορά τα φαγητά που τρως συχνά (υλικά + γραμμάρια, προαιρετικά βάρος μαγειρεμένου), και μετά τα καταγράφεις γράφοντας μόνο πόσο ζύγισε η μερίδα. Ή «Αποθήκευση ως έτοιμο γεύμα» από ένα γεύμα της ημέρας |
| **Στόχοι** | Mifflin-St Jeor BMR × καθημερινή κίνηση → αρχική κατανάλωση. Θερμίδες/μακρο ανά στόχο (απώλεια/διατήρηση/αύξηση) και τύπο διατροφής. Βιταμίνες & μέταλλα με RDA/AI ανά φύλο/ηλικία |
| **Adaptive TDEE (σαν MacroFactor)** | Εβδομαδιαίο check-in: «ενεργειακό ισοζύγιο ανάποδα» από τάση βάρους (EMA) + πρόσληψη 21 ημερών → νέα εκτίμηση κατανάλωσης → νέοι στόχοι, με ομαλή προσαρμογή |
| **Άσκηση** | Οι προπονήσεις (Garmin, Strava, αρχείο .FIT, χειροκίνητα) προσθέτουν θερμίδες στον ημερήσιο ισολογισμό (ρυθμιζόμενο %, προεπιλογή 75%) |
| **Γυμναστήριο (σαν Hevy)** | Βιβλιοθήκη 114 ασκήσεων (+ δικές σου), routines, ζωντανή καταγραφή με στήλη «Προηγούμενο», τύπους σετ (προθέρμανση / αποτυχία / drop), supersets, χρονόμετρο ξεκούρασης, PRs & εκτιμώμενο 1RM, ιστορικό και γραφήματα ανά άσκηση, κατανομή μυών, υπολογιστής δίσκων & 1RM, κοινοποίηση στο feed με φωτογραφία |
| **Gamification** | XP για καταγραφή, ημέρες στον στόχο, πρωτεΐνη, ζύγισμα, προπονήσεις, check-in · levels & ranks (Bronze → Legend) · streaks · 19 επιτεύγματα · εβδομαδιαία leaderboards φίλων / global |
| **Social** | Feed, δημοσιεύσεις γευμάτων/προπονήσεων/προόδου/κειμένου με φωτογραφία, **W / L** (like / dislike), σχόλια, follow, ειδοποιήσεις, ορατότητα ανά δημοσίευση (Δημόσιο / Φίλοι / Μόνο εγώ), ρυθμίσεις απορρήτου |

## Εκκίνηση

Χρειάζεται Node.js 20+.

```bash
npm install
cp .env.example .env        # βάλε τα κλειδιά που έχεις
npm run setup               # δημιουργεί τη βάση (SQLite) και τα δεδομένα (τρόφιμα, ασκήσεις, demo)
npm run dev                 # http://localhost:3000
```

Σε υπάρχουσα βάση, μετά από `git pull`: `npx prisma db push && npx tsx prisma/seed-gym.ts` (προσθέτει μόνο ό,τι λείπει).

Το `npm run setup` φτιάχνει και έναν **demo λογαριασμό** με 3 εβδομάδες ιστορικό και 4 φίλους. Τα στοιχεία σύνδεσης είναι στην κορυφή του [`prisma/seed.ts`](prisma/seed.ts). Αν δεν θέλεις demo δεδομένα: `SEED_DEMO=0 npm run setup`.

## Κλειδιά (`.env`)

| Μεταβλητή | Για τι | Πού |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI φωτογραφία & περιγραφή γεύματος (Claude) | https://console.anthropic.com |
| `USDA_API_KEY` | Αναζήτηση USDA (το `DEMO_KEY` δουλεύει με όρια) | https://fdc.nal.usda.gov/api-key-signup |
| `STRAVA_CLIENT_ID` / `SECRET` | Σύνδεση Strava | https://www.strava.com/settings/api (Authorization Callback Domain: `localhost`) |
| `GARMIN_CLIENT_ID` / `SECRET` | Σύνδεση Garmin | https://developer.garmin.com/gc-developer-program/ |

### Garmin
Το Garmin Connect Developer Program (Health/Activity API) **απαιτεί έγκριση** από τη Garmin για επιχειρήσεις. Ο κώδικας για OAuth 2.0 PKCE και webhooks (push & ping για `activities`, `dailies`, `deregistrations`) είναι έτοιμος στο [`src/lib/integrations/garmin.ts`](src/lib/integrations/garmin.ts). Μόλις πάρεις κλειδιά, όρισε ως webhook URL το `https://<domain>/api/integrations/garmin/webhook` και έλεγξε τα endpoints στα docs του portal.
**Μέχρι τότε:** στο Garmin Connect, Δραστηριότητα → ⚙ → «Εξαγωγή αρχικού αρχείου» → ανέβασμα του `.FIT` στη σελίδα Προπονήσεις.

### Strava
Από τον Νοέμβριο του 2024 το [Strava API Agreement](https://www.strava.com/legal/api) επιτρέπει να φαίνονται τα δεδομένα Strava ενός χρήστη **μόνο στον ίδιο**. Γι' αυτό οι προπονήσεις από Strava μετράνε στον ισολογισμό θερμίδων του χρήστη, αλλά δεν μπαίνουν στο feed, στα leaderboards ή στο XP. Webhook: `https://<domain>/api/integrations/strava/webhook`. Τα νέα Strava apps ξεκινούν με όριο 1 αθλητή μέχρι να εγκριθούν.

## Τεχνολογία

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Prisma + SQLite · Claude API (`claude-opus-5-5`, vision + structured outputs) · Open Food Facts · USDA FoodData Central · fit-file-parser

```
src/lib/nutrition.ts      BMR, στόχοι, adaptive TDEE, τάση βάρους
src/lib/nutrients.ts      βιταμίνες/μέταλλα & ημερήσιες ανάγκες
src/lib/gamification.ts   XP, streaks, επιτεύγματα
src/lib/plan.ts           ημερήσιος ισολογισμός & εβδομαδιαίο check-in
src/lib/social.ts         feed, ορατότητα, leaderboards
src/lib/integrations/     Garmin, Strava, .FIT
src/app/(app)/            σελίδες: today, log, progress, nutrients, workouts, social, u/[username], settings
```

## Production

- Άλλαξε το `provider` στο `prisma/schema.prisma` σε `postgresql` και βάλε `DATABASE_URL` (π.χ. Neon/Supabase).
- Οι φωτογραφίες αποθηκεύονται τοπικά στο `uploads/` ([`src/lib/uploads.ts`](src/lib/uploads.ts)). Για serverless hosting (Vercel) άλλαξέ το σε object storage (Vercel Blob / S3 / R2).
- Όρισε `APP_URL` στο δημόσιο domain για τα OAuth redirects.
