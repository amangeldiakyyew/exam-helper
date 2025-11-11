import { EmailTemplatePage } from "@/components/EmailTemplatePage";
import { Layout } from "@/components/Layout";
import { PdfParsing } from "@/components/PdfParsing";
import { Settings } from "@/components/Settings";
import { useState } from "react";

export default function App() {
	const [currentPage, setCurrentPage] = useState<
		"settings" | "pdf-parsing" | "email-template"
	>("pdf-parsing");

	return (
		<Layout currentPage={currentPage} onNavigate={setCurrentPage}>
			{currentPage === "settings" ? (
				<Settings />
			) : currentPage === "email-template" ? (
				<EmailTemplatePage />
			) : (
				<PdfParsing />
			)}
		</Layout>
	);
}
