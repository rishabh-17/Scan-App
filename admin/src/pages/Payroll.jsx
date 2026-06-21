import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import { getCenters, getProjects, importPayroll } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/useAuth';

const Payroll = () => {
  const { user } = useAuth();
  const isFinanceUser = user?.role === 'admin' || user?.role === 'finance_hr';
  const isProjectManager = user?.role === 'project_manager';
  const [activeTab, setActiveTab] = useState('payouts');
  const [payrollData, setPayrollData] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedHistoryIds, setSelectedHistoryIds] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [failureModal, setFailureModal] = useState({ isOpen: false, payment: null });
  const [failureReason, setFailureReason] = useState('');
  const [editFailureModal, setEditFailureModal] = useState({ isOpen: false, payment: null });
  const [failedStaffForm, setFailedStaffForm] = useState({
    name: '',
    bankDetails: {
      accountHolderName: '',
      accountNo: '',
      ifscCode: '',
      bankName: '',
    }
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmVariant: 'primary'
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary'
  });

  const fileInputRef = useRef(null);
  const payrollFileInputRef = useRef(null);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [centersData, projectsData] = await Promise.all([getCenters(), getProjects()]);
        setCenters(centersData);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const historyPromise = api.get('/payments');
        const payrollPromise = isFinanceUser ? api.get('/payroll') : Promise.resolve({ data: [] });
        const [payrollResponse, historyResponse] = await Promise.all([
          payrollPromise,
          historyPromise,
        ]);
        setPayrollData(payrollResponse.data || []);
        setPaymentHistory(historyResponse.data || []);
        if (!isFinanceUser) {
          setActiveTab('history');
        }
      } catch (error) {
        console.error('Error loading payroll:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [isFinanceUser]);

  const handleSearch = async () => {
    setLoading(true);
    await Promise.all([
      isFinanceUser ? fetchPayroll() : Promise.resolve(),
      fetchPaymentHistory()
    ]);
  };

  const fetchPayroll = async () => {
    try {
      const params = {};
      if (selectedCenter) params.center = selectedCenter;
      if (selectedProject) params.project = selectedProject;
      const response = await api.get('/payroll', { params });
      setPayrollData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const params = {};
      if (selectedCenter) params.center = selectedCenter;
      if (selectedProject) params.project = selectedProject;
      if (isProjectManager) params.status = 'failed,pending';
      const response = await api.get('/payments', { params });
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const calculateTotalPayout = () => {
    return payrollData.reduce((total, item) => total + (item.pendingAmount || 0), 0);
  };

  const calculateTotalPaid = () => {
    return paymentHistory.reduce((total, item) => total + item.amount, 0);
  };

  const executeCreatePayment = async (operatorId, amount) => {
    setActionLoading(true);
    try {
      await api.post('/payments', {
        staff: operatorId,
        amount: amount,
        status: 'paid',
      });

      // Refresh both lists
      fetchPayroll();
      fetchPaymentHistory();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Payment marked as paid successfully',
        variant: 'success'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error creating payment:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to mark payment as paid',
        variant: 'danger'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePayment = (operatorId, amount) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Payment',
      message: `Are you sure you want to mark ₹${amount.toLocaleString()} as paid?`,
      onConfirm: () => executeCreatePayment(operatorId, amount),
      confirmVariant: 'primary'
    });
  };

  const executeBulkCreatePayment = async () => {
    const selectedItems = payrollData.filter(item => selectedIds.has(item.operatorId));
    setActionLoading(true);

    try {
      await Promise.all(selectedItems.map(item =>
        api.post('/payments', {
          staff: item.operatorId,
          amount: item.pendingAmount,
          status: 'paid',
        })
      ));

      setSelectedIds(new Set());
      fetchPayroll();
      fetchPaymentHistory();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Selected payments marked as paid successfully',
        variant: 'success'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error creating bulk payments:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Some payments failed to process',
        variant: 'danger'
      });
      fetchPayroll();
      fetchPaymentHistory();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkCreatePayment = () => {
    const selectedItems = payrollData.filter(item => selectedIds.has(item.operatorId));
    if (selectedItems.length === 0) return;

    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.pendingAmount || 0), 0);

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bulk Payment',
      message: `Mark ${selectedItems.length} operators as paid? Total: ₹${totalAmount.toLocaleString()}`,
      onConfirm: executeBulkCreatePayment,
      confirmVariant: 'primary'
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === payrollData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payrollData.map(item => item.operatorId)));
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

  const toggleSelectAllHistory = () => {
    const selectableIds = paymentHistory
      .filter((item) => item.status !== 'paid' && item.status !== 'failed')
      .map((item) => item._id);
    if (selectedHistoryIds.size === selectableIds.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(selectableIds));
    }
  };

  const toggleSelectHistory = (id) => {
    const payment = paymentHistory.find((item) => item._id === id);
    if (!payment || payment.status === 'paid' || payment.status === 'failed') return;
    const newSelected = new Set(selectedHistoryIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHistoryIds(newSelected);
  };

  const canEditFailedRecord = (payment) => payment.status === 'failed' && (isFinanceUser || isProjectManager);

  const handleImportClick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handlePayrollImportClick = () => {
    if (!payrollFileInputRef.current) return;
    payrollFileInputRef.current.click();
  };

  const handleExport = () => {
    const date = new Date();
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

    const headers = [
      'S.No.',
      'User Id',
      'User Name',
      'Mobile No',
      'Department',
      'Source',
      'No of Days',
      'Day Wise Pay',
      'Total Per Day Payment',
      'Inward Count',
      'Inward payment',
      'Amount Per script Scan',
      'Scan Count',
      'Scanning total Amount',
      'Qc Amount Per script',
      'Qc Count',
      'QC total Amount',
      'Outward Amount Per script',
      'Outward Count',
      'Outward total Amount',
      'Sticker Amount Per script',
      'Sticker Count',
      'Sticker Total Amount',
      'Total Pay= (I+N+Q+T+W)',
      'Status Pay/Hold',
      'Aadhar Card Number',
      'Pan card Number',
      'Account No',
      'Bank',
      'ISFC Code',
      'TDS',
      'Net Amount (Amount-TDS)',
      'Remarks1',
      'Remarks2',
    ];

    const exportRows = payrollData.map((item, index) => {
      const bankDetails = item.bankDetails || {};
      const totalPay = Number(item.pendingAmount || 0);
      const hasBreakdown = [
        'scanUnits', 'scanAmount',
        'qcUnits', 'qcAmount',
        'stickerUnits', 'stickerAmount',
        'inwardUnits', 'inwardAmount',
        'outwardUnits', 'outwardAmount',
        'dayUnits', 'dayAmount',
        'trainingUnits', 'trainingAmount',
        'referralUnits', 'referralAmount',
        'miscUnits', 'miscAmount',
        'othersUnits', 'othersAmount',
      ].some(k => item?.[k] !== undefined);

      const scanUnits = Number(item.scanUnits || 0);
      const scanAmount = Number(item.scanAmount || 0);
      const qcUnits = Number(item.qcUnits || 0);
      const qcAmount = Number(item.qcAmount || 0);
      const outwardUnits = Number(item.outwardUnits || 0);
      const outwardAmount = Number(item.outwardAmount || 0);
      const stickerUnits = Number(item.stickerUnits || 0);
      const stickerAmount = Number(item.stickerAmount || 0);
      const inwardUnits = Number(item.inwardUnits || 0);
      const inwardAmount = Number(item.inwardAmount || 0);

      const earnedTotalAmount = Number(item.totalAmount || 0);
      const pendingFactor = earnedTotalAmount > 0 ? (totalPay / earnedTotalAmount) : 1;

      const toScaledUnits = (n) => Math.round(Number(n || 0) * pendingFactor);
      const toScaledAmount = (n) => Number((Number(n || 0) * pendingFactor).toFixed(2));

      const scanUnitsPending = hasBreakdown ? toScaledUnits(scanUnits) : 0;
      const scanAmountPending = hasBreakdown ? toScaledAmount(scanAmount) : 0;
      const qcUnitsPending = hasBreakdown ? toScaledUnits(qcUnits) : 0;
      const qcAmountPending = hasBreakdown ? toScaledAmount(qcAmount) : 0;
      const outwardUnitsPending = hasBreakdown ? toScaledUnits(outwardUnits) : 0;
      const outwardAmountPending = hasBreakdown ? toScaledAmount(outwardAmount) : 0;
      const stickerUnitsPending = hasBreakdown ? toScaledUnits(stickerUnits) : 0;
      const stickerAmountPending = hasBreakdown ? toScaledAmount(stickerAmount) : 0;
      const inwardUnitsPending = hasBreakdown ? toScaledUnits(inwardUnits) : 0;
      const inwardAmountPending = hasBreakdown ? toScaledAmount(inwardAmount) : 0;

      const scanRate = (scanUnits > 0 && scanAmount > 0) ? (scanAmount / scanUnits) : Number(item.rate || 0);
      const qcRate = (qcUnits > 0 && qcAmount > 0) ? (qcAmount / qcUnits) : 0;
      const outwardRate = (outwardUnits > 0 && outwardAmount > 0) ? (outwardAmount / outwardUnits) : 0;
      const stickerRate = (stickerUnits > 0 && stickerAmount > 0) ? (stickerAmount / stickerUnits) : 0;

      const fallbackScanCount = scanRate > 0 ? Math.round(totalPay / scanRate) : '';

      return {
        'S.No.': index + 1,
        'User Id': item.employeeId || item.operatorId || '',
        'User Name': item.operatorName || '',
        'Mobile No': item.mobile || '',
        'Department': '',
        'Source': '',
        'No of Days': Number(item.noOfDays || 0),
        'Day Wise Pay': '',
        'Total Per Day Payment': '',
        'Inward Count': hasBreakdown ? inwardUnitsPending : 0,
        'Inward payment': hasBreakdown ? inwardAmountPending : 0,
        'Amount Per script Scan': scanRate,
        'Scan Count': hasBreakdown ? scanUnitsPending : fallbackScanCount,
        'Scanning total Amount': hasBreakdown ? scanAmountPending : totalPay,
        'Qc Amount Per script': hasBreakdown ? qcRate : 0,
        'Qc Count': hasBreakdown ? qcUnitsPending : 0,
        'QC total Amount': hasBreakdown ? qcAmountPending : 0,
        'Outward Amount Per script': hasBreakdown ? outwardRate : 0,
        'Outward Count': hasBreakdown ? outwardUnitsPending : 0,
        'Outward total Amount': hasBreakdown ? outwardAmountPending : 0,
        'Sticker Amount Per script': hasBreakdown ? stickerRate : 0,
        'Sticker Count': hasBreakdown ? stickerUnitsPending : 0,
        'Sticker Total Amount': hasBreakdown ? stickerAmountPending : 0,
        'Total Pay= (I+N+Q+T+W)': totalPay,
        'Status Pay/Hold': 'Pay',
        'Aadhar Card Number': '',
        'Pan card Number': item.panNumber || '',
        'Account No': bankDetails.accountNo || '',
        'Bank': bankDetails.bankName || '',
        'ISFC Code': bankDetails.ifscCode || '',
        'TDS': 0,
        'Net Amount (Amount-TDS)': totalPay,
        'Remarks1': '',
        'Remarks2': '',
      };
    });

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.sheet_add_json(ws, exportRows, { header: headers, skipHeader: true, origin: 'A2' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");

    const fileName = `Payroll_Export_${monthYear.replace(' ', '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const executeMarkAsPaid = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/payments/${id}`, { status: 'paid' });
      // Update local state
      setPaymentHistory(prev => prev.map(p =>
        p._id === id ? { ...p, status: 'paid' } : p
      ));
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Payment status updated',
        variant: 'success'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error updating payment status:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update payment status',
        variant: 'danger'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Update',
      message: 'Are you sure you want to mark this payment as paid?',
      onConfirm: () => executeMarkAsPaid(id),
      confirmVariant: 'primary'
    });
  };

  const executeBulkMarkHistoryPaid = async () => {
    const selectedItems = paymentHistory.filter(item => selectedHistoryIds.has(item._id));
    setActionLoading(true);
    try {
      await Promise.all(selectedItems.map(item =>
        api.put(`/payments/${item._id}`, { status: 'paid' })
      ));

      setPaymentHistory(prev => prev.map(p => selectedHistoryIds.has(p._id) ? { ...p, status: 'paid' } : p));
      setSelectedHistoryIds(new Set());
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Selected payments marked as paid',
        variant: 'success'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error bulk updating:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Some updates failed',
        variant: 'danger'
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkHistoryPaid = () => {
    if (selectedHistoryIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bulk Update',
      message: `Mark ${selectedHistoryIds.size} payments as paid?`,
      onConfirm: executeBulkMarkHistoryPaid,
      confirmVariant: 'primary'
    });
  };

  const openFailureModal = (payment) => {
    setFailureModal({ isOpen: true, payment });
    setFailureReason(payment?.failureReason || '');
  };

  const handleMarkFailed = async () => {
    if (!failureModal.payment) return;
    if (!failureReason.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter rejection reason',
        variant: 'danger'
      });
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/payments/${failureModal.payment._id}/fail`, { reason: failureReason });
      await fetchPaymentHistory();
      setFailureModal({ isOpen: false, payment: null });
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Payment marked as failed',
        variant: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update payment status',
        variant: 'danger'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openEditFailureModal = (payment) => {
    setEditFailureModal({ isOpen: true, payment });
    setFailedStaffForm({
      name: payment?.staff?.name || '',
      bankDetails: {
        accountHolderName: payment?.staff?.bankDetails?.accountHolderName || '',
        accountNo: payment?.staff?.bankDetails?.accountNo || '',
        ifscCode: payment?.staff?.bankDetails?.ifscCode || '',
        bankName: payment?.staff?.bankDetails?.bankName || '',
      }
    });
  };

  const handleFailedStaffChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('bankDetails.')) {
      const key = name.split('.')[1];
      setFailedStaffForm((prev) => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          [key]: value
        }
      }));
      return;
    }
    setFailedStaffForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFailedStaffSave = async () => {
    if (!editFailureModal.payment) return;

    setActionLoading(true);
    try {
      await api.put(`/payments/${editFailureModal.payment._id}/failure-staff`, failedStaffForm);
      await fetchPaymentHistory();
      setEditFailureModal({ isOpen: false, payment: null });
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Staff details updated successfully',
        variant: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update staff details',
        variant: 'danger'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmitFailedPayment = async (payment) => {
    setActionLoading(true);
    try {
      await api.put(`/payments/${payment._id}/resubmit`);
      await fetchPaymentHistory();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Failed payment submitted for processing',
        variant: 'success'
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to submit failed payment',
        variant: 'danger'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const response = await api.post('/payments/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { success, failed, errors } = response.data.results;
      let message = `Import Completed:\nSuccess: ${success}\nFailed: ${failed}`;
      if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
      }
      setAlertModal({
        isOpen: true,
        title: 'Import Result',
        message: message,
        variant: failed > 0 ? 'warning' : 'success'
      });

      fetchPaymentHistory();
    } catch (error) {
      console.error('Import error:', error);
      setAlertModal({
        isOpen: true,
        title: 'Import Failed',
        message: 'Failed to import payments. Please check the file format.',
        variant: 'danger'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePayrollFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    try {
      const response = await importPayroll(file);
      const { results } = response;
      const errors = Array.isArray(results?.errors) ? results.errors : [];
      let message = `Import Completed:\nTotal: ${results.total}\nCreated Payments: ${results.createdPayments}\nHold Rows: ${results.heldRows}\nFailed: ${results.failed}`;
      if (errors.length > 0) {
        message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`;
      }
      setAlertModal({
        isOpen: true,
        title: 'Payroll Import Result',
        message: message,
        variant: results.failed > 0 ? 'warning' : 'success'
      });

      await Promise.all([fetchPayroll(), fetchPaymentHistory()]);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Payroll Import Failed',
        message: error.response?.data?.message || 'Failed to import payroll. Please check the file format.',
        variant: 'danger'
      });
    } finally {
      setImporting(false);
      if (payrollFileInputRef.current) payrollFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 mx-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review operator payouts and manage payment history
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Center</label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Centers</option>
                {centers.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.centerCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={handleSearch}>
            Search
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <input
            type="file"
            ref={payrollFileInputRef}
            onChange={handlePayrollFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          {isFinanceUser && (
            <>
              <Button
                onClick={handleExport}
                variant="secondary"
              >
                Export to Excel
              </Button>
              <Button
                onClick={handleImportClick}
                loading={importing}
              >
                Import Payments (Excel)
              </Button>
              <Button
                onClick={handlePayrollImportClick}
                loading={importing}
                variant="secondary"
              >
                Import Payroll (Excel/CSV)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {isFinanceUser && (
            <button
              onClick={() => setActiveTab('payouts')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payouts'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Pending Payouts
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {isFinanceUser ? 'Payment History' : 'Payment Failures'}
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'payouts' ? (
        <>
          {/* KPI Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
            <p className="text-sm text-gray-500">Total Payout Pending</p>
            <h2 className="text-3xl font-bold text-green-600 mt-1">
              ₹{calculateTotalPayout().toLocaleString()}
            </h2>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between mb-6">
              <span className="text-blue-700 font-medium">{selectedIds.size} operators selected</span>
              <Button
                onClick={handleBulkCreatePayment}
                loading={actionLoading}
              >
                Mark Selected as Paid
              </Button>
            </div>
          )}

          {/* Payouts Table */}
          {loading ? (
            <div className="text-gray-500">Loading payroll data...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={payrollData.length > 0 && selectedIds.size === payrollData.length}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operator</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Scans</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Pending Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payrollData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-gray-500">No pending payouts available</td>
                      </tr>
                    ) : (
                      payrollData.map((item) => (
                        <tr key={item.operatorId} className={`hover:bg-gray-50 transition ${selectedIds.has(item.operatorId) ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.operatorId)}
                              onChange={() => toggleSelect(item.operatorId)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{item.operatorName}</p>
                            <p className="text-xs text-gray-500">{item.operatorId}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.projectName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.totalScans}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">₹{item.rate}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-green-600 font-semibold">₹{(item.pendingAmount || 0).toLocaleString()}</span>
                            <div className="text-xs text-gray-400">Total: ₹{item.totalAmount?.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              onClick={() => handleCreatePayment(item.operatorId, item.pendingAmount)}
                              className="text-xs px-3 py-1.5"
                              loading={actionLoading}
                            >
                              Mark Paid
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* History KPI */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
            <p className="text-sm text-gray-500">{isFinanceUser ? 'Total Paid (All Time)' : 'Failed / Returned Payments'}</p>
            <h2 className="text-3xl font-bold text-blue-600 mt-1">
              {isFinanceUser
                ? `₹${calculateTotalPaid().toLocaleString()}`
                : paymentHistory.filter((payment) => payment.status === 'failed').length}
            </h2>
          </div>

          {/* Bulk Actions for History */}
          {isFinanceUser && selectedHistoryIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between mb-6">
              <span className="text-blue-700 font-medium">{selectedHistoryIds.size} payments selected</span>
              <Button
                onClick={handleBulkMarkHistoryPaid}
                loading={actionLoading}
              >
                Mark Selected as Paid
              </Button>
            </div>
          )}

          {/* History Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      {isFinanceUser && (
                        <input
                          type="checkbox"
                          checked={paymentHistory.filter((p) => p.status !== 'paid' && p.status !== 'failed').length > 0 && selectedHistoryIds.size === paymentHistory.filter((p) => p.status !== 'paid' && p.status !== 'failed').length}
                          onChange={toggleSelectAllHistory}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Beneficiary</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode / Ref</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-gray-500">No payment history found</td>
                    </tr>
                  ) : (
                    paymentHistory.map((payment) => (
                      <tr key={payment._id} className={`hover:bg-gray-50 transition ${selectedHistoryIds.has(payment._id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4">
                          {isFinanceUser && (
                            <input
                              type="checkbox"
                              checked={selectedHistoryIds.has(payment._id)}
                              disabled={payment.status === 'paid' || payment.status === 'failed'}
                              onChange={() => toggleSelectHistory(payment._id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{payment.staff?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{payment.staff?.mobile}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₹{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="capitalize">{payment.paymentMode.replace('_', ' ')}</div>
                          <div className="text-xs text-gray-500">{payment.transactionId || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {payment.accountDetails?.accountNo ? (
                            <>
                              <div>{payment.accountDetails.accountNo}</div>
                              <div className="text-xs text-gray-500">{payment.accountDetails.ifscCode}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          {payment.failureReason || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${payment.status === 'processed' ? 'bg-blue-50 text-blue-700' :
                              payment.status === 'paid' ? 'bg-green-50 text-green-700' :
                                payment.status === 'failed' ? 'bg-red-50 text-red-700' :
                                  'bg-yellow-50 text-yellow-700'
                              }`}>
                              {payment.status}
                            </span>
                            {isFinanceUser && payment.status !== 'paid' && payment.status !== 'failed' && (
                              <Button
                                onClick={() => handleMarkAsPaid(payment._id)}
                                variant="secondary"
                                className="text-xs px-2 py-1"
                                loading={actionLoading}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-2">
                            {isFinanceUser && payment.status !== 'paid' && payment.status !== 'failed' && (
                              <Button
                                onClick={() => openFailureModal(payment)}
                                variant="danger"
                                className="text-xs px-2 py-1"
                                loading={actionLoading}
                              >
                                Mark Failed
                              </Button>
                            )}
                            {canEditFailedRecord(payment) && (
                              <Button
                                onClick={() => openEditFailureModal(payment)}
                                variant="secondary"
                                className="text-xs px-2 py-1"
                                loading={actionLoading}
                              >
                                Edit Staff
                              </Button>
                            )}
                            {(isProjectManager || user?.role === 'admin') && payment.status === 'failed' && (
                              <Button
                                onClick={() => handleResubmitFailedPayment(payment)}
                                className="text-xs px-2 py-1"
                                loading={actionLoading}
                              >
                                Submit For Processing
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmVariant={confirmModal.confirmVariant}
        loading={actionLoading}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      <Modal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal({ isOpen: false, payment: null })}
        title="Mark Payment As Failed"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Enter the rejection reason for this bank payment failure.
          </p>
          <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            rows="4"
            placeholder="Failure reason..."
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setFailureModal({ isOpen: false, payment: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleMarkFailed}
              loading={actionLoading}
            >
              Mark Failed
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editFailureModal.isOpen}
        onClose={() => setEditFailureModal({ isOpen: false, payment: null })}
        title="Edit Failed Payment Staff Details"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Only name and bank account details are editable for failed payment correction.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={failedStaffForm.name}
              onChange={handleFailedStaffChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              name="bankDetails.accountHolderName"
              value={failedStaffForm.bankDetails.accountHolderName}
              onChange={handleFailedStaffChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              name="bankDetails.accountNo"
              value={failedStaffForm.bankDetails.accountNo}
              onChange={handleFailedStaffChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input
              type="text"
              name="bankDetails.ifscCode"
              value={failedStaffForm.bankDetails.ifscCode}
              onChange={handleFailedStaffChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              name="bankDetails.bankName"
              value={failedStaffForm.bankDetails.bankName}
              onChange={handleFailedStaffChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setEditFailureModal({ isOpen: false, payment: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFailedStaffSave}
              loading={actionLoading}
            >
              Save Details
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
