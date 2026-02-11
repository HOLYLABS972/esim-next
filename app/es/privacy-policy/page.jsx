'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyEs() {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Política de Privacidad</h1>
          <p className="text-gray-600">Holylabs Ltd - RoamJet</p>
          <p className="text-sm text-gray-500 mt-2">Última actualización: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Información Básica</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs Ltd ("Holylabs", "nosotros", "nos" o "nuestro") es una empresa registrada en el Reino Unido que reconoce la importancia de su privacidad.
              </p>
              <p>
                Entre sus diversas actividades, Holylabs puede recibir datos o información personal de sus clientes o usuarios. El propósito de esta Política de Privacidad es explicar el uso permitido de estos datos y explicar y dar a los usuarios y clientes de RoamJet información sobre qué tipo de datos almacena Holylabs y qué opciones tienen los usuarios y clientes con respecto a estos datos.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Puntos Clave:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>NO procesamos ni almacenamos ninguna información personal que no hayamos recibido directamente del sujeto.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Minimizamos los datos personales solicitados y almacenados tanto como sea posible.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Siempre puede contactarnos y solicitar que compartamos con usted los datos que tenemos y eliminar dichos datos (si los hay).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Todos los servicios de Holylabs están limitados a la edad de 18 años. En caso de uso por debajo de esta edad, se debe obtener el consentimiento de los padres.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introducción</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Respetamos su privacidad y estamos comprometidos a protegerla mediante nuestro cumplimiento con esta política de privacidad ("Política"). Esta Política describe los tipos de información que podemos recopilar de usted o que usted puede proporcionar ("Información Personal") en la aplicación móvil "RoamJet" y el sitio web (roamjet.net) ("Aplicación Móvil", "Sitio Web" o "Servicio") y cualquiera de sus productos y servicios relacionados (colectivamente, "Servicios"), y nuestras prácticas para recopilar, usar, mantener, proteger y divulgar esa Información Personal.
              </p>
            </div>
          </section>

          {/* Personal Information Collection */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recopilación de Información Personal</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Cuando se registra en los servicios de RoamJet, se le solicita que proporcione la siguiente información:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Su nombre</li>
                <li>Dirección de correo electrónico</li>
                <li>Información de facturación</li>
              </ul>
              <p>
                Mantenemos esta información y la usamos para operar el servicio, facturación y propósitos internos. <strong>Dicha información NO se transfiere a ningún tercero</strong> excepto para fines de procesamiento de pagos a través de pasarelas de pago seguras.
              </p>
              <p>
                Si tiene alguna pregunta sobre la información que almacenamos o sobre cualquier problema de privacidad, no dude en contactar a nuestro equipo por correo electrónico: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Sus Derechos</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Dependiendo de su ubicación y la ley aplicable, puede tener los siguientes derechos con respecto a su Información Personal:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Derecho de acceso:</strong> Tiene derecho a solicitar copias de sus datos personales.</li>
                <li><strong>Derecho de rectificación:</strong> Tiene derecho a solicitar que corrijamos cualquier información que crea que es inexacta o complete la información que crea que está incompleta.</li>
                <li><strong>Derecho de supresión:</strong> Tiene derecho a solicitar que eliminemos sus datos personales, bajo ciertas condiciones.</li>
                <li><strong>Derecho a restringir el procesamiento:</strong> Tiene derecho a solicitar que restrinjamos el procesamiento de sus datos personales, bajo ciertas condiciones.</li>
              </ul>
              <p>
                Para ejercer cualquiera de estos derechos, contáctenos en <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>. Responderemos a su solicitud dentro de 30 días.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contáctenos</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Si tiene alguna pregunta sobre esta Política de Privacidad o nuestras prácticas, contáctenos:
              </p>
              <p>
                Correo electrónico: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/es" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
