"use client";

import { useEffect, useState } from "react";
import { Users, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
};

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch("/api/crm");
        const data = await res.json();
        if (data.contacts) {
          setContacts(data.contacts);
        }
      } catch (err) {
        console.error("Failed to fetch CRM contacts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#161616]">
      <header className="h-[68px] flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-100 dark:border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">CRM Contacts</h1>
        </div>
        <Link
          href="/crm/add"
          target="_blank"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact (Mobile Form)
          <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
        </Link>
      </header>
      
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">No contacts yet</h3>
            <p className="max-w-md mx-auto mb-6">Add people to your CRM to keep track of their details.</p>
            <Link
              href="/crm/add"
              target="_blank"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Contact
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(contact => (
              <div key={contact.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-5 bg-white dark:bg-[#1c1c1c] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{contact.name}</h3>
                    {contact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{contact.company}</p>}
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="text-gray-400 w-16">Email:</span>
                      <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">{contact.email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <span className="text-gray-400 w-16">Phone:</span>
                      <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-xs line-clamp-3">
                      {contact.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
