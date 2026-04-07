import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Card, Col, Row, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd';
import { Pie, Column } from '@ant-design/plots';
import Button from '../components/Button';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import Modal from '../components/Modal';

const Dashboard = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [stats, setStats] = useState({ totalUnits: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });

  // UI States
  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, ids: [] });
  const [rejectReason, setRejectReason] = useState('');

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending'
        ? '/scan-entry/pending'
        : activeTab === 'approved'
          ? '/scan-entry/pending?type=approved'
          : '/scan-entry/pending?type=rejected';
      const response = await api.get(endpoint);
      setEntries(response.data);
    } catch {
      setError('Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/scan-entry/stats');
      setStats(response.data || { totalUnits: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
    } catch {
      setStats({ totalUnits: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await fetchStats();
      await fetchEntries();
      setSelectedIds(new Set());
    };
    run();
  }, [fetchEntries, fetchStats]);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.put(`/scan-entry/${id}/approve`);
      await fetchStats();
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
    const selectedApprovableIds = entries
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
        ids.map(id => api.put(`/scan-entry/${id}/approve`))
      );
      setSelectedIds(new Set());
      await fetchStats();
      await fetchEntries();
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Selected entries approved successfully', variant: 'success' });
    } catch {
      setConfirmConfig({ ...confirmConfig, isOpen: false });
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Some approvals failed. Please check the list.' });
      fetchEntries();
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    const rejectableIds = entries
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
        message: 'No rejectable entries selected',
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
      await fetchStats();
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

  const canSelect = (entry) => canApprove(entry) || canReject(entry);

  const statusPieData = [
    { type: 'Pending', value: Number(stats.pendingCount || 0) },
    { type: 'Approved', value: Number(stats.approvedCount || 0) },
    { type: 'Rejected', value: Number(stats.rejectedCount || 0) },
  ].filter(d => d.value > 0);

  const dailyData = (() => {
    const byDay = new Map();
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 6);
    entries.forEach((e) => {
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime()) || d < cutoff) return;
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + Number(e.scans || 0));
    });
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, units: byDay.get(key) || 0 });
    }
    return days;
  })();

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Operator',
      dataIndex: ['operatorId', 'name'],
      key: 'operator',
      render: (_, r) => r.operatorId?.name || 'Unknown',
    },
    {
      title: 'Project',
      dataIndex: ['projectId', 'name'],
      key: 'project',
      render: (_, r) => r.projectId?.name || 'Unknown',
    },
    {
      title: 'Activity',
      dataIndex: 'activityType',
      key: 'activityType',
      render: (v) => String(v || ''),
    },
    {
      title: 'Scans',
      dataIndex: 'scans',
      key: 'scans',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag>{String(v || '').replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, entry) => (
        <Space>
          {canApprove(entry) && (
            <Button
              onClick={() => handleApprove(entry._id)}
              variant="success"
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
              disabled={processingId !== null}
            >
              Reject
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: Array.from(selectedIds),
    onChange: (keys) => setSelectedIds(new Set(keys)),
    getCheckboxProps: (record) => ({ disabled: !canSelect(record) }),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Pending" value={stats.pendingCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Approved" value={stats.approvedCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Rejected" value={stats.rejectedCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Total Units" value={stats.totalUnits || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Status Split">
            {statusPieData.length > 0 ? (
              <Pie
                data={statusPieData}
                angleField="value"
                colorField="type"
                radius={0.9}
                height={220}
                legend={{ position: 'bottom' }}
              />
            ) : (
              <Typography.Text type="secondary">No data</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Units (Last 7 Days)">
            <Column
              data={dailyData}
              xField="day"
              yField="units"
              height={220}
              xAxis={{ label: { autoRotate: false } }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {activeTab === 'pending' ? 'Pending Approvals' : activeTab === 'approved' ? 'Approved Entries' : 'Rejected Entries'}
          </Typography.Title>
          <Segmented
            value={activeTab}
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            onChange={setActiveTab}
          />
        </Space>
      </Card>

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
        <Card style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}>
          <Loader size="xl" />
        </Card>
      ) : error ? (
        <Card>
          <Typography.Text type="danger">{error}</Typography.Text>
        </Card>
      ) : (
        <Card>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={entries}
            rowSelection={rowSelection}
            pagination={{ pageSize: 20 }}
          />
        </Card>
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
