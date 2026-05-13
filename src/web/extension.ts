import * as vscode from 'vscode';

type SectionKind = 'public' | 'protected' | 'private';

export interface SectionLineRange {
	kind: SectionKind;
	startLine: number;
	endLine: number;
}

export interface SectionHeaderRange {
	kind: SectionKind;
	line: number;
	startCharacter: number;
	endCharacter: number;
}

const sectionPattern = /^(\s*)((public|protected|private)\s+section)\s*\./i;
const endClassPattern = /^\s*endclass\s*\./i;

const sectionColours: Record<SectionKind, { border: string; background: string }> = {
	public: {
		border: 'rgba(80, 180, 120, 0.55)',
		background: 'rgba(80, 180, 120, 0.35)'
	},
	protected: {
		border: 'rgba(230, 190, 70, 0.55)',
		background: 'rgba(230, 190, 70, 0.35)'
	},
	private: {
		border: 'rgba(220, 80, 70, 0.60)',
		background: 'rgba(220, 80, 70, 0.38)'
	}
};

const sectionDecorations: Record<SectionKind, vscode.TextEditorDecorationType> = {
	public: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: sectionColours.public.border,
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	}),
	protected: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: sectionColours.protected.border,
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	}),
	private: vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: sectionColours.private.border,
		borderStyle: 'solid',
		borderWidth: '0 0 0 3px'
	})
};

const sectionHeaderDecorations: Record<SectionKind, vscode.TextEditorDecorationType> = {
	public: vscode.window.createTextEditorDecorationType({
		backgroundColor: sectionColours.public.background
	}),
	protected: vscode.window.createTextEditorDecorationType({
		backgroundColor: sectionColours.protected.background
	}),
	private: vscode.window.createTextEditorDecorationType({
		backgroundColor: sectionColours.private.background
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
				kind: sectionMatch[3].toLowerCase() as SectionKind,
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

export function findAbapSectionHeaderRanges(text: string): SectionHeaderRange[] {
	return text.split(/\r?\n/).flatMap((line, lineIndex) => {
		const sectionMatch = sectionPattern.exec(line);

		if (!sectionMatch) {
			return [];
		}

		const startCharacter = 0;
		const endCharacter = line.length;

		return [{
			kind: sectionMatch[3].toLowerCase() as SectionKind,
			line: lineIndex,
			startCharacter,
			endCharacter
		}];
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		...Object.values(sectionDecorations),
		...Object.values(sectionHeaderDecorations)
	);

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
	const headerRangesByKind: Record<SectionKind, vscode.Range[]> = {
		public: [],
		protected: [],
		private: []
	};

	const text = editor.document.getText();

	for (const sectionRange of findAbapSectionLineRanges(text)) {
		const endLine = Math.min(sectionRange.endLine, editor.document.lineCount - 1);
		rangesByKind[sectionRange.kind].push(new vscode.Range(
			sectionRange.startLine,
			0,
			endLine,
			editor.document.lineAt(endLine).range.end.character
		));
	}

	for (const headerRange of findAbapSectionHeaderRanges(text)) {
		headerRangesByKind[headerRange.kind].push(new vscode.Range(
			headerRange.line,
			headerRange.startCharacter,
			headerRange.line,
			headerRange.endCharacter
		));
	}

	for (const kind of Object.keys(sectionDecorations) as SectionKind[]) {
		editor.setDecorations(sectionDecorations[kind], rangesByKind[kind]);
		editor.setDecorations(sectionHeaderDecorations[kind], headerRangesByKind[kind]);
	}
}

function clearDecorations(editor: vscode.TextEditor): void {
	for (const decoration of [
		...Object.values(sectionDecorations),
		...Object.values(sectionHeaderDecorations)
	]) {
		editor.setDecorations(decoration, []);
	}
}

export function deactivate() {}
