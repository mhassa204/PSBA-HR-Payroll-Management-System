import React, { useEffect, useRef, useState } from "react";
import { displayCNIC } from "../../../utils/formatters";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { searchEmployees } from "../services/transferService";

const PAGE_SIZE = 10;

// Searchable, paginated employee list. Each row's current employment
// (designation + location) comes back inline from GET /employees.
const EmployeePickerPanel = ({ search, page, onSearchChange, onPageChange, onSelect }) => {
  const [input, setInput] = useState(search || "");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => setInput(search || ""), [search]);

  // Debounced search -> parent updates the URL, which drives the fetch below
  const handleInput = (value) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 350);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await searchEmployees({ page, limit: PAGE_SIZE, search: search || "" });
        if (cancelled) return;
        setRows(data.employees || []);
        setTotal(data.total ?? (data.employees || []).length);
      } catch {
        if (!cancelled) { setRows([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = (emp) => (emp.employmentRecords || []).find((e) => e.is_current) || (emp.employmentRecords || [])[0];

  return (
    <div className="space-y-3">
      <div className="filter-panel compact">
        <input
          className="form-input sm:col-span-2"
          placeholder="Search by name, CNIC, mobile or email"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          autoFocus
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><LoadingSpinner size="md" text="Loading employees..." /></div>
      ) : !rows.length ? (
        <div className="card-soft p-10 text-center text-sm text-gray-500">No employees match your search.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-shell card-soft p-0 custom-thin-scroll overflow-x-auto">
            <table className="table-enhanced min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Name</th>
                  <th className="text-left">CNIC</th>
                  <th className="text-left">Designation</th>
                  <th className="text-left">Current Location</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((emp) => {
                  const cur = current(emp);
                  return (
                    <tr key={emp.id} className="cursor-pointer hover:bg-blue-50/50" onClick={() => onSelect(emp)}>
                      <td className="text-left font-medium">{emp.full_name}</td>
                      <td className="text-left">{displayCNIC(emp.cnic) || "-"}</td>
                      <td className="text-left">{cur?.designation?.title || cur?.designation_text || "-"}</td>
                      <td className="text-left">
                        {cur?.location ? (
                          <span className="badge badge-blue">{cur.location.name}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${String(emp.status).toLowerCase() === "active" ? "badge-green" : "badge-gray"}`}>
                          {emp.status || "Unknown"}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); onSelect(emp); }}>
                          Transfers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {rows.map((emp) => {
              const cur = current(emp);
              return (
                <button
                  key={emp.id}
                  className="card-soft p-4 w-full text-left flex items-center justify-between gap-3"
                  onClick={() => onSelect(emp)}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{emp.full_name}</div>
                    <div className="text-xs text-gray-500">{displayCNIC(emp.cnic) || "-"}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {cur?.designation?.title || cur?.designation_text || "-"}
                      {cur?.location ? ` · ${cur.location.name}` : ""}
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${String(emp.status).toLowerCase() === "active" ? "badge-green" : "badge-gray"}`}>
                    {emp.status || "?"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{total} employee(s) · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeePickerPanel;
