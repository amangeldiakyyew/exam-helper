import { Button } from "./button";

import { useEffect, useState } from "react";
import { useIpc } from "../hooks/useIpc";
import type { StudentInfo } from "../types";

export const Settings = () => {
	const ipc = useIpc();
	const [classes, setClasses] = useState<string[]>([]);
	const [selectedClass, setSelectedClass] = useState<string>("");
	const [students, setStudents] = useState<Record<string, StudentInfo>>({});
	const [newClassName, setNewClassName] = useState("");
	const [activeTab, setActiveTab] = useState<
		"add" | "edit" | "bulk" | "template"
	>("template");
	const [selectedStudent, setSelectedStudent] = useState("");
	const [loading, setLoading] = useState(false);
	const [notification, setNotification] = useState("");

	const [formData, setFormData] = useState<StudentInfo>({
		"Okul No": "",
		"Anne Adı Soyadı": "",
		"Anne E-posta": "",
		"Anne Telefon": "",
		"Baba Adı Soyadı": "",
		"Baba E-posta": "",
		"Baba Telefon": "",
	});
	const [studentName, setStudentName] = useState("");

	useEffect(() => {
		loadClasses();
	}, []);

	useEffect(() => {
		if (selectedClass) {
			loadStudents();
		}
	}, [selectedClass]);

	useEffect(() => {
		if (selectedStudent && students[selectedStudent]) {
			const student = students[selectedStudent];
			setFormData(student);
			setStudentName(selectedStudent);
		} else {
			// Reset form when no student selected
			setFormData({
				"Okul No": "",
				"Anne Adı Soyadı": "",
				"Anne E-posta": "",
				"Anne Telefon": "",
				"Baba Adı Soyadı": "",
				"Baba E-posta": "",
				"Baba Telefon": "",
			});
			setStudentName("");
		}
	}, [selectedStudent, students]);

	const loadClasses = async () => {
		try {
			const classList = await ipc.getClasses();
			setClasses(classList);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const loadStudents = async () => {
		try {
			const studentsData = await ipc.getStudents(selectedClass);
			setStudents(studentsData);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const showNotification = (message: string) => {
		setNotification(message);
		setTimeout(() => setNotification(""), 3000);
	};

	const handleCreateClass = async () => {
		if (!newClassName.trim()) {
			showNotification("Sınıf adı gerekli");
			return;
		}
		try {
			await ipc.createClass(newClassName);
			showNotification("Sınıf başarıyla oluşturuldu");
			setNewClassName("");
			await loadClasses();
			setSelectedClass(newClassName);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleDeleteClass = async () => {
		if (!selectedClass) return;
		if (
			!confirm(
				`"${selectedClass}" sınıfını ve tüm öğrencileri silmek istediğinizden emin misiniz?`,
			)
		)
			return;
		try {
			await ipc.deleteClass(selectedClass);
			showNotification("Sınıf başarıyla silindi");
			setSelectedClass("");
			setStudents({});
			await loadClasses();
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleAddStudent = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedClass || !studentName.trim()) return;
		try {
			await ipc.saveStudent(selectedClass, studentName, formData);
			showNotification("Öğrenci başarıyla kaydedildi");
			setStudentName("");
			setFormData({
				"Okul No": "",
				"Anne Adı Soyadı": "",
				"Anne E-posta": "",
				"Anne Telefon": "",
				"Baba Adı Soyadı": "",
				"Baba E-posta": "",
				"Baba Telefon": "",
			});
			await loadStudents();
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};


	const handleUpdateStudent = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedClass || !selectedStudent || !studentName.trim()) return;
		try {
			await ipc.updateStudent(
				selectedClass,
				selectedStudent,
				studentName,
				formData,
			);
			showNotification("Öğrenci başarıyla güncellendi");
			// Reset selection (this will trigger useEffect to clear form)
			setSelectedStudent("");
			await loadStudents();
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleDeleteStudent = async () => {
		if (!selectedClass || !selectedStudent) return;
		if (
			!confirm(
				`"${selectedStudent}" öğrencisini silmek istediğinizden emin misiniz?`,
			)
		)
			return;
		try {
			await ipc.deleteStudent(selectedClass, selectedStudent);
			showNotification("Öğrenci başarıyla silindi");
			// Reset selection (this will trigger useEffect to clear form)
			setSelectedStudent("");
			await loadStudents();
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const handleUploadExcel = async () => {
		if (!selectedClass) return;
		try {
			setLoading(true);
			const count = await ipc.uploadExcel(selectedClass);
			showNotification(`${count} öğrenci başarıyla içe aktarıldı`);
			await loadStudents();
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold text-gray-800">
				📂 Sınıf ve Öğrenci Yönetimi
			</h1>

			{notification && (
				<div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
					{notification}
				</div>
			)}

			{/* Class Management */}
			<div className="bg-white rounded-lg shadow-md p-6">
				<h2 className="text-xl font-semibold mb-4">
					Sınıf Seçimi ve Yönetimi
				</h2>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Düzenlenecek Sınıfı Seçin
					</label>
					<select
						value={selectedClass}
						onChange={(e) => setSelectedClass(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					>
						<option value="">-- Sınıf Seçin --</option>
						{classes.map((cls) => (
							<option key={cls} value={cls}>
								{cls}
							</option>
						))}
					</select>
				</div>

				{!selectedClass && (
					<div className="bg-gray-50 p-4 rounded-lg">
						<h3 className="font-medium mb-2">Yeni Sınıf Oluştur</h3>
						<div className="flex gap-2">
							<input
								type="text"
								value={newClassName}
								onChange={(e) => setNewClassName(e.target.value)}
								placeholder="Örn: 5-A"
								className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
							/>
							<Button
								onClick={handleCreateClass}
								className="bg-indigo-600 hover:bg-indigo-700"
							>
								Sınıfı Oluştur
							</Button>
						</div>
					</div>
				)}

				{selectedClass && (
					<Button
						onClick={handleDeleteClass}
						className="bg-red-600 hover:bg-red-700"
					>
						Sınıfı Sil (Tüm Öğrencilerle Birlikte)
					</Button>
				)}
			</div>

			{/* Student Management */}
			{selectedClass && (
				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-xl font-semibold mb-4">Öğrenci Yönetimi</h2>

					{/* Tabs */}
					<div className="flex gap-2 mb-4 border-b overflow-x-auto">
						<button
							onClick={() => {
								setActiveTab("add");
								setSelectedStudent(""); // Clear selection when switching to add tab
							}}
							className={`px-4 py-2 font-medium whitespace-nowrap ${
								activeTab === "add"
									? "border-b-2 border-indigo-600 text-indigo-600"
									: "text-gray-600"
							}`}
						>
							Tek Öğrenci Ekle
						</button>
						<button
							onClick={() => {
								setActiveTab("edit");
								setSelectedStudent(""); // Clear selection when switching to edit tab
							}}
							className={`px-4 py-2 font-medium whitespace-nowrap ${
								activeTab === "edit"
									? "border-b-2 border-indigo-600 text-indigo-600"
									: "text-gray-600"
							}`}
						>
							Öğrenci Düzenle/Sil
						</button>
						<button
							onClick={() => {
								setActiveTab("bulk");
								setSelectedStudent(""); // Clear selection when switching to bulk tab
							}}
							className={`px-4 py-2 font-medium whitespace-nowrap ${
								activeTab === "bulk"
									? "border-b-2 border-indigo-600 text-indigo-600"
									: "text-gray-600"
							}`}
						>
							Excel ile Toplu Yükleme
						</button>
					</div>

					{/* Add Student Tab */}
					{activeTab === "add" && (
						<form onSubmit={handleAddStudent} className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Öğrenci Adı Soyadı (Tam)
									</label>
									<input
										type="text"
										value={studentName}
										onChange={(e) => setStudentName(e.target.value)}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Okul No
									</label>
									<input
										type="text"
										value={formData["Okul No"]}
										onChange={(e) =>
											setFormData({ ...formData, "Okul No": e.target.value })
										}
										required
										className="w-full px-4 py-2 border border-gray-300 rounded-lg"
									/>
								</div>
							</div>

							<h4 className="font-medium text-gray-700">Veli Bilgileri</h4>
							<div className="grid grid-cols-3 gap-4">
								<input
									type="text"
									placeholder="Anne Adı Soyadı"
									value={formData["Anne Adı Soyadı"]}
									onChange={(e) =>
										setFormData({
											...formData,
											"Anne Adı Soyadı": e.target.value,
										})
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
								<input
									type="email"
									placeholder="Anne E-posta"
									value={formData["Anne E-posta"]}
									onChange={(e) =>
										setFormData({ ...formData, "Anne E-posta": e.target.value })
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
								<input
									type="tel"
									placeholder="Anne Telefon"
									value={formData["Anne Telefon"]}
									onChange={(e) =>
										setFormData({ ...formData, "Anne Telefon": e.target.value })
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<input
									type="text"
									placeholder="Baba Adı Soyadı"
									value={formData["Baba Adı Soyadı"]}
									onChange={(e) =>
										setFormData({
											...formData,
											"Baba Adı Soyadı": e.target.value,
										})
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
								<input
									type="email"
									placeholder="Baba E-posta"
									value={formData["Baba E-posta"]}
									onChange={(e) =>
										setFormData({ ...formData, "Baba E-posta": e.target.value })
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
								<input
									type="tel"
									placeholder="Baba Telefon"
									value={formData["Baba Telefon"]}
									onChange={(e) =>
										setFormData({ ...formData, "Baba Telefon": e.target.value })
									}
									className="px-4 py-2 border border-gray-300 rounded-lg"
								/>
							</div>

							<Button
								type="submit"
								className="bg-indigo-600 hover:bg-indigo-700"
							>
								Öğrenciyi Ekle/Güncelle
							</Button>
						</form>
					)}

					{/* Edit Student Tab */}
					{activeTab === "edit" && (
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Düzenlenecek Öğrenciyi Seçin
								</label>
								<select
									value={selectedStudent}
									onChange={(e) => setSelectedStudent(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg"
								>
									<option value="">-- Öğrenci Seçin --</option>
									{Object.keys(students).map((name) => (
										<option key={name} value={name}>
											{name}
										</option>
									))}
								</select>
							</div>

							{selectedStudent && (
								<form onSubmit={handleUpdateStudent} className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Öğrenci Adı Soyadı (Tam)
											</label>
											<input
												type="text"
												value={studentName}
												onChange={(e) => setStudentName(e.target.value)}
												required
												className="w-full px-4 py-2 border border-gray-300 rounded-lg"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Okul No
											</label>
											<input
												type="text"
												value={formData["Okul No"]}
												onChange={(e) =>
													setFormData({
														...formData,
														"Okul No": e.target.value,
													})
												}
												required
												className="w-full px-4 py-2 border border-gray-300 rounded-lg"
											/>
										</div>
									</div>

									<h4 className="font-medium text-gray-700">Veli Bilgileri</h4>
									<div className="grid grid-cols-3 gap-4">
										<input
											type="text"
											placeholder="Anne Adı Soyadı"
											value={formData["Anne Adı Soyadı"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Anne Adı Soyadı": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
										<input
											type="email"
											placeholder="Anne E-posta"
											value={formData["Anne E-posta"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Anne E-posta": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
										<input
											type="tel"
											placeholder="Anne Telefon"
											value={formData["Anne Telefon"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Anne Telefon": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
									</div>

									<div className="grid grid-cols-3 gap-4">
										<input
											type="text"
											placeholder="Baba Adı Soyadı"
											value={formData["Baba Adı Soyadı"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Baba Adı Soyadı": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
										<input
											type="email"
											placeholder="Baba E-posta"
											value={formData["Baba E-posta"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Baba E-posta": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
										<input
											type="tel"
											placeholder="Baba Telefon"
											value={formData["Baba Telefon"]}
											onChange={(e) =>
												setFormData({
													...formData,
													"Baba Telefon": e.target.value,
												})
											}
											className="px-4 py-2 border border-gray-300 rounded-lg"
										/>
									</div>

									<div className="flex gap-4">
										<Button
											type="submit"
											className="bg-indigo-600 hover:bg-indigo-700"
										>
											Öğrenciyi Güncelle
										</Button>
										<Button
											type="button"
											onClick={handleDeleteStudent}
											className="bg-red-600 hover:bg-red-700"
										>
											Öğrenciyi Sil
										</Button>
									</div>
								</form>
							)}
						</div>
					)}

					{/* Bulk Upload Tab */}
					{activeTab === "bulk" && (
						<div className="space-y-4">
							<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
								<p className="text-sm text-gray-700">
									Excel dosyanız şu sütunları içermelidir:
									<br />
									<strong>
										Ad Soyad, Okul No, Anne Adı Soyadı, Anne E-posta, Anne
										Telefon, Baba Adı Soyadı, Baba E-posta, Baba Telefon
									</strong>
								</p>
							</div>
							<Button
								onClick={handleUploadExcel}
								disabled={loading}
								className="bg-indigo-600 hover:bg-indigo-700"
							>
								{loading ? "Yükleniyor..." : "Excel Dosyası Seç ve Yükle"}
							</Button>
						</div>
					)}

					{/* Students Table */}
					{Object.keys(students).length > 0 && (
						<div className="mt-6">
							<h3 className="font-semibold mb-2">
								Tüm Öğrenciler ({Object.keys(students).length})
							</h3>
							<div className="overflow-auto max-h-96 border rounded-lg">
								<table className="w-full text-sm">
									<thead className="bg-gray-100 sticky top-0">
										<tr>
											<th className="px-4 py-2 text-left">Ad Soyad</th>
											<th className="px-4 py-2 text-left">Okul No</th>
											<th className="px-4 py-2 text-left">Anne</th>
											<th className="px-4 py-2 text-left">Baba</th>
										</tr>
									</thead>
									<tbody>
										{Object.entries(students).map(([name, info]) => (
											<tr key={name} className="border-t hover:bg-gray-50">
												<td className="px-4 py-2">{name}</td>
												<td className="px-4 py-2">{info["Okul No"]}</td>
												<td className="px-4 py-2">{info["Anne Adı Soyadı"]}</td>
												<td className="px-4 py-2">{info["Baba Adı Soyadı"]}</td>
											</tr>
										))}
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
