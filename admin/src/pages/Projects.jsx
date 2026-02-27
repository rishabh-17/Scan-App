import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    center: '',
    scanRate: '',
    productivityLimit: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', formData);
      setShowModal(false);
      setFormData({ name: '', center: '', scanRate: '', productivityLimit: '' });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    }
  };

  const statusBadge = (isActive) =>
    isActive
      ? "px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700"
      : "px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage scanning projects, rates, and productivity thresholds
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          Create Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading projects...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Center</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scan Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {project.name}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.center}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₹{project.scanRate}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.productivityLimit || 'N/A'}
                    </td>

                    <td className="px-6 py-4">
                      <span className={statusBadge(project.isActive)}>
                        {project.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Project
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Project Name", name: "name", type: "text" },
                { label: "Center", name: "center", type: "text" },
                { label: "Scan Rate", name: "scanRate", type: "number" },
                { label: "Productivity Limit", name: "productivityLimit", type: "number" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required={field.name !== 'productivityLimit'}
                  />
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;