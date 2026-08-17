function renderCharts(hourlyData, topMediaData) {
  const ctxLine = document.getElementById('lineChart');
  const ctxBar = document.getElementById('barChart');
  
  if (ctxLine && window.Chart) {
    new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: ['00', '04', '08', '12', '16', '20'],
        datasets: [{ label: 'ExibiÃ§Ãµes', data: [12, 19, 3, 5, 2, 3], borderColor: '#d946ef' }]
      }
    });
  }
  
  if (ctxBar && window.Chart) {
    new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['MÃ­dia 1', 'MÃ­dia 2', 'MÃ­dia 3', 'MÃ­dia 4', 'MÃ­dia 5'],
        datasets: [{ label: 'Top MÃ­dias', data: [50, 40, 30, 20, 10], backgroundColor: '#d946ef' }]
      }
    });
  }
}
