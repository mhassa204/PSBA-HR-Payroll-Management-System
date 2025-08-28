import React, { useEffect, useState } from 'react';
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
        weekly_off_days: e.weekly_off_days,
        day_schedules: e.day_schedules,
        remarks: e.remarks,
      })),
    };
    await rosterService.update(roster.id, payload);
    navigate('/rosters');
  };

  if (!roster) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Edit Duty Roster</h2>
        <div className="flex gap-2">
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

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Name</th>
              <th className="px-3 py-2 text-left text-xs uppercase text-slate-500">Weekly Off</th>
              {days.map((d) => (
                <th key={d} className="px-3 py-2 text-left text-xs uppercase text-slate-500">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.entries.map((en) => (
              <tr key={en.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{en.employee?.full_name}</td>
                <td className="px-3 py-2">
                  <select multiple className="border rounded px-2 py-1"
                    value={en.weekly_off_days}
                    onChange={(e)=>{
                      const values = Array.from(e.target.selectedOptions).map(o=>o.value);
                      updateEntry(en.id, (curr) => ({ ...curr, weekly_off_days: values }));
                    }}
                  >
                    {days.map((d)=> <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                {days.map((d) => {
                  const day = en.day_schedules?.[d] || { type: 'time', value: '' };
                  return (
                    <td key={d} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select className="border rounded px-2 py-1"
                          value={day.type}
                          onChange={(e)=>{
                            const type = e.target.value;
                            updateEntry(en.id, (curr) => ({
                              ...curr,
                              day_schedules: { ...curr.day_schedules, [d]: { type, value: '' } }
                            }));
                          }}
                        >
                          <option value="time">Time</option>
                          <option value="offsite">Offsite</option>
                          <option value="weekly_off">Weekly off</option>
                        </select>
                        {day.type !== 'weekly_off' && (
                          <input className="border rounded px-2 py-1 w-36" placeholder={day.type === 'time' ? '9AM to 5PM' : 'Location'}
                            value={day.value}
                            onChange={(e)=>updateEntry(en.id, (curr) => ({
                              ...curr,
                              day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], value: e.target.value } }
                            }))}
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditRoster;
