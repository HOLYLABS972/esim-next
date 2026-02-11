'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceEs() {
  const currentDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Términos de Uso</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">Última actualización: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introducción</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet es un producto de Holylabs Ltd ("Holylabs"). Holylabs, sus empleados, gerentes y propietarios se complacen de que hayas elegido usar RoamJet.
              </p>
              <p>
                Al usar RoamJet (incluido cualquier uso de la APP, sitio web (roamjet.net), datos, textos, imágenes, videos, estilos de diseño, código de computadora y código móvil de RoamJet, o cualquier uso de los servicios ofrecidos en RoamJet, incluyendo, pero no limitado a, usar un eSIM) ("RoamJet") aceptas estar sujeto a estos términos de uso ("TDU"). Si no estás de acuerdo con los TDU, no uses RoamJet.
              </p>
              <p className="font-semibold">
                Estos TDU afectan tus derechos y obligaciones legales. Si no aceptas estar sujeto a todos los TDU, no accedas o uses RoamJet.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Directrices Principales de Operación y Política de Reembolso</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">1.</span>
                <p>Al instalar y activar el eSIM, debes actuar exactamente según las instrucciones en la APP y en el sitio web. No se dará reembolso por un paquete que no se activó debido al incumplimiento de las instrucciones.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">2.</span>
                <p>No elimines/remuevas el eSIM del dispositivo después de que se haya instalado. No se otorgará crédito/reembolso si se elimina el eSIM.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">3.</span>
                <p>No hay reembolso por datos no utilizados.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">4.</span>
                <p>Antes de la compra, el usuario debe asegurarse de que el dispositivo admita y esté desbloqueado para el uso de un eSIM.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Uso de RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                La aplicación, servicio, contenido, datos e información mostrados en o enviados por RoamJet se proporcionan "tal cual", "según disponibilidad" y "con todos los defectos". Tú, como usuario, no tendrás ninguna demanda, reclamación legal u otra reclamación sobre la calidad de los datos, errores en los datos, declaración errónea (incluida la declaración errónea considerando los eSIM disponibles, el nivel del servicio en un país específico, videos, precios, etc.), o cualquier error de cualquier tipo.
              </p>
              <p>
                En Holylabs haremos todo lo posible para brindarte servicios de alta calidad. Sin embargo, Holylabs no garantiza y no puede garantizar que los servicios eSIM no tendrán tiempo de inactividad, no se interrumpirán o estarán libres de errores.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Propiedad Intelectual y Derechos de Autor</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Toda la propiedad intelectual y los derechos de autor con respecto a RoamJet, incluida la APP, el diseño, el código de computadora, los gráficos, las imágenes, la estructura de la aplicación, del sitio y del código, y cualquier otro componente en RoamJet pertenecen solo a Holylabs. Está prohibido copiar, distribuir, reproducir, mostrar públicamente o divulgar a terceros cualquier parte de este material protegido, sin consentimiento previo por escrito de Holylabs.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">General</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs se reserva el derecho de demandar a cualquier usuario por cualquier daño, perjuicio, pérdida o pérdida futura de ganancias. Por ejemplo, tales daños pueden ser causados por el uso ficticio de la aplicación, atacar o sobrecargar los servidores, copiar datos y/o información de RoamJet para uso comercial o cualquier otro uso no permitido.
              </p>
              <p>
                Estos TDU se regirán por las leyes de Inglaterra y Gales. Cualquier litigio entre el usuario y Holylabs se llevará a cabo en los tribunales competentes de Londres, Reino Unido.
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
