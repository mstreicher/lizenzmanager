export function exportToCsv(data, filename = 'export.csv') {
  if (!data || data.length === 0) return alert('Keine Daten zum Exportieren');
  const rows = [Object.keys(data[0]).join(','), ...data.map(obj =>
    Object.values(obj).map(v => `"${v}"`).join(',')
  )];
  const csvContent = rows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
