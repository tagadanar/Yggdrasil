'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { userAPI } from '@/utils/api';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  Camera,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  Award,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    department: '',
    studentId: ''
  });

  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        phone: user.profile.phone || '',
        bio: user.profile.bio || '',
        department: user.profile.department || '',
        studentId: user.profile.studentId || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await userAPI.updateProfile(user._id, {
        profile: profileData
      });

      if (response.success) {
        updateUser(response.data);
        setEditing(false);
        toast.success('Profil mis à jour avec succès');
      } else {
        toast.error(response.error || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 5MB');
      return;
    }

    setLoading(true);
    try {
      const response = await userAPI.uploadPhoto(file);
      
      if (response.success) {
        // Update user with new photo URL
        const updatedUser = {
          ...user!,
          profile: {
            ...user!.profile,
            profilePhoto: response.data.photoUrl
          }
        };
        updateUser(updatedUser);
        toast.success('Photo de profil mise à jour');
      } else {
        toast.error(response.error || 'Erreur lors du téléchargement');
      }
    } catch (error: any) {
      toast.error('Erreur lors du téléchargement de la photo');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'staff': return 'Personnel';
      case 'teacher': return 'Enseignant';
      case 'student': return 'Étudiant';
      default: return 'Utilisateur';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Chargement...</h1>
            <p className="text-gray-600">Veuillez patienter pendant le chargement de votre profil.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mon Profil
            </h1>
            <p className="text-gray-600">
              Gérez vos informations personnelles et vos préférences.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-center">
                  {/* Profile Photo */}
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto flex items-center justify-center overflow-hidden">
                      {user.profile?.profilePhoto ? (
                        <img
                          src={user.profile.profilePhoto}
                          alt="Photo de profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-16 h-16 text-gray-500" />
                      )}
                    </div>
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={loading}
                    />
                  </div>

                  <h2 className="mt-4 text-xl font-semibold text-gray-900">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </h2>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>

                  <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 space-y-3">
                    <Link
                      href="/settings"
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier le profil
                    </Link>
                    
                    {user.role === 'student' && (
                      <Link
                        href="/courses/my-courses"
                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Mes cours
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Card */}
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statut</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    {user.isActive ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">Compte actif</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-sm text-gray-700">Compte inactif</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      Dernière connexion: {new Date(user.lastLogin || user.updatedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Informations personnelles
                  </h3>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          // Reset to original values
                          if (user?.profile) {
                            setProfileData({
                              firstName: user.profile.firstName || '',
                              lastName: user.profile.lastName || '',
                              phone: user.profile.phone || '',
                              bio: user.profile.bio || '',
                              department: user.profile.department || '',
                              studentId: user.profile.studentId || ''
                            });
                          }
                        }}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{user.profile?.firstName || 'Non renseigné'}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{user.profile?.lastName || 'Non renseigné'}</p>
                      )}
                    </div>

                    {/* Email (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email
                      </label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Téléphone
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{user.profile?.phone || 'Non renseigné'}</p>
                      )}
                    </div>

                    {/* Role-specific fields */}
                    {user.role === 'student' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numéro d'étudiant
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={profileData.studentId}
                            onChange={(e) => setProfileData({...profileData, studentId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{user.profile?.studentId || 'Non renseigné'}</p>
                        )}
                      </div>
                    )}

                    {(user.role === 'teacher' || user.role === 'staff') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Département
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={profileData.department}
                            onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="text-gray-900">{user.profile?.department || 'Non renseigné'}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {editing ? (
                      <textarea
                        rows={4}
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Parlez-nous de vous..."
                      />
                    ) : (
                      <p className="text-gray-900">{user.profile?.bio || 'Aucune bio renseignée'}</p>
                    )}
                  </div>

                  {/* Activity Summary */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900 flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Activité récente
                      </h4>
                      <Link
                        href="/activity"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Voir tout
                      </Link>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Consultez votre historique d'activité complet pour voir vos actions récentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}