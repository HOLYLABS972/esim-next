'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyAr() {
  const currentDate = new Date().toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">سياسة الخصوصية</h1>
          <p className="text-gray-600">Holylabs Ltd - RoamJet</p>
          <p className="text-sm text-gray-500 mt-2">آخر تحديث: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">معلومات أساسية</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs Ltd ("Holylabs"، "نحن"، "لنا" أو "خاصتنا") هي شركة مسجلة في المملكة المتحدة تدرك أهمية خصوصيتك.
              </p>
              <p>
                من بين أنشطتها المتعددة، قد تتلقى Holylabs بيانات أو معلومات شخصية من عملائها أو مستخدميها. الغرض من سياسة الخصوصية هذه هو شرح الاستخدام المسموح به لهذه البيانات، وشرح وإعطاء مستخدمي وعملاء RoamJet معلومات بخصوص نوع البيانات التي تخزنها Holylabs، وما هي الخيارات المتاحة للمستخدمين والعملاء فيما يتعلق بهذه البيانات.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">النقاط الرئيسية:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>نحن لا نعالج ولا نخزن أي معلومات شخصية لم نتلقها منا مباشرة من الموضوع.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>نقوم بتقليل البيانات الشخصية المطلوبة والمخزنة قدر الإمكان.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>يمكنك دائمًا الاتصال بنا وطلب مشاركة البيانات التي لدينا معك، وحذف هذه البيانات (إن وجدت).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>جميع خدمات Holylabs مقتصرة على عمر 18 عامًا. في حالة الاستخدام دون هذا العمر، يجب الحصول على موافقة الوالدين.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">مقدمة</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                نحن نحترم خصوصيتك ونلتزم بحمايتها من خلال امتثالنا لسياسة الخصوصية هذه ("السياسة"). تصف هذه السياسة أنواع المعلومات التي قد نجمعها منك أو التي قد تقدمها ("المعلومات الشخصية") في تطبيق الهاتف المحمول "RoamJet" والموقع الإلكتروني (roamjet.net) ("تطبيق الهاتف المحمول"، "الموقع الإلكتروني" أو "الخدمة") وأي من منتجاتها وخدماتها ذات الصلة (مجتمعة، "الخدمات")، وممارساتنا لجمع واستخدام وصيانة وحماية والكشف عن تلك المعلومات الشخصية.
              </p>
              <p>
                هذه السياسة هي اتفاقية ملزمة قانونًا بينك ("المستخدم"، "أنت" أو "الخاص بك") وبين Holylabs Ltd. إذا كنت تدخل في هذه الاتفاقية نيابة عن شركة أو كيان قانوني آخر، فإنك تقر بأن لديك السلطة لإلزام هذا الكيان بهذه الاتفاقية، وفي هذه الحالة ستشير المصطلحات "المستخدم"، "أنت" أو "الخاص بك" إلى هذا الكيان. إذا لم يكن لديك هذه السلطة، أو إذا كنت لا توافق على شروط هذه الاتفاقية، فيجب ألا تقبل هذه الاتفاقية ولا يجوز لك الوصول إلى واستخدام تطبيق الهاتف المحمول والموقع الإلكتروني والخدمات.
              </p>
            </div>
          </section>

          {/* Continue with more sections... */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">جمع المعلومات الشخصية</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                عندما تسجل في خدمات RoamJet، يُطلب منك تقديم المعلومات التالية:
              </p>
              <ul className="list-disc pr-6 space-y-2">
                <li>اسمك</li>
                <li>عنوان البريد الإلكتروني</li>
                <li>معلومات الفواتير</li>
              </ul>
              <p>
                نحتفظ بهذه المعلومات ونستخدمها لتشغيل الخدمة والفواتير والأغراض الداخلية. <strong>لا يتم نقل هذه المعلومات إلى أي طرف ثالث</strong> باستثناء أغراض معالجة الدفع من خلال بوابات دفع آمنة.
              </p>
              <p>
                إذا كان لديك أي سؤال بخصوص المعلومات التي قمنا بتخزينها أو بخصوص أي مسألة تتعلق بالخصوصية، لا تتردد في الاتصال بفريقنا عبر البريد الإلكتروني: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">حقوقك</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                اعتمادًا على موقعك والقانون المعمول به، قد يكون لديك الحقوق التالية فيما يتعلق بمعلوماتك الشخصية:
              </p>
              <ul className="list-disc pr-6 space-y-2">
                <li><strong>الحق في الوصول:</strong> لديك الحق في طلب نسخ من بياناتك الشخصية.</li>
                <li><strong>الحق في التصحيح:</strong> لديك الحق في طلب تصحيح أي معلومات تعتقد أنها غير دقيقة أو إكمال المعلومات التي تعتقد أنها غير مكتملة.</li>
                <li><strong>الحق في المحو:</strong> لديك الحق في طلب حذف بياناتك الشخصية، في ظل ظروف معينة.</li>
                <li><strong>الحق في تقييد المعالجة:</strong> لديك الحق في طلب تقييد معالجة بياناتك الشخصية، في ظل ظروف معينة.</li>
              </ul>
              <p>
                لممارسة أي من هذه الحقوق، يرجى الاتصال بنا على <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>. سنرد على طلبك في غضون 30 يومًا.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">اتصل بنا</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه أو ممارساتنا، يرجى الاتصال بنا:
              </p>
              <p>
                البريد الإلكتروني: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
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
