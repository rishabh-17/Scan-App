import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getProjects, getCenters, validateBulkUpload, bulkCreateScanEntries, getBulkUploadHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';

const WorkUpload = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [centers, setCenters] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [uploadDate, setUploadDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadHistory, setUploadHistory] = useState([]);

  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    fetchMetadata();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const history = await getBulkUploadHistory();
      setUploadHistory(history);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    if (selectedCenter) {
      // Find selected center object to get its name
      const selectedCenterObj = centers.find(c => c._id === selectedCenter);
      const selectedCenterName = selectedCenterObj ? selectedCenterObj.name : '';

      // Find projects assigned to this center
      // Check both 'centers' array (new format) and 'center' string (legacy format)
      const relevant = projects.filter(p => {
        // Check new format: centers array of IDs
        const hasCenterId = p.centers && p.centers.some(c => {
          const cId = c._id || c;
          return cId.toString() === selectedCenter;
        });

        // Check legacy format: center string matching name
        const hasCenterName = p.center && selectedCenterName && 
          p.center.toLowerCase() === selectedCenterName.toLowerCase();

        return hasCenterId || hasCenterName;
      });

      setFilteredProjects(relevant);
      // Reset project if not in the new list
      if (!relevant.find(p => p._id === selectedProject)) {
        setSelectedProject('');
      }
    } else {
      setFilteredProjects([]);
      setSelectedProject('');
    }
  }, [selectedCenter, projects]);

  const fetchMetadata = async () => {
    try {
      const [projectsData, centersData] = await Promise.all([
        getProjects(),
        getCenters()
      ]);
      setProjects(projectsData);
      setCenters(centersData);
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Failed to load projects and centers');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setValidationResult(null);
      setError('');
      setSuccessMessage('');

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

          // Parse header and rows
          if (data.length < 2) {
            setError('File appears to be empty or missing header');
            return;
          }

          const header = data[0].map(h => h.trim().toLowerCase());
          const rows = data.slice(1).filter(r => r.length > 0);

          // Map columns to keys
          // Expected: Staff ID, Staff Name, Activity Type, Units Completed, Work Date, Project Code, Center Code, Remarks
          const colMap = {
            staffId: header.findIndex(h => h.includes('staff id')),
            staffName: header.findIndex(h => h.includes('staff name')),
            activityType: header.findIndex(h => h.includes('activity type')),
            unitsCompleted: header.findIndex(h => h.includes('units completed')),
            workDate: header.findIndex(h => h.includes('work date')),
            projectCode: header.findIndex(h => h.includes('project code')),
            centerCode: header.findIndex(h => h.includes('center code')),
            remarks: header.findIndex(h => h.includes('remarks'))
          };

          // Check if essential columns are found
          const missingCols = [];
          if (colMap.staffId === -1) missingCols.push('Staff ID');
          if (colMap.unitsCompleted === -1) missingCols.push('Units Completed');

          if (missingCols.length > 0) {
            setError(`Missing required columns: ${missingCols.join(', ')}`);
            return;
          }

          // Use selected values or file values
          // If user selected project/center, we should prioritize them or validate against them
          const selectedProjectObj = projects.find(p => p._id === selectedProject);
          const selectedCenterObj = centers.find(c => c._id === selectedCenter);

          const formattedRows = rows.map((row) => ({
            staffId: row[colMap.staffId],
            staffName: row[colMap.staffName],
            activityType: row[colMap.activityType],
            unitsCompleted: row[colMap.unitsCompleted],
            workDate: uploadDate, // Force upload date
            projectCode: selectedProjectObj ? selectedProjectObj.projectCode : row[colMap.projectCode],
            centerCode: selectedCenterObj ? selectedCenterObj.centerCode : row[colMap.centerCode],
            remarks: row[colMap.remarks]
          }));

          setParsedData(formattedRows);
        } catch (err) {
          console.error('Error parsing file:', err);
          setError('Failed to parse Excel file');
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleValidate = async () => {
    if (parsedData.length === 0) {
      setError('No data to validate');
      return;
    }

    setLoading(true);
    setValidationResult(null);
    setError('');

    try {
      // If user selected project/center, we could enforce it here, but let's just validate what's in the file first
      // Or maybe override? Let's stick to validating file content against DB.

      const result = await validateBulkUpload(parsedData);
      setValidationResult(result);

      if (!result.valid) {
        setError(`Validation failed for ${result.errors.length} rows`);
      } else {
        setSuccessMessage('Validation successful! You can now submit.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Server error during validation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validationResult?.valid) {
      setError('Please validate successfully before submitting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await bulkCreateScanEntries(parsedData);
      setSuccessMessage(`Successfully created ${result.message}`);
      setFile(null);
      setParsedData([]);
      setValidationResult(null);
      fetchHistory(); // Refresh history
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Work Upload (Bulk)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 1. Center Selection (First Step) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select Center</option>
              {centers.map(center => (
                <option key={center._id} value={center._id}>{center.name} ({center.centerCode})</option>
              ))}
            </select>
          </div>

          {/* 2. Project Selection (Filtered by Center) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={!selectedCenter}
              className={`w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!selectedCenter ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select Project</option>
              {filteredProjects.map(project => (
                <option key={project._id} value={project._id}>{project.name} ({project.projectCode})</option>
              ))}
            </select>
          </div>

          {/* 3. Upload Date (Disabled/Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Date</label>
            <input
              type="date"
              value={uploadDate}
              disabled={true}
              className="w-full bg-gray-100 border-gray-300 rounded-md shadow-sm text-gray-500 cursor-not-allowed sm:text-sm"
            />
          </div>

          {/* 4. File Upload (Enabled only after Project & Center selected) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Excel File</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={!selectedCenter || !selectedProject}
              className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold 
                ${(!selectedCenter || !selectedProject) ? 'file:bg-gray-200 file:text-gray-500 cursor-not-allowed' : 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100'}`}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        {parsedData.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview ({parsedData.length} rows)</h3>
            <div className="bg-gray-50 p-2 rounded max-h-40 overflow-auto text-xs border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Row</th>
                    <th className="px-2 py-1 text-left">Staff ID</th>
                    <th className="px-2 py-1 text-left">Activity</th>
                    <th className="px-2 py-1 text-left">Units</th>
                    <th className="px-2 py-1 text-left">Project</th>
                    <th className="px-2 py-1 text-left">Center</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1">{idx + 1}</td>
                      <td className="px-2 py-1">{row.staffId}</td>
                      <td className="px-2 py-1">{row.activityType}</td>
                      <td className="px-2 py-1">{row.unitsCompleted}</td>
                      <td className="px-2 py-1">{row.projectCode}</td>
                      <td className="px-2 py-1">{row.centerCode}</td>
                    </tr>
                  ))}
                  {parsedData.length > 10 && (
                    <tr>
                      <td colSpan="6" className="px-2 py-1 text-center text-gray-500">...and {parsedData.length - 10} more rows</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {validationResult && validationResult.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <ul className="list-disc pl-5 text-xs text-red-700 max-h-32 overflow-auto">
              {validationResult.errors.map((err, idx) => (
                <li key={idx}>
                  Row {err.row}: {err.errors.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleValidate}
            disabled={!file || parsedData.length === 0 || loading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${!file || parsedData.length === 0 || loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {loading ? 'Validating...' : 'Validate'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={!validationResult?.valid || submitting}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${!validationResult?.valid || submitting ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>

      {/* Upload History Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Recent Uploads</h3>
        {uploadHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No upload history found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadHistory.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.projectId?.name || entry.projectId?.projectCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.centerId?.name || entry.centerId?.centerCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.operatorId?.name || entry.operatorId?.employeeId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.activityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.scans}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${entry.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          entry.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkUpload;
