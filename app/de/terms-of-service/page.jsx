'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceDe() {
  const currentDate = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nutzungsbedingungen</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">Letzte Aktualisierung: {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Einleitung</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet ist ein Produkt von Holylabs Ltd ("Holylabs"). Holylabs, seine Mitarbeiter, Manager und Eigentümer freuen sich, dass Sie sich für die Nutzung von RoamJet entschieden haben.
              </p>
              <p>
                Durch die Nutzung von RoamJet (einschließlich jeder Nutzung der APP, Website (roamjet.net), Daten, Texte, Bilder, Videos, Designstile, Computercode und Mobilcode von RoamJet oder jeder Nutzung der auf RoamJet angebotenen Dienste, einschließlich, aber nicht beschränkt auf die Verwendung einer eSIM) ("RoamJet") stimmen Sie zu, an diese Nutzungsbedingungen ("AGB") gebunden zu sein. Wenn Sie den AGB nicht zustimmen, nutzen Sie RoamJet nicht.
              </p>
              <p className="font-semibold">
                Diese AGB beeinflussen Ihre gesetzlichen Rechte und Pflichten. Wenn Sie nicht damit einverstanden sind, an alle AGB gebunden zu sein, greifen Sie nicht auf RoamJet zu oder nutzen Sie es nicht.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Hauptbetriebsrichtlinien und Rückerstattungsrichtlinie</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">1.</span>
                <p>Bei der Installation und Aktivierung der eSIM müssen Sie genau nach den Anweisungen in der APP und auf der Website handeln. Für ein Paket, das aufgrund der Nichteinhaltung der Anweisungen nicht aktiviert wurde, wird keine Rückerstattung gewährt.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">2.</span>
                <p>Löschen/entfernen Sie die eSIM nicht vom Gerät, nachdem sie installiert wurde. Es wird keine Gutschrift/Rückerstattung gewährt, wenn die eSIM entfernt wird.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">3.</span>
                <p>Es gibt keine Rückerstattung für nicht genutzte Daten.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">4.</span>
                <p>Vor dem Kauf muss der Benutzer sicherstellen, dass das Gerät eSIM unterstützt und entsperrt ist.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Nutzung von RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Die App, der Dienst, die Inhalte, Daten und Informationen, die in RoamJet angezeigt oder von RoamJet gesendet werden, werden "wie besehen", "wie verfügbar" und "mit allen Fehlern" bereitgestellt. Sie als Benutzer haben keine Forderung, keinen Rechtsanspruch oder anderen Anspruch bezüglich der Datenqualität, Fehler in den Daten, falscher Darstellung (einschließlich falscher Darstellung in Bezug auf verfügbare eSIMs, das Serviceniveau in einem bestimmten Land, Videos, Preise usw.) oder irgendeinem Fehler jeglicher Art.
              </p>
              <p>
                Wir bei Holylabs werden unser Bestes tun, um Ihnen qualitativ hochwertige Dienste anzubieten. Holylabs garantiert jedoch nicht und kann nicht garantieren, dass die eSIM-Dienste keine Ausfallzeiten haben, nicht unterbrochen werden oder fehlerfrei sind.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Geistiges Eigentum und Urheberrechte</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Alle geistigen Eigentumsrechte und Urheberrechte in Bezug auf RoamJet, einschließlich der APP, des Designs, des Computercodes, der Grafiken, Bilder, der Anwendungs-, Website- und Codestruktur und jeder anderen Komponente in RoamJet, gehören ausschließlich Holylabs. Es ist verboten, irgendeinen Teil dieses geschützten Materials ohne vorherige schriftliche Zustimmung von Holylabs zu kopieren, zu verteilen, zu reproduzieren, öffentlich anzuzeigen oder an Dritte weiterzugeben.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Allgemeines</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs behält sich das Recht vor, jeden Benutzer für jeden Schaden, Verlust oder zukünftigen Gewinnverlust zu verklagen. Zum Beispiel können solche Schäden durch fiktive Nutzung der App, Angriff oder Überlastung der Server, Kopieren von Daten und/oder Informationen von RoamJet für kommerzielle Zwecke oder jede andere unerlaubte Nutzung verursacht werden.
              </p>
              <p>
                Diese AGB unterliegen den Gesetzen von England und Wales. Jede Rechtsstreitigkeit zwischen dem Benutzer und Holylabs wird vor den zuständigen Gerichten in London, Vereinigtes Königreich, verhandelt.
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
