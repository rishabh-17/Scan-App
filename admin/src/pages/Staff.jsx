import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getCenters,
  getProjects
} from '../services/api';

const Staff = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [centers, setCenters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialFormState = {
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'pending',
    employeeId: '',
    center: '',
    project: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhaarNumber: '',
    panNumber: '',
    bankDetails: {
      accountNo: '',
      confirmAccountNo: '',
      ifscCode: '',
      bankName: '',
      accountHolderName: '',
    },
    // Files will be stored here too
    aadhaarDoc: null,
    panDoc: null,
    cancelledChequeDoc: null
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, centersRes, projectsRes] = await Promise.all([
        getUsers({ role: 'staff' }), // Fetch staff users only
        getCenters(),
        getProjects()
      ]);
      setStaffList(staffRes);
      setCenters(centersRes);
      setProjects(projectsRes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleEditClick = (staff) => {
    setFormData({
      _id: staff._id,
      name: staff.name,
      mobile: staff.mobile,
      email: staff.email || '',
      password: '', // Don't populate password
      center: typeof staff.center === 'object' ? staff.center._id : staff.center || '',
      role: staff.role,
      status: staff.status,
      employeeId: staff.employeeId || '',
      project: staff.project ? (typeof staff.project === 'object' ? staff.project._id : staff.project) : '',
      dob: staff.dob ? staff.dob.split('T')[0] : '',
      address: staff.address || '',
      city: staff.city || '',
      state: staff.state || '',
      pincode: staff.pincode || '',
      aadhaarNumber: staff.aadhaarNumber || '',
      panNumber: staff.panNumber || '',
      bankDetails: {
        accountNo: staff.bankDetails?.accountNo || '',
        confirmAccountNo: staff.bankDetails?.accountNo || '', // Pre-fill confirm with actual
        ifscCode: staff.bankDetails?.ifscCode || '',
        bankName: staff.bankDetails?.bankName || '',
        accountHolderName: staff.bankDetails?.accountHolderName || '',
      },
      aadhaarDoc: null, // Reset files on edit
      panDoc: null,
      cancelledChequeDoc: null
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddClick = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.bankDetails.accountNo !== formData.bankDetails.confirmAccountNo) {
      alert("Bank Account Numbers do not match!");
      return;
    }

    try {
      const data = new FormData();

      // Append simple fields
      Object.keys(formData).forEach(key => {
        if (key === 'bankDetails') {
          data.append('bankDetails', JSON.stringify(formData.bankDetails));
        } else if (['aadhaarDoc', 'panDoc', 'cancelledChequeDoc'].includes(key)) {
          if (formData[key] instanceof File) {
            data.append(key, formData[key]);
          }
        } else if (key !== '_id') { // Don't send _id in body
          data.append(key, formData[key]);
        }
      });

      if (isEditing) {
        await updateUser(formData._id, data);
      } else {
        await createUser(data);
      }

      setShowModal(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Error saving staff:', error);
      alert(error.response?.data?.message || 'Error saving staff');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteUser(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  // Filter projects based on selected center
  const filteredProjects = formData.center
    ? projects.filter(p => {
      // Handle both string ID and object cases for project.center
      const projectCenterId = typeof p.center === 'object' ? p.center._id : p.center;
      return projectCenterId === formData.center;
    })
    : [];

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
          className={`bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm ${(currentUser?.role !== 'admin' && currentUser?.role !== 'center_supervisor') ? 'hidden' : ''
            }`}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name / Emp ID</th>
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
                      <p className="text-xs text-gray-500">ID: {staff.employeeId || 'N/A'}</p>
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
                      {typeof staff.center === 'object' ? staff.center?.name : 'Unknown Center'}
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
                        onClick={() => navigate(`/staff/${staff._id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </button>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'center_supervisor') && (
                        <button
                          onClick={() => handleEditClick(staff)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(staff._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isEditing ? 'Edit / Approve Staff' : 'Add New Staff'}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mandatory Fields Section */}
              <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Mandatory Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Employee ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Center <span className="text-red-500">*</span></label>
                    <select
                      name="center"
                      value={formData.center}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Center</option>
                      {centers.map((center) => (
                        <option key={center._id} value={center._id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
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
                </div>
              </div>

              {/* Personal Details */}
              <div className="md:col-span-2 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Personal Details</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email ID</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              {/* Identity Documents */}
              <div className="md:col-span-2 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Identity Documents</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Aadhaar Document</label>
                <input
                  type="file"
                  name="aadhaarDoc"
                  onChange={handleFileChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Upload PAN Document</label>
                <input
                  type="file"
                  name="panDoc"
                  onChange={handleFileChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>

              {/* Bank Details */}
              <div className="md:col-span-2 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Bank Details</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                <input
                  type="text"
                  name="bankDetails.accountNo"
                  value={formData.bankDetails.accountNo}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Account Number</label>
                <input
                  type="text"
                  name="bankDetails.confirmAccountNo"
                  value={formData.bankDetails.confirmAccountNo}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <input
                  type="text"
                  name="bankDetails.ifscCode"
                  value={formData.bankDetails.ifscCode}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <input
                  type="text"
                  name="bankDetails.bankName"
                  value={formData.bankDetails.bankName}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                <input
                  type="text"
                  name="bankDetails.accountHolderName"
                  value={formData.bankDetails.accountHolderName}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Cancelled Cheque</label>
                <input
                  type="file"
                  name="cancelledChequeDoc"
                  onChange={handleFileChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>

              {/* Assignment & Role */}
              <div className="md:col-span-2 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Role & Assignment</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Assign Project</label>
                <select
                  name="project"
                  value={formData.project}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {filteredProjects.map((proj) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
                {!formData.center && <p className="text-xs text-gray-500 mt-1">Select a center first to see projects.</p>}
              </div>



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

              <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
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
