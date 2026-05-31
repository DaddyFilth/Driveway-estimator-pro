"use client";

import Link from "next/link";
import { ArrowRight, Zap, BarChart3, Clock, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">EasyAsphalt</h1>
          <Link
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Professional Asphalt
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Estimating Made Easy
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Calculate accurate material costs and labor estimates for your paving projects in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/estimator"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
            >
              Start Estimating
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-lg transition-all duration-200 border border-slate-600"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {/* Feature 1 */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
            <Zap className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Instant Calculations</h3>
            <p className="text-slate-300">
              Get accurate estimates in seconds with our advanced calculation engine.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
            <BarChart3 className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Project Management</h3>
            <p className="text-slate-300">
              Track all your projects in one place with detailed progress updates.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
            <Clock className="w-8 h-8 text-amber-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Save Time</h3>
            <p className="text-slate-300">
              Eliminate manual calculations and focus on growing your business.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10">
            <Shield className="w-8 h-8 text-purple-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Secure & Reliable</h3>
            <p className="text-slate-300">
              Your data is protected with enterprise-grade security standards.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-2 border-blue-500/50 rounded-xl p-12 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to streamline your estimating process?
          </h3>
          <p className="text-lg text-slate-300 mb-8">
            Join hundreds of contractors using EasyAsphalt to save time and increase accuracy.
          </p>
          <Link
            href="/estimator"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform"
          >
            Create Your First Estimate
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 text-center text-slate-400">
          <p>&copy; 2026 EasyAsphalt. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
