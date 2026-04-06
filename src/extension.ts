import * as vscode from 'vscode';
import axios from 'axios';
import { extractMetrics } from './utils/featureExtractor';

let timeout: NodeJS.Timeout | undefined;
let provider: AnalyzerViewProvider | undefined;
let panel: vscode.WebviewPanel | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Code Risk Analyzer activation started');

	const statusBar = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBar.text = 'Code Risk Analyzer Ready';
	statusBar.show();
	context.subscriptions.push(statusBar);

	// Command to open analyzer panel
	const openPanelCommand = vscode.commands.registerCommand('code-risk-analyzer.openPanel', () => {
		if (!panel) {
			panel = vscode.window.createWebviewPanel(
				'codeRiskAnalyzer',
				'Code Risk Analyzer',
				vscode.ViewColumn.Beside,
				{ enableScripts: true }
			);
			
			provider = new AnalyzerViewProvider(context);
			const webview = panel.webview;
			webview.html = provider.getHtml(webview);
			
			panel.onDidDispose(() => {
				panel = undefined;
			});
			
			// Send dummy data
			setTimeout(() => {
				webview.postMessage({
					score: 75,
					complexity: 8,
					issues: 1,
					maintainability: 78,
					technicalDebt: 15.5,
					complexityLevel: 1
				});
			}, 500);
		} else {
			panel.reveal();
		}
	});
	context.subscriptions.push(openPanelCommand);

	// Also register the original command
	const helloCommand = vscode.commands.registerCommand('code-risk-analyzer.helloWorld', () => {
		vscode.window.showInformationMessage('Code Risk Analyzer is active. Edit a file to see the risk score.');
		vscode.commands.executeCommand('code-risk-analyzer.openPanel');
	});
	context.subscriptions.push(helloCommand);

	const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		const code = event.document.getText();
		clearTimeout(timeout);

		timeout = setTimeout(() => {
			void analyzeCode(code, statusBar);
		}, 800);
	});

	context.subscriptions.push(documentChangeListener);
	
	console.log('Code Risk Analyzer activation completed');
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
		
		// Send data to webview
		if (panel && panel.webview) {
			panel.webview.postMessage({
				score: Math.round(probability * 100),
				complexity: metrics.CYCLOMATIC_COMPLEXITY,
				issues: metrics.code_smell_risk,
				maintainability: Math.round(metrics.maintainability_score),
				technicalDebt: Math.round(metrics.technical_debt * 100) / 100,
				complexityLevel: metrics.complexity_level
			});
		}
	} catch (err) {
		statusBar.text = '⚠️ API Error';
		const metrics = extractMetrics(code);
		statusBar.text = `${metrics.LOC_TOTAL} LOC, ${metrics.CYCLOMATIC_COMPLEXITY} CC`;
		
		// Send metrics data to webview on error
		if (panel && panel.webview) {
			panel.webview.postMessage({
				score: Math.round((metrics.maintainability_score / 171) * 100),
				complexity: metrics.CYCLOMATIC_COMPLEXITY,
				issues: metrics.code_smell_risk,
				maintainability: Math.round(metrics.maintainability_score),
				technicalDebt: Math.round(metrics.technical_debt * 100) / 100,
				complexityLevel: metrics.complexity_level
			});
		}
	}
}

class AnalyzerViewProvider implements vscode.WebviewViewProvider {
	private webviewView?: vscode.WebviewView;

	constructor(private context: vscode.ExtensionContext){}

	updateData(data: { 
		score: number; 
		complexity: number; 
		issues: number;
		maintainability?: number;
		technicalDebt?: number;
		complexityLevel?: number;
	}) {
		if (this.webviewView) {
			this.webviewView.webview.postMessage(data);
		}
	}

	getHtml(webview: vscode.Webview) {
		return `
		<!DOCTYPE html>
		<html lang="en">
		${this.getStyles()}
		${this.getBody()}
		</html>
		`;
	}

