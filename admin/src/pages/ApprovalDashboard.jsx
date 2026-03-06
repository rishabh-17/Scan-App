import React, { useState, useEffect } from 'react';
import { getStats, getPendingEntries, approveEntry, rejectEntry } from '../services/api';

const ApprovalDashboard = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    totalAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });
  const [pendingWork, setPendingWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, pendingData] = await Promise.all([
        getStats(),
        getPendingEntries() // Fetch pending entries list
      ]);
      setStats(statsData);
      setPendingWork(pendingData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleApprove = async (id, currentStatus) => {
    try {
      // Use generic approval (no level needed)
      await approveEntry(id);

      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Approval failed:', err);
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        await rejectEntry(id, reason);
        fetchData();
      } catch (err) {
        console.error('Rejection failed:', err);
        alert('Rejection failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Approval Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm">Pending Work Uploads</h3>
          <p className="text-2xl font-bold">{stats.pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm">Approved Work</h3>
          <p className="text-2xl font-bold">{stats.approvedCount}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm">Rejected Work</h3>
          <p className="text-2xl font-bold">{stats.rejectedCount}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm">Total Units</h3>
          <p className="text-2xl font-bold">{stats.totalUnits}</p>
        </div>
        <div className="bg-white p-4 rounded shadow border-l-4 border-indigo-500">
          <h3 className="text-gray-500 text-sm">Total Amount</h3>
          <p className="text-2xl font-bold">₹{stats.totalAmount}</p>
        </div>
      </div>

      {/* Pending Work Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scans</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingWork.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">No pending work found.</td>
                </tr>
              ) : (
                pendingWork.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.projectId?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.operatorId?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.activityType || 'Scanning'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.scans}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{entry.amount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${entry.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          entry.status === 'finance_approved' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                        {entry.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(entry._id, entry.status)}
                          className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded border border-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(entry._id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded border border-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDashboard;
