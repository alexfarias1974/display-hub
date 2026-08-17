function renderShowsTable(shows) {
  const tbody = document.getElementById('shows-tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  shows.forEach(show => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${show.content_id || '-'}</td>
      <td>${show.campaign_id || '-'}</td>
      <td>${show.device_id || '-'}</td>
      <td>-</td>
      <td>${new Date(show.start).toLocaleString()}</td>
      <td>${new Date(show.end).toLocaleString()}</td>
      <td>-</td>
    `;
    tbody.appendChild(tr);
  });
}
