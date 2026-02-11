'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyDe() {
  const currentDate = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Datenschutzrichtlinie</h1>
          <p className="text-gray-600">Holylabs Ltd - RoamJet</p>
          <p className="text-sm text-gray-500 mt-2">Letzte Aktualisierung: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Grundlegende Informationen</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs Ltd ("Holylabs", "wir", "uns" oder "unser") ist ein im Vereinigten Königreich registriertes Unternehmen, das die Bedeutung Ihrer Privatsphäre anerkennt.
              </p>
              <p>
                Unter ihren verschiedenen Aktivitäten kann Holylabs Daten oder persönliche Informationen von ihren Kunden oder Benutzern erhalten. Der Zweck dieser Datenschutzrichtlinie besteht darin, die zulässige Verwendung dieser Daten zu erklären und den Benutzern und Kunden von RoamJet Informationen darüber zu geben, welche Art von Daten Holylabs speichert und welche Optionen die Benutzer und Kunden in Bezug auf diese Daten haben.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Wichtige Punkte:</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Wir verarbeiten und speichern KEINE persönlichen Informationen, die wir nicht direkt vom Betroffenen erhalten haben.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Wir minimieren die angeforderten und gespeicherten persönlichen Daten so weit wie möglich.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Sie können uns jederzeit kontaktieren und beantragen, dass wir die von uns gespeicherten Daten mit Ihnen teilen und solche Daten löschen (falls vorhanden).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Alle Dienste von Holylabs sind auf ein Alter von 18 Jahren beschränkt. Bei Nutzung unter diesem Alter muss die elterliche Zustimmung eingeholt werden.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Einleitung</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Wir respektieren Ihre Privatsphäre und verpflichten uns, sie durch die Einhaltung dieser Datenschutzrichtlinie ("Richtlinie") zu schützen. Diese Richtlinie beschreibt die Arten von Informationen, die wir von Ihnen sammeln oder die Sie bereitstellen können ("Persönliche Informationen") in der mobilen Anwendung "RoamJet" und auf der Website (roamjet.net) ("Mobile Anwendung", "Website" oder "Dienst") und allen damit verbundenen Produkten und Dienstleistungen (zusammen "Dienste"), sowie unsere Praktiken zum Sammeln, Verwenden, Pflegen, Schützen und Offenlegen dieser persönlichen Informationen.
              </p>
            </div>
          </section>

          {/* Personal Information Collection */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Erhebung persönlicher Informationen</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Wenn Sie sich für die Dienste von RoamJet registrieren, werden Sie gebeten, die folgenden Informationen bereitzustellen:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ihr Name</li>
                <li>E-Mail-Adresse</li>
                <li>Rechnungsinformationen</li>
              </ul>
              <p>
                Wir bewahren diese Informationen auf und verwenden sie für den Betrieb des Dienstes, die Abrechnung und interne Zwecke. <strong>Solche Informationen werden NICHT an Dritte weitergegeben</strong>, außer für Zahlungsabwicklungszwecke über sichere Zahlungsgateways.
              </p>
              <p>
                Sollten Sie Fragen zu den von uns gespeicherten Informationen oder zu Datenschutzfragen haben, zögern Sie nicht, unser Team per E-Mail zu kontaktieren: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ihre Rechte</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Abhängig von Ihrem Standort und dem geltenden Recht können Sie die folgenden Rechte in Bezug auf Ihre persönlichen Informationen haben:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Recht auf Zugang:</strong> Sie haben das Recht, Kopien Ihrer persönlichen Daten anzufordern.</li>
                <li><strong>Recht auf Berichtigung:</strong> Sie haben das Recht zu verlangen, dass wir Informationen korrigieren, die Sie für unrichtig halten, oder Informationen vervollständigen, die Sie für unvollständig halten.</li>
                <li><strong>Recht auf Löschung:</strong> Sie haben das Recht zu verlangen, dass wir Ihre persönlichen Daten löschen, unter bestimmten Bedingungen.</li>
                <li><strong>Recht auf Einschränkung der Verarbeitung:</strong> Sie haben das Recht zu verlangen, dass wir die Verarbeitung Ihrer persönlichen Daten einschränken, unter bestimmten Bedingungen.</li>
              </ul>
              <p>
                Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte unter <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>. Wir werden innerhalb von 30 Tagen auf Ihre Anfrage antworten.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Kontaktieren Sie uns</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Wenn Sie Fragen zu dieser Datenschutzrichtlinie oder unseren Praktiken haben, kontaktieren Sie uns bitte:
              </p>
              <p>
                E-Mail: <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/de" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
