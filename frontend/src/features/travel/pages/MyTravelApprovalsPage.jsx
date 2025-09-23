import React, { useEffect, useState } from 'react';
import { getMyApprovals, actOnApproval } from '../../../services/travelService';
import { useAuthStore } from '../../auth/authStore';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Header = ({ title, actions }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
    <div className="flex gap-2">{actions}</div>
  </div>
);

export default function MyTravelApprovalsPage() {
  const can = useAuthStore(s => s.can);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyApprovals();
      setList(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onAct = async (instId, decision) => {
    await actOnApproval(instId, decision, '');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">My Travel Approvals</h1>
      </div>

      <Card>
        <Header title="Pending Steps" />
        <div className="divide-y">
          {loading && <div className="p-4 text-slate-500">Loading...</div>}
          {!loading && list.length === 0 && <div className="p-6 text-slate-500">No pending approvals</div>}
          {list.map(step => (
            <div key={step.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-800">{step.step_definition?.name} · {step.step_definition?.definition?.name}</div>
                <div className="text-slate-500">Instance #{step.instance_id} · Mode: {step.approval_mode}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onAct(step.instance_id, 'APPROVE')} className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">Approve</button>
                <button onClick={() => onAct(step.instance_id, 'REJECT')} className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white">Reject</button>
                <button onClick={() => onAct(step.instance_id, 'RETURN')} className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white">Return</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
