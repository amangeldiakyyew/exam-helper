import { exec } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Template variable replacement function
function replaceTemplateVariables(
	text: string,
	variables: Record<string, string>,
): string {
	let result = text;
	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
		result = result.replace(regex, value || "");
	}
	return result;
}

export interface OutlookEmailOptions {
	to: string[];
	subject: string;
	body: string;
	attachmentPath: string;
}

/**
 * Opens Outlook with a new email pre-filled with the provided details
 * Uses PowerShell to create and open an Outlook email with attachment
 */
export async function openOutlookEmail(
	options: OutlookEmailOptions,
): Promise<void> {
	const { to, subject, body, attachmentPath } = options;

	const recipients = to.join(";");

	// Escape single quotes for PowerShell here-string
	const escapeForHereString = (str: string) => {
		return str.replace(/'/g, "''");
	};

	// PowerShell script using here-strings to avoid escaping issues
	const psScript = `
try {
    $outlook = New-Object -ComObject Outlook.Application
    $mail = $outlook.CreateItem(0)
    $mail.To = '${escapeForHereString(recipients)}'
    $mail.Subject = '${escapeForHereString(subject)}'
    $mail.Body = @'
${body}
'@
    
    # Add attachment
    $attachment = '${attachmentPath.replace(/'/g, "''")}'
    if (Test-Path $attachment) {
        $mail.Attachments.Add($attachment) | Out-Null
    }
    
    $mail.Display()
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`.trim();

	// Write script to temporary file
	const tempScriptPath = path.join(
		os.tmpdir(),
		`outlook-email-${Date.now()}.ps1`,
	);

	try {
		// Write the PowerShell script to a file
		await fs.writeFile(tempScriptPath, psScript, "utf-8");

		// Execute the PowerShell script file
		await execAsync(
			`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempScriptPath}"`,
			{
				windowsHide: true,
			},
		);

		// Clean up temp file
		await fs.unlink(tempScriptPath).catch(() => {
			/* ignore cleanup errors */
		});
	} catch (error) {
		// Clean up temp file on error
		await fs.unlink(tempScriptPath).catch(() => {
			/* ignore cleanup errors */
		});

		console.error("Failed to open Outlook:", error);
		throw new Error(
			"Could not open Outlook. Make sure Outlook is installed and configured.",
		);
	}
}

/**
 * Helper to prepare email from template and student data
 */
export function prepareEmailFromTemplate(
	template: { subject: string; message: string },
	studentName: string,
	studentInfo: Record<string, string>,
): { subject: string; body: string } {
	const variables: Record<string, string> = {
		"Ad Soyad": studentName,
		"Okul No": studentInfo["Okul No"] || "",
		"Anne Adı Soyadı": studentInfo["Anne Adı Soyadı"] || "",
		"Anne E-posta": studentInfo["Anne E-posta"] || "",
		"Anne Telefon": studentInfo["Anne Telefon"] || "",
		"Baba Adı Soyadı": studentInfo["Baba Adı Soyadı"] || "",
		"Baba E-posta": studentInfo["Baba E-posta"] || "",
		"Baba Telefon": studentInfo["Baba Telefon"] || "",
	};

	return {
		subject: replaceTemplateVariables(template.subject, variables),
		body: replaceTemplateVariables(template.message, variables),
	};
}

