import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const StaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/staff/${id}`);
        setStaff(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching staff details:', error);
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading staff details...</div>;
  if (!staff) return <div className="p-6 text-red-500">Staff not found</div>;

  const fileValue = (value) => {
    if (!value) return 'N/A';
    return String(value).split('/').pop() || String(value);
  };

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
          <p className="text-sm text-gray-500">
            {staff.role} • {staff.center?.name || 'Unassigned Center'}
          </p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${staff.status === 'active' ? 'bg-green-100 text-green-800' :
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
            <DetailRow label="Name" value={staff.name} />
            <DetailRow label="Mobile" value={staff.mobile} />
            <DetailRow label="Alternate Mobile" value={staff.alternateMobile || 'N/A'} />
            <DetailRow label="Email" value={staff.email || 'N/A'} />
            <DetailRow label="Employee ID" value={staff.employeeId || 'N/A'} />
            <DetailRow label="Date of Birth" value={staff.dob ? new Date(staff.dob).toLocaleDateString() : 'N/A'} />
            <DetailRow label="Gender" value={staff.gender || 'N/A'} />
            <DetailRow label="Blood Group" value={staff.bloodGroup || 'N/A'} />
            <DetailRow label="Father Name" value={staff.fatherName || 'N/A'} />
            <DetailRow label="Mother Name" value={staff.motherName || 'N/A'} />
            <DetailRow label="Location" value={staff.location || 'N/A'} />
            <DetailRow label="Address" value={staff.address || 'N/A'} />
            <DetailRow label="City" value={staff.city || 'N/A'} />
            <DetailRow label="State" value={staff.state || 'N/A'} />
            <DetailRow label="Pincode" value={staff.pincode || 'N/A'} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Assignment & Status</h2>
          <div className="space-y-4">
            <DetailRow label="Role" value={staff.role || 'N/A'} />
            <DetailRow label="Status" value={staff.status || 'N/A'} />
            <DetailRow label="Center" value={staff.center?.name || 'N/A'} />
            <DetailRow label="Center Code" value={staff.center?.centerCode || 'N/A'} />
            <DetailRow label="Center Location" value={staff.center?.location || 'N/A'} />
            <DetailRow label="Current Project" value={staff.project?.name || 'Unassigned'} />
            <DetailRow label="Project Center" value={staff.project?.center || 'N/A'} />
            <DetailRow label="Scan Rate" value={staff.project?.scanRate ? `₹${staff.project.scanRate}` : 'N/A'} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Identity & Education</h2>
          <div className="space-y-4">
            <DetailRow label="Aadhaar Number" value={staff.aadhaarNumber || 'N/A'} />
            <DetailRow label="PAN Number" value={staff.panNumber || 'N/A'} />
            <DetailRow label="Highest Education" value={staff.highestEducation || 'N/A'} />
            <DetailRow label="Affiliated University" value={staff.affiliatedUniversity || 'N/A'} />
            <DetailRow label="Previous Employment" value={staff.previousEmployment || 'N/A'} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bank Details</h2>
          <div className="space-y-4">
            <DetailRow label="Account Holder Name" value={staff.bankDetails?.accountHolderName || 'N/A'} />
            <DetailRow label="Account Number" value={staff.bankDetails?.accountNo || 'N/A'} />
            <DetailRow label="IFSC Code" value={staff.bankDetails?.ifscCode || 'N/A'} />
            <DetailRow label="Bank Name" value={staff.bankDetails?.bankName || 'N/A'} />
            <DetailRow label="Cancelled Cheque Doc" value={fileValue(staff.bankDetails?.cancelledChequeDoc)} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Reference & Documents</h2>
          <div className="space-y-4">
            <DetailRow label="Reference Source" value={staff.referenceSource || 'N/A'} />
            <DetailRow label="Agency Name" value={staff.agencyName || 'N/A'} />
            <DetailRow label="Reference Contact No" value={staff.referenceContactNo || 'N/A'} />
            <DetailRow label="Aadhaar Document" value={fileValue(staff.aadhaarDoc)} />
            <DetailRow label="PAN Document" value={fileValue(staff.panDoc)} />
            <DetailRow label="Photo" value={fileValue(staff.photo)} />
            <DetailRow label="Bank Passbook Doc" value={fileValue(staff.bankPassbookDoc)} />
            <DetailRow label="Educational Doc" value={fileValue(staff.educationalDoc)} />
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
