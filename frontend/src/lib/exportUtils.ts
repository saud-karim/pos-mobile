import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string) {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  // Convert JSON to a sheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Append sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  // Write the file and trigger download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
