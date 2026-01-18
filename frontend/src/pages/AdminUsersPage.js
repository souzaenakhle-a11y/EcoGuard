import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Home, Trash2, Users, Building2, Calendar, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, { withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (deleteConfirm !== userId) {
      setDeleteConfirm(userId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await axios.delete(`${API}/admin/users/${userId}`, { withCredentials: true });
      toast.success(`Usuário ${userName} excluído`);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir');
    }
    setDeleteConfirm(null);
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-green-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-2">
            <Users className="w-8 h-8" />
            Gerenciamento de Usuários
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors shadow"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total de Usuários</div>
            <div className="text-2xl font-bold text-green-600">{users.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Com Empresas</div>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.empresas && u.empresas.length > 0).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Com Tickets</div>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.tickets_count > 0).length}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Empresas</th>
                  <th className="px-4 py-3 text-left">Tickets</th>
                  <th className="px-4 py-3 text-left">Criado em</th>
                  <th className="px-4 py-3 text-left">Último Login</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.picture && (
                          <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.empresas && user.empresas.length > 0 ? (
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <Building2 className="w-4 h-4" />
                            {user.empresas.length} empresa(s)
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {user.empresas.map(e => e.nome).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Nenhuma</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.tickets_count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.tickets_count} tickets
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {formatDate(user.last_login)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDelete(user.user_id, user.name)}
                          className={`p-2 rounded-lg transition-colors ${
                            deleteConfirm === user.user_id
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                          title={deleteConfirm === user.user_id ? 'Clique novamente para confirmar' : 'Excluir usuário'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  );
}