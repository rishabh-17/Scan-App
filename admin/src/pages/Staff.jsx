import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Staff = () => {
  const [staffList, setStaffList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    center: '',
    role: 'staff',
    status: 'pending',
    employeeId: '',
    scannerId: '',
    project: '',
    address: '',
    bankDetails: {
      accountNo: '',
      ifscCode: '',
    },
  });

  useEffect(() => {
    fetchStaff();
    fetchProjects();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff?role=staff');
      setStaffList(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEditClick = (staff) => {
    setFormData({
      _id: staff._id,
      name: staff.name,
      mobile: staff.mobile,
      password: '', // Don't populate password
      center: staff.center,
      role: staff.role,
      status: staff.status,
      employeeId: staff.employeeId || '',
      scannerId: staff.scannerId || '',
      project: staff.project ? staff.project._id : '',
      address: staff.address || '',
      bankDetails: {
        accountNo: staff.bankDetails?.accountNo || '',
        ifscCode: staff.bankDetails?.ifscCode || '',
      },
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddClick = () => {
    setFormData({
      name: '',
      mobile: '',
      password: '',
      center: '',
      role: 'staff',
      status: 'pending',
      employeeId: '',
      scannerId: '',
      project: '',
      address: '',
      bankDetails: {
        accountNo: '',
        ifscCode: '',
      },
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // Update existing staff
        await api.put(`/staff/${formData._id}`, formData);
      } else {
        // Create new staff
        await api.post('/auth/register', formData);
      }

      setShowModal(false);
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error saving staff');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await api.delete(`/staff/${id}`);
        fetchStaff();
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  // (Logic unchanged above — only JSX updated below)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage staff onboarding, approvals, and assignments
          </p>
        </div>

        <button
          onClick={handleAddClick}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          Add Staff
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading staff...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name / ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Center / Project</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {staffList.map((staff) => (
                  <tr key={staff._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-500">ID: {staff.scannerId || 'No ID'}</p>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">{staff.mobile}</td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${staff.role === 'admin'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-green-50 text-green-700'
                        }`}>
                        {staff.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {staff.center}
                      {staff.project && (
                        <p className="text-xs text-indigo-600 mt-0.5">
                          {typeof staff.project === 'object' ? staff.project.name : 'Linked'}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${staff.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : staff.status === 'pending'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                        }`}>
                        {staff.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleEditClick(staff)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(staff._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isEditing ? 'Edit / Approve Staff' : 'Add New Staff'}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { label: "Name", name: "name", type: "text", required: true },
                { label: "Scanner ID", name: "scannerId" },
                { label: "Employee ID", name: "employeeId" },
                { label: "Mobile", name: "mobile", required: true },
                { label: "Address", name: "address", col: 2 },
                { label: "Account No", name: "bankDetails.accountNo" },
                { label: "IFSC Code", name: "bankDetails.ifscCode" },
                { label: "Center", name: "center", required: true },
              ].map((field) => (
                <div key={field.name} className={field.col === 2 ? "col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={field.name.includes('.') ? formData.bankDetails?.[field.name.split('.')[1]] : formData[field.name]}
                    onChange={handleInputChange}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required={field.required}
                  />
                </div>
              ))}

              {!isEditing && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required={!isEditing}
                  />
                </div>
              )}

              {/* Project */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Assign Project</label>
                <select
                  name="project"
                  value={formData.project}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {projects.map((proj) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.name} ({proj.center})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                >
                  <option value="staff">Staff</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  {isEditing ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Staff;