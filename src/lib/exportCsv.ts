// Utilitaire d'export CSV avec BOM UTF-8 pour compatibilité Excel

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  const BOM = "\uFEFF";
  const csvContent =
    BOM +
    [headers.join(";"), ...rows.map((row) => row.map(escapeCsvField).join(";"))].join(
      "\n"
    );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(field: string): string {
  if (field.includes(";") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