	private getBody() {
		return `
  <body>

    <div class="header">
      <div class="header-title">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
        Code Quality Analysis
      </div>
      <div class="header-subtitle">Real-time code metrics & insights</div>
    </div>

    <div class="metrics-grid">
      <!-- Maintainability Score -->
      <div class="metric-card primary">
        <div class="metric-header">
          <div class="metric-label">Maintainability Score</div>
          <div class="metric-help" title="How easy is your code to maintain and understand? Higher is better (0-171).">?</div>
        </div>
        <div class="metric-value" id="score">--</div>
        <div class="metric-description">Measures code readability and maintainability</div>
        <div class="progress-bar">
          <div class="progress-fill" id="bar" style="width: 0%"></div>
        </div>
      </div>

      <!-- Complexity Level -->
      <div class="metric-card">
        <div class="metric-header">
          <div class="metric-label">Complexity Level</div>
          <div class="metric-help" title="0=Low, 1=Medium, 2=High. Simple code is easier to maintain.">?</div>
        </div>
        <div class="metric-value-text" id="complexityLevel">--</div>
        <div class="metric-description">Code branching complexity assessment</div>
        <div class="badge" id="complexityLevelBadge">Info</div>
      </div>

      <!-- Cyclomatic Complexity -->
      <div class="metric-card">
        <div class="metric-header">
          <div class="metric-label">Cyclomatic Complexity</div>
          <div class="metric-help" title="Number of independent code paths. Lower is better. Keep below 10.">?</div>
        </div>
        <div class="metric-value" id="complexity">--</div>
        <div class="metric-description">Counts decision points (if/for/while/switch)</div>
        <div class="badge" id="complexityBadge">Info</div>
      </div>

      <!-- Code Smell Risk -->
      <div class="metric-card">
        <div class="metric-header">
          <div class="metric-label">Code Smell Risk</div>
          <div class="metric-help" title="Detects potential bugs based on complexity and size. 0=Safe, 2=Warning.">?</div>
        </div>
        <div class="metric-value-text" id="issues">--</div>
        <div class="metric-description">Indicates potential design issues</div>
        <div class="badge" id="issueBadge">Info</div>
      </div>

      <!-- Technical Debt -->
      <div class="metric-card">
        <div class="metric-header">
          <div class="metric-label">Technical Debt</div>
          <div class="metric-help" title="Effort required to refactor. Lower is better. Reset after refactoring.">?</div>
        </div>
        <div class="metric-value" id="technicalDebt">--</div>
        <div class="metric-description">Estimated refactoring effort score</div>
      </div>

      <!-- Maintainability Index -->
      <div class="metric-card">
        <div class="metric-header">
          <div class="metric-label">Code Health</div>
          <div class="metric-help" title="Overall code quality score from 0-100. Higher indicates better health.">?</div>
        </div>
        <div class="metric-value" id="maintainability">--</div>
        <div class="metric-description">Overall health score from all metrics</div>
        <div class="badge" id="maintainabilityBadge">Health</div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-title">Legend</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color" style="background: #6a9955;"></span>
          <span>Good / Low Risk</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #d4923f;"></span>
          <span>Medium Risk</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #c02d2d;"></span>
          <span>High Risk</span>
        </div>
      </div>
    </div>

    <script>
      window.addEventListener('message', event => {
        const data = event.data;

        const score = data.score || 0;
        const complexity = data.complexity || 0;
        const issues = data.issues || 0;
        const maintainability = data.maintainability || 0;
        const technicalDebt = data.technicalDebt || 0;
        const complexityLevel = data.complexityLevel !== undefined ? data.complexityLevel : 0;

        document.getElementById('score').innerText = score + '%';
        document.getElementById('complexity').innerText = complexity;
        document.getElementById('complexityLevel').innerText = ['Low', 'Medium', 'High'][complexityLevel];
        document.getElementById('issues').innerText = ['Safe', 'Warning', 'Critical'][issues];
        document.getElementById('maintainability').innerText = Math.min(100, Math.max(0, maintainability));
        document.getElementById('technicalDebt').innerText = technicalDebt.toFixed(2);

        document.getElementById('bar').style.width = Math.min(score, 100) + '%';
        
        // Update complexity badge
        const complexityBadge = document.getElementById('complexityBadge');
        if (complexity > 10) {
          complexityBadge.innerText = 'High';
          complexityBadge.style.background = '#c02d2d';
        } else if (complexity > 5) {
          complexityBadge.innerText = 'Medium';
          complexityBadge.style.background = '#d4923f';
        } else {
          complexityBadge.innerText = 'Low';
          complexityBadge.style.background = '#6a9955';
        }

        // Update complexity level badge
        const complexityLevelBadge = document.getElementById('complexityLevelBadge');
        complexityLevelBadge.innerText = ['Low', 'Medium', 'High'][complexityLevel];
        if (complexityLevel === 0) {
          complexityLevelBadge.style.background = '#6a9955';
        } else if (complexityLevel === 1) {
          complexityLevelBadge.style.background = '#d4923f';
        } else {
          complexityLevelBadge.style.background = '#c02d2d';
        }

        // Update smell risk badge
        const badge = document.getElementById('issueBadge');
        badge.innerText = ['Safe', 'Warning', 'Critical'][issues];
        if (issues === 0) {
          badge.style.background = '#6a9955';
        } else if (issues === 1) {
          badge.style.background = '#d4923f';
        } else {
          badge.style.background = '#c02d2d';
        }

        // Update maintainability badge
        const maintainabilityBadge = document.getElementById('maintainabilityBadge');
        if (maintainability > 85) {
          maintainabilityBadge.innerText = 'Excellent';
          maintainabilityBadge.style.background = '#6a9955';
        } else if (maintainability > 70) {
          maintainabilityBadge.innerText = 'Good';
          maintainabilityBadge.style.background = '#569cd6';
        } else if (maintainability > 50) {
          maintainabilityBadge.innerText = 'Fair';
          maintainabilityBadge.style.background = '#d4923f';
        } else {
          maintainabilityBadge.innerText = 'Poor';
          maintainabilityBadge.style.background = '#c02d2d';
        }
      });
    </script>

		</body>
		`;
	}

