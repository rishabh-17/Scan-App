import React, { useState, useEffect } from 'react';
import { getProjects } from '../services/api';

const RateCharts = () => {
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState([]);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const projects = await getProjects();
      const processedRates = [];

      projects.forEach(project => {
        // 1. Default Scan Rate
        if (project.scanRate) {
          processedRates.push({
            id: `${project._id}-default`,
            activityName: 'Scanning (Default)',
            rate: project.scanRate,
            project: project.name,
            centers: project.centers?.map(c => c.name).join(', ') || 'All Assigned',
            effectiveDate: project.updatedAt, // Using project update time as proxy or current
            status: project.isActive ? 'Active' : 'Inactive',
            type: 'default'
          });
        }

        // 2. Rate Chart Items
        if (project.rateChart && project.rateChart.length > 0) {
          project.rateChart.forEach((item, index) => {
            processedRates.push({
              id: `${project._id}-${index}`,
              activityName: item.activityName,
              rate: item.rate,
              project: project.name,
              centers: project.centers?.map(c => c.name).join(', ') || 'All Assigned',
              effectiveDate: item.effectiveDate,
              status: item.status,
              type: 'custom'
            });
          });
        }
      });

      setRates(processedRates);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rates:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rate Charts</h1>
        <div className="text-sm text-gray-500">
          Rates are configured in Project Settings
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate per Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.length > 0 ? (
              rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rate.activityName}
                    {rate.type === 'default' && <span className="ml-2 text-xs text-gray-400">(Base Rate)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    ₹{rate.rate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.centers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rate.effectiveDate ? new Date(rate.effectiveDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rate.status === 'Active' || rate.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {rate.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No rates found. Configure rates in Project Management.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RateCharts;
