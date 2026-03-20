import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import { getCenters, getProjects, importPayroll } from '../services/api';

const Payroll = () => {
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
        const [payrollResponse, historyResponse] = await Promise.all([
          api.get('/payroll'),
          api.get('/payments'),
        ]);
        setPayrollData(payrollResponse.data);
        setPaymentHistory(historyResponse.data);
      } catch (error) {
        console.error('Error loading payroll:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    await Promise.all([fetchPayroll(), fetchPaymentHistory()]);
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
    if (selectedHistoryIds.size === paymentHistory.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(paymentHistory.map(item => item._id)));
    }
  };

  const toggleSelectHistory = (id) => {
    const newSelected = new Set(selectedHistoryIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedHistoryIds(newSelected);
  };

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
    ];

    const exportRows = payrollData.map((item, index) => {
      const bankDetails = item.bankDetails || {};
      const totalPay = Number(item.pendingAmount || 0);
      const scanRate = Number(item.rate || 0);
      const scanCount = scanRate > 0 ? Math.round(totalPay / scanRate) : '';

      return {
        'S.No.': index + 1,
        'User Id': item.operatorId || '',
        'User Name': item.operatorName || '',
        'Mobile No': item.mobile || '',
        'Department': '',
        'Source': '',
        'No of Days': '',
        'Day Wise Pay': '',
        'Total Per Day Payment': '',
        'Inward Count': 0,
        'Inward payment': 0,
        'Amount Per script Scan': scanRate,
        'Scan Count': scanCount,
        'Scanning total Amount': totalPay,
        'Qc Amount Per script': 0,
        'Qc Count': 0,
        'QC total Amount': 0,
        'Outward Amount Per script': 0,
        'Outward Count': 0,
        'Outward total Amount': 0,
        'Sticker Amount Per script': 0,
        'Sticker Count': 0,
        'Sticker Total Amount': 0,
        'Total Pay= (I+N+Q+T+W)': totalPay,
        'Status Pay/Hold': 'Pay',
        'Aadhar Card Number': '',
        'Pan card Number': item.panNumber || '',
        'Account No': bankDetails.accountNo || '',
        'Bank': bankDetails.bankName || '',
        'ISFC Code': bankDetails.ifscCode || '',
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
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('payouts')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payouts'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Pending Payouts
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Payment History
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
            <p className="text-sm text-gray-500">Total Paid (All Time)</p>
            <h2 className="text-3xl font-bold text-blue-600 mt-1">
              ₹{calculateTotalPaid().toLocaleString()}
            </h2>
          </div>

          {/* Bulk Actions for History */}
          {selectedHistoryIds.size > 0 && (
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
                      <input
                        type="checkbox"
                        checked={paymentHistory.length > 0 && selectedHistoryIds.size === paymentHistory.length}
                        onChange={toggleSelectAllHistory}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Beneficiary</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mode / Ref</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Account Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-gray-500">No payment history found</td>
                    </tr>
                  ) : (
                    paymentHistory.map((payment) => (
                      <tr key={payment._id} className={`hover:bg-gray-50 transition ${selectedHistoryIds.has(payment._id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedHistoryIds.has(payment._id)}
                            onChange={() => toggleSelectHistory(payment._id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
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
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${payment.status === 'processed' ? 'bg-blue-50 text-blue-700' :
                              payment.status === 'paid' ? 'bg-green-50 text-green-700' :
                                payment.status === 'failed' ? 'bg-red-50 text-red-700' :
                                  'bg-yellow-50 text-yellow-700'
                              }`}>
                              {payment.status}
                            </span>
                            {payment.status !== 'paid' && payment.status !== 'failed' && (
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
    </div>
  );
};

export default Payroll;
