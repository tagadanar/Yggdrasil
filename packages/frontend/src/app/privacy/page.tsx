'use client';

import React from 'react';
import { Shield, ArrowLeft, Eye, Lock, Database, Users } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Politique de confidentialité
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

          {/* Quick Summary */}
          <div className="px-6 py-6 bg-blue-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              En résumé
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center text-sm text-blue-800">
                <Lock className="h-5 w-5 mr-2 text-blue-600" />
                Données sécurisées
              </div>
              <div className="flex items-center text-sm text-blue-800">
                <Eye className="h-5 w-5 mr-2 text-blue-600" />
                Transparence totale
              </div>
              <div className="flex items-center text-sm text-blue-800">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Contrôle de vos données
              </div>
              <div className="flex items-center text-sm text-blue-800">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Respect du RGPD
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
            <div className="prose prose-gray max-w-none">
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  1. Introduction
                </h2>
                <p className="text-gray-700 mb-4">
                  Chez 101 School, nous accordons une grande importance à la protection de vos données personnelles. 
                  Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et 
                  protégeons vos informations lorsque vous utilisez notre plateforme éducative.
                </p>
                <p className="text-gray-700 mb-4">
                  Nous nous conformons au Règlement Général sur la Protection des Données (RGPD) et à toutes 
                  les lois françaises applicables en matière de protection des données.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  2. Données que nous collectons
                </h2>
                
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Informations d'identification
                </h3>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone (optionnel)</li>
                  <li>Photo de profil (optionnelle)</li>
                  <li>Numéro d'étudiant ou identifiant personnel</li>
                  <li>Rôle (étudiant, enseignant, personnel, administrateur)</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Données d'utilisation
                </h3>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Historique de connexion</li>
                  <li>Pages visitées et actions effectuées</li>
                  <li>Préférences et paramètres</li>
                  <li>Données de performance et d'utilisation</li>
                  <li>Messages et communications</li>
                </ul>

                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Données techniques
                </h3>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et version</li>
                  <li>Système d'exploitation</li>
                  <li>Données de cookies</li>
                  <li>Données de session</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  3. Comment nous utilisons vos données
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous utilisons vos données personnelles pour :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Fournir et maintenir notre service éducatif</li>
                  <li>Créer et gérer votre compte utilisateur</li>
                  <li>Personnaliser votre expérience sur la plateforme</li>
                  <li>Communiquer avec vous (notifications, updates, support)</li>
                  <li>Améliorer nos services et développer de nouvelles fonctionnalités</li>
                  <li>Assurer la sécurité et prévenir les abus</li>
                  <li>Respecter nos obligations légales</li>
                  <li>Générer des statistiques anonymisées</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  4. Base légale du traitement
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous traitons vos données personnelles sur la base de :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li><strong>Consentement :</strong> Pour certaines fonctionnalités optionnelles</li>
                  <li><strong>Contrat :</strong> Pour fournir les services éducatifs</li>
                  <li><strong>Intérêt légitime :</strong> Pour améliorer nos services et assurer la sécurité</li>
                  <li><strong>Obligation légale :</strong> Pour respecter les exigences réglementaires</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  5. Partage des données
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos données uniquement dans les cas suivants :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li><strong>Avec votre consentement explicite</strong></li>
                  <li><strong>Prestataires de services :</strong> Partenaires techniques qui nous aident à fournir le service</li>
                  <li><strong>Obligations légales :</strong> Si requis par la loi ou une autorité compétente</li>
                  <li><strong>Protection des droits :</strong> Pour protéger nos droits, votre sécurité ou celle d'autrui</li>
                </ul>

                <div className="bg-green-50 p-4 rounded-lg mt-4">
                  <h4 className="font-medium text-green-900 mb-2">Nos prestataires respectent :</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Le RGPD et les lois de protection des données</li>
                    <li>• Des accords de traitement des données strictes</li>
                    <li>• Des mesures de sécurité appropriées</li>
                  </ul>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  6. Sécurité des données
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Chiffrement des données en transit et au repos</li>
                  <li>Authentification sécurisée et gestion des accès</li>
                  <li>Surveillance continue et détection des menaces</li>
                  <li>Sauvegardes régulières et plans de récupération</li>
                  <li>Formation du personnel sur la sécurité des données</li>
                  <li>Audits de sécurité réguliers</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  7. Conservation des données
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Fournir nos services</li>
                  <li>Respecter nos obligations légales</li>
                  <li>Résoudre les litiges</li>
                  <li>Faire respecter nos accords</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  En général, nous conservons les données de compte actif pendant la durée de votre inscription, 
                  puis pendant une période maximale de 3 ans après la fermeture du compte, sauf obligation légale contraire.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  8. Vos droits
                </h2>
                <p className="text-gray-700 mb-4">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Droit d'accès</h4>
                    <p className="text-sm text-gray-700">Obtenir une copie de vos données personnelles</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Droit de rectification</h4>
                    <p className="text-sm text-gray-700">Corriger des données inexactes ou incomplètes</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Droit à l'effacement</h4>
                    <p className="text-sm text-gray-700">Demander la suppression de vos données</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Droit de portabilité</h4>
                    <p className="text-sm text-gray-700">Récupérer vos données dans un format structuré</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">
                  Pour exercer ces droits, contactez-nous à privacy@101school.com ou utilisez les paramètres 
                  de votre compte.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  9. Cookies et technologies similaires
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous utilisons des cookies et technologies similaires pour :
                </p>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>Maintenir votre session connectée</li>
                  <li>Mémoriser vos préférences</li>
                  <li>Analyser l'utilisation du site</li>
                  <li>Améliorer les performances</li>
                </ul>
                <p className="text-gray-700 mb-4">
                  Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  10. Transferts internationaux
                </h2>
                <p className="text-gray-700 mb-4">
                  Vos données sont principalement traitées en France et dans l'Union Européenne. 
                  Si nous devons transférer des données vers des pays tiers, nous nous assurons que des 
                  garanties appropriées sont en place (décisions d'adéquation de la Commission européenne, 
                  clauses contractuelles types, etc.).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  11. Modifications de cette politique
                </h2>
                <p className="text-gray-700 mb-4">
                  Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. 
                  Nous vous informerons de tout changement important par email ou par notification sur la plateforme.
                </p>
                <p className="text-gray-700 mb-4">
                  Nous vous encourageons à consulter régulièrement cette page pour rester informé de nos pratiques.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  12. Contact et réclamations
                </h2>
                <p className="text-gray-700 mb-4">
                  Pour toute question concernant cette politique de confidentialité ou vos données personnelles :
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700">
                    <strong>Délégué à la Protection des Données (DPO)</strong><br />
                    Email : privacy@101school.com<br />
                    Adresse : 123 Rue de l'Éducation, 75001 Paris, France
                  </p>
                </div>
                <p className="text-gray-700 mb-4">
                  Si vous n'êtes pas satisfait de notre réponse, vous avez le droit de déposer une réclamation 
                  auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    <strong>CNIL</strong><br />
                    3 Place de Fontenoy - TSA 80715<br />
                    75334 PARIS CEDEX 07<br />
                    Téléphone : 01 53 73 22 22<br />
                    Site web : www.cnil.fr
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Vos données sont protégées et vous gardez le contrôle.
              </p>
              <div className="mt-4 sm:mt-0 space-x-4">
                <Link
                  href="/terms"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  Conditions d'utilisation
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