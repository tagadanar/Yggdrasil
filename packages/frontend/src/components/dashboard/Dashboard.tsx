'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import DashboardCard from './DashboardCard';

// Mock data - in a real app, this would come from API calls
const getDashboardData = (userRole: string) => {
  const baseData = {
    student: {
      stats: [
        {
          title: 'Cours suivis',
          value: 8,
          icon: BookOpen,
          color: 'primary' as const,
          change: { value: 12, label: 'ce semestre', trend: 'up' as const },
        },
        {
          title: 'Devoirs à rendre',
          value: 3,
          icon: Clock,
          color: 'warning' as const,
          change: { value: -25, label: 'cette semaine', trend: 'down' as const },
        },
        {
          title: 'Moyenne générale',
          value: '15.2/20',
          icon: TrendingUp,
          color: 'success' as const,
          change: { value: 8, label: 'ce mois', trend: 'up' as const },
        },
        {
          title: 'Présence',
          value: '94%',
          icon: CheckCircle,
          color: 'success' as const,
          change: { value: 2, label: 'ce mois', trend: 'up' as const },
        },
      ],
      recentActivities: [
        { title: 'Nouveau cours ajouté: JavaScript Avancé', time: 'Il y a 2 heures' },
        { title: 'Devoir rendu: Projet React', time: 'Il y a 1 jour' },
        { title: 'Note reçue: Examen TypeScript (17/20)', time: 'Il y a 2 jours' },
      ],
    },
    teacher: {
      stats: [
        {
          title: 'Cours enseignés',
          value: 5,
          icon: BookOpen,
          color: 'primary' as const,
          change: { value: 0, label: 'ce semestre', trend: 'neutral' as const },
        },
        {
          title: 'Étudiants',
          value: 127,
          icon: Users,
          color: 'success' as const,
          change: { value: 15, label: 'ce semestre', trend: 'up' as const },
        },
        {
          title: 'Devoirs à corriger',
          value: 23,
          icon: Clock,
          color: 'warning' as const,
          change: { value: -18, label: 'cette semaine', trend: 'down' as const },
        },
        {
          title: 'Taux de réussite',
          value: '87%',
          icon: TrendingUp,
          color: 'success' as const,
          change: { value: 5, label: 'ce mois', trend: 'up' as const },
        },
      ],
      recentActivities: [
        { title: 'Nouveau devoir créé: Projet Final', time: 'Il y a 1 heure' },
        { title: '15 devoirs corrigés', time: 'Il y a 3 heures' },
        { title: 'Cours planifié: React Hooks', time: 'Il y a 1 jour' },
      ],
    },
    staff: {
      stats: [
        {
          title: 'Utilisateurs actifs',
          value: 1248,
          icon: Users,
          color: 'primary' as const,
          change: { value: 8, label: 'ce mois', trend: 'up' as const },
        },
        {
          title: 'Cours disponibles',
          value: 45,
          icon: BookOpen,
          color: 'success' as const,
          change: { value: 12, label: 'ce semestre', trend: 'up' as const },
        },
        {
          title: 'Événements planifiés',
          value: 28,
          icon: Calendar,
          color: 'warning' as const,
          change: { value: -5, label: 'cette semaine', trend: 'down' as const },
        },
        {
          title: 'Tickets support',
          value: 7,
          icon: AlertCircle,
          color: 'error' as const,
          change: { value: -30, label: 'cette semaine', trend: 'down' as const },
        },
      ],
      recentActivities: [
        { title: 'Nouveau utilisateur inscrit', time: 'Il y a 30 minutes' },
        { title: 'Maintenance système programmée', time: 'Il y a 2 heures' },
        { title: 'Rapport mensuel généré', time: 'Il y a 1 jour' },
      ],
    },
    admin: {
      stats: [
        {
          title: 'Utilisateurs totaux',
          value: 1248,
          icon: Users,
          color: 'primary' as const,
          change: { value: 8, label: 'ce mois', trend: 'up' as const },
        },
        {
          title: 'Cours actifs',
          value: 45,
          icon: BookOpen,
          color: 'success' as const,
          change: { value: 12, label: 'ce semestre', trend: 'up' as const },
        },
        {
          title: 'Utilisation système',
          value: '78%',
          icon: TrendingUp,
          color: 'warning' as const,
          change: { value: 15, label: 'cette semaine', trend: 'up' as const },
        },
        {
          title: 'Taux de satisfaction',
          value: '94%',
          icon: CheckCircle,
          color: 'success' as const,
          change: { value: 3, label: 'ce mois', trend: 'up' as const },
        },
      ],
      recentActivities: [
        { title: 'Sauvegarde système effectuée', time: 'Il y a 1 heure' },
        { title: 'Nouveau module déployé', time: 'Il y a 4 heures' },
        { title: 'Rapport de sécurité généré', time: 'Il y a 1 jour' },
      ],
    },
  };

  return baseData[userRole as keyof typeof baseData] || baseData.student;
};

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const dashboardData = getDashboardData(user.role);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {user.profile?.firstName} !
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Voici un aperçu de votre activité sur la plateforme 101 School.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData.stats.map((stat, index) => (
          <DashboardCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            change={stat.change}
          />
        ))}
      </div>

      {/* Recent Activities and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-400" />
              Activités récentes
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a
                href="/activity"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                Voir toutes les activités →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-gray-400" />
              Actions rapides
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {user.role === 'student' && (
                <>
                  <a href="/courses/my-courses" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <BookOpen className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Mes cours</span>
                  </a>
                  <a href="/planning" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <Calendar className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Planning</span>
                  </a>
                </>
              )}
              {user.role === 'teacher' && (
                <>
                  <a href="/courses/create" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <BookOpen className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Créer un cours</span>
                  </a>
                  <a href="/users" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <Users className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Mes étudiants</span>
                  </a>
                </>
              )}
              {(user.role === 'admin' || user.role === 'staff') && (
                <>
                  <a href="/users" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <Users className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Gérer utilisateurs</span>
                  </a>
                  <a href="/statistics" className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                    <TrendingUp className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">Statistiques</span>
                  </a>
                </>
              )}
              <button className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <MessageSquare className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Messages</span>
              </button>
              <button className="flex flex-col items-center p-4 text-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600">Support</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}