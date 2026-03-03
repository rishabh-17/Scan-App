import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchEntries();
  }, [activeTab]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' ? '/scan-entry/pending' : '/scan-entry/pending?type=approved';
      const response = await api.get(endpoint);
      setEntries(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch entries');
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/scan-entry/${id}/approve`);
      fetchEntries();
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/scan-entry/${id}/reject`, { reason });
      fetchEntries();
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const getNextAction = (entry) => {
    if (entry.actions?.includes('APPROVE')) return 'Approve';
    return '';
  };

  const canApprove = (entry) => {
    return entry.actions?.includes('APPROVE');
  };

  const canReject = (entry) => {
    return entry.actions?.includes('REJECT');
  };

  const getStatusBadge = (status) => {
    const base = "px-2.5 py-1 text-xs font-medium rounded-full capitalize";
    if (status === 'entered') return `${base} bg-yellow-50 text-yellow-700`;
    if (status === 'finance_approved') return `${base} bg-green-50 text-green-700`;
    if (status === 'locked') return `${base} bg-gray-50 text-gray-700`;
    return `${base} bg-blue-50 text-blue-700`;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {activeTab === 'pending' ? 'Pending Approvals' : 'Approved Entries'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'pending'
              ? 'Review and approve scan entries across workflow stages'
              : 'View history of approved and completed entries'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'approved'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            Approved
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-gray-500">Loading entries...</div>
      ) : error ? (
        <div className="p-6 text-red-500">{error}</div>
      ) : (
        /* Table card */
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operator</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scans</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {entry.operatorId?.name || 'Unknown'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.projectId?.name || 'Unknown'}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.scans}
                    </td>

                    <td className="px-6 py-4">
                      <span className={getStatusBadge(entry.status)}>
                        {entry.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {canApprove(entry) && (
                          <button
                            onClick={() => handleApprove(entry._id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition"
                          >
                            {getNextAction(entry)}
                          </button>
                        )}
                        {canReject(entry) && (
                          <button
                            onClick={() => handleReject(entry._id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-500">
                      {activeTab === 'pending' ? 'No pending approvals found' : 'No approved entries found'}
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

export default Dashboard;