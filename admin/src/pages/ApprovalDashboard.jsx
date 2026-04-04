import React, { useState, useEffect } from 'react';
import { getStats, getPendingEntries, approveEntry, rejectEntry, getProjects, getCenters } from '../services/api';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import Modal from '../components/Modal';

const ApprovalDashboard = () => {
  const [stats, setStats] = useState({
    totalUnits: 0,
    totalAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });
  const [pendingWork, setPendingWork] = useState([]);
  const [projects, setProjects] = useState([]);
  const [centers, setCenters] = useState([]);
  const [filters, setFilters] = useState({
    projectId: '',
    centerId: '',
    activityType: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // UI States
  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, ids: [] });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [statsData, projectsData, centersData] = await Promise.all([
          getStats(),
          getProjects(),
          getCenters()
        ]);
        setStats(statsData);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setCenters(Array.isArray(centersData) ? centersData : []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const pendingData = await getPendingEntries({
          type: 'all',
          ...(filters.projectId ? { projectId: filters.projectId } : {}),
          ...(filters.centerId ? { centerId: filters.centerId } : {}),
          ...(filters.activityType ? { activityType: filters.activityType } : {})
        });
        setPendingWork(Array.isArray(pendingData) ? pendingData : []);
        setSelectedIds(new Set());
      } catch (err) {
        console.error('Error fetching entries:', err);
        setError('Failed to load entries');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [filters.projectId, filters.centerId, filters.activityType]);

  const fetchStats = async () => {
    try {
      const statsData = await getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      // Use generic approval (no level needed)
      await approveEntry(id);
      // Refresh data
      await fetchStats();
    } catch (err) {
      console.error('Approval failed:', err);
      setAlertConfig({
        isOpen: true,
        title: 'Approval Failed',
        message: err.response?.data?.message || err.message
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openBulkApproveConfirm = () => {
    const selectedApprovableIds = pendingWork
      .filter(e => selectedIds.has(e._id) && canApprove(e))
      .map(e => e._id);

    setConfirmConfig({
      isOpen: true,
      title: 'Approve Selected',
      message: `Are you sure you want to approve ${selectedApprovableIds.length} entries?`,
      onConfirm: () => handleBulkApprove(selectedApprovableIds),
      confirmVariant: 'success'
    });
  };

  const handleBulkApprove = async (ids) => {
    setActionLoading(true);
    try {
      await Promise.all(
        ids.map(id => approveEntry(id))
      );
      setSelectedIds(new Set());
      await fetchStats();
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Selected entries approved successfully', variant: 'success' });
    } catch (err) {
      console.error('Bulk approval failed:', err);
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Some approvals failed. Please check the list.' });
      fetchStats();
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    const rejectableIds = pendingWork
      .filter(e => idsArray.includes(e._id) && canReject(e))
      .map(e => e._id);

    setRejectModal({ isOpen: true, ids: rejectableIds });
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setAlertConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter a rejection reason',
        variant: 'danger'
      });
      return;
    }

    if (rejectModal.ids.length === 0) {
      setAlertConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'No rejectable records selected',
        variant: 'danger'
      });
      return;
    }

    setActionLoading(true);
    try {
      await Promise.all(
        rejectModal.ids.map(id => rejectEntry(id, rejectReason))
      );

      if (selectedIds.size > 0) {
        const allSelected = rejectModal.ids.length === selectedIds.size;
        if (allSelected) setSelectedIds(new Set());
        else {
          const newSelected = new Set(selectedIds);
          rejectModal.ids.forEach(id => newSelected.delete(id));
          setSelectedIds(newSelected);
        }
      }

      setRejectModal({ isOpen: false, ids: [] });
      await fetchStats();
    } catch (err) {
      console.error('Rejection failed:', err);
      setAlertConfig({
        isOpen: true,
        title: 'Rejection Failed',
        message: err.response?.data?.message || err.message
      });
      fetchStats();
    } finally {
      setActionLoading(false);
    }
  };

  const canApprove = (entry) => entry.actions?.includes('APPROVE');
  const canReject = (entry) => entry.actions?.includes('REJECT');
  const canSelect = (entry) => canApprove(entry) || canReject(entry);

  const toggleSelectAll = () => {
    const selectableIds = pendingWork.filter(canSelect).map(e => e._id);
    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader size="xl" className="text-indigo-600" /></div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
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

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between mb-6">
          <span className="text-blue-700 font-medium">{selectedIds.size} items selected</span>
          <div className="space-x-3">
            <Button
              onClick={openBulkApproveConfirm}
              variant="success"
              loading={actionLoading && confirmConfig.isOpen}
            >
              Approve Selected
            </Button>
            <Button
              onClick={() => openRejectModal(Array.from(selectedIds))}
              variant="danger"
            >
              Reject Selected
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={filters.centerId}
              onChange={(e) => setFilters(prev => ({ ...prev, centerId: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="">All Locations</option>
              {centers.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select
              value={filters.activityType}
              onChange={(e) => setFilters(prev => ({ ...prev, activityType: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="">All Activities</option>
              <option value="Scanning">Scanning</option>
              <option value="QC">QC</option>
              <option value="Outward">Outward</option>
              <option value="Sticker">Sticker</option>
              <option value="Inward">Inward</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={pendingWork.some(canSelect) && selectedIds.size === pendingWork.filter(canSelect).length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
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
                  <td colSpan="9" className="px-6 py-4 text-center text-gray-500">No records found.</td>
                </tr>
              ) : (
                pendingWork.map((entry) => (
                  <tr key={entry._id} className={selectedIds.has(entry._id) ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        disabled={!canSelect(entry)}
                        onChange={() => toggleSelect(entry._id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
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
                        <Button
                          onClick={() => handleApprove(entry._id)}
                          variant="success"
                          size="sm"
                          className="py-1 px-3 text-xs"
                          loading={processingId === entry._id}
                          disabled={processingId !== null || !canApprove(entry)}
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => openRejectModal(entry._id)}
                          variant="danger"
                          size="sm"
                          className="py-1 px-3 text-xs"
                          disabled={processingId !== null || !canReject(entry)}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Modals */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmVariant={confirmConfig.confirmVariant}
        loading={actionLoading}
      />

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant || 'primary'}
      />

      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ ...rejectModal, isOpen: false })}
        title="Reject Entry"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Please provide a reason for rejecting {rejectModal.ids.length} entrie(s).
          </p>
          <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            rows="3"
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          ></textarea>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectSubmit}
              loading={actionLoading}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApprovalDashboard;
