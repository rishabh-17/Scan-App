import React, { useEffect, useState } from 'react';
import { createActivity, getActivities } from '../services/api';
import Button from '../components/Button';
import AlertModal from '../components/AlertModal';

const ActivitiesMaster = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    aliases: '',
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
  });

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await getActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load activities',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createActivity({
        ...formData,
        code: String(formData.code || '').trim(),
      });
      setFormData({ name: '', code: '', aliases: '' });
      await loadActivities();
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Activity added successfully',
        variant: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add activity',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Activities Master</h1>
        <p className="text-sm text-gray-500 mt-1">
          Default activities are global. Add new activity codes here to make them available in rate charts.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              className="w-full rounded-md border border-gray-300 p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aliases</label>
            <input
              type="text"
              value={formData.aliases}
              onChange={(e) => setFormData((prev) => ({ ...prev, aliases: e.target.value }))}
              placeholder="Comma separated"
              className="w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <div>
            <Button type="submit" loading={saving}>Add Activity</Button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aliases</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading activities...</td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No activities found.</td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.code}>
                  <td className="px-6 py-4 text-sm text-gray-900">{activity.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{activity.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{(activity.aliases || []).join(', ')}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{activity.source || 'custom'}</td>
                </tr>
              ))
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

export default ActivitiesMaster;
