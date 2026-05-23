"use client";

import Link from "next/link";
import { Plus, Eye, Trash2, Share2, TrendingUp, Calendar } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "in-progress" | "completed">("all");

  const projects = [
    {
      id: "1",
      name: "Main Street Resurfacing",
      client: "ABC Construction",
      status: "In Progress",
      totalCost: 18500,
      date: "2026-05-15",
      progress: 65,
    },
    {
      id: "2",
      name: "Residential Driveway",
      client: "John Doe",
      status: "Completed",
      totalCost: 4200,
      date: "2026-05-10",
      progress: 100,
    },
    {
      id: "3",
      name: "Commercial Parking Lot",
      client: "Tech Corp",
      status: "In Progress",
      totalCost: 52000,
      date: "2026-05-18",
      progress: 30,
    },
  ];

  const filteredProjects = projects.filter((p) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "in-progress") return p.status === "In Progress";
    if (selectedStatus === "completed") return p.status === "Completed";
    return true;
  });

  const totalRevenue = projects.reduce((sum, p) => sum + p.totalCost, 0);
  const completedCount = projects.filter((p) => p.status === "Completed").length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Project Dashboard
              </h1>
              <p className="text-lg text-slate-300">
                Manage your paving estimates and projects
              </p>
            </div>
            <Link
              href="/estimator"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Estimate
            </Link>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium mb-1">Total Projects</p>
                  <p className="text-3xl font-bold text-white">{projects.length}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-400 opacity-50" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-400">{completedCount}</p>
                </div>
                <div className="text-sm text-slate-400">
                  {Math.round((completedCount / projects.length) * 100)}%
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm font-medium mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">${(totalRevenue / 1000).toFixed(1)}K</p>
                </div>
                <div className="text-sm text-slate-400">
                  {projects.length} projects
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedStatus === "all"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setSelectedStatus("in-progress")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedStatus === "in-progress"
                  ? "bg-amber-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setSelectedStatus("completed")}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedStatus === "completed"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`bg-gradient-to-br from-slate-700 to-slate-800 border-2 rounded-xl overflow-hidden transition-all duration-300 shadow-lg ${
                hoveredId === project.id
                  ? "border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 transform"
                  : "border-slate-600"
              }`}
            >
              {/* Card Header */}
              <div className="p-6 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-600">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white flex-1 leading-tight">
                    {project.name}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-2 ${
                      project.status === "Completed"
                        ? "bg-green-500/20 text-green-300 border border-green-400/50"
                        : "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-400 font-medium">Progress</p>
                    <p className="text-xs text-slate-300 font-bold">{project.progress}%</p>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        project.progress === 100
                          ? "bg-gradient-to-r from-green-500 to-green-400"
                          : "bg-gradient-to-r from-blue-500 to-blue-400"
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">Client</p>
                    <p className="text-sm font-semibold text-white">{project.client}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </p>
                    <p className="text-sm font-semibold text-white">{project.date}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-600">
                    <p className="text-sm text-slate-400 mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-blue-400">
                      ${project.totalCost.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-600">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-lg"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Link>
                  <button
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      hoveredId === project.id
                        ? "bg-slate-600 text-blue-400 hover:text-blue-300"
                        : "bg-slate-700 text-slate-400 hover:text-blue-400"
                    }`}
                    title="Share project"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      hoveredId === project.id
                        ? "bg-slate-600 text-red-400 hover:text-red-300"
                        : "bg-slate-700 text-slate-400 hover:text-red-400"
                    }`}
                    title="Delete project"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-slate-400 mb-4">No projects found</p>
            <Link
              href="/estimator"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Project
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
