import { useEffect, useState } from "react";
import { getReports } from "../api/reportAPI";

function ReportTable() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  return (
    <table border="1">
      <thead>
        <tr>
          <th>Store ID</th>
          <th>Status</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.storeId}>
            <td>{report.storeId}</td>
            <td>{report.status}</td>
            <td>{new Date(report.lastUpdated).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ReportTable;
