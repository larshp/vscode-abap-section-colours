import * as vscode from 'vscode';

type SectionKind = 'public' | 'protected' | 'private';

export interface SectionLineRange {
	kind: SectionKind;
	startLine: number;
	endLine: number;
}

const sectionPattern = /^\s*(public|protected|private)\s+section\s*\./i;
const endClassPattern = /^\s*endclass\s*\./i;

const sectionDecorations: Record<SectionKind, vscode.TextEditorDecorationType> = {
	public: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: 'rgba(80, 180, 120, 0.55)',
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	}),
	protected: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: 'rgba(230, 190, 70, 0.55)',
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	}),
	private: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: 'rgba(220, 120, 90, 0.55)',
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	})
};

export function findAbapSectionLineRanges(text: string): SectionLineRange[] {
	const lines = text.split(/\r?\n/);
	const ranges: SectionLineRange[] = [];
	let current: SectionLineRange | undefined;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const sectionMatch = sectionPattern.exec(line);

		if (sectionMatch) {
			if (current) {
				current.endLine = lineIndex - 1;
				ranges.push(current);
			}

			current = {
				kind: sectionMatch[1].toLowerCase() as SectionKind,
				startLine: lineIndex,
				endLine: lineIndex
			};
			continue;
		}

		if (current && endClassPattern.test(line)) {
			current.endLine = lineIndex - 1;
			ranges.push(current);
			current = undefined;
		}
	}

	if (current) {
		current.endLine = lines.length - 1;
		ranges.push(current);
	}

	return ranges.filter(range => range.endLine >= range.startLine);
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(...Object.values(sectionDecorations));

	let updateTimer: ReturnType<typeof setTimeout> | undefined;

	const queueUpdate = () => {
		if (updateTimer) {
			clearTimeout(updateTimer);
		}

		updateTimer = setTimeout(() => {
			updateVisibleEditors();
		}, 100);
	};

	const updateVisibleEditors = () => {
		for (const editor of vscode.window.visibleTextEditors) {
			updateEditorDecorations(editor);
		}
	};

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(updateVisibleEditors),
		vscode.window.onDidChangeActiveTextEditor(queueUpdate),
		vscode.workspace.onDidChangeTextDocument(event => {
			if (vscode.window.visibleTextEditors.some(editor => editor.document === event.document)) {
				queueUpdate();
			}
		})
	);

	updateVisibleEditors();
}

function updateEditorDecorations(editor: vscode.TextEditor): void {
	if (editor.document.languageId !== 'abap') {
		clearDecorations(editor);
		return;
	}

	const rangesByKind: Record<SectionKind, vscode.Range[]> = {
		public: [],
		protected: [],
		private: []
	};

	for (const sectionRange of findAbapSectionLineRanges(editor.document.getText())) {
		const endLine = Math.min(sectionRange.endLine, editor.document.lineCount - 1);
		rangesByKind[sectionRange.kind].push(new vscode.Range(
			sectionRange.startLine,
			0,
			endLine,
			editor.document.lineAt(endLine).range.end.character
		));
	}

	for (const kind of Object.keys(sectionDecorations) as SectionKind[]) {
		editor.setDecorations(sectionDecorations[kind], rangesByKind[kind]);
	}
}

function clearDecorations(editor: vscode.TextEditor): void {
	for (const decoration of Object.values(sectionDecorations)) {
		editor.setDecorations(decoration, []);
	}
}

export function deactivate() {}
