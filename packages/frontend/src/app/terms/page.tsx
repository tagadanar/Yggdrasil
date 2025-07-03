'use client';

import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Conditions d'utilisation
                  </h1>
                  <p className="text-sm text-gray-500">
                    Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour à l'inscription
              </Link>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  1. Acceptation des conditions
                </h2>
                <p className="text-gray-700 mb-4">
                  En accédant et en utilisant la plateforme 101 School, vous acceptez d'être lié par ces conditions d'utilisation. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  2. Description du service
                </h2>
                <p className="text-gray-700 mb-4">
                  101 School est une plateforme éducative en ligne qui permet aux étudiants, enseignants et personnel administratif 
                  de gérer les cours, les emplois du temps, les évaluations et autres activités pédagogiques.
                </p>
                <p className="text-gray-700 mb-4">
                  Le service comprend notamment :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Gestion des cours et des inscriptions</li>
                  <li>Calendrier et planification</li>
                  <li>Système de notifications</li>
                  <li>Statistiques et rapports</li>
                  <li>Gestion des utilisateurs</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  3. Comptes utilisateurs
                </h2>
                <p className="text-gray-700 mb-4">
                  Pour utiliser notre service, vous devez créer un compte avec des informations exactes et complètes. 
                  Vous êtes responsable de maintenir la confidentialité de vos identifiants de connexion.
                </p>
                <p className="text-gray-700 mb-4">
                  Vous vous engagez à :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Fournir des informations exactes lors de l'inscription</li>
                  <li>Maintenir la sécurité de votre mot de passe</li>
                  <li>Notifier immédiatement toute utilisation non autorisée de votre compte</li>
                  <li>Ne pas partager votre compte avec d'autres personnes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  4. Utilisation acceptable
                </h2>
                <p className="text-gray-700 mb-4">
                  Vous acceptez d'utiliser le service uniquement à des fins légales et conformément à ces conditions. 
                  Il est interdit de :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Violer les lois ou règlements applicables</li>
                  <li>Harceler, menacer ou intimider d'autres utilisateurs</li>
                  <li>Publier du contenu offensant, diffamatoire ou inapproprié</li>
                  <li>Tenter d'accéder de manière non autorisée au système</li>
                  <li>Utiliser le service à des fins commerciales non autorisées</li>
                  <li>Perturber le fonctionnement normal du service</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  5. Propriété intellectuelle
                </h2>
                <p className="text-gray-700 mb-4">
                  Le contenu de la plateforme, incluant mais non limité aux textes, graphiques, logos, icônes, images, 
                  clips audio, téléchargements numériques et logiciels, est la propriété de 101 School ou de ses 
                  fournisseurs de contenu et est protégé par les lois françaises et internationales sur le droit d'auteur.
                </p>
                <p className="text-gray-700 mb-4">
                  Vous conservez la propriété du contenu que vous créez et partagez sur la plateforme, mais vous nous 
                  accordez une licence pour l'utiliser dans le cadre de la fourniture de nos services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  6. Protection des données
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous nous engageons à protéger vos données personnelles conformément au Règlement Général sur la 
                  Protection des Données (RGPD). Consultez notre 
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-500 underline ml-1">
                    politique de confidentialité
                  </Link> 
                  {' '}pour plus d'informations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  7. Limitation de responsabilité
                </h2>
                <p className="text-gray-700 mb-4">
                  101 School fournit le service "en l'état" sans garantie d'aucune sorte. Nous ne pouvons garantir 
                  que le service sera ininterrompu ou exempt d'erreurs.
                </p>
                <p className="text-gray-700 mb-4">
                  Dans la mesure permise par la loi, 101 School ne sera pas responsable des dommages indirects, 
                  spéciaux, consécutifs ou punitifs résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  8. Suspension et résiliation
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous nous réservons le droit de suspendre ou de résilier votre accès au service à tout moment, 
                  avec ou sans préavis, si vous violez ces conditions d'utilisation.
                </p>
                <p className="text-gray-700 mb-4">
                  Vous pouvez résilier votre compte à tout moment en nous contactant ou en utilisant les options 
                  disponibles dans votre profil.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  9. Modifications des conditions
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment. 
                  Les modifications prendront effet immédiatement après leur publication sur cette page.
                </p>
                <p className="text-gray-700 mb-4">
                  Il est de votre responsabilité de consulter régulièrement ces conditions pour vous tenir 
                  informé des éventuelles modifications.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  10. Loi applicable et juridiction
                </h2>
                <p className="text-gray-700 mb-4">
                  Ces conditions d'utilisation sont régies par le droit français. Tout litige sera soumis 
                  à la juridiction exclusive des tribunaux français.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  11. Contact
                </h2>
                <p className="text-gray-700 mb-4">
                  Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à :
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>101 School</strong><br />
                    Email : legal@101school.com<br />
                    Téléphone : +33 1 23 45 67 89<br />
                    Adresse : 123 Rue de l'Éducation, 75001 Paris, France
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                En continuant à utiliser nos services, vous acceptez ces conditions.
              </p>
              <div className="mt-4 sm:mt-0 space-x-4">
                <Link
                  href="/privacy"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Politique de confidentialité
                </Link>
                <Link
                  href="/register"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Créer un compte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}