// import { useEffect, useState } from "react";
// import LoadingSpinner from "./loading-spinner";
// import { AgGridReact } from "ag-grid-react";
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-alpine.css";
// import readXlsxFile, { readSheetNames } from "read-excel-file";

// export type ExcelProps = {
//   url: string;
// };

// export function Excel({ url }: ExcelProps) {
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [activeSheetName, setActiveSheetName] = useState<string>();
//   const [workbook, setWorkbook] = useState<any>();
//   const [rows, setRows] = useState<any>();
//   const [cols, setCols] = useState<any>();

//   useEffect(() => {
//     const loadSpreadsheet = async () => {
//       setIsLoading(true);
//       const response = await fetch(url);
//       const blob = await response.blob();
//       const sheets = await readSheetNames(blob);
//       const firstSheetName = sheets[0];

//       if (!firstSheetName) {
//         throw new Error("No sheet found in the spreadsheet");
//       }

//       setActiveSheetName(firstSheetName);
//       const workSheet = await readXlsxFile(blob, {
//         sheet: firstSheetName,
//         schema: {},
//       });

//       if (!ws) {
//         throw new Error("WorkSheet not found");
//       }

//       const range = utils.decode_range(ws["!ref"] || "A1");
//       const columns = Array.from({ length: range.e.c + 1 }, (_, i) => ({
//         field: utils.encode_col(i),
//       }));

//       const rowsAr = utils.sheet_to_json(ws, { header: 1 });
//       const rows = rowsAr.map((row) => {
//         const obj = {};
//         columns.forEach((col, i) => {
//           obj[col.field] = row[i];
//         });
//         return obj;
//       });

//       setRows(rows);
//       setCols(columns);
//       setIsLoading(false);
//     };

//     loadSpreadsheet();
//   }, [url]);

//   return isLoading ? (
//     <div className="flex h-[300px] w-[600px] w-full items-center justify-center">
//       <LoadingSpinner />
//     </div>
//   ) : (
//     <>
//       {cols && rows && (
//         <div>
//           <div
//             className="ag-theme-alpine"
//             style={{ height: 400, width: "100%" }}
//           >
//             <AgGridReact
//               rowData={rows}
//               columnDefs={cols}
//               defaultColDef={{
//                 resizable: true,
//                 minWidth: 200,
//                 flex: 1,
//                 sortable: true,
//                 filter: true,
//               }}
//             ></AgGridReact>
//           </div>
//           <div className="border-t">
//             {workbook.SheetNames.map((name: string, idx: number) => {
//               return (
//                 <>
//                   <button
//                     key={idx}
//                     className={`border-b border-l border-r px-3 pb-2 pt-4 text-sm ${
//                       name == activeSheetName ? "font-semibold" : ""
//                     }`}
//                     onClick={() => loadSpreadsheet(workbook, name)}
//                   >
//                     {name}
//                   </button>
//                 </>
//               );
//             })}
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
