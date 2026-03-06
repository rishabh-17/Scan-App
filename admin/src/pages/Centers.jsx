import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { getCenters, createCenter, updateCenter, deleteCenter, getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Centers = () => {
  const { user: currentUser } = useAuth();
  const [centers, setCenters] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    centerCode: '',
    location: '',
    status: 'active',
    contactEmail: '',
    contactPhone: '',
    supervisors: [], // Array of user IDs
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [centersData, usersData] = await Promise.all([getCenters(), getUsers()]);
      setCenters(centersData);

      // Filter users who are center supervisors
      const supervisorUsers = usersData.filter(u => u.role === 'center_supervisor');
      setSupervisors(supervisorUsers);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSupervisorChange = (selectedOptions) => {
    setFormData({ ...formData, supervisors: selectedOptions ? selectedOptions.map(option => option.value) : [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCenter) {
        await updateCenter(editingCenter._id, formData);
      } else {
        await createCenter(formData);
      }
      setShowModal(false);
      setEditingCenter(null);
      setFormData({ name: '', centerCode: '', location: '', status: 'active', contactEmail: '', contactPhone: '', supervisors: [] });

      // Refresh centers
      const centersData = await getCenters();
      setCenters(centersData);
    } catch (error) {
      console.error('Error saving center:', error);
      alert('Error saving center');
    }
  };

  const handleEdit = (center) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      centerCode: center.centerCode || '',
      location: center.location || '',
      status: center.status || 'active',
      contactEmail: center.contactEmail || '',
      contactPhone: center.contactPhone || '',
      supervisors: center.supervisors ? center.supervisors.map(s => s._id) : [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this center?')) {
      try {
        await deleteCenter(id);
        const centersData = await getCenters();
        setCenters(centersData);
      } catch (error) {
        console.error('Error deleting center:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Center Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage centers and assign supervisors
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingCenter(null);
              setFormData({ name: '', location: '', supervisors: [] });
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            Create Center
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading centers...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supervisors</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {centers.map((center) => (
                  <tr key={center._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{center.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{center.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {center.supervisors && center.supervisors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {center.supervisors.map(sup => (
                            <span key={sup._id} className="px-2 py-0.5 text-xs rounded bg-green-50 text-green-700 border border-green-100">
                              {sup.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No supervisors assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(center)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(center._id)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCenter ? 'Edit Center' : 'Create New Center'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Center Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Center Code</label>
                <input
                  type="text"
                  name="centerCode"
                  value={formData.centerCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

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
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Supervisors</label>
                <Select
                  isMulti
                  name="supervisors"
                  options={supervisors.map(user => ({ value: user._id, label: `${user.name} (${user.mobile})` }))}
                  value={supervisors
                    .filter(user => formData.supervisors.includes(user._id))
                    .map(user => ({ value: user._id, label: `${user.name} (${user.mobile})` }))
                  }
                  onChange={handleSupervisorChange}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  placeholder="Select supervisors..."
                />
                {supervisors.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No users with 'Center Supervisor' role found. Create them in User Management first.
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
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
                  {editingCenter ? 'Update Center' : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Centers;
