import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import Modal from '../components/Modal'; // For custom reject modal

const Dashboard = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
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
    fetchEntries();
    setSelectedIds(new Set());
  }, [activeTab]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' ? '/scan-entry/pending' : '/scan-entry/pending?type=approved';
      const response = await api.get(endpoint);
      setEntries(response.data);
    } catch (err) {
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/scan-entry/${id}/approve`);
      await fetchEntries();
    } catch (err) {
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
    setConfirmConfig({
      isOpen: true,
      title: 'Approve Selected',
      message: `Are you sure you want to approve ${selectedIds.size} entries?`,
      onConfirm: handleBulkApprove,
      confirmVariant: 'success'
    });
  };

  const handleBulkApprove = async () => {
    setActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.put(`/scan-entry/${id}/approve`))
      );
      setSelectedIds(new Set());
      await fetchEntries();
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Selected entries approved successfully', variant: 'success' });
    } catch (err) {
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Some approvals failed. Please check the list.' });
      fetchEntries();
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (ids) => {
    setRejectModal({ isOpen: true, ids: Array.isArray(ids) ? ids : [ids] });
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

    setActionLoading(true);
    try {
      await Promise.all(
        rejectModal.ids.map(id => api.put(`/scan-entry/${id}/reject`, { reason: rejectReason }))
      );

      if (selectedIds.size > 0) {
        // If we rejected selected items, verify if all selected were rejected
        // For simplicity, just clear selection if it matches
        const allSelected = rejectModal.ids.length === selectedIds.size;
        if (allSelected) setSelectedIds(new Set());
        else {
          // Remove processed ids from selection
          const newSelected = new Set(selectedIds);
          rejectModal.ids.forEach(id => newSelected.delete(id));
          setSelectedIds(newSelected);
        }
      }

      setRejectModal({ isOpen: false, ids: [] });
      await fetchEntries();
    } catch (err) {
      setAlertConfig({
        isOpen: true,
        title: 'Rejection Failed',
        message: err.response?.data?.message || err.message
      });
      fetchEntries();
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e._id)));
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
    <div className="space-y-6 mx-2">
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

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
          <span className="text-blue-700 font-medium">{selectedIds.size} items selected</span>
          <div className="space-x-3">
            <Button
              onClick={openBulkApproveConfirm}
              variant="success"
              loading={actionLoading && confirmConfig.isOpen} // Only show loading if confirm is open (actually handled in modal)
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

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader size="xl" className="text-indigo-600" />
        </div>
      ) : error ? (
        <div className="p-6 text-red-500 bg-red-50 rounded-lg">{error}</div>
      ) : (
        /* Table card */
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={entries.length > 0 && selectedIds.size === entries.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
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
                  <tr key={entry._id} className={`hover:bg-gray-50 transition ${selectedIds.has(entry._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry._id)}
                        onChange={() => toggleSelect(entry._id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
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
                          <Button
                            onClick={() => handleApprove(entry._id)}
                            variant="success"
                            size="sm"
                            className="py-1 px-3 text-xs"
                            loading={processingId === entry._id}
                            disabled={processingId !== null}
                          >
                            {getNextAction(entry)}
                          </Button>
                        )}
                        {canReject(entry) && (
                          <Button
                            onClick={() => openRejectModal(entry._id)}
                            variant="danger"
                            size="sm"
                            className="py-1 px-3 text-xs"
                            disabled={processingId !== null}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {entries.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      {activeTab === 'pending' ? 'No pending approvals found' : 'No approved entries found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

export default Dashboard;