"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const project = {
    id: projectId,
    name: "Sample Project",
    client: "ABC Construction",
    status: "In Progress",
    createdAt: "2026-05-15",
    squareFootage: 5000,
    depth: 2,
    asphaltType: "hot-mix",
    totalCost: 18500,
    location: "123 Main St, Oklahoma City, OK",
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {project.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Project #{project.id}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mt-2">
              {project.status}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {project.client}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Cost</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ${project.totalCost.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Project Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                Location
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{project.location}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                Square Footage
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{project.squareFootage.toLocaleString()} sq ft</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                Depth
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{project.depth} inches</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                Asphalt Type
              </label>
              <p className="mt-1 text-slate-900 dark:text-white capitalize">{project.asphaltType.replace("-", " ")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                Created
              </label>
              <p className="mt-1 text-slate-900 dark:text-white">{project.createdAt}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
