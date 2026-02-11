'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceHe() {
  const currentDate = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">תנאי שימוש</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">עדכון אחרון: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">הקדמה</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet הוא מוצר של Holylabs Ltd ("Holylabs"). Holylabs, עובדיה, מנהליה ובעליה שמחים שבחרת להשתמש ב-RoamJet.
              </p>
              <p>
                על ידי שימוש ב-RoamJet (כולל כל שימוש באפליקציה, באתר (roamjet.net), נתונים, טקסטים, תמונות, סרטונים, סגנונות עיצוב, קוד מחשב וקוד נייד של RoamJet, או כל שימוש בשירותים המוצעים ב-RoamJet, כולל, אך לא רק, שימוש ב-eSIM) ("RoamJet") אתה מסכים להיות מחויב לתנאי שימוש אלה ("תנאי השימוש"). אם אינך מסכים לתנאי השימוש, אל תשתמש ב-RoamJet.
              </p>
              <p className="font-semibold">
                תנאי השימוש משפיעים על זכויותיך וחובותיך המשפטיים. אם אינך מסכים להיות קשור בכל תנאי השימוש, אל תיגש או תשתמש ב-RoamJet.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">הנחיות תפעול עיקריות ומדיניות החזרים</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">1.</span>
                <p>בעת התקנה והפעלה של eSIM, עליך לפעול בדיוק לפי ההוראות באפליקציה ובאתר. לא יינתן החזר כספי עבור חבילה שלא הופעלה עקב אי ציות להוראות.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">2.</span>
                <p>אל תמחק/תסיר את ה-eSIM מהמכשיר לאחר שהותקן. לא יינתן זיכוי/החזר כספי אם ה-eSIM יוסר.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">3.</span>
                <p>אין החזר כספי עבור נתונים שלא נוצלו.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">4.</span>
                <p>לפני הרכישה, על המשתמש לוודא שהמכשיר תומך ב-eSIM ואינו נעול.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">שימוש ב-RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                האפליקציה, השירות, התוכן, הנתונים והמידע המוצגים או הנשלחים על ידי RoamJet ניתנים "כמות שהם", "כפי שזמינים" ו"עם כל הליקויים". אתה, כמשתמש, לא תהיה לך כל דרישה, תביעה משפטית או תביעה אחרת לגבי איכות הנתונים, שגיאות בנתונים, הצגה מוטעית (כולל הצגה מוטעית בהתחשב ב-eSIM הזמינים, רמת השירות במדינה מסוימת, סרטונים, תמחור וכו'), או כל טעות מכל סוג שהוא.
              </p>
              <p>
                אנחנו ב-Holylabs נעשה כמיטב יכולתנו לספק לך שירותים באיכות גבוהה. עם זאת, Holylabs אינה ולא יכולה להבטיח ששירותי eSIM לא יהיו עם זמן השבתה, לא יופרעו או יהיו חסרי תקלות.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">קניין רוחני וזכויות יוצרים</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                כל הקניין הרוחני וזכויות היוצרים בנוגע ל-RoamJet, כולל האפליקציה, העיצוב, קוד המחשב, הגרפיקה, התמונות, מבנה האפליקציה, האתר והקוד, וכל רכיב אחר ב-RoamJet שייכים רק ל-Holylabs. אסור להעתיק, להפיץ, לשכפל, להציג בפומבי או לחשוף לצדדים שלישיים כל חלק מחומר מוגן זה, ללא הסכמה מראש בכתב מ-Holylabs.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">כללי</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs שומרת לעצמה את הזכות לתבוע כל משתמש עבור כל נזק, פגיעה, הפסד או הפסד רווחים עתידי. לדוגמה, נזקים כאלה יכולים להיגרם משימוש פיקטיבי באפליקציה, תקיפה או עומס יתר על השרתים, העתקת נתונים ו/או מידע מ-RoamJet לשימוש מסחרי או כל שימוש אחר שאינו מורשה.
              </p>
              <p>
                תנאי שימוש אלה יהיו כפופים לחוקי אנגליה ווילס. כל התדיינות בין המשתמש ל-Holylabs תתקיים בבתי המשפט המוסמכים בלונדון, בריטניה.
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/he" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              → חזור לדף הבית
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
