export function exportToCSV(data: unknown[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0] as object);
  const rows = data.map(item => 
    headers.map(header => {
      const value = (item as Record<string, unknown>)[header];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Add BOM for UTF-8 Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

export function copyToClipboard(data: unknown[], format: 'tsv' | 'csv' = 'tsv'): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0] as object);
  const rows = data.map(item => 
    headers.map(header => {
      const value = (item as Record<string, unknown>)[header];
      if (value === null || value === undefined) return '';
      return String(value);
    })
  );
  
  const separator = format === 'tsv' ? '\t' : ',';
  const headerLine = headers.join(separator);
  const dataLines = rows.map(row => 
    format === 'csv' 
      ? row.map(cell => cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell).join(separator)
      : row.join(separator)
  ).join('\n');
  
  const content = `${headerLine}\n${dataLines}`;
  navigator.clipboard.writeText(content).then(() => {
    // Success - toast handled by caller
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = content;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  });
}