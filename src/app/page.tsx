import { Wand2, SlidersHorizontal, Settings } from "lucide-react";
import { EmailRow } from "@/components/EmailRow";

export default function InboxPage() {
  // Temporary mock data for UI testing.
  // In production, this will fetch from Supabase.
  const emails = [
    {
      id: "1",
      sender: "Luke D",
      summary: "Can we review the Q3 roadmap together this afternoon? I've updated the key milestones.",
      category: "Project",
      categoryColor: "blue",
      timestamp: "1:19 PM",
      isUnread: true,
    },
    {
      id: "2",
      sender: "Jane Kim",
      summary: "Found a great candidate for the senior frontend role. Attached her resume and portfolio.",
      category: "Recruiting",
      categoryColor: "pink",
      timestamp: "11:30 AM",
      isUnread: true,
    },
    {
      id: "3",
      sender: "Sarah Jenkins",
      summary: "Client just signed the contract for the enterprise tier! Setting up onboarding.",
      category: "Leads",
      categoryColor: "purple",
      timestamp: "Yesterday",
      isUnread: false,
    },
    {
      id: "4",
      sender: "AWS Alerts",
      summary: "URGENT: Database CPU utilization crossed 90% threshold in us-east-1.",
      category: "Urgent",
      categoryColor: "red",
      timestamp: "Yesterday",
      isUnread: false,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
        
        <div className="flex items-center gap-3 text-sm">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors">
            <Wand2 className="w-3.5 h-3.5" />
            Auto label
          </button>
          
          <div className="h-4 w-px bg-gray-200" />
          
          <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <EmailRow key={email.id} email={email} />
        ))}
      </div>
    </div>
  );
}
