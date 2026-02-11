'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyFr() {
  const currentDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Politique de Confidentialité</h1>
          <p className="text-gray-600">Holylabs Ltd - RoamJet</p>
          <p className="text-sm text-gray-500 mt-2">Dernière mise à jour : {currentDate}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Basic Info */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Informations de Base</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Holylabs Ltd ("Holylabs", "nous", "notre" ou "nos") est une société enregistrée au Royaume-Uni qui reconnaît l'importance de votre vie privée.
              </p>
              <p>
                Parmi ses diverses activités, Holylabs peut recevoir des données ou des informations personnelles de ses clients ou utilisateurs. Le but de cette politique de confidentialité est d'expliquer l'utilisation autorisée de ces données et d'expliquer et de donner aux utilisateurs et clients de RoamJet des informations concernant le type de données que Holylabs stocke et les options dont disposent les utilisateurs et clients concernant ces données.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Points Clés :</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Nous ne traitons et ne stockons AUCUNE information personnelle qui ne nous est pas directement reçue du sujet.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Nous minimisons les données personnelles demandées et stockées autant que possible.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Vous pouvez toujours nous contacter et demander que nous partagions avec vous les données que nous avons et supprimions ces données (le cas échéant).</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Tous les services de Holylabs sont limités à l'âge de 18 ans. En cas d'utilisation en dessous de cet âge, le consentement parental doit être obtenu.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Nous respectons votre vie privée et nous nous engageons à la protéger en respectant cette politique de confidentialité ("Politique"). Cette politique décrit les types d'informations que nous pouvons collecter auprès de vous ou que vous pouvez fournir ("Informations Personnelles") dans l'application mobile "RoamJet" et le site Web (roamjet.net) ("Application Mobile", "Site Web" ou "Service") et tous ses produits et services connexes (collectivement, "Services"), ainsi que nos pratiques de collecte, d'utilisation, de maintenance, de protection et de divulgation de ces informations personnelles.
              </p>
            </div>
          </section>

          {/* Personal Information Collection */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Collecte d'Informations Personnelles</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Lorsque vous vous inscrivez aux services de RoamJet, vous êtes invité à fournir les informations suivantes :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Votre nom</li>
                <li>Adresse e-mail</li>
                <li>Informations de facturation</li>
              </ul>
              <p>
                Nous conservons ces informations et les utilisons pour exploiter le service, la facturation et à des fins internes. <strong>Ces informations ne sont PAS transférées à un tiers</strong> sauf à des fins de traitement des paiements via des passerelles de paiement sécurisées.
              </p>
              <p>
                Si vous avez des questions concernant les informations que nous avons stockées ou concernant tout problème de confidentialité, n'hésitez pas à contacter notre équipe par e-mail : <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vos Droits</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Selon votre emplacement et la loi applicable, vous pouvez avoir les droits suivants concernant vos informations personnelles :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès :</strong> Vous avez le droit de demander des copies de vos données personnelles.</li>
                <li><strong>Droit de rectification :</strong> Vous avez le droit de demander que nous corrigions toute information que vous jugez inexacte ou que nous complétions les informations que vous jugez incomplètes.</li>
                <li><strong>Droit à l'effacement :</strong> Vous avez le droit de demander que nous effacions vos données personnelles, dans certaines conditions.</li>
                <li><strong>Droit de restreindre le traitement :</strong> Vous avez le droit de demander que nous restreignions le traitement de vos données personnelles, dans certaines conditions.</li>
              </ul>
              <p>
                Pour exercer l'un de ces droits, veuillez nous contacter à <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>. Nous répondrons à votre demande dans les 30 jours.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Nous Contacter</h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Si vous avez des questions sur cette politique de confidentialité ou nos pratiques, veuillez nous contacter :
              </p>
              <p>
                E-mail : <a href="mailto:support@roamjet.net" className="text-blue-600 hover:underline">support@roamjet.net</a>
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
