import { EmailTemplateEditor } from "./EmailTemplate";

export const EmailTemplatePage = () => {
	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold text-gray-800">
				📧 E-posta Şablonu Ayarları
			</h1>

			<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
				<p className="text-sm text-gray-700">
					<strong>Kullanım:</strong> E-posta şablonunu yapılandırın. Outlook ile
					e-posta gönderirken bu şablon kullanılacaktır. Değişkenler otomatik
					olarak öğrenci bilgileriyle değiştirilecektir.
				</p>
			</div>

			<EmailTemplateEditor />
		</div>
	);
};

