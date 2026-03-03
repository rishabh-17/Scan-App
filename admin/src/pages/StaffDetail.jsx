import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const StaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffDetails();
  }, [id]);

  const fetchStaffDetails = async () => {
    try {
      const response = await api.get(`/staff/${id}`);
      setStaff(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching staff details:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading staff details...</div>;
  if (!staff) return <div className="p-6 text-red-500">Staff not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
          >
            ← Back to List
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{staff.name}</h1>
          <p className="text-sm text-gray-500">{staff.role} • {staff.center}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
          staff.status === 'active' ? 'bg-green-100 text-green-800' :
          staff.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
        }`}>
          {staff.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Personal Information</h2>
          <div className="space-y-4">
            <DetailRow label="Mobile" value={staff.mobile} />
            <DetailRow label="Employee ID" value={staff.employeeId || 'N/A'} />
            <DetailRow label="Scanner ID" value={staff.scannerId || 'N/A'} />
            <DetailRow label="Address" value={staff.address || 'N/A'} />
            <DetailRow label="PAN Number" value={staff.panNumber || 'N/A'} />
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bank Details</h2>
          <div className="space-y-4">
            <DetailRow label="Account Number" value={staff.bankDetails?.accountNo || 'N/A'} />
            <DetailRow label="IFSC Code" value={staff.bankDetails?.ifscCode || 'N/A'} />
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Project Assignment</h2>
          <div className="space-y-4">
            <DetailRow label="Current Project" value={staff.project?.name || 'Unassigned'} />
            <DetailRow label="Project Center" value={staff.project?.center || 'N/A'} />
            <DetailRow label="Scan Rate" value={staff.project?.scanRate ? `₹${staff.project.scanRate}` : 'N/A'} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between py-1">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-gray-900 font-medium text-sm">{value}</span>
  </div>
);

export default StaffDetail;
