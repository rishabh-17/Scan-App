import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { getProjects, createProject, updateProject, deleteProject, getCenters, getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
  const { user: currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [centers, setCenters] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    projectCode: '',
    startDate: '',
    endDate: '',
    center: '',
    managers: [], // Array of user IDs
    scanRate: '',
    productivityLimit: '',
    rateChart: [],
  });

  // Rate chart form state
  const [rateChartItem, setRateChartItem] = useState({
    activityName: '',
    rate: '',
  });

  const addRateChartItem = () => {
    if (rateChartItem.activityName && rateChartItem.rate) {
      setFormData({
        ...formData,
        rateChart: [...formData.rateChart, { ...rateChartItem, status: 'active', effectiveDate: new Date() }]
      });
      setRateChartItem({ activityName: '', rate: '' });
    }
  };

  const removeRateChartItem = (index) => {
    const updatedRateChart = [...formData.rateChart];
    updatedRateChart.splice(index, 1);
    setFormData({ ...formData, rateChart: updatedRateChart });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsData, centersData, usersData] = await Promise.all([
        getProjects(),
        getCenters(),
        getUsers()
      ]);
      setProjects(projectsData);
      setCenters(centersData);

      // Filter users who are project managers
      const projectManagerUsers = usersData.filter(u => u.role === 'project_manager');
      setManagers(projectManagerUsers);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManagerChange = (selectedOptions) => {
    setFormData({ ...formData, managers: selectedOptions ? selectedOptions.map(option => option.value) : [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rateChartItem.activityName || rateChartItem.rate) {
      if (!window.confirm('You have entered data in the Rate Chart fields but haven\'t clicked "Add". Do you want to proceed without adding this item?')) {
        return;
      }
    }

    try {
      // Convert center to centers array for backend
      const projectData = {
        ...formData,
        centers: formData.center ? [formData.center] : []
      };

      if (editingProject) {
        await updateProject(editingProject._id, projectData);
      } else {
        await createProject(projectData);
      }
      setShowModal(false);
      setEditingProject(null);
      setFormData({ name: '', clientName: '', projectCode: '', startDate: '', endDate: '', center: '', managers: [], scanRate: '', productivityLimit: '', rateChart: [] });
      setRateChartItem({ activityName: '', rate: '' });

      // Refresh projects
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      clientName: project.clientName || '',
      projectCode: project.projectCode || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      center: project.centers && project.centers.length > 0 ? project.centers[0]._id : '',
      managers: project.managers ? project.managers.map(m => m._id) : [],
      scanRate: project.scanRate,
      productivityLimit: project.productivityLimit || '',
      rateChart: project.rateChart || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        const projectsData = await getProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Project Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage projects, assign managers, and set rates
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingProject(null);
              setFormData({
                name: '',
                clientName: '',
                projectCode: '',
                startDate: '',
                endDate: '',
                center: '',
                managers: [],
                scanRate: '',
                productivityLimit: '',
                rateChart: []
              });
              setShowModal(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            Create Project
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading projects...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Managers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.centers && project.centers.length > 0
                        ? project.centers.map(c => c.name).join(', ')
                        : <span className="text-red-400">No Center</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project.managers && project.managers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {project.managers.map(mgr => (
                            <span key={mgr._id} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {mgr.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No managers assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project.rateChart && project.rateChart.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-900">{project.rateChart.length} activities</span>
                          <span className="text-xs text-gray-400">
                            {project.rateChart.slice(0, 2).map(r => r.activityName).join(', ')}
                            {project.rateChart.length > 2 && '...'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Default only</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(project)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(project._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                    <input
                      type="text"
                      name="projectCode"
                      value={formData.projectCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Center</label>
                  <select
                    name="center"
                    required
                    value={formData.center}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Center</option>
                    {centers.map(center => (
                      <option key={center._id} value={center._id}>
                        {center.name} ({center.centerCode})
                      </option>
                    ))}
                  </select>
                  {centers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No centers found. Create them in Center Management first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Project Managers</label>
                  <Select
                    isMulti
                    name="managers"
                    options={managers.map(user => ({ value: user._id, label: `${user.name} (${user.mobile})` }))}
                    value={managers
                      .filter(user => formData.managers.includes(user._id))
                      .map(user => ({ value: user._id, label: `${user.name} (${user.mobile})` }))
                    }
                    onChange={handleManagerChange}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    placeholder="Select project managers..."
                  />
                  {managers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No users with 'Project Manager' role found. Create them in User Management first.
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Rate Chart Mapping</h4>

                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Activity Name (e.g., Scanning)"
                      value={rateChartItem.activityName}
                      onChange={(e) => setRateChartItem({ ...rateChartItem, activityName: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Rate (₹)"
                      value={rateChartItem.rate}
                      onChange={(e) => setRateChartItem({ ...rateChartItem, rate: e.target.value })}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={addRateChartItem}
                      className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-200"
                    >
                      Add
                    </button>
                  </div>

                  {formData.rateChart && formData.rateChart.length > 0 && (
                    <div className="bg-gray-50 rounded-md p-2 space-y-2">
                      {formData.rateChart.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
                          <div>
                            <span className="font-medium text-gray-900">{item.activityName}</span>
                            <span className="ml-2 text-gray-500">- ₹{item.rate}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRateChartItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 rounded-b-lg flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="project-form"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
