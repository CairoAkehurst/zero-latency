"use client";

import { useState } from "react";
import { Users, UserPlus, CheckCircle, ArrowLeft } from "lucide-react";

export default function CRMAddPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to add contact");
      }
      
      setSuccess(true);
      setFormData({ name: "", email: "", phone: "", company: "", notes: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-start p-4 sm:p-8">
      <div className="w-full max-w-md bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-xl overflow-hidden mt-4 sm:mt-12">
        <div className="bg-blue-600 p-6 text-white text-center relative">
          <button 
            onClick={() => window.close()} 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
            title="Close"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold tracking-tight">Add to CRM</h1>
          <p className="text-blue-100 mt-1 text-sm">Enter contact details below</p>
        </div>
        
        <div className="p-6 sm:p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Contact Added!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">The contact has been successfully saved to your CRM.</p>
              <button
                onClick={() => setSuccess(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors focus:ring-4 focus:ring-blue-500/20"
              >
                Add Another Person
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800/50">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  placeholder="Jane Doe"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  placeholder="jane@example.com"
                  inputMode="email"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  placeholder="+1 (555) 000-0000"
                  inputMode="tel"
                />
              </div>
              
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                  placeholder="Acme Corp"
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Met at the conference..."
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium py-3.5 px-4 rounded-xl transition-colors focus:ring-4 focus:ring-blue-500/20 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Save to CRM
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        Optimized for mobile. Add this page to your home screen for quick access.
      </p>
    </div>
  );
}
