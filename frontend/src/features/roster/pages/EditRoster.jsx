import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import rosterService from '../../roster/services/rosterService';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const EditRoster = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roster, setRoster] = useState(null);

  useEffect(() => {
    rosterService.get(id).then((res) => setRoster(res.roster));
  }, [id]);

  const updateEntry = (entryId, updater) => {
    setRoster((r) => ({
      ...r,
      entries: r.entries.map((e) => e.id === entryId ? updater({ ...e }) : e)
    }));
  };

  const submit = async () => {
    const payload = {
      title: roster.title,
      bazaar_id: roster.bazaar_id,
      valid_from: roster.valid_from,
      valid_to: roster.valid_to,
      entries: roster.entries.map((e) => ({
        employee_id: e.employee_id,
        day_schedules: e.day_schedules,
        remarks: e.remarks,
      })),
    };
    await rosterService.update(roster.id, payload);
    navigate('/rosters');
  };

  const cloneAsNew = async () => {
    const payload = {
      title: `${roster.title || 'Roster'} (Copy)`,
      valid_from: roster.valid_from?.slice(0,10),
      valid_to: roster.valid_to?.slice(0,10),
      entries: roster.entries.map((e) => ({
        employee_id: e.employee_id,
        day_schedules: e.day_schedules,
        remarks: e.remarks,
      })),
    };
    await rosterService.create(payload);
    navigate('/rosters');
  };

  // Group by role tag of current employment
  const grouped = useMemo(() => {
    if (!roster) return [];
    const map = new Map();
    for (const en of roster.entries) {
      const emp = en.employee;
      const currEmp = emp?.employmentRecords?.[0];
      const key = currEmp?.role_tag?.name || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(en);
    }
    return Array.from(map.entries()).map(([name, list]) => ({ name, list }));
  }, [roster]);

  if (!roster) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Edit Duty Roster</h2>
        <div className="flex gap-2">
          <button onClick={cloneAsNew} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded">Clone as New</button>
          <button onClick={() => navigate('/rosters')} className="px-4 py-2 bg-slate-600 text-white rounded">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Update</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Title</label>
          <input className="w-full border rounded px-3 py-2" value={roster.title || ''} onChange={(e)=>setRoster({...roster, title: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Valid From</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={roster.valid_from?.slice(0,10)} onChange={(e)=>setRoster({...roster, valid_from: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Valid To</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={roster.valid_to?.slice(0,10)} onChange={(e)=>setRoster({...roster, valid_to: e.target.value})} />
        </div>
      </div>

      {grouped.map(group => (
        <div key={group.name} className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-700">{group.name}</h3>
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
                {group.list.map((en) => {
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
                        const day = en.day_schedules?.[d] || { type: 'time', time_from: '', time_to: '' };
                        return (
                          <td key={d} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <select className="border rounded px-2 py-1"
                                value={day.type}
                                onChange={(e)=>{
                                  const type = e.target.value;
                                  updateEntry(en.id, (curr) => ({
                                    ...curr,
                                    day_schedules: { ...curr.day_schedules, [d]: type === 'time' ? { type, time_from: '', time_to: '', location: '' } : (type === 'offsite' ? { type, location: '' } : { type }) }
                                  }));
                                }}
                              >
                                <option value="time">Time</option>
                                <option value="offsite">Offsite</option>
                                <option value="weekly_off">Weekly off</option>
                              </select>
                              {day.type === 'time' && (
                                <>
                                  <input type="time" className="border rounded px-2 py-1 w-28"
                                    value={day.time_from}
                                    onChange={(e)=>updateEntry(en.id, (curr) => ({
                                      ...curr,
                                      day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], time_from: e.target.value } }
                                    }))}
                                  />
                                  <span className="text-slate-500">to</span>
                                  <input type="time" className="border rounded px-2 py-1 w-28"
                                    value={day.time_to}
                                    onChange={(e)=>updateEntry(en.id, (curr) => ({
                                      ...curr,
                                      day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], time_to: e.target.value } }
                                    }))}
                                  />
                                </>
                              )}
                              {day.type === 'offsite' && (
                                <input className="border rounded px-2 py-1 w-36" placeholder="Location"
                                  value={day.location || ''}
                                  onChange={(e)=>updateEntry(en.id, (curr) => ({
                                    ...curr,
                                    day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], location: e.target.value } }
                                  }))}
                                />
                              )}
                              {day.type === 'weekly_off' && (
                                <span className="text-slate-500 text-sm">Weekly off</span>
                              )}
                            </div>
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
      ))}
    </div>
  );
};

export default EditRoster;
