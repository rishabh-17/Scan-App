import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Users = () => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/staff?excludeRole=staff');
      setUsersList(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all system users (Admins, Supervisors, Managers)
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Center / Project</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {usersList.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      {user.employeeId && <p className="text-xs text-gray-500">ID: {user.employeeId}</p>}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">{user.mobile}</td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 
                        user.role === 'supervisor' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.center}
                      {user.project && (
                        <p className="text-xs text-indigo-600 mt-0.5">
                          {typeof user.project === 'object' ? user.project.name : 'Linked'}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' ? 'bg-green-50 text-green-700' : 
                        user.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 
                        'bg-red-50 text-red-700'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
