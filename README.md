# 🏠 מטבחי CRM — מדריך פריסה

## מה תקבלי בסוף?

---

## שלב 1: Supabase (בסיס נתונים בחינם)

1. כנסי ל-[supabase.com](https://supabase.com) → "Start your project"
2. צרי חשבון → צרי פרויקט חדש (תני לו שם כמו `kitchen-crm`)
3. בחרי region **Israel (il-central-1)** אם קיים, אחרת **Europe West**
4. לאחר שהפרויקט עלה (~2 דקות), לכי ל:
   - **SQL Editor** (בתפריט שמאלי) → **New Query**
   - הדביקי את תוכן הקובץ `supabase-schema.sql` → לחצי **Run**
5. לכי ל-**Settings → API**:
   - העתיקי את **Project URL** (כמו `https://xxxx.supabase.co`)
   - העתיקי את **anon public key**

---

## שלב 2: הגדרת משתני סביבה

1. העתיקי את `.env.example` ל-`.env.local`
2. מלאי את הפרטים שהעתקת מ-Supabase:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

*(אופציונלי)* להפעלת AI Center:
```
VITE_CLAUDE_API_KEY=sk-ant-...
```
מפתח ניתן לקבל ב-[console.anthropic.com](https://console.anthropic.com)

---

## שלב 3: בדיקה מקומית (אופציונלי)

```bash
npm install
npm run dev
```
פתחי דפדפן ב-`http://localhost:5173`

---

## שלב 4: פריסה ל-Vercel (חינם)

### דרך א — ממשק ויזואלי:
1. כנסי ל-[github.com](https://github.com) → צרי **New Repository**
2. העלי את כל הקבצים (גרורי לתוך הממשק)
3. כנסי ל-[vercel.com](https://vercel.com) → "Add New Project"
4. חברי את ה-GitHub repo שיצרת
5. ב-**Environment Variables** הוסיפי:
   - `VITE_SUPABASE_URL` = הערך מ-Supabase
   - `VITE_SUPABASE_ANON_KEY` = הערך מ-Supabase
6. לחצי **Deploy** → תוך דקה תקבלי כתובת URL

### דרך ב — שורת פקודה:
```bash
npm install -g vercel
vercel --prod
```

---

## שלב 5: הוספת עובדים

ב-Supabase → **Authentication → Users** → "Invite user" → שלחי הזמנה לכל עובד עם האימייל שלו.

או שהעובדים יכולים להירשם לבד דרך מסך ה-Login באפליקציה.

---

## שאלות נפוצות

**האם הנתונים משותפים?**
כן! כל שינוי שמישהו עושה מופיע לכולם בזמן אמת.

**כמה זה עולה?**
- Supabase: חינם עד 500MB ו-50,000 שורות (מספיק לשנים)
- Vercel: חינם לחלוטין לשימוש עסקי קטן

**האם אפשר לשנות את שם הדומיין?**
כן, ב-Vercel Settings → Domains אפשר לחבר דומיין שלך.
