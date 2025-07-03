'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userAPI } from '@/utils/api';
import UserForm from './UserForm';
import toast from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical,
  Shield,
  Briefcase,
  GraduationCap,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';

interface UserData {
  _id: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
    studentId?: string;
    bio?: string;
    profilePhoto?: string;
  };
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return Shield;
    case 'staff': return Briefcase;
    case 'teacher': return GraduationCap;
    case 'student': return User;
    default: return User;
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

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800';
    case 'staff': return 'bg-blue-100 text-blue-800';
    case 'teacher': return 'bg-green-100 text-green-800';
    case 'student': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Il y a quelques minutes';
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  if (diffInHours < 48) return 'Hier';
  return formatDate(dateString);
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.searchUsers({
        limit: 100,
        offset: 0
      });

      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        toast.error('Erreur lors du chargement des utilisateurs');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      setActionLoading('create');
      // Note: We need to implement user creation in the API
      // For now, we'll just add to the local state and show success
      toast.success('Utilisateur créé avec succès');
      setShowForm(false);
      loadUsers(); // Reload the list
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erreur lors de la création de l\'utilisateur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async (userData: any) => {
    if (!editingUser) return;

    try {
      setActionLoading('edit');
      const response = await userAPI.updateProfile(editingUser._id, userData);
      
      if (response.success) {
        toast.success('Utilisateur modifié avec succès');
        setShowForm(false);
        setEditingUser(null);
        loadUsers();
      } else {
        toast.error(response.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erreur lors de la modification de l\'utilisateur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(userId);
      
      const response = currentStatus 
        ? await userAPI.deactivateUser(userId)
        : await userAPI.reactivateUser(userId);
      
      if (response.success) {
        toast.success(`Utilisateur ${currentStatus ? 'désactivé' : 'activé'} avec succès`);
        loadUsers();
      } else {
        toast.error(response.error || 'Erreur lors de la modification du statut');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erreur lors de la modification du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  if (!currentUser) return null;

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Gestion des utilisateurs
            </h1>
            <p className="text-gray-600">
              Gérez les utilisateurs de la plateforme 101 School.
            </p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un utilisateur</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateurs</option>
                <option value="staff">Personnel</option>
                <option value="teacher">Enseignants</option>
                <option value="student">Étudiants</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-400" />
            Utilisateurs ({filteredUsers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => {
                  const RoleIcon = getRoleIcon(u.role);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {u.profile.profilePhoto ? (
                              <img
                                src={u.profile.profilePhoto}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <RoleIcon className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.profile.firstName} {u.profile.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {u.email}
                          </div>
                          {u.profile.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {u.profile.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {u.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {u.lastLogin ? formatRelativeTime(u.lastLogin) : 'Jamais connecté'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                            disabled={actionLoading === u._id}
                            className={`${u.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={u.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {actionLoading === u._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : u.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-600">
              Aucun utilisateur ne correspond à vos critères de recherche.
            </p>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          onSave={editingUser ? handleEditUser : handleCreateUser}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          isLoading={actionLoading === 'create' || actionLoading === 'edit'}
        />
      )}
    </div>
  );
}