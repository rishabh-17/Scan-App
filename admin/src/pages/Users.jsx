import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getCenters, getProjects } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'center_supervisor',
    center: '', // Center ID
    project: '', // Project ID
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersData, centersData, projectsData] = await Promise.all([
        getUsers({ excludeRole: 'staff' }),
        getCenters(),
        getProjects()
      ]);
      setUsers(usersData);
      setCenters(centersData);
      setProjects(projectsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update logic (password optional if empty)
        const dataToSend = { ...formData };
        if (!dataToSend.password) delete dataToSend.password;
        await updateUser(editingUser._id, dataToSend);
      } else {
        await createUser(formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', mobile: '', password: '', role: 'center_supervisor', center: '', project: '', status: 'active' });
      fetchData();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email || '',
      mobile: user.mobile,
      password: '', // Don't populate password
      role: user.role,
      center: typeof user.center === 'object' ? user.center._id : user.center || '',
      project: typeof user.project === 'object' ? user.project._id : user.project || '',
      status: user.status || 'active',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const roleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Admin</span>;
      case 'project_manager':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Project Manager</span>;
      case 'center_supervisor':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Center Supervisor</span>;
      case 'finance_hr':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Finance/HR</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{role}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system users and their roles
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', mobile: '', password: '', role: 'center_supervisor', center: '', project: '', status: 'active' });
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            Create User
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading users...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.mobile}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{roleBadge(user.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    name="mobile"
                    required
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    disabled={editingUser && editingUser.role === 'admin'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {editingUser && editingUser.role === 'admin' && (
                      <option value="admin">Admin</option>
                    )}
                    <option value="center_supervisor">Center Supervisor</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="finance_hr">Finance/HR</option>
                  </select>
                </div>

                {formData.role === 'center_supervisor' && (
                  <div>
                    {/* Center assignment handled in Staff Management */}
                  </div>
                )}

                {formData.role === 'project_manager' && (
                  <div>
                    {/* Project assignment handled in Staff Management */}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
