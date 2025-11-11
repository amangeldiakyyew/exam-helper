import archiver from "archiver";
import { dialog, ipcMain, shell } from "electron";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import type { ExcelRow, StudentInfo } from "../../src/types";
import {
  deleteClass,
  deleteStudent,
  getClasses,
  getStudentsByClass,
  saveClass,
  saveStudent,
} from "../modules/dataManager";
import {
  parsePdfForStudents,
  prepareStudentInfo,
} from "../modules/pdfParser";

// XLSX is a CommonJS module, use require
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

// Class Management
ipcMain.handle("get-classes", async () => {
    try {
      const classes = await getClasses();
      return { success: true, classes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle("get-students", async (_event, className: string) => {
    try {
      const students = await getStudentsByClass(className);
      return { success: true, students };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle("create-class", async (_event, className: string) => {
    try {
      await saveClass(className);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle("delete-class", async (_event, className: string) => {
    try {
      await deleteClass(className);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle(
    "save-student",
    async (
      _event,
      className: string,
      studentName: string,
      studentInfo: StudentInfo,
    ) => {
      try {
        await saveStudent(className, studentName, studentInfo);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
  
  ipcMain.handle(
    "update-student",
    async (
      _event,
      className: string,
      oldName: string,
      newName: string,
      studentInfo: StudentInfo,
    ) => {
      try {
        if (oldName !== newName) {
          await deleteStudent(className, oldName);
        }
        await saveStudent(className, newName, studentInfo);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
  
  ipcMain.handle(
    "delete-student",
    async (_event, className: string, studentName: string) => {
      try {
        await deleteStudent(className, studentName);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
  
  // Excel Upload
  ipcMain.handle("upload-excel", async (_event, className: string) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
      });
  
      if (result.canceled) {
        return { success: false, error: "File selection cancelled" };
      }
  
      const filePath = result.filePaths[0];
      const buffer = await fs.readFile(filePath);
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
  
      let successCount = 0;
      const students = await getStudentsByClass(className);
  
      for (const row of data) {
        const name = String(row["Ad Soyad"] || "").trim();
        const schoolNo = String(row["Okul No"] || "").trim();
  
        if (
          name &&
          schoolNo &&
          name !== "undefined" &&
          schoolNo !== "undefined"
        ) {
          students[name] = {
            "Okul No": schoolNo,
            "Anne Adı Soyadı": String(row["Anne Adı Soyadı"] || "").trim(),
            "Anne E-posta": String(row["Anne E-posta"] || "").trim(),
            "Anne Telefon": String(row["Anne Telefon"] || "").trim(),
            "Baba Adı Soyadı": String(row["Baba Adı Soyadı"] || "").trim(),
            "Baba E-posta": String(row["Baba E-posta"] || "").trim(),
            "Baba Telefon": String(row["Baba Telefon"] || "").trim(),
          };
          successCount++;
        }
      }
  
      await saveClass(className, students);
      return { success: true, count: successCount };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  // PDF Parsing
  ipcMain.handle("parse-pdf", async (_event, className: string) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
  
      if (result.canceled) {
        return { success: false, error: "File selection cancelled" };
      }
  
      const filePath = result.filePaths[0];
      const buffer = await fs.readFile(filePath);
      const classStudents = await getStudentsByClass(className);
      const studentInfo = prepareStudentInfo(classStudents);
  
      if (Object.keys(studentInfo).length === 0) {
        return {
          success: false,
          error:
            "No valid students found in class. Students need school number and at least 2 name parts.",
        };
      }
  
      const parseResult = await parsePdfForStudents(buffer, studentInfo, filePath);
  
      return {
        success: true,
        ...parseResult,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Download single PDF
  ipcMain.handle("download-pdf", async (_event, filePath: string, fileName: string) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });
  
      if (result.canceled || !result.filePath) {
        return { success: false, error: "Save cancelled" };
      }
  
      await fs.copyFile(filePath, result.filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Download ZIP
  ipcMain.handle(
    "download-zip",
    async (_event, reports: Array<{ filePath: string; fileNameSchoolNo: string; fileNameStudent: string }>, namingMode: "schoolNo" | "name") => {
      try {
        const result = await dialog.showSaveDialog({
          defaultPath: `reports_${namingMode}.zip`,
          filters: [{ name: "ZIP Files", extensions: ["zip"] }],
        });
  
        if (result.canceled || !result.filePath) {
          return { success: false, error: "Save cancelled" };
        }
  
        const output = await fs.open(result.filePath, "w");
        const outputStream = output.createWriteStream();
        const archive = archiver("zip", { zlib: { level: 9 } });
  
        archive.pipe(outputStream);
  
        const nameCounts: Record<string, number> = {};
  
        for (const report of reports) {
          const fileName =
            namingMode === "schoolNo"
              ? report.fileNameSchoolNo
              : report.fileNameStudent;
  
          const sanitizedFileName = fileName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
            .replace(/\s+/g, "_");
  
          let finalName = sanitizedFileName;
          if (nameCounts[sanitizedFileName]) {
            nameCounts[sanitizedFileName]++;
            finalName = sanitizedFileName.replace(
              ".pdf",
              `_${nameCounts[sanitizedFileName]}.pdf`,
            );
          } else {
            nameCounts[sanitizedFileName] = 1;
          }
  
          const fileBuffer = await fs.readFile(report.filePath);
          archive.append(fileBuffer, { name: finalName });
        }
  
        await archive.finalize();
        await new Promise<void>((resolve) => outputStream.on("close", () => resolve()));
  
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
  
  // Delete parsed PDF
  ipcMain.handle("delete-report", async (_event, filePath: string) => {
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Open folder in file explorer
  ipcMain.handle("open-folder", async (_event, folderPath: string) => {
    try {
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
  
  
  