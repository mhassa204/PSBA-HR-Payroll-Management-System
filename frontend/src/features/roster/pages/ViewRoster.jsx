import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import rosterService from '../../roster/services/rosterService';
import { useAuthStore } from '../../auth/authStore';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const STATUSES = ['PENDING','APPROVED','REJECTED'];

const ViewRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roster, setRoster] = useState(null);
  const can = useAuthStore((s) => s.can);

  const load = async () => {
    const res = await rosterService.get(id);
    setRoster(res.roster);
  };

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status) => {
    await rosterService.setStatus(id, status);
    await load();
  };

  if (!roster) return <div className="p-6">Loading...</div>;

  const canApprove = can('roster.approve');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Duty Roster #{roster.id}</h2>
        <div className="flex gap-2 items-center">
          <span className={`px-2 py-1 rounded text-xs font-medium ${roster.status === 'APPROVED' ? 'bg-green-100 text-green-700' : roster.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{roster.status}</span>
          {canApprove && (
            <select
              value={roster.status}
              onChange={(e) => changeStatus(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => navigate(`/rosters/${roster.id}/edit`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Edit</button>
          <button onClick={() => navigate('/rosters')} className="px-4 py-2 bg-slate-600 text-white rounded">Back</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded shadow">
        <div>
          <div className="text-sm text-slate-500">Title</div>
          <div className="font-medium">{roster.title || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Bazaar</div>
          <div className="font-medium">{roster.location?.name || '—'}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Valid From</div>
          <div className="font-medium">{roster.valid_from?.slice(0,10)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Valid To</div>
          <div className="font-medium">{roster.valid_to?.slice(0,10)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Created By</div>
          <div className="font-medium">{roster.createdBy?.email || `User #${roster.created_by_user_id}`}</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Name</th>
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Designation</th>
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">CNIC</th>
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Contact</th>
              {days.map((d) => (
                <th key={d} className="px-3 py-2 text-left text-xs uppercase text-slate-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.entries.map((en) => {
              const emp = en.employee;
              const currEmp = emp?.employmentRecords?.[0];
              const designation = currEmp?.designation?.title || '';
              return (
                <tr key={en.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{emp?.full_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{designation || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp?.cnic || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp?.mobile_number || '—'}</td>
                  {days.map((d) => {
                    const day = en.day_schedules?.[d];
                    return (
                      <td key={d} className="px-3 py-2 whitespace-nowrap">
                        {day?.type === 'time' && (day.time_from || day.time_to) && (
                          <span>{day.time_from || '—'} to {day.time_to || '—'}</span>
                        )}
                        {day?.type === 'offsite' && (
                          <span>Offsite: {day.location || '—'}</span>
                        )}
                        {day?.type === 'weekly_off' && (
                          <span>Weekly off</span>
                        )}
                        {!day && <span>—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewRoster;
