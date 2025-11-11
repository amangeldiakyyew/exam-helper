import { Button } from "./button";

import { useEffect, useState } from "react";
import { useIpc } from "../hooks/useIpc";
import type { FoundReport, StudentInfo } from "../types";

export const PdfParsing = () => {
	const ipc = useIpc();
	const [classes, setClasses] = useState<string[]>([]);
	const [selectedClass, setSelectedClass] = useState<string>("");
	const [studentCount, setStudentCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [notification, setNotification] = useState("");

	const [parseResult, setParseResult] = useState<{
		foundReports: FoundReport[];
		missingStudents: string[];
		hasDuplicates: boolean;
		totalPages: number;
		outputDir: string;
	} | null>(null);

	const [students, setStudents] = useState<Record<string, StudentInfo>>({});
	const [selectedReports, setSelectedReports] = useState<Set<string>>(
		new Set(),
	);
	const [isSendingBulk, setIsSendingBulk] = useState(false);

	useEffect(() => {
		loadClasses();
	}, []);

	useEffect(() => {
		if (selectedClass) {
			loadStudentCount();
		}
	}, [selectedClass]);

	const loadClasses = async () => {
		try {
			const classList = await ipc.getClasses();
			setClasses(classList);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const loadStudentCount = async () => {
		try {
			const studentsData = await ipc.getStudents(selectedClass);
			setStudents(studentsData);
			setStudentCount(Object.keys(studentsData).length);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const showNotification = (message: string) => {
		setNotification(message);
		setTimeout(() => setNotification(""), 3000);
	};

	const handleParsePdf = async () => {
		if (!selectedClass) {
			showNotification("Lütfen önce bir sınıf seçin");
			return;
		}

		try {
			setLoading(true);
			const result = await ipc.parsePdf(selectedClass);
			setParseResult(result);
			setSelectedReports(new Set()); // Reset selection
			showNotification(
				`${result.foundReports.length} rapor bulundu, ${result.missingStudents.length} eksik`,
			);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		} finally {
			setLoading(false);
		}
	};

	const handleDownloadPdf = async (report: FoundReport) => {
		try {
			await ipc.downloadPdf(report.filePath, report.fileNameStudent);
			showNotification("PDF başarıyla indirildi");
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleDownloadZip = async () => {
		if (!parseResult) return;

		try {
			const reports = parseResult.foundReports.map((r) => ({
				filePath: r.filePath,
				fileNameSchoolNo: r.fileNameSchoolNo,
				fileNameStudent: r.fileNameStudent,
			}));

			await ipc.downloadZip(reports, "schoolNo");
			showNotification("ZIP başarıyla indirildi");
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleDeleteReport = async (report: FoundReport) => {
		if (
			!confirm(
				`${report.studentName} için raporu silmek istediğinizden emin misiniz?`,
			)
		)
			return;

		try {
			await ipc.deleteReport(report.filePath);
			setParseResult((prev) =>
				prev
					? {
							...prev,
							foundReports: prev.foundReports.filter((r) => r.id !== report.id),
						}
					: null,
			);
			showNotification("Rapor başarıyla silindi");
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleSendEmail = async (report: FoundReport) => {
		try {
			const studentInfo = students[report.studentName];
			if (!studentInfo) {
				showNotification(`${report.studentName} için öğrenci bilgisi bulunamadı`);
				return;
			}

			// Check if student has parent email
			if (
				!studentInfo["Anne E-posta"] &&
				!studentInfo["Baba E-posta"]
			) {
				showNotification(
					`${report.studentName} için anne veya baba e-posta adresi bulunamadı`,
				);
				return;
			}

			await ipc.openOutlookEmail(
				report.studentName,
				studentInfo,
				report.filePath,
			);

			showNotification(`${report.studentName} için Outlook açıldı`);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleSelectReport = (reportId: string) => {
		setSelectedReports((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(reportId)) {
				newSet.delete(reportId);
			} else {
				newSet.add(reportId);
			}
			return newSet;
		});
	};

	const handleSelectAll = () => {
		if (!parseResult) return;

		if (selectedReports.size === parseResult.foundReports.length) {
			// Deselect all
			setSelectedReports(new Set());
		} else {
			// Select all students with email
			const reportsWithEmail = parseResult.foundReports.filter((report) => {
				const studentInfo = students[report.studentName];
				return (
					studentInfo?.["Anne E-posta"] || studentInfo?.["Baba E-posta"]
				);
			});
			setSelectedReports(new Set(reportsWithEmail.map((r) => r.id)));
		}
	};

	const handleBulkSendEmails = async () => {
		if (selectedReports.size === 0) {
			showNotification("Lütfen en az bir öğrenci seçin");
			return;
		}

		if (
			!confirm(
				`${selectedReports.size} öğrenci için Outlook e-postaları sırayla açılacak. Devam etmek istiyor musunuz?`,
			)
		) {
			return;
		}

		setIsSendingBulk(true);
		let successCount = 0;
		let errorCount = 0;
		const selectedReportsArray = Array.from(selectedReports);

		try {
			for (let i = 0; i < selectedReportsArray.length; i++) {
				const reportId = selectedReportsArray[i];
				const report = parseResult?.foundReports.find((r) => r.id === reportId);
				if (!report) {
					errorCount++;
					continue;
				}

				const studentInfo = students[report.studentName];
				if (!studentInfo) {
					console.error(`Student info not found for ${report.studentName}`);
					errorCount++;
					continue;
				}

				// Check if student has parent email
				if (
					!studentInfo["Anne E-posta"] &&
					!studentInfo["Baba E-posta"]
				) {
					console.error(`No email found for ${report.studentName}`);
					errorCount++;
					continue;
				}

				try {
					await ipc.openOutlookEmail(
						report.studentName,
						studentInfo,
						report.filePath,
					);
					successCount++;
					console.log(`✓ Outlook opened for ${report.studentName}`);

					// Wait 2 seconds before opening next email (not for the last one)
					if (i < selectedReportsArray.length - 1) {
						await new Promise((resolve) => setTimeout(resolve, 2000));
					}
				} catch (error) {
					console.error(
						`Failed to open email for ${report.studentName}:`,
						error,
					);
					errorCount++;
				}
			}

			// Always show the final notification
			const message =
				errorCount > 0
					? `✓ ${successCount} e-posta açıldı, ✗ ${errorCount} hata`
					: `✓ ${successCount} e-posta başarıyla açıldı!`;

			showNotification(message);
			setSelectedReports(new Set()); // Clear selection after bulk send
		} catch (error) {
			console.error("Bulk send error:", error);
			showNotification(`❌ Hata: ${(error as Error).message}`);
		} finally {
			setIsSendingBulk(false);
		}
	};

	const handleOpenFolder = async () => {
		if (!parseResult?.outputDir) return;

		try {
			await ipc.openFolder(parseResult.outputDir);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold text-gray-800">
				⚙️ PDF Ayrıştırma ve Rapor Yönetimi
			</h1>

			{notification && (
				<div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
					{notification}
				</div>
			)}

			{/* Class Selection */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<h2 className="text-xl font-semibold mb-4">1. Sınıf Seçimi</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Ayrıştırma Yapılacak Sınıfı Seçin
					</label>
					<select
						value={selectedClass}
						onChange={(e) => setSelectedClass(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
					>
						<option value="">-- Sınıf Seçin --</option>
						{classes.map((cls) => (
							<option key={cls} value={cls}>
								{cls}
							</option>
						))}
					</select>
				</div>

				{selectedClass && (
					<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
						Bu sınıfta <strong>{studentCount}</strong> öğrenci bulundu.
					</div>
				)}
			</div>

			{/* PDF Upload */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<h2 className="text-xl font-semibold mb-4">
					2. PDF Yükleme ve Ayrıştırma
				</h2>

				<Button
					onClick={handleParsePdf}
					disabled={!selectedClass || loading}
					className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400"
				>
					{loading ? "Ayrıştırılıyor..." : "PDF Dosyası Seç ve Ayrıştır"}
				</Button>

				{loading && (
					<div className="mt-4 flex items-center gap-2 text-gray-600">
						<div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
						<span>Sayfalar taranıyor ve sonuçlar ayrıştırılıyor...</span>
					</div>
				)}
			</div>

			{/* Results */}
			{parseResult && (
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">
						3. Sonuçlar ve Raporlar
					</h2>

					{/* Open Folder Button */}
					<div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-semibold text-green-800 mb-1">
									✅ PDF'ler Başarıyla Ayrıştırıldı!
								</h3>
								<p className="text-sm text-green-700">
									{parseResult.foundReports.length} rapor dosya klasörüne
									kaydedildi
								</p>
								<p className="text-xs text-gray-600 mt-1 font-mono">
									📁 {parseResult.outputDir}
								</p>
							</div>
							<Button
								onClick={handleOpenFolder}
								className="bg-green-600 hover:bg-green-700 text-white"
							>
								📂 Klasörü Aç
							</Button>
						</div>
					</div>

					{/* Missing Students */}
					{parseResult.missingStudents.length > 0 && (
						<div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
							<h3 className="font-semibold text-yellow-800 mb-2">
								❌ Bulunamayan Öğrenciler
							</h3>
							<p className="text-sm text-yellow-700 mb-2">
								PDF'de {parseResult.missingStudents.length} öğrenci bulunamadı
							</p>
							<div className="flex flex-wrap gap-2">
								{parseResult.missingStudents.map((name) => (
									<span
										key={name}
										className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm"
									>
										{name}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Found Reports */}
					{parseResult.foundReports.length > 0 && (
						<div className="space-y-4">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<h3 className="font-semibold text-gray-800">
									🔎 Bulunan Raporlar ({parseResult.foundReports.length})
									{selectedReports.size > 0 && (
										<span className="ml-2 text-sm text-indigo-600">
											({selectedReports.size} seçili)
										</span>
									)}
								</h3>
								<div className="flex gap-2">
									<Button
										onClick={handleDownloadZip}
										className="bg-indigo-600 hover:bg-indigo-700"
									>
										📁 Tümünü ZIP İndir
									</Button>
									<Button
										onClick={handleBulkSendEmails}
										disabled={selectedReports.size === 0 || isSendingBulk}
										className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
									>
										{isSendingBulk
											? "Gönderiliyor..."
											: `📧 Seçilenlere E-posta Gönder (${selectedReports.size})`}
									</Button>
								</div>
							</div>

							<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p className="text-sm text-gray-700">
									<strong>İpucu:</strong> E-posta göndermek istediğiniz
									öğrencileri seçin. Seçili öğrenciler için Outlook e-postaları
									sırayla açılacak (2 saniye aralıklarla). Her e-postayı kontrol
									edip gönderin.
								</p>
							</div>

							{parseResult.hasDuplicates && (
								<div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
									⚠️ <strong>DİKKAT!</strong> Mükerrer kayıtlar bulundu. Aynı
									okul numarasına ait birden fazla sayfa var.
								</div>
							)}

							{/* Reports Table */}
							<div className="overflow-auto max-h-96 border rounded-lg">
								<table className="w-full text-sm">
									<thead className="bg-gray-100 sticky top-0">
										<tr>
											<th className="px-4 py-2 text-center w-12">
												<input
													type="checkbox"
													checked={
														parseResult.foundReports.length > 0 &&
														selectedReports.size > 0 &&
														selectedReports.size ===
															parseResult.foundReports.filter((r) => {
																const si = students[r.studentName];
																return si?.["Anne E-posta"] || si?.["Baba E-posta"];
															}).length
													}
													onChange={handleSelectAll}
													className="w-4 h-4 cursor-pointer"
													title="Tümünü seç/kaldır"
												/>
											</th>
											<th className="px-4 py-2 text-left">Öğrenci</th>
											<th className="px-4 py-2 text-left">E-posta</th>
											<th className="px-4 py-2 text-left">Eşleşen Metin</th>
											<th className="px-4 py-2 text-left">Dosya Adı</th>
											<th className="px-4 py-2 text-center">Sayfa</th>
											<th className="px-4 py-2 text-center">İşlemler</th>
										</tr>
									</thead>
									<tbody>
										{parseResult.foundReports.map((report) => {
											const studentInfo = students[report.studentName];
											const hasEmail =
												studentInfo?.["Anne E-posta"] ||
												studentInfo?.["Baba E-posta"];
											const isSelected = selectedReports.has(report.id);
											return (
												<tr
													key={report.id}
													className={`border-t hover:bg-gray-50 ${
														isSelected ? "bg-blue-50" : ""
													}`}
												>
													<td className="px-4 py-2 text-center">
														<input
															type="checkbox"
															checked={isSelected}
															onChange={() => handleSelectReport(report.id)}
															disabled={!hasEmail}
															className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
														/>
													</td>
													<td className="px-4 py-2 font-medium">
														{report.studentName}
													</td>
													<td className="px-4 py-2 text-xs">
														{hasEmail ? (
															<span className="text-green-600">✓ Var</span>
														) : (
															<span className="text-red-600">✗ Yok</span>
														)}
													</td>
													<td className="px-4 py-2 text-gray-600 text-xs">
														{report.matchedText.substring(0, 30)}
														{report.matchedText.length > 30 && "..."}
													</td>
													<td className="px-4 py-2 text-xs text-gray-600">
														{report.fileNameSchoolNo}
													</td>
													<td className="px-4 py-2 text-center">
														{report.pageNumber}
													</td>
													<td className="px-4 py-2">
														<div className="flex gap-2 justify-center flex-wrap">
															<button
																onClick={() => handleSendEmail(report)}
																disabled={!hasEmail}
																className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
																title={hasEmail ? "Outlook'ta aç" : "E-posta yok"}
															>
																📧 E-posta
															</button>
															<button
																onClick={() => handleDownloadPdf(report)}
																className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
															>
																İndir
															</button>
															<button
																onClick={() => handleDeleteReport(report)}
																className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
															>
																Sil
															</button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
