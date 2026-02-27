import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('payouts');
  const [payrollData, setPayrollData] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPayroll();
    fetchPaymentHistory();
  }, []);

  const fetchPayroll = async () => {
    try {
      const response = await api.get('/payroll');
      setPayrollData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payroll:', error);
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await api.get('/payments');
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const calculateTotalPayout = () => {
    return payrollData.reduce((total, item) => total + item.totalAmount, 0);
  };

  const calculateTotalPaid = () => {
    return paymentHistory.reduce((total, item) => total + item.amount, 0);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleExport = () => {
    const exportData = payrollData.map(item => ({
      'Operator Name': item.operatorName,
      'Project': item.projectName,
      'Total Scans': item.totalScans,
      'Rate': item.rate,
      'Total Amount': item.totalAmount,
      'Mobile': item.mobile || 'N/A',
      'Center': item.center || 'N/A',
      'Bank Account': item.bankDetails?.accountNo || 'N/A',
      'IFSC Code': item.bankDetails?.ifscCode || 'N/A',
      'PAN Number': item.panNumber || 'N/A',
      'Status': 'Pending/Approved', // Placeholder as aggregation groups multiple statuses
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, "payroll_export.xlsx");
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
      alert(message);

      fetchPaymentHistory();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import payments');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review operator payouts and manage payment history
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            Export to Excel
          </button>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 ${importing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {importing ? 'Importing...' : 'Import Payments (Excel)'}
          </button>
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

          {/* Payouts Table */}
          {loading ? (
            <div className="text-gray-500">Loading payroll data...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Operator</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Scans</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payrollData.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-gray-500">No payroll data available</td>
                      </tr>
                    ) : (
                      payrollData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{item.operatorName}</p>
                            <p className="text-xs text-gray-500">{item.operatorId}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.projectName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{item.totalScans}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">₹{item.rate}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-green-600 font-semibold">₹{item.totalAmount.toLocaleString()}</span>
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

          {/* History Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
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
                      <td colSpan="6" className="py-12 text-center text-gray-500">No payment history found</td>
                    </tr>
                  ) : (
                    paymentHistory.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50 transition">
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
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${payment.status === 'processed' ? 'bg-green-50 text-green-700' :
                            payment.status === 'failed' ? 'bg-red-50 text-red-700' :
                              'bg-yellow-50 text-yellow-700'
                            }`}>
                            {payment.status}
                          </span>
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
    </div>
  );
};

export default Payroll;
