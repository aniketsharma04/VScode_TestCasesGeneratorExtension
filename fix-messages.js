const fs = require('fs');

const filePath = 'src/webviewProvider.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove any remaining show(true) calls
content = content.replace(/        outputChannel\.show\(true\);\n/g, '');

// Update messages to reference Terminal instead of Output panel
content = content.replace(
    `vscode.window.showInformationMessage('✅ Tests completed! Check Output panel for results.');`,
    `vscode.window.showInformationMessage('✅ Tests completed! See Terminal for results.');`
);

content = content.replace(
    `vscode.window.showErrorMessage('❌ Tests failed. Check Output panel for details.');`,
    `vscode.window.showErrorMessage('❌ Tests failed. See Terminal for details.');`
);

fs.writeFileSync(filePath, content);
console.log('✅ Removed output panel show() and updated messages to reference Terminal');
