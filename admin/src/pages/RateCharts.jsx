import React, { useEffect, useMemo, useState } from 'react';
import { getActivities, getCenters, getProjects, updateProjectRates } from '../services/api';
import Button from '../components/Button';
import AlertModal from '../components/AlertModal';

const RateCharts = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [centers, setCenters] = useState([]);
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState({
    projectId: '',
    centerId: '',
    activityName: '',
  });
  const [formData, setFormData] = useState({
    projectId: '',
    scope: 'project',
    centerId: '',
    activityName: 'SCAN',
    rate: '',
    status: 'active',
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsData, centersData, activitiesData] = await Promise.all([
        getProjects(),
        getCenters(),
        getActivities(),
      ]);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setCenters(Array.isArray(centersData) ? centersData : []);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
    } catch {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load rate chart data',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rates = useMemo(() => {
    const rows = [];

    projects.forEach((project) => {
      const hasProjectScanRate = Array.isArray(project.rateChart)
        && project.rateChart.some((item) => item.activityName === 'SCAN' && !item.center);

      if (project.scanRate && !hasProjectScanRate) {
        rows.push({
          id: `${project._id}-scan-base`,
          projectId: project._id,
          projectName: project.name,
          centerId: '',
          centerName: 'All Centers',
          activityName: 'SCAN',
          activityLabel: 'Scanning',
          rate: project.scanRate,
          effectiveDate: project.updatedAt,
          status: project.isActive ? 'active' : 'inactive',
          scope: 'project',
          type: 'base',
        });
      }

      (project.rateChart || []).forEach((item, index) => {
        const activity = activities.find((entry) => entry.code === item.activityName);
        rows.push({
          id: `${project._id}-${index}-${item.activityName}-${item.center?._id || 'project'}`,
          projectId: project._id,
          projectName: project.name,
          centerId: item.center?._id || '',
          centerName: item.center?.name || 'All Centers',
          activityName: item.activityName,
          activityLabel: activity?.name || item.activityName,
          rate: item.rate,
          effectiveDate: item.effectiveDate,
          status: item.status || 'active',
          scope: item.center ? 'center' : 'project',
          type: 'custom',
        });
      });
    });

    return rows.filter((row) => {
      if (filters.projectId && row.projectId !== filters.projectId) return false;
      if (filters.activityName && row.activityName !== filters.activityName) return false;
      if (filters.centerId) {
        return row.centerId === filters.centerId || row.scope === 'project';
      }
      return true;
    });
  }, [activities, filters.activityName, filters.centerId, filters.projectId, projects]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.activityName || !formData.rate) return;

    const project = projects.find((item) => item._id === formData.projectId);
    if (!project) return;

    const normalizedCenterId = formData.scope === 'center' ? formData.centerId : '';
    if (formData.scope === 'center' && !normalizedCenterId) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please select a center for project & center level rate',
        variant: 'warning',
      });
      return;
    }

    const nextRateChart = [...(project.rateChart || [])];
    const existingIndex = nextRateChart.findIndex((item) => (
      String(item.activityName) === String(formData.activityName)
      && String(item.center?._id || item.center || '') === String(normalizedCenterId || '')
    ));

    const nextItem = {
      activityName: formData.activityName,
      rate: Number(formData.rate),
      center: normalizedCenterId || null,
      status: formData.status,
      effectiveDate: new Date().toISOString(),
    };

    if (existingIndex >= 0) nextRateChart[existingIndex] = { ...nextRateChart[existingIndex], ...nextItem };
    else nextRateChart.push(nextItem);

    const payload = {
      rateChart: nextRateChart,
      scanRate: formData.activityName === 'SCAN' && formData.scope === 'project'
        ? Number(formData.rate)
        : project.scanRate,
    };

    setSaving(true);
    try {
      await updateProjectRates(project._id, payload);
      await loadData();
      setFormData((prev) => ({ ...prev, rate: '', centerId: '' }));
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Rate configured successfully',
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save rate',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Charts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure project-level and project & center-level activity rates.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData((prev) => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
            <select
              value={formData.scope}
              onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value, centerId: '' }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="project">Project Level</option>
              <option value="center">Project & Center</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
            <select
              value={formData.centerId}
              onChange={(e) => setFormData((prev) => ({ ...prev, centerId: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
              disabled={formData.scope !== 'center'}
            >
              <option value="">All Centers</option>
              {centers.map((center) => (
                <option key={center._id} value={center._id}>{center.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
            <select
              value={formData.activityName}
              onChange={(e) => setFormData((prev) => ({ ...prev, activityName: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              {activities.map((activity) => (
                <option key={activity.code} value={activity.code}>{activity.name} ({activity.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.rate}
              onChange={(e) => setFormData((prev) => ({ ...prev, rate: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <Button type="submit" loading={saving}>Save Rate</Button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Centre</label>
            <select
              value={filters.centerId}
              onChange={(e) => setFilters((prev) => ({ ...prev, centerId: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">All Centres</option>
              {centers.map((center) => (
                <option key={center._id} value={center._id}>{center.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Activity</label>
            <select
              value={filters.activityName}
              onChange={(e) => setFilters((prev) => ({ ...prev, activityName: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="">All Activities</option>
              {activities.map((activity) => (
                <option key={activity.code} value={activity.code}>{activity.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate per Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.length > 0 ? (
              rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rate.activityLabel} ({rate.activityName})
                    {rate.type === 'base' && <span className="ml-2 text-xs text-gray-400">(Base Rate)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">₹{rate.rate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.projectName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.centerName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rate.scope === 'center' ? 'Project & Centre' : 'Project'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rate.effectiveDate ? new Date(rate.effectiveDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rate.status === 'active'
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
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                  No rates found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </div>
  );
};

export default RateCharts;
