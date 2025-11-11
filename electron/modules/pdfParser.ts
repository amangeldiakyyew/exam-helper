import fs from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import type {
	FoundReport,
	ParseResult,
	StudentInfo,
	StudentInfoMap,
} from "../../src/types";

// Configure PDF.js worker for Node.js environment
PDFParse.setWorker();

const EXACT_MATCH_LIMIT = 10;
const CONTEXT_CHAR_LIMIT = 10;

export function prepareStudentInfo(
	classStudents: Record<string, StudentInfo>,
): StudentInfoMap {
	const prepared: StudentInfoMap = {};

	for (const [fullName, details] of Object.entries(classStudents)) {
		const schoolNo = String(details["Okul No"] || "");
		const nameParts = fullName.trim().split(/\s+/);

		if (schoolNo && schoolNo !== "undefined" && nameParts.length >= 2) {
			prepared[fullName] = {
				schoolNo: schoolNo,
				nameParts: nameParts,
			};
		}
	}

	return prepared;
}

export async function parsePdfForStudents(
	pdfBuffer: Buffer,
	studentInfo: StudentInfoMap,
	sourcePdfPath: string,
): Promise<ParseResult> {
	try {
		console.log("Starting PDF parsing...");
		const startTime = Date.now();

		const pdfDoc = await PDFDocument.load(pdfBuffer);
		const totalPages = pdfDoc.getPageCount();
		console.log(`PDF loaded with ${totalPages} pages`);

		console.log("Starting text extraction...");
		const parser = new PDFParse({
			data: pdfBuffer,
		});
		const textResult = await parser.getText();
		// Clean up parser resources
		await parser.destroy();
		console.log(`Text extraction completed in ${Date.now() - startTime}ms`);

		const foundReports: FoundReport[] = [];
		const foundStudents = new Set<string>();
		const schoolNumberCounts: Record<string, number> = {};
		let hasDuplicates = false;

		// Normalize Turkish characters for better matching
		// This handles both Turkish->Latin and keeps the text searchable both ways
		const normalizeTurkish = (str: string) => {
			return str
				.toLowerCase()
				.replace(/i̇/g, "i")
				.replace(/İ/g, "i")
				.replace(/ı/g, "i")
				.replace(/Ι/g, "i")
				.replace(/ğ/g, "g")
				.replace(/Ğ/g, "g")
				.replace(/ü/g, "u")
				.replace(/Ü/g, "u")
				.replace(/ş/g, "s")
				.replace(/Ş/g, "s")
				.replace(/ö/g, "o")
				.replace(/Ö/g, "o")
				.replace(/ç/g, "c")
				.replace(/Ç/g, "c");
		};

		const searchPatterns: Record<
			string,
			{ patterns: string[]; schoolNo: string }
		> = {};
		for (const [fullName, info] of Object.entries(studentInfo)) {
			const nameParts = info.nameParts.map((p) => normalizeTurkish(p));
			const patterns: string[] = [];

			// Helper to create patterns with flexible spacing
			const createPattern = (parts: string[]) => {
				return parts.join("\\s+");
			};

			// Helper to generate all possible combinations of name parts
			const generateCombinations = (parts: string[]) => {
				const combos: string[][] = [];
				
				// Add all possible pairs (for partial names like "fatma sert" from "fatma bengi sert")
				for (let i = 0; i < parts.length; i++) {
					for (let j = i + 1; j < parts.length; j++) {
						combos.push([parts[i], parts[j]]);
						combos.push([parts[j], parts[i]]);
					}
				}
				
				// Add all possible triples if we have 3+ parts
				if (parts.length >= 3) {
					for (let i = 0; i < parts.length; i++) {
						for (let j = i + 1; j < parts.length; j++) {
							for (let k = j + 1; k < parts.length; k++) {
								// Generate all permutations of the triple
								const triple = [parts[i], parts[j], parts[k]];
								combos.push([triple[0], triple[1], triple[2]]);
								combos.push([triple[0], triple[2], triple[1]]);
								combos.push([triple[1], triple[0], triple[2]]);
								combos.push([triple[1], triple[2], triple[0]]);
								combos.push([triple[2], triple[0], triple[1]]);
								combos.push([triple[2], triple[1], triple[0]]);
							}
						}
					}
				}
				
				return combos;
			};

			// Generate multiple pattern variations for flexible matching
			if (nameParts.length === 2) {
				// For 2-part names: try both orders
				patterns.push(createPattern(nameParts));
				patterns.push(createPattern([...nameParts].reverse()));
			} else if (nameParts.length === 3) {
				// For 3-part names (common in Turkish):
				// Full name patterns
				const [a, b, c] = nameParts;
				patterns.push(createPattern([a, b, c])); // FirstName MiddleName Surname
				patterns.push(createPattern([c, a, b])); // Surname FirstName MiddleName
				patterns.push(createPattern([c, b, a])); // Surname MiddleName FirstName
				patterns.push(createPattern([b, a, c])); // MiddleName FirstName Surname
				patterns.push(createPattern([a, c, b])); // FirstName Surname MiddleName
				patterns.push(createPattern([b, c, a])); // MiddleName Surname FirstName
				
				// Partial name patterns (2 parts from 3)
				const partialCombos = generateCombinations(nameParts);
				for (const combo of partialCombos) {
					patterns.push(createPattern(combo));
				}
			} else if (nameParts.length >= 4) {
				// For 4+ part names
				patterns.push(createPattern(nameParts)); // Full name as-is
				patterns.push(createPattern([...nameParts].reverse())); // Reversed
				
				// Try last name first with rest
				patterns.push(
					createPattern([
						nameParts[nameParts.length - 1],
						...nameParts.slice(0, -1),
					]),
				);
				
				// Add partial combinations
				const partialCombos = generateCombinations(nameParts);
				for (const combo of partialCombos) {
					patterns.push(createPattern(combo));
				}
			} else {
				// Single name or fallback
				patterns.push(createPattern(nameParts));
			}

			searchPatterns[fullName] = {
				patterns,
				schoolNo: info.schoolNo,
			};
		}

		// Create output directory next to source PDF with timestamp
		const sourcePdfDir = path.dirname(sourcePdfPath);
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5);
		const outputDir = path.join(sourcePdfDir, "pdf_result", timestamp);
		await fs.mkdir(outputDir, { recursive: true });

		console.log("Processing pages and matching students...");
		for (let pageNum = 0; pageNum < totalPages; pageNum++) {
			try {
				// Use array directly (0-indexed) instead of getPageText which uses 1-based page numbers
				const pageText = textResult.pages[pageNum]?.text || "";
				const pageTextLower = normalizeTurkish(pageText);

				let matchedStudent: string | null = null;
				let matchedText = "";

				for (const [fullName, searchInfo] of Object.entries(searchPatterns)) {
					let found = false;

					for (const pattern of searchInfo.patterns) {
						const regex = new RegExp(pattern, "i");
						const match = pageTextLower.match(regex);

						if (match) {
							matchedStudent = fullName;
							const matchStart = match.index || 0;
							const matchEnd = matchStart + match[0].length;

							const preMatchLen = matchStart;
							const postMatchLen = pageTextLower.length - matchEnd;

							if (
								preMatchLen <= EXACT_MATCH_LIMIT &&
								postMatchLen <= EXACT_MATCH_LIMIT
							) {
								matchedText = pageText.substring(matchStart, matchEnd).trim();
							} else {
								const startIndex = Math.max(0, matchStart - CONTEXT_CHAR_LIMIT);
								const endIndex = Math.min(
									pageText.length,
									matchEnd + CONTEXT_CHAR_LIMIT,
								);
								matchedText = pageText.substring(startIndex, endIndex).trim();
							}

							found = true;
							break;
						}
					}

					if (found) break;
				}

				if (matchedStudent) {
					const schoolNo = searchPatterns[matchedStudent].schoolNo;
					const studentName = matchedStudent; //fullName

					schoolNumberCounts[schoolNo] =
						(schoolNumberCounts[schoolNo] || 0) + 1;
					const count = schoolNumberCounts[schoolNo];

					// Sanitize student name: replace spaces with dashes, lowercase, remove special chars
					const sanitizedName = studentName
						.toLowerCase()
						.replace(/\s+/g, "-")
						.replace(/[^a-z0-9-ğüşöçıİ]/gi, "")
						.replace(/-+/g, "-")
						.replace(/^-|-$/g, "");

					// Create filename in format: john-doe-1234 or john-doe-1234-2 for duplicates
					let fileNameSchoolNo: string;
					let fileNameStudent: string;
					if (count > 1) {
						hasDuplicates = true;
						fileNameSchoolNo = `${sanitizedName}-${schoolNo}-${count}.pdf`;
						fileNameStudent = `${sanitizedName}-${schoolNo}-${count}.pdf`;
					} else {
						fileNameSchoolNo = `${sanitizedName}-${schoolNo}.pdf`;
						fileNameStudent = `${sanitizedName}-${schoolNo}.pdf`;
					}

					// Extract single page PDF
					const outputDoc = await PDFDocument.create();
					const [page] = await outputDoc.copyPages(pdfDoc, [pageNum]);
					outputDoc.addPage(page);
					const pdfBytes = await outputDoc.save();

					// Save to file instead of memory
					const filePath = path.join(outputDir, fileNameSchoolNo);
					await fs.writeFile(filePath, pdfBytes);

					foundReports.push({
						id: uuidv4(),
						studentName: matchedStudent,
						matchedText: matchedText,
						fileNameSchoolNo: fileNameSchoolNo,
						fileNameStudent: fileNameStudent,
						pageNumber: pageNum + 1,
						filePath: filePath,
					});

					foundStudents.add(matchedStudent);
				}
			} catch (pageError) {
				console.error(`Error processing page ${pageNum + 1}:`, pageError);
			}
		}

		const allStudentNames = Object.keys(studentInfo);
		const missingStudents = allStudentNames.filter(
			(name) => !foundStudents.has(name),
		);

		const totalTime = Date.now() - startTime;
		console.log(
			`PDF parsing completed in ${totalTime}ms. Found ${foundReports.length} reports, ${missingStudents.length} missing.`,
		);

		return {
			foundReports,
			missingStudents,
			hasDuplicates,
			totalPages,
			outputDir,
		};
	} catch (error) {
		console.error("Error parsing PDF:", error);
		throw error;
	}
}
