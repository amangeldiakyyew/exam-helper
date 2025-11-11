import fs from "node:fs/promises";
import path from "node:path";

import { app } from "electron";

import type { ClassData, EmailTemplate, StudentInfo } from "../../src/types";

const getDataFilePath = () => {
	const userDataPath = app.getPath("userData");
	return path.join(userDataPath, "student_data.json");
};

const getTemplateFilePath = () => {
	const userDataPath = app.getPath("userData");
	return path.join(userDataPath, "email_template.json");
};

export async function loadData(): Promise<ClassData> {
	try {
		const dataFile = getDataFilePath();
		const data = await fs.readFile(dataFile, "utf-8");
		const parsed = JSON.parse(data);
		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {};
		}
		console.error("Error loading data:", error);
		return {};
	}
}

export async function saveData(data: ClassData): Promise<void> {
	try {
		const dataFile = getDataFilePath();
		await fs.mkdir(path.dirname(dataFile), { recursive: true });
		await fs.writeFile(dataFile, JSON.stringify(data, null, 2), "utf-8");
	} catch (error) {
		console.error("Error saving data:", error);
		throw error;
	}
}

export async function getClasses(): Promise<string[]> {
	const data = await loadData();
	return Object.keys(data);
}

export async function getStudentsByClass(
	className: string,
): Promise<Record<string, StudentInfo>> {
	const data = await loadData();
	return data[className] || {};
}

export async function saveClass(
	className: string,
	students: Record<string, StudentInfo> = {},
): Promise<void> {
	const data = await loadData();
	data[className] = students;
	await saveData(data);
}

export async function deleteClass(className: string): Promise<void> {
	const data = await loadData();
	delete data[className];
	await saveData(data);
}

export async function saveStudent(
	className: string,
	studentName: string,
	studentInfo: StudentInfo,
): Promise<void> {
	const data = await loadData();
	if (!data[className]) {
		data[className] = {};
	}
	data[className][studentName] = studentInfo;
	await saveData(data);
}

export async function deleteStudent(
	className: string,
	studentName: string,
): Promise<void> {
	const data = await loadData();
	if (data[className]) {
		delete data[className][studentName];
		await saveData(data);
	}
}

// Email Template
export async function getEmailTemplate(): Promise<EmailTemplate> {
	try {
		const templateFile = getTemplateFilePath();
		const data = await fs.readFile(templateFile, "utf-8");
		const template = JSON.parse(data);
		// Ensure cc and bcc exist for backward compatibility
		return {
			...template,
			cc: template.cc || "",
			bcc: template.bcc || "",
		};
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// Return default template
			return {
				subject: "{{Okul No}} - {{Ad Soyad}} Sınav Sonucu",
				message:
					"Sayın {{Anne Adı Soyadı}} ve {{Baba Adı Soyadı}},\n\nÖğrenciniz {{Ad Soyad}} ({{Okul No}}) için sınav sonucu ekte yer almaktadır.\n\nSaygılarımızla.",
				cc: "",
				bcc: "",
			};
		}
		console.error("Error loading email template:", error);
		throw error;
	}
}

export async function saveEmailTemplate(
	template: EmailTemplate,
): Promise<void> {
	try {
		const templateFile = getTemplateFilePath();
		await fs.mkdir(path.dirname(templateFile), { recursive: true });
		await fs.writeFile(templateFile, JSON.stringify(template, null, 2), "utf-8");
	} catch (error) {
		console.error("Error saving email template:", error);
		throw error;
	}
}
