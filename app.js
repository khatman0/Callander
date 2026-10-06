// ===== فقط این دو خط رو عوض کن =====
const SUPABASE_URL = 'https://ixncalwaoudpwqysqyoc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iK2bD-_Mny4t8x24kbbryQ_km94FKkl';
// ===================================

// (اسم متغیر db هست تا با window.supabase کتابخانه تداخل نکنه)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

// getDay() جاوااسکریپت: یکشنبه=0 ... شنبه=6  →  ما: شنبه=0 ... جمعه=6
function todayIndex() {
  return (new Date().getDay() + 1) % 7;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// عدد انگلیسی به فارسی
function toFA(s) {
  return String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// اگه لاگین نبود برگردون به صفحه‌ی ورود
async function requireSession() {
  const { data } = await db.auth.getSession();
  if (!data.session) {
    location.replace('index.html');
    return null;
  }
  return data.session;
}

// آیا دانشجو حداقل یک کلاس ثبت کرده؟
async function hasClasses() {
  const { count, error } = await db
    .from('my_classes')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count > 0;
}

async function logout() {
  await db.auth.signOut();
  location.replace('index.html');
}

// ===== نام کاربری و رمز عبور =====
// Supabase برای ورود ایمیل می‌خواد، پس نام کاربری رو پشت صحنه به یه ایمیل ساختگی تبدیل می‌کنیم.
// دانشجو فقط نام کاربری و رمز می‌بینه.

// یکسان‌سازی: حروف انگلیسی کوچک، ی/ک عربی → فارسی، اعداد فارسی/عربی → انگلیسی
function normalizeUsername(raw) {
  return String(raw)
    .trim()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase();
}

// فقط حروف فارسی، حروف انگلیسی و عدد. بدون فاصله و کاراکتر خاص.
const USERNAME_RE = /^[a-z0-9\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+$/;

// برمی‌گردونه: متن خطا، یا '' اگه درست بود
function validateUsername(raw) {
  const u = normalizeUsername(raw);
  if (!u) return 'نام کاربری رو وارد کن.';
  if (/\s/.test(u)) return 'نام کاربری نباید فاصله داشته باشه.';
  if (u.length < 3) return 'نام کاربری باید حداقل ۳ کاراکتر باشه.';
  if (u.length > 20) return 'نام کاربری باید حداکثر ۲۰ کاراکتر باشه.';
  if (!USERNAME_RE.test(u)) return 'نام کاربری فقط می‌تونه حروف فارسی، حروف انگلیسی و عدد داشته باشه.';
  return '';
}

function validatePassword(p) {
  if (!p) return 'رمز عبور رو وارد کن.';
  if (/\s/.test(p)) return 'رمز عبور نباید فاصله داشته باشه.';
  if (p.length < 6) return 'رمز عبور باید حداقل ۶ کاراکتر باشه.';
  if (p.length > 30) return 'رمز عبور باید حداکثر ۳۰ کاراکتر باشه.';
  return '';
}

// نام کاربری → ایمیل ساختگی (هش، تا فارسی هم کار کنه و طول ایمیل زیاد نشه)
async function usernameToEmail(raw) {
  const bytes = new TextEncoder().encode(normalizeUsername(raw));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `u${hex.slice(0, 40)}@users.classapp.com`;
}
