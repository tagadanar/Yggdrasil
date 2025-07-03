'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle, BookOpen, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

// Mock activity data
const getActivitiesForRole = (role: string) => {
  const baseActivities = {
    student: [
      {
        id: 1,
        type: 'course',
        icon: BookOpen,
        title: 'Nouveau cours ajouté: JavaScript Avancé',
        description: 'Un nouveau cours sur les concepts avancés de JavaScript a été ajouté à votre programme.',
        time: 'Il y a 2 heures',
        date: '2023-12-15T14:30:00Z'
      },
      {
        id: 2,
        type: 'assignment',
        icon: CheckCircle,
        title: 'Devoir rendu: Projet React',
        description: 'Vous avez successfully rendu votre projet React avant la date limite.',
        time: 'Il y a 1 jour',
        date: '2023-12-14T10:15:00Z'
      },
      {
        id: 3,
        type: 'grade',
        icon: TrendingUp,
        title: 'Note reçue: Examen TypeScript (17/20)',
        description: 'Votre note pour l\'examen TypeScript a été publiée. Excellent travail!',
        time: 'Il y a 2 jours',
        date: '2023-12-13T16:45:00Z'
      },
      {
        id: 4,
        type: 'calendar',
        icon: Calendar,
        title: 'Rappel: Cours de React Hooks demain',
        description: 'N\'oubliez pas votre cours de React Hooks prévu demain à 14h00.',
        time: 'Il y a 3 jours',
        date: '2023-12-12T09:00:00Z'
      }
    ],
    teacher: [
      {
        id: 1,
        type: 'assignment',
        icon: BookOpen,
        title: 'Nouveau devoir créé: Projet Final',
        description: 'Vous avez créé un nouveau devoir pour vos étudiants en JavaScript.',
        time: 'Il y a 1 heure',
        date: '2023-12-15T15:30:00Z'
      },
      {
        id: 2,
        type: 'grading',
        icon: CheckCircle,
        title: '15 devoirs corrigés',
        description: 'Vous avez terminé la correction de 15 devoirs pour le cours React.',
        time: 'Il y a 3 heures',
        date: '2023-12-15T13:00:00Z'
      },
      {
        id: 3,
        type: 'calendar',
        icon: Calendar,
        title: 'Cours planifié: React Hooks',
        description: 'Nouveau cours sur les React Hooks planifié pour demain.',
        time: 'Il y a 1 jour',
        date: '2023-12-14T11:30:00Z'
      },
      {
        id: 4,
        type: 'students',
        icon: Users,
        title: '3 nouveaux étudiants inscrits',
        description: 'De nouveaux étudiants se sont inscrits à votre cours de JavaScript.',
        time: 'Il y a 2 jours',
        date: '2023-12-13T14:20:00Z'
      }
    ],
    staff: [
      {
        id: 1,
        type: 'user',
        icon: Users,
        title: 'Nouveau utilisateur inscrit',
        description: 'Un nouvel étudiant s\'est inscrit sur la plateforme.',
        time: 'Il y a 30 minutes',
        date: '2023-12-15T16:00:00Z'
      },
      {
        id: 2,
        type: 'system',
        icon: AlertCircle,
        title: 'Maintenance système programmée',
        description: 'Maintenance de routine programmée pour ce week-end.',
        time: 'Il y a 2 heures',
        date: '2023-12-15T14:00:00Z'
      },
      {
        id: 3,
        type: 'report',
        icon: TrendingUp,
        title: 'Rapport mensuel généré',
        description: 'Le rapport d\'activité mensuel a été généré avec succès.',
        time: 'Il y a 1 jour',
        date: '2023-12-14T09:00:00Z'
      }
    ],
    admin: [
      {
        id: 1,
        type: 'system',
        icon: CheckCircle,
        title: 'Sauvegarde système effectuée',
        description: 'Sauvegarde automatique du système terminée avec succès.',
        time: 'Il y a 1 heure',
        date: '2023-12-15T15:00:00Z'
      },
      {
        id: 2,
        type: 'deployment',
        icon: AlertCircle,
        title: 'Nouveau module déployé',
        description: 'Module de statistiques avancées déployé en production.',
        time: 'Il y a 4 heures',
        date: '2023-12-15T12:00:00Z'
      },
      {
        id: 3,
        type: 'security',
        icon: TrendingUp,
        title: 'Rapport de sécurité généré',
        description: 'Rapport de sécurité hebdomadaire généré et analysé.',
        time: 'Il y a 1 jour',
        date: '2023-12-14T08:00:00Z'
      }
    ]
  };

  return baseActivities[role as keyof typeof baseActivities] || baseActivities.student;
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'course':
    case 'assignment':
      return 'bg-blue-100 text-blue-600';
    case 'grade':
    case 'grading':
      return 'bg-green-100 text-green-600';
    case 'calendar':
      return 'bg-purple-100 text-purple-600';
    case 'user':
    case 'students':
      return 'bg-indigo-100 text-indigo-600';
    case 'system':
    case 'deployment':
      return 'bg-orange-100 text-orange-600';
    case 'security':
    case 'report':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export default function ActivityPage() {
  const { user } = useAuth();
  
  const activities = user ? getActivitiesForRole(user.role) : [];

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Activités récentes
            </h1>
            <p className="text-gray-600">
              Consultez toutes vos activités et interactions sur la plateforme.
            </p>
          </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-400" />
              Historique d'activité
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              const colorClasses = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {activities.length === 0 && (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune activité récente
              </h3>
              <p className="text-gray-600">
                Vos activités sur la plateforme apparaîtront ici.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}