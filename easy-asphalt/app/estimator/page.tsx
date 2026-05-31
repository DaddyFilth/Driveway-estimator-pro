"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, AlertCircle, CheckCircle } from "lucide-react";

interface EstimateForm {
  projectName: string;
  squareFootage: number;
  depth: number;
  asphaltType: string;
  location: string;
}

export default function EstimatorPage() {
  const [form, setForm] = useState<EstimateForm>({
    projectName: "",
    squareFootage: 0,
    depth: 2,
    asphaltType: "hot-mix",
    location: "",
  });

  const [estimate, setEstimate] = useState<{
    tons: number;
    materialCost: number;
    laborCost: number;
    total: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const calculateEstimate = () => {
    setError(null);

    if (form.squareFootage <= 0) {
      setError("Square footage must be greater than 0");
      setEstimate(null);
      return;
    }

    if (form.depth <= 0 || form.depth > 12) {
      setError("Depth must be between 1 and 12 inches");
      setEstimate(null);
      return;
    }

    const cubicFeet = form.squareFootage * (form.depth / 12);
    const tons = (cubicFeet * 145) / 2000;
    const materialCost = tons * 120;
    const laborCost = form.squareFootage * 2.5;
    const total = materialCost + laborCost;

    setEstimate({
      tons: Math.round(tons * 100) / 100,
      materialCost: Math.round(materialCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      total: Math.round(total * 100) / 100,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8 md:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
              <Calculator className="w-10 h-10 text-blue-400" />
              Paving Estimator
            </h1>
            <p className="text-lg text-slate-300">
              Calculate material costs and labor for your project
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Main Form Card */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-3">
                Project Name
              </label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 text-base"
                placeholder="e.g., Main Street Resurfacing"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-3">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 text-base"
                placeholder="e.g., 123 Main St, Oklahoma City, OK"
              />
            </div>

            {/* Square Footage */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-3">
                Square Footage
              </label>
              <input
                type="number"
                value={form.squareFootage || ""}
                onChange={(e) => setForm({ ...form, squareFootage: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 text-base"
                placeholder="e.g., 5000"
                min="1"
              />
            </div>

            {/* Depth */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-3">
                Depth (inches)
              </label>
              <input
                type="number"
                value={form.depth}
                onChange={(e) => setForm({ ...form, depth: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 text-base"
                min="1"
                max="12"
              />
            </div>

            {/* Asphalt Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-200 mb-3">
                Asphalt Type
              </label>
              <select
                value={form.asphaltType}
                onChange={(e) => setForm({ ...form, asphaltType: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all duration-200 text-base"
              >
                <option value="hot-mix">Hot Mix Asphalt</option>
                <option value="warm-mix">Warm Mix Asphalt</option>
                <option value="porous">Porous Asphalt</option>
                <option value="recycled">Recycled Asphalt</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Calculate Button */}
          <button
            onClick={calculateEstimate}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            Calculate Estimate
          </button>
        </div>

        {/* Results Section */}
        {estimate && (
          <div className="bg-gradient-to-br from-green-700/20 to-green-800/20 border-2 border-green-500/50 rounded-xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <h2 className="text-3xl font-bold text-white">Estimate Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Material Needed */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <p className="text-sm text-slate-300 font-medium mb-2">Material Needed</p>
                <p className="text-4xl font-bold text-blue-400">{estimate.tons}</p>
                <p className="text-sm text-slate-400 mt-1">tons</p>
              </div>

              {/* Material Cost */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <p className="text-sm text-slate-300 font-medium mb-2">Material Cost</p>
                <p className="text-4xl font-bold text-blue-400">
                  ${estimate.materialCost.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400 mt-1">per unit</p>
              </div>

              {/* Labor Cost */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <p className="text-sm text-slate-300 font-medium mb-2">Labor Cost</p>
                <p className="text-4xl font-bold text-amber-400">
                  ${estimate.laborCost.toLocaleString()}
                </p>
                <p className="text-sm text-slate-400 mt-1">labor only</p>
              </div>

              {/* Total Estimate */}
              <div className="bg-gradient-to-br from-green-600/30 to-green-700/30 border-2 border-green-500 rounded-lg p-6">
                <p className="text-sm text-slate-200 font-bold mb-2">Total Estimate</p>
                <p className="text-4xl font-bold text-green-400">
                  ${estimate.total.toLocaleString()}
                </p>
                <p className="text-sm text-slate-300 mt-1">all-inclusive</p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-300">
                <span className="font-bold text-white">Note:</span> This estimate includes material and labor costs. Actual pricing may vary based on regional factors and contractor rates.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setEstimate(null);
                  setForm({
                    projectName: "",
                    squareFootage: 0,
                    depth: 2,
                    asphaltType: "hot-mix",
                    location: "",
                  });
                }}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all duration-200"
              >
                Calculate Another
              </button>
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-200 text-center"
              >
                Save to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