	private getStyles() {
		return `
		<head>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
      max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        padding: 16px;
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
      }

      .header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--vscode-editorWidget-border);
      }

      .header-title {
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .header-icon {
        width: 20px;
        height: 20px;
        opacity: 0.8;
      }

      .header-subtitle {
        font-size: 12px;
        opacity: 0.6;
      }

      .metrics-grid {
      max-width: 400px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .metric-card {
      max-width: 300px;
        background: var(--vscode-editorWidget-background);
        border: 1px solid var(--vscode-editorWidget-border);
        border-radius: 6px;
        padding: 12px;
        transition: all 0.2s ease;
      }

      .metric-card:hover {
        border-color: var(--vscode-editorHoverWidget-border);
        background: var(--vscode-editorHoverWidget-background);
      }

      .metric-card.primary {
        border-color: var(--vscode-editorInfo-foreground);
        background: rgba(86, 156, 214, 0.08);
      }

      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .metric-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
      }

      .metric-help {
        cursor: help;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--vscode-editorInfo-foreground);
        color: var(--vscode-editor-background);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .metric-help:hover {
        opacity: 1;
      }

      .metric-value {
        font-size: 28px;
        font-weight: 700;
        margin: 8px 0;
        background: linear-gradient(135deg, var(--vscode-editorInfo-foreground), var(--vscode-textLink-foreground));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .metric-value-text {
        font-size: 20px;
        font-weight: 600;
        margin: 8px 0;
      }

      .metric-description {
        font-size: 11px;
        opacity: 0.5;
        margin: 4px 0;
      }

      .progress-bar {
        height: 6px;
        margin-top: 8px;
        background: var(--vscode-editor-background);
        border-radius: 3px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6a9955, #569cd6);
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-top: 8px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        transition: all 0.2s ease;
      }

      .legend {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--vscode-editorWidget-border);
      }

      .legend-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        opacity: 0.6;
        margin-bottom: 8px;
      }

      .legend-items {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
      }

      .legend-color {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }

      /* Responsive */
      @media (max-width: 600px) {
        .metrics-grid {
          grid-template-columns: 1fr;
        }
        
        .legend-items {
          grid-template-columns: 1fr;
        }
      }
    </style>
		</head>
		`;
	}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		this.webviewView = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: []
		};
		webviewView.webview.html = this.getHtml(webviewView.webview);
		
		console.log('Webview resolved, sending dummy data');
		
		// Send dummy data for testing
		setTimeout(() => {
			this.updateData({
				score: 75,
				complexity: 8,
				issues: 1,
				maintainability: 78,
				technicalDebt: 15.5,
				complexityLevel: 1
			});
		}, 500);
	}
}





// This method is called when your extension is deactivated
export function deactivate() {}
