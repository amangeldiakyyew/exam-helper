import type { IpcRenderer } from "electron";

import type { EmailTemplate, FoundReport, StudentInfo } from "../types";

declare global {
	interface Window {
		ipcRenderer: IpcRenderer;
	}
}

interface ApiResponse<T = unknown> {
	success: boolean;
	error?: string;
	data?: T;
}

export const useIpc = () => {
	const invoke = async <T>(channel: string, ...args: unknown[]): Promise<T> => {
		const result = await window.ipcRenderer.invoke(channel, ...args);
		if (!result.success) {
			throw new Error(result.error || "Unknown error");
		}
		return result as T;
	};

	return {
		// Class Management
		getClasses: async (): Promise<string[]> => {
			const result = await invoke<{ classes: string[] }>("get-classes");
			return result.classes;
		},

		getStudents: async (
			className: string,
		): Promise<Record<string, StudentInfo>> => {
			const result = await invoke<{ students: Record<string, StudentInfo> }>(
				"get-students",
				className,
			);
			return result.students;
		},

		createClass: async (className: string): Promise<void> => {
			await invoke("create-class", className);
		},

		deleteClass: async (className: string): Promise<void> => {
			await invoke("delete-class", className);
		},

		saveStudent: async (
			className: string,
			studentName: string,
			studentInfo: StudentInfo,
		): Promise<void> => {
			await invoke("save-student", className, studentName, studentInfo);
		},

		updateStudent: async (
			className: string,
			oldName: string,
			newName: string,
			studentInfo: StudentInfo,
		): Promise<void> => {
			await invoke("update-student", className, oldName, newName, studentInfo);
		},

		deleteStudent: async (
			className: string,
			studentName: string,
		): Promise<void> => {
			await invoke("delete-student", className, studentName);
		},

		// Excel Upload
		uploadExcel: async (className: string): Promise<number> => {
			const result = await invoke<{ count: number }>("upload-excel", className);
			return result.count;
		},

		// PDF Parsing
		parsePdf: async (
			className: string,
		): Promise<{
			foundReports: FoundReport[];
			missingStudents: string[];
			hasDuplicates: boolean;
			totalPages: number;
			outputDir: string;
		}> => {
			const result = await invoke<{
				foundReports: FoundReport[];
				missingStudents: string[];
				hasDuplicates: boolean;
				totalPages: number;
				outputDir: string;
			}>("parse-pdf", className);
			return result;
		},

		// Downloads
		downloadPdf: async (filePath: string, fileName: string): Promise<void> => {
			await invoke("download-pdf", filePath, fileName);
		},

		downloadZip: async (
			reports: Array<{
				filePath: string;
				fileNameSchoolNo: string;
				fileNameStudent: string;
			}>,
			namingMode: "schoolNo" | "name",
		): Promise<void> => {
			await invoke("download-zip", reports, namingMode);
		},

		deleteReport: async (filePath: string): Promise<void> => {
			await invoke("delete-report", filePath);
		},

		openFolder: async (folderPath: string): Promise<void> => {
			await invoke("open-folder", folderPath);
		},

		openFile: async (filePath: string): Promise<void> => {
			await invoke("open-file", filePath);
		},

		// Email Template
		getEmailTemplate: async (): Promise<EmailTemplate> => {
			const result = await invoke<{ template: EmailTemplate }>(
				"get-email-template",
			);
			return result.template;
		},

		saveEmailTemplate: async (template: EmailTemplate): Promise<void> => {
			await invoke("save-email-template", template);
		},

		// Open Outlook Email
		openOutlookEmail: async (
			studentName: string,
			studentInfo: StudentInfo,
			attachmentPath: string,
		): Promise<void> => {
			await invoke("open-outlook-email", studentName, studentInfo, attachmentPath);
		},
	};
};
