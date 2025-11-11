import { useEffect, useState } from "react";
import { useIpc } from "../hooks/useIpc";
import type { EmailTemplate } from "../types";
import { Button } from "./button";

export const EmailTemplateEditor = () => {
	const ipc = useIpc();
	const [loading, setLoading] = useState(false);
	const [notification, setNotification] = useState("");
	const [template, setTemplate] = useState<EmailTemplate>({
		subject: "",
		message: "",
		cc: "",
		bcc: "",
	});

	useEffect(() => {
		loadTemplate();
	}, []);

	const loadTemplate = async () => {
		try {
			const data = await ipc.getEmailTemplate();
			setTemplate(data);
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		}
	};

	const showNotification = (message: string) => {
		setNotification(message);
		setTimeout(() => setNotification(""), 3000);
	};

	const handleSave = async () => {
		try {
			if (!template.subject || !template.message) {
				showNotification("Lütfen konu ve mesaj alanlarını doldurun");
				return;
			}

			setLoading(true);
			await ipc.saveEmailTemplate(template);
			showNotification("E-posta şablonu kaydedildi!");
		} catch (error) {
			showNotification(`Hata: ${(error as Error).message}`);
		} finally {
			setLoading(false);
		}
	};

	const insertVariable = (variable: string, field: "subject" | "message") => {
		if (field === "subject") {
			setTemplate({
				...template,
				subject: template.subject + `{{${variable}}}`,
			});
		} else {
			setTemplate({
				...template,
				message: template.message + `{{${variable}}}`,
			});
		}
	};

	const variables = [
		"Ad Soyad",
		"Okul No",
		"Anne Adı Soyadı",
		"Anne E-posta",
		"Anne Telefon",
		"Baba Adı Soyadı",
		"Baba E-posta",
		"Baba Telefon",
	];

	return (
		<div className="bg-white rounded-lg shadow p-6 space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold">E-posta Şablonu</h2>
				{notification && (
					<div className="px-4 py-2 rounded bg-blue-100 text-blue-800 text-sm">
						{notification}
					</div>
				)}
			</div>

			<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
				<p className="text-sm text-gray-700">
					<strong>Şablon Değişkenleri:</strong> Aşağıdaki değişkenleri kullanarak
					öğrenci bilgilerini e-posta içeriğine ekleyebilirsiniz. E-posta
					gönderilirken bu değişkenler otomatik olarak değiştirilecektir.
				</p>
			</div>

			<div className="space-y-2">
				<label className="block text-sm font-medium">
					Kullanılabilir Değişkenler
				</label>
				<div className="flex flex-wrap gap-2">
					{variables.map((variable) => (
						<div key={variable} className="inline-flex gap-1">
							<code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
								{`{{${variable}}}`}
							</code>
						</div>
					))}
				</div>
			</div>

			<div className="space-y-4">
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="block text-sm font-medium">Konu</label>
						<div className="flex gap-2">
							{variables.slice(0, 2).map((variable) => (
								<button
									type="button"
									key={variable}
									onClick={() => insertVariable(variable, "subject")}
									className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
								>
									+ {variable}
								</button>
							))}
						</div>
					</div>
					<input
						type="text"
						value={template.subject}
						onChange={(e) =>
							setTemplate({ ...template, subject: e.target.value })
						}
						placeholder="Örnek: {{Okul No}} - {{Ad Soyad}} Sınav Sonucu"
						className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium mb-1">
						CC (Karbon Kopya) - Opsiyonel
					</label>
					<input
						type="text"
						value={template.cc || ""}
						onChange={(e) => setTemplate({ ...template, cc: e.target.value })}
						placeholder="Örnek: mudur@okul.com, mudur.yardimcisi@okul.com"
						className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<p className="text-xs text-gray-500 mt-1">
						Birden fazla e-posta adresi için virgül (,) kullanın. Bu kişiler
						e-postayı görebilir.
					</p>
				</div>

				<div>
					<label className="block text-sm font-medium mb-1">
						BCC (Gizli Kopya) - Opsiyonel
					</label>
					<input
						type="text"
						value={template.bcc || ""}
						onChange={(e) => setTemplate({ ...template, bcc: e.target.value })}
						placeholder="Örnek: yonetim@okul.com"
						className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<p className="text-xs text-gray-500 mt-1">
						Birden fazla e-posta adresi için virgül (,) kullanın. Bu kişiler
						diğer alıcılara görünmez.
					</p>
				</div>

				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="block text-sm font-medium">Mesaj</label>
						<div className="flex flex-wrap gap-2">
							{variables.map((variable) => (
								<button
									type="button"
									key={variable}
									onClick={() => insertVariable(variable, "message")}
									className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
								>
									+ {variable}
								</button>
							))}
						</div>
					</div>
					<textarea
						value={template.message}
						onChange={(e) =>
							setTemplate({ ...template, message: e.target.value })
						}
						placeholder={`Örnek:\n\nSayın {{Anne Adı Soyadı}} ve {{Baba Adı Soyadı}},\n\nÖğrenciniz {{Ad Soyad}} ({{Okul No}}) için sınav sonucu ekte yer almaktadır.\n\nSaygılarımızla.`}
						rows={10}
						className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
					/>
				</div>

				<div className="bg-gray-50 border rounded p-4">
					<h3 className="font-semibold mb-2 text-sm">Önizleme:</h3>
					<div className="space-y-2">
						<div>
							<span className="text-xs font-semibold text-gray-600">Konu:</span>
							<p className="text-sm mt-1 p-2 bg-white rounded border">
								{template.subject || "Konu belirtilmedi"}
							</p>
						</div>
						<div>
							<span className="text-xs font-semibold text-gray-600">Mesaj:</span>
							<p className="text-sm mt-1 p-2 bg-white rounded border whitespace-pre-wrap">
								{template.message || "Mesaj belirtilmedi"}
							</p>
						</div>
					</div>
					<p className="text-xs text-gray-500 mt-2">
						* Değişkenler e-posta gönderilirken gerçek verilerle değiştirilecektir
					</p>
				</div>

				<Button
					onClick={handleSave}
					disabled={loading}
					className="bg-blue-600 hover:bg-blue-700 text-white"
				>
					{loading ? "Kaydediliyor..." : "Şablonu Kaydet"}
				</Button>
			</div>
		</div>
	);
};

