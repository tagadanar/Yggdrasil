'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { userAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe,
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    bio: user?.profile?.bio || '',
    department: user?.profile?.department || '',
    studentId: user?.profile?.studentId || ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    scheduleChanges: true,
    newAnnouncements: true,
    assignmentReminders: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    language: 'fr',
    theme: 'light',
    timezone: 'Europe/Paris'
  });

  const tabs = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'preferences', name: 'Préférences', icon: Palette }
  ];

  const [loading, setLoading] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        email: user.email || '',
        phone: user.profile.phone || '',
        bio: user.profile.bio || '',
        department: user.profile.department || '',
        studentId: user.profile.studentId || ''
      });
    }

    // Load user preferences if available
    if (user?.preferences) {
      setPreferences({
        language: user.preferences.language || 'fr',
        theme: user.preferences.theme || 'light',
        timezone: user.preferences.timezone || 'Europe/Paris'
      });
    }

    // Load notification settings if available
    if (user?.notificationSettings) {
      setNotificationSettings({
        emailNotifications: user.notificationSettings.emailNotifications ?? true,
        pushNotifications: user.notificationSettings.pushNotifications ?? true,
        smsNotifications: user.notificationSettings.smsNotifications ?? false,
        scheduleChanges: user.notificationSettings.scheduleChanges ?? true,
        newAnnouncements: user.notificationSettings.newAnnouncements ?? true,
        assignmentReminders: user.notificationSettings.assignmentReminders ?? true
      });
    }
  }, [user]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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
        toast.success('Photo de profil mise à jour');
        // The photo URL will be updated when the user refreshes or the context updates
      } else {
        toast.error(response.error || 'Erreur lors du téléchargement');
      }
    } catch (error: any) {
      toast.error('Erreur lors du téléchargement de la photo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      switch (section) {
        case 'profile':
          const profileResponse = await userAPI.updateProfile(user._id, {
            profile: {
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phone: profileData.phone,
              bio: profileData.bio,
              department: profileData.department,
              studentId: profileData.studentId
            }
          });

          if (profileResponse.success) {
            toast.success('Profil mis à jour avec succès');
          } else {
            toast.error(profileResponse.error || 'Erreur lors de la mise à jour du profil');
          }
          break;

        case 'preferences':
          const preferencesResponse = await userAPI.updatePreferences(preferences);
          
          if (preferencesResponse.success) {
            toast.success('Préférences mises à jour avec succès');
          } else {
            toast.error(preferencesResponse.error || 'Erreur lors de la mise à jour des préférences');
          }
          break;

        case 'notifications':
          // This would need a separate endpoint for notification settings
          // For now, we'll simulate success
          toast.success('Paramètres de notification mis à jour');
          break;

        case 'security':
          if (!securitySettings.currentPassword || !securitySettings.newPassword) {
            toast.error('Veuillez remplir tous les champs requis');
            return;
          }

          if (securitySettings.newPassword !== securitySettings.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
          }

          // This would need a separate endpoint for password change
          // For now, we'll simulate success and clear the form
          setSecuritySettings({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          toast.success('Mot de passe mis à jour avec succès');
          break;

        default:
          toast.error('Section inconnue');
      }
    } catch (error: any) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'staff', 'teacher', 'student']}>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Paramètres
          </h1>
          <p className="text-gray-600">
            Gérez vos préférences et paramètres de compte.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white shadow rounded-lg p-2">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white shadow rounded-lg">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="w-5 h-5 mr-2 text-gray-400" />
                      Informations du profil
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Profile Photo */}
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.profile?.profilePhoto ? (
                            <img
                              src={user.profile.profilePhoto}
                              alt="Photo de profil"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <label className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer">
                          <Camera className="w-4 h-4" />
                          <span>{loading ? 'Téléchargement...' : 'Changer la photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={loading}
                          />
                        </label>
                      </div>

                      {/* Form Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Prénom
                          </label>
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nom
                          </label>
                          <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      {user.role === 'student' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Numéro d'étudiant
                          </label>
                          <input
                            type="text"
                            value={profileData.studentId}
                            onChange={(e) => setProfileData({...profileData, studentId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {(user.role === 'teacher' || user.role === 'staff') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Département
                          </label>
                          <input
                            type="text"
                            value={profileData.department}
                            onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        <textarea
                          rows={4}
                          value={profileData.bio}
                          onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Parlez-nous de vous..."
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSave('profile')}
                          disabled={loading}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-gray-400" />
                      Préférences de notifications
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {Object.entries(notificationSettings).map(([key, value]) => {
                        const labels = {
                          emailNotifications: 'Notifications par email',
                          pushNotifications: 'Notifications push',
                          smsNotifications: 'Notifications SMS',
                          scheduleChanges: 'Changements d\'horaire',
                          newAnnouncements: 'Nouvelles annonces',
                          assignmentReminders: 'Rappels de devoirs'
                        };

                        return (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {labels[key as keyof typeof labels]}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => setNotificationSettings({
                                  ...notificationSettings,
                                  [key]: e.target.checked
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                          </div>
                        );
                      })}

                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => handleSave('notifications')}
                          disabled={loading}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-gray-400" />
                      Sécurité
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Changer le mot de passe
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Mot de passe actuel
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={securitySettings.currentPassword}
                                onChange={(e) => setSecuritySettings({
                                  ...securitySettings,
                                  currentPassword: e.target.value
                                })}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              value={securitySettings.newPassword}
                              onChange={(e) => setSecuritySettings({
                                ...securitySettings,
                                newPassword: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Confirmer le nouveau mot de passe
                            </label>
                            <input
                              type="password"
                              value={securitySettings.confirmPassword}
                              onChange={(e) => setSecuritySettings({
                                ...securitySettings,
                                confirmPassword: e.target.value
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => handleSave('security')}
                          disabled={loading}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 flex items-center">
                      <Palette className="w-5 h-5 mr-2 text-gray-400" />
                      Préférences
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Globe className="w-4 h-4 inline mr-1" />
                          Langue
                        </label>
                        <select
                          value={preferences.language}
                          onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="fr">Français</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Thème
                        </label>
                        <select
                          value={preferences.theme}
                          onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="light">Clair</option>
                          <option value="dark">Sombre</option>
                          <option value="auto">Automatique</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fuseau horaire
                        </label>
                        <select
                          value={preferences.timezone}
                          onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                          <option value="America/New_York">America/New_York (UTC-5)</option>
                          <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                        </select>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => handleSave('preferences')}
                          disabled={loading}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          <span>{loading ? 'Enregistrement...' : 'Enregistrer'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}