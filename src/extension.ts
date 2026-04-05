import * as vscode from 'vscode';
import axios from 'axios';
import { extractMetrics } from './utils/featureExtractor';

let timeout: NodeJS.Timeout | undefined;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const statusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );

	statusBar.text = 'Code Risk Analyzer Ready';
	statusBar.show();
	context.subscriptions.push(statusBar);

	const command = vscode.commands.registerCommand('code-risk-analyzer.helloWorld', () => {
		vscode.window.showInformationMessage('Code Risk Analyzer is active. Edit a file to see the risk score.');
	});
	context.subscriptions.push(command);

	const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		const code = event.document.getText();
		clearTimeout(timeout);

		timeout = setTimeout(() => {
			void analyzeCode(code, statusBar);
		}, 800);
	});

	context.subscriptions.push(documentChangeListener);
}

async function analyzeCode(code: string, statusBar: vscode.StatusBarItem) {
	try {
		const metrics = extractMetrics(code);
		const res = await axios.post('http://localhost:5000/analyze', metrics);
		const { probability } = res.data;
		let risk = '';

		if (probability > 0.7) {
			risk = '🔴 High';
		} else if (probability > 0.4) {
			risk = '🟠 Medium';
		} else {
			risk = '🟢 Low';
		}

		statusBar.text = `${risk} Risk (${(probability * 100).toFixed(1)}%)`;
	} catch (err) {
		statusBar.text = '⚠️ API Error';
		const mertics=extractMetrics(code);
		statusBar.text=`${mertics.LOC_TOTAL} LOC, ${mertics.CYCLOMATIC_COMPLEXITY} CC`;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
