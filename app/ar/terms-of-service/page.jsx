'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceAr() {
  const currentDate = new Date().toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">شروط الاستخدام</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">آخر تحديث: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">مقدمة</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet هو منتج من Holylabs Ltd ("Holylabs"). يسر Holylabs وموظفيها ومديريها وأصحابها أنك اخترت استخدام RoamJet.
              </p>
              <p>
                باستخدام RoamJet (بما في ذلك أي استخدام للتطبيق والموقع الإلكتروني (roamjet.net) والبيانات والنصوص والصور ومقاطع الفيديو وأنماط التصميم وكود الكمبيوتر وكود الهاتف المحمول في RoamJet، أو أي استخدام للخدمات المقدمة على RoamJet، بما في ذلك على سبيل المثال لا الحصر، استخدام eSIM) ("RoamJet") فإنك توافق على الالتزام بشروط الاستخدام هذه ("الشروط"). إذا كنت لا توافق على الشروط، فلا تستخدم RoamJet.
              </p>
              <p className="font-semibold">
                تؤثر هذه الشروط على حقوقك والتزاماتك القانونية. إذا كنت لا توافق على الالتزام بجميع الشروط، فلا تدخل أو تستخدم RoamJet.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">المبادئ التوجيهية الرئيسية وسياسة الاسترداد</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">١.</span>
                <p>عند تثبيت وتفعيل eSIM، يجب عليك التصرف وفقًا للتعليمات الموجودة في التطبيق وعلى الموقع الإلكتروني. لن يتم رد المبلغ لحزمة لم يتم تفعيلها بسبب عدم الامتثال للتعليمات.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">٢.</span>
                <p>لا تحذف/تزيل eSIM من الجهاز بعد تثبيته. لن يتم منح رصيد/استرداد إذا تمت إزالة eSIM.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">٣.</span>
                <p>لا يوجد استرداد للبيانات غير المستخدمة.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">٤.</span>
                <p>قبل الشراء، يجب على المستخدم التأكد من أن الجهاز يدعم eSIM وغير مقفل.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">استخدام RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                يتم توفير التطبيق والخدمة والمحتوى والبيانات والمعلومات المعروضة أو المرسلة بواسطة RoamJet "كما هي" و "كما هي متاحة" و "مع جميع الأخطاء". أنت، كمستخدم، لن يكون لديك أي مطالبة أو مطالبة قانونية أو مطالبة أخرى حول جودة البيانات أو الأخطاء في البيانات أو التحريف (بما في ذلك التحريف فيما يتعلق بـ eSIM المتاحة أو مستوى الخدمة في بلد معين أو مقاطع الفيديو أو التسعير وما إلى ذلك) أو أي خطأ من أي نوع كان.
              </p>
              <p>
                نحن في Holylabs سنبذل قصارى جهدنا لتزويدك بخدمات عالية الجودة. ومع ذلك، لا تضمن Holylabs ولا يمكنها ضمان أن خدمات eSIM لن تتعطل أو تتعطل أو تكون خالية من الأخطاء.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">الملكية الفكرية وحقوق النشر</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                جميع الملكية الفكرية وحقوق النشر المتعلقة بـ RoamJet، بما في ذلك التطبيق والتصميم وكود الكمبيوتر والرسومات والصور والتطبيق وبنية الموقع والكود وأي مكون آخر في RoamJet تنتمي فقط إلى Holylabs. يُحظر نسخ أو توزيع أو إعادة إنتاج أو عرض علنًا أو الكشف لأطراف ثالثة عن أي جزء من هذه المواد المحمية، دون موافقة مسبقة كتابيًا من Holylabs.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">عام</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                تحتفظ Holylabs بالحق في مقاضاة أي مستخدم عن أي ضرر أو أذى أو خسارة أو خسارة أرباح مستقبلية. على سبيل المثال، يمكن أن تحدث هذه الأضرار من خلال استخدام وهمي للتطبيق أو مهاجمة أو تحميل زائد على الخوادم أو نسخ البيانات و/أو المعلومات من RoamJet للاستخدام التجاري أو أي استخدام آخر غير مصرح به.
              </p>
              <p>
                تحكم هذه الشروط قوانين إنجلترا وويلز. سيتم عقد أي نزاع بين المستخدم و Holylabs في المحاكم المختصة في لندن، المملكة المتحدة.
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/ar" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              → العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
