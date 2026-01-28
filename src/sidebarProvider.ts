/**
 * Sidebar TreeView Provider for Test Generator
 */

import * as vscode from 'vscode';

export class TestGeneratorViewProvider implements vscode.TreeDataProvider<TestGeneratorItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TestGeneratorItem | undefined | null | void> = new vscode.EventEmitter<TestGeneratorItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TestGeneratorItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TestGeneratorItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TestGeneratorItem): Thenable<TestGeneratorItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.getMainItems());
        }
    }

    private getMainItems(): TestGeneratorItem[] {
        return [
            new TestGeneratorItem(
                '🚀 Generate Test Cases',
                'Generate comprehensive test cases for the active file',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testcase-generator.generate',
                    title: 'Generate Tests',
                    arguments: []
                }
            ),
            new TestGeneratorItem(
                '📝 Generate from Selection',
                'Generate tests for selected code',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testcase-generator.generateFromSelection',
                    title: 'Generate from Selection',
                    arguments: []
                }
            ),
            new TestGeneratorItem(
                '🔑 Configure API Key',
                'Set up your AI provider API key',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testcase-generator.configure',
                    title: 'Configure',
                    arguments: []
                }
            ),
            new TestGeneratorItem(
                '⚙️ Settings',
                'Open Test Generator settings',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'workbench.action.openSettings',
                    title: 'Settings',
                    arguments: ['@ext:aniketsharma04.testcase-generator']
                }
            ),
            new TestGeneratorItem(
                '📖 Documentation',
                'View extension documentation',
                vscode.TreeItemCollapsibleState.None,
                {
                    command: 'testcase-generator.openDocs',
                    title: 'Documentation',
                    arguments: []
                }
            )
        ];
    }
}

class TestGeneratorItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.contextValue = 'testGeneratorItem';
    }
}

/**
 * Create and register the sidebar view
 */
export function registerSidebarView(context: vscode.ExtensionContext) {
    const treeDataProvider = new TestGeneratorViewProvider(context);
    
    const treeView = vscode.window.createTreeView('testGeneratorView', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: false
    });

    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand('testcase-generator.refreshView', () => {
        treeDataProvider.refresh();
    });

    // Register documentation command
    const docsCommand = vscode.commands.registerCommand('testcase-generator.openDocs', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/aniketsharma04/VScode_TestCasesGeneratorExtension#readme'));
    });

    // Show welcome message with button to open sidebar
    const showWelcome = vscode.commands.registerCommand('testcase-generator.showWelcome', () => {
        vscode.window.showInformationMessage(
            'Welcome to AI Test Generator! Open the Test Generator panel to get started.',
            'Open Panel'
        ).then(selection => {
            if (selection === 'Open Panel') {
                vscode.commands.executeCommand('testGeneratorView.focus');
            }
        });
    });

    context.subscriptions.push(treeView, refreshCommand, docsCommand, showWelcome);
    
    return treeDataProvider;
}
