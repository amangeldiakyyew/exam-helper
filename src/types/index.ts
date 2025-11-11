export interface StudentInfo {
	"Okul No": string;
	"Anne Adı Soyadı"?: string;
	"Anne E-posta"?: string;
	"Anne Telefon"?: string;
	"Baba Adı Soyadı"?: string;
	"Baba E-posta"?: string;
	"Baba Telefon"?: string;
}

export interface ClassData {
	[className: string]: {
		[studentName: string]: StudentInfo;
	};
}

export interface ParsedStudent {
	schoolNo: string;
	nameParts: string[];
}

export interface StudentInfoMap {
	[fullName: string]: ParsedStudent;
}

export interface FoundReport {
	id: string;
	studentName: string;
	matchedText: string;
	fileNameSchoolNo: string;
	fileNameStudent: string;
	pageNumber: number;
	filePath: string;
}

export interface ParseResult {
	foundReports: FoundReport[];
	missingStudents: string[];
	hasDuplicates: boolean;
	totalPages: number;
	outputDir: string;
}

export interface ExcelRow {
	"Ad Soyad"?: string;
	"Okul No"?: string;
	"Anne Adı Soyadı"?: string;
	"Anne E-posta"?: string;
	"Anne Telefon"?: string;
	"Baba Adı Soyadı"?: string;
	"Baba E-posta"?: string;
	"Baba Telefon"?: string;
}

export interface EmailTemplate {
	subject: string;
	message: string;
	cc?: string; // Comma-separated email addresses
	bcc?: string; // Comma-separated email addresses
}

export interface OutlookEmailData {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	body: string;
	attachmentPath: string;
}
