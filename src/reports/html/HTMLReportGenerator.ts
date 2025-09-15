import type { BenchmarkReport } from '../../benchmarks/types.ts';

/**
Generates HTML reports with charts for benchmark comparisons
*/
export class HTMLReportGenerator
{
  /**
  Generate an HTML report comparing multiple benchmark reports
  */
  static generateComparisonHTML(reports: BenchmarkReport[]): string
  {
    const sortedReports = [...reports].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benchmark Comparison Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 3px solid #3498db;
    }
    h2 {
      color: #34495e;
      margin: 30px 0 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }
    .summary-card h3 {
      color: #2c3e50;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 8px;
      opacity: 0.7;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #3498db;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin: 30px 0;
      padding: 20px;
      background: #fafafa;
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #2c3e50;
      position: sticky;
      top: 0;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .success { color: #27ae60; }
    .failed { color: #e74c3c; }
    .machine-tag {
      display: inline-block;
      padding: 4px 8px;
      background: #3498db;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      margin: 0 4px;
    }
    .tabs {
      display: flex;
      gap: 10px;
      margin: 20px 0;
      border-bottom: 2px solid #ecf0f1;
    }
    .tab {
      padding: 10px 20px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #7f8c8d;
      transition: all 0.3s;
    }
    .tab:hover {
      color: #3498db;
    }
    .tab.active {
      color: #3498db;
      border-bottom: 3px solid #3498db;
      margin-bottom: -2px;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Benchmark Comparison Report</h1>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Reports</h3>
        <div class="value">${reports.length}</div>
      </div>
      <div class="summary-card">
        <h3>Date Range</h3>
        <div class="value">${this.formatDateRange(sortedReports)}</div>
      </div>
      <div class="summary-card">
        <h3>Machines</h3>
        <div class="value">${this.getUniqueMachines(reports).length}</div>
      </div>
      <div class="summary-card">
        <h3>Benchmarks</h3>
        <div class="value">${this.getUniqueBenchmarks(reports).length}</div>
      </div>
    </div>

    <h2>Performance Trends</h2>
    <div class="tabs">
      ${
      this.getUniqueBenchmarks(reports).map((name, i) =>
        `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${name}">${name}</button>`
      ).join('')
    }
    </div>

    ${
      this.getUniqueBenchmarks(reports).map((name, i) => `
      <div class="tab-content ${i === 0 ? 'active' : ''}" id="${name}">
        <div class="chart-container">
          <canvas id="chart-${name.replace(/\s+/g, '-')}"></canvas>
        </div>
      </div>
    `).join('')
    }

    <h2>Detailed Results</h2>
    <table>
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Machine</th>
          <th>Benchmark</th>
          <th>Duration (ms)</th>
          <th>Status</th>
          <th>Filesystem</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateTableRows(sortedReports)}
      </tbody>
    </table>

    <h2>System Information</h2>
    <div class="legend">
      ${
      this.getUniqueMachines(reports).map(machine =>
      {
        const report = reports.find(r => r.machineId === machine);
        return `
          <div class="legend-item">
            <div class="legend-color" style="background: ${this.getMachineColor(machine)}"></div>
            <div>
              <strong>${machine}</strong><br>
              ${report?.systemInfo.cpu}<br>
              ${report?.systemInfo.memoryGb} GB RAM • ${report?.systemInfo.platform}
            </div>
          </div>
        `;
      }).join('')
    }
    </div>
  </div>

  <script>
    ${this.generateChartScript(reports)}

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
      });
    });
  </script>
</body>
</html>`;

    return html;
  }

  private static formatDateRange(reports: BenchmarkReport[]): string
  {
    if (reports.length === 0) return 'N/A';
    if (reports.length === 1) return reports[0].timestamp.toLocaleDateString();

    const first = reports[0].timestamp;
    const last = reports[reports.length - 1].timestamp;

    return `${first.toLocaleDateString()} - ${last.toLocaleDateString()}`;
  }

  private static getUniqueMachines(reports: BenchmarkReport[]): string[]
  {
    return [...new Set(reports.map(r => r.machineId))];
  }

  private static getUniqueBenchmarks(reports: BenchmarkReport[]): string[]
  {
    const benchmarks = new Set<string>();
    reports.forEach(report =>
    {
      report.results.forEach(result =>
      {
        benchmarks.add(result.name);
      });
    });
    return [...benchmarks];
  }

  private static getMachineColor(machineId: string): string
  {
    // Generate consistent colors for machines
    const colors = [
      '#3498db',
      '#e74c3c',
      '#2ecc71',
      '#f39c12',
      '#9b59b6',
      '#1abc9c',
      '#34495e',
      '#e67e22',
      '#95a5a6',
      '#16a085',
    ];

    let hash = 0;
    for (let i = 0; i < machineId.length; i++)
    {
      hash = machineId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  private static generateTableRows(reports: BenchmarkReport[]): string
  {
    const rows: string[] = [];

    for (const report of reports)
    {
      for (const result of report.results)
      {
        const statusClass = result.success ? 'success' : 'failed';
        const statusText = result.success ? '✅ Success' : '❌ Failed';

        rows.push(`
          <tr>
            <td>${report.timestamp.toLocaleString()}</td>
            <td><span class="machine-tag">${report.machineId}</span></td>
            <td>${result.name}</td>
            <td>${result.duration.toFixed(2)}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${report.filesystemLabel}</td>
          </tr>
        `);
      }
    }

    return rows.join('');
  }

  private static generateChartScript(reports: BenchmarkReport[]): string
  {
    const benchmarks = this.getUniqueBenchmarks(reports);
    const machines = this.getUniqueMachines(reports);

    const chartConfigs = benchmarks.map(benchmarkName =>
    {
      const datasets = machines.map(machineId =>
      {
        const data = reports
          .filter(r => r.machineId === machineId)
          .map(report =>
          {
            const result = report.results.find(r => r.name === benchmarkName);
            return {
              x: report.timestamp.toISOString(),
              y: result?.success ? result.duration : null,
            };
          })
          .filter(d => d.y !== null);

        return {
          label: machineId,
          data,
          borderColor: this.getMachineColor(machineId),
          backgroundColor: this.getMachineColor(machineId) + '33',
          tension: 0.1,
        };
      });

      return `
        new Chart(document.getElementById('chart-${benchmarkName.replace(/\s+/g, '-')}'), {
          type: 'line',
          data: {
            datasets: ${JSON.stringify(datasets)}
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: '${benchmarkName} Performance Over Time'
              },
              legend: {
                display: true,
                position: 'bottom'
              }
            },
            scales: {
              x: {
                type: 'time',
                time: {
                  unit: 'day',
                  displayFormats: {
                    day: 'MMM dd'
                  }
                },
                title: {
                  display: true,
                  text: 'Date'
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Duration (ms)'
                },
                beginAtZero: true
              }
            }
          }
        });
      `;
    }).join('');

    return chartConfigs;
  }

  /**
  Write HTML report to file
  */
  static async writeHTMLReport(reports: BenchmarkReport[], filepath: string): Promise<void>
  {
    const html = this.generateComparisonHTML(reports);
    await Deno.writeTextFile(filepath, html);
  }
}
