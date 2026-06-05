import './MachineTable.css'

export default function MachineTable({ machineSummary = [] }) {
  return (
    <div className="machine-table-wrap panel">
      <div style={{ padding: '16px 16px 0' }}>
        <div className="section-title">MACHINE SUMMARY</div>
      </div>
      <div className="scroll-area" style={{ maxHeight: 280 }}>
        <table className="data-table machine-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Records</th>
              <th>Total Qty</th>
              <th>Fail Rate</th>
            </tr>
          </thead>
          <tbody>
            {machineSummary.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><span>No data</span></div></td></tr>
            ) : machineSummary.map(m => (
              <tr key={m.machine_number}>
                <td style={{ fontFamily: 'Share Tech Mono', color: 'var(--neon2)' }}>
                  {m.machine_number || '—'}
                </td>
                <td>{m.count}</td>
                <td>{m.total_qty?.toLocaleString()}</td>
                <td>
                  <span className={`badge ${m.failure_rate > 20 ? 'badge-error' : m.failure_rate > 10 ? 'badge-warn' : 'badge-reviewed'}`}>
                    {m.failure_rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
