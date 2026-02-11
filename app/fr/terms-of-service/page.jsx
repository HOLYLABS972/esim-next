'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsOfServiceFr() {
  const currentDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Conditions d'Utilisation</h1>
          <p className="text-gray-600">RoamJet by Holylabs Ltd</p>
          <p className="text-sm text-gray-500 mt-2">Dernière mise à jour : {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                RoamJet est un produit de Holylabs Ltd ("Holylabs"). Holylabs, ses employés, gestionnaires et propriétaires sont heureux que vous ayez choisi d'utiliser RoamJet.
              </p>
              <p>
                En utilisant RoamJet (y compris toute utilisation de l'APP, du site Web (roamjet.net), des données, textes, images, vidéos, styles de conception, code informatique et code mobile de RoamJet, ou toute utilisation des services offerts sur RoamJet, y compris, mais sans s'y limiter, l'utilisation d'une eSIM) ("RoamJet"), vous acceptez d'être lié par ces conditions d'utilisation ("CGU"). Si vous n'acceptez pas les CGU, n'utilisez pas RoamJet.
              </p>
              <p className="font-semibold">
                Ces CGU affectent vos droits et obligations légaux. Si vous n'acceptez pas d'être lié par toutes les CGU, n'accédez pas ou n'utilisez pas RoamJet.
              </p>
            </div>
          </section>

          {/* Main Operation Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Directives Principales d'Opération et Politique de Remboursement</h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex">
                <span className="font-semibold mr-2">1.</span>
                <p>Lors de l'installation et de l'activation de l'eSIM, vous devez agir exactement selon les instructions dans l'APP et sur le site Web. Aucun remboursement ne sera accordé pour un forfait qui n'a pas été activé en raison du non-respect des instructions.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">2.</span>
                <p>Ne supprimez/retirez pas l'eSIM de l'appareil après son installation. Aucun crédit/remboursement ne sera accordé si l'eSIM est supprimée.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">3.</span>
                <p>Il n'y a pas de remboursement pour les données non utilisées.</p>
              </div>
              <div className="flex">
                <span className="font-semibold mr-2">4.</span>
                <p>Avant l'achat, l'utilisateur doit s'assurer que l'appareil prend en charge et est déverrouillé pour l'utilisation d'une eSIM.</p>
              </div>
            </div>
          </section>

          {/* Using RoamJet */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Utilisation de RoamJet</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                L'application, le service, le contenu, les données et les informations affichés dans ou envoyés par RoamJet sont fournis "tel quel", "selon disponibilité" et "avec tous les défauts". Vous, en tant qu'utilisateur, n'aurez aucune demande, réclamation légale ou autre réclamation concernant la qualité des données, les erreurs dans les données, la fausse déclaration (y compris la fausse déclaration concernant les eSIM disponibles, le niveau de service dans un pays spécifique, les vidéos, les prix, etc.), ou toute erreur de quelque nature que ce soit.
              </p>
              <p>
                Chez Holylabs, nous ferons de notre mieux pour vous fournir des services de haute qualité. Cependant, Holylabs ne garantit pas et ne peut pas garantir que les services eSIM n'auront pas de temps d'arrêt, ne seront pas interrompus ou seront sans erreur.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Propriété Intellectuelle et Droits d'Auteur</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Toute la propriété intellectuelle et les droits d'auteur concernant RoamJet, y compris l'APP, la conception, le code informatique, les graphiques, les images, la structure de l'application, du site et du code, et tout autre composant dans RoamJet appartiennent uniquement à Holylabs. Il est interdit de copier, distribuer, reproduire, afficher publiquement ou divulguer à des tiers toute partie de ce matériel protégé, sans consentement écrit préalable de Holylabs.
              </p>
            </div>
          </section>

          {/* General Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Général</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs se réserve le droit de poursuivre tout utilisateur pour tout dommage, préjudice, perte ou perte future de profits. Par exemple, de tels dommages peuvent être causés par une utilisation fictive de l'application, une attaque ou une surcharge des serveurs, la copie de données et/ou d'informations de RoamJet à des fins commerciales ou toute autre utilisation non autorisée.
              </p>
              <p>
                Ces CGU sont régies par les lois de l'Angleterre et du Pays de Galles. Tout litige entre l'utilisateur et Holylabs sera tenu devant les tribunaux compétents à Londres, Royaume-Uni.
              </p>
            </div>
          </section>

          {/* Back to Home */}
          <div className="pt-8 border-t border-gray-200">
            <Link 
              href="/fr" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Retour à l'Accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
