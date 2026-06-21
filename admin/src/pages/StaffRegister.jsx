import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AlertModal from '../components/AlertModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://scan-app-ukcg.onrender.com/api';
const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || '').trim());
const getIdValue = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return value._id || value.toString?.() || String(value);
  return String(value);
};

const StaffRegister = () => {
  const [searchParams] = useSearchParams();
  const initialCenter = searchParams.get('center') || '';
  const initialProject = searchParams.get('project') || '';

  const [centers, setCenters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    aadhaarNumber: '',
    panNumber: '',
    referenceSource: 'Direct',
    agencyName: '',
    center: initialCenter,
    project: initialProject,
    password: '',
  });

  const filteredProjects = useMemo(() => {
    if (!formData.center) return projects;
    return projects.filter((p) => {
      if (p.centers && Array.isArray(p.centers)) {
        return p.centers.some((c) => {
          const cId = getIdValue(c);
          return cId === formData.center;
        });
      }
      if (p.center) {
        const projectCenterId = getIdValue(p.center);
        return projectCenterId === formData.center;
      }
      return false;
    });
  }, [formData.center, projects]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [centersRes, projectsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/centers/public`),
          axios.get(`${API_BASE_URL}/projects/public`),
        ]);
        setCenters(centersRes.data || []);
        setProjects(projectsRes.data || []);
      } catch {
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: 'Failed to load centers/projects',
          variant: 'danger',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    let nextCenter = formData.center;
    let nextProject = formData.project;
    let didChange = false;

    if (nextCenter && !isObjectId(nextCenter)) {
      const centerObj = centers.find((c) => String(c.centerCode || '').trim() === String(nextCenter).trim());
      if (centerObj?._id) {
        nextCenter = centerObj._id;
        didChange = true;
      } else {
        nextCenter = '';
        didChange = true;
        setAlertModal({
          isOpen: true,
          title: 'Invalid Link',
          message: 'Center in URL is invalid. Please select a center.',
          variant: 'warning',
        });
      }
    }

    if (nextProject && !isObjectId(nextProject)) {
      const projectObj = projects.find((p) => String(p.projectCode || '').trim() === String(nextProject).trim());
      if (projectObj?._id) {
        nextProject = projectObj._id;
        didChange = true;
      } else {
        nextProject = '';
        didChange = true;
        setAlertModal({
          isOpen: true,
          title: 'Invalid Link',
          message: 'Project in URL is invalid. Please select a project.',
          variant: 'warning',
        });
      }
    }

    if (!nextCenter && nextProject) {
      const projectObj = projects.find((p) => p._id === nextProject);
      const projectCenters = Array.isArray(projectObj?.centers) ? projectObj.centers : [];
      const firstCenter = projectCenters.length > 0
        ? getIdValue(projectCenters[0])
        : '';

      if (firstCenter) {
        nextCenter = firstCenter;
        didChange = true;
      } else {
        nextProject = '';
        didChange = true;
        setAlertModal({
          isOpen: true,
          title: 'Invalid Link',
          message: 'Project in URL is invalid or has no center mapping. Please select center and project.',
          variant: 'warning',
        });
      }
    }

    if (didChange) {
      setFormData((prev) => ({ ...prev, center: nextCenter, project: nextProject }));
    }
  }, [centers, formData.center, formData.project, loading, projects]);

  useEffect(() => {
    if (loading) return;
    if (!formData.center || !formData.project) return;
    if (!isObjectId(formData.center) || !isObjectId(formData.project)) return;

    if (!filteredProjects.some((p) => p._id === formData.project)) {
      setFormData((prev) => ({ ...prev, project: '' }));
      setAlertModal({
        isOpen: true,
        title: 'Invalid Link',
        message: 'Project in URL does not belong to selected center. Please select a project again.',
        variant: 'warning',
      });
    }
  }, [filteredProjects, formData.center, formData.project, loading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.alternateMobile || !formData.password || !formData.center) {
      setAlertModal({
        isOpen: true,
        title: 'Validation',
        message: 'Please fill all required fields',
        variant: 'warning',
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: formData.name,
        mobile: formData.mobile,
        alternateMobile: formData.alternateMobile,
        email: formData.email,
        aadhaarNumber: formData.aadhaarNumber,
        panNumber: formData.panNumber,
        referenceSource: formData.referenceSource,
        agencyName: formData.referenceSource === 'Agency' ? formData.agencyName : '',
        center: formData.center,
        project: formData.project || undefined,
        password: formData.password,
      });

      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Registration submitted. Await admin approval.',
        variant: 'success',
      });

      setFormData((prev) => ({
        ...prev,
        name: '',
        mobile: '',
        alternateMobile: '',
        email: '',
        aadhaarNumber: '',
        panNumber: '',
        referenceSource: 'Direct',
        agencyName: '',
        password: '',
      }));
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Registration Failed',
        message: error?.response?.data?.message || 'Something went wrong',
        variant: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Staff Registration</h1>
        <p className="text-sm text-gray-500 mt-1">Fill details to submit registration for approval</p>

        {loading ? (
          <div className="text-sm text-gray-500 mt-6">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Center *</label>
              <select
                name="center"
                value={formData.center}
                onChange={(e) => {
                  const nextCenter = e.target.value;
                  setFormData((prev) => ({ ...prev, center: nextCenter, project: '' }));
                }}
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Center</option>
                {centers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Project</label>
              <select
                name="project"
                value={formData.project}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={!formData.center}
              >
                <option value="">{formData.center ? 'Select Project' : 'Select Center first'}</option>
                {filteredProjects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile *</label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Alternate Mobile *</label>
                <input
                  type="text"
                  name="alternateMobile"
                  value={formData.alternateMobile}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Source *</label>
              <div className="mt-2 flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.referenceSource === 'Direct'}
                    onChange={() => setFormData((prev) => ({
                      ...prev,
                      referenceSource: 'Direct',
                      agencyName: '',
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span>Direct</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.referenceSource === 'Agency'}
                    onChange={() => setFormData((prev) => ({
                      ...prev,
                      referenceSource: 'Agency',
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span>Agency</span>
                </label>
              </div>
            </div>

            {formData.referenceSource === 'Agency' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Agency Name *</label>
                <input
                  type="text"
                  name="agencyName"
                  value={formData.agencyName}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        )}
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default StaffRegister;
