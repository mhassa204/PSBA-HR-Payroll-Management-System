import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rosterService from '../../roster/services/rosterService';
import axios from '../../../lib/axios';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const CreateRoster = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [title, setTitle] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    // load employees with roster permissions (controller enforces manager-only)
    (async () => {
      try {
        const empRes = await rosterService.officerEmployees();
        setEmployees(empRes.employees || []);
      } catch (e) {
        const status = e?.response?.status;
        if (status === 403) {
          navigate('/unauthorized');
        }
      }
    })();
  }, [navigate]);

  // initialize entries when employees change
  useEffect(() => {
    setEntries(employees.map((e) => ({
      employee_id: e.id,
      // weekly_off_days removed; manage per-day via type 'weekly_off'
      day_schedules: days.reduce((acc, d) => ({ ...acc, [d]: { type: 'time', time_from: '', time_to: '', location: '' } }), {}),
      remarks: '',
    })));
  }, [employees]);

  const updateEntry = (empId, updater) => {
    setEntries((prev) => prev.map((en) => en.employee_id === empId ? updater({ ...en }) : en));
  };

  const submit = async () => {
    const payload = {
      title: title || null,
      valid_from: validFrom,
      valid_to: validTo,
      entries,
    };
    await rosterService.create(payload);
    navigate('/rosters');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Create Duty Roster</h2>
        <div className="flex gap-2">
          <button onClick={() => navigate('/rosters')} className="px-4 py-2 bg-slate-600 text-white rounded">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded shadow">
        <div className="col-span-2">
          <label className="block text-sm text-slate-600 mb-1">Title</label>
          <input className="w-full border rounded px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g. Security Roster (Aug)" />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Valid From</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={validFrom} onChange={(e)=>setValidFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Valid To</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={validTo} onChange={(e)=>setValidTo(e.target.value)} />
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
            {employees.map((emp) => {
              const entry = entries.find((en) => en.employee_id === emp.id);
              if (!entry) return null;
              return (
                <tr key={emp.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{emp.full_name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp.designation || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp.cnic || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{emp.mobile_number || '—'}</td>
                  {days.map((d) => {
                    const day = entry.day_schedules[d];
                    return (
                      <td key={d} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <select className="border rounded px-2 py-1"
                            value={day.type}
                            onChange={(e)=>{
                              const type = e.target.value;
                              updateEntry(emp.id, (curr) => ({
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
                                onChange={(e)=>updateEntry(emp.id, (curr) => ({
                                  ...curr,
                                  day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], time_from: e.target.value } }
                                }))}
                              />
                              <span className="text-slate-500">to</span>
                              <input type="time" className="border rounded px-2 py-1 w-28"
                                value={day.time_to}
                                onChange={(e)=>updateEntry(emp.id, (curr) => ({
                                  ...curr,
                                  day_schedules: { ...curr.day_schedules, [d]: { ...curr.day_schedules[d], time_to: e.target.value } }
                                }))}
                              />
                            </>
                          )}
                          {day.type === 'offsite' && (
                            <input className="border rounded px-2 py-1 w-36" placeholder="Location (e.g. Chiniot)"
                              value={day.location}
                              onChange={(e)=>updateEntry(emp.id, (curr) => ({
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
  );
};

export default CreateRoster;
