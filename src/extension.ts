// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

class IRDefinitionUtil {
    public static findDefitionForParameter(refPattern: string, txt: string, document: vscode.TextDocument, position: vscode.Position) {
        const defitionRegExp = RegExp(refPattern);
        var lastPosition;
        let posibleDefinitionWord = txt.match(defitionRegExp);
        if (posibleDefinitionWord === null) {
            console.log("can not find definition for", posibleDefinitionWord);
            return lastPosition;
        }
        let x = document.positionAt(Number(posibleDefinitionWord.index));
        const txtLine = document.lineAt(x.line).text;
        lastPosition = new vscode.Location(vscode.Uri.file(document.fileName), x);
        return lastPosition;
    }

    public static findDefition(word: string, refPattern: string, txt: string, document: vscode.TextDocument, position: vscode.Position) {
        var lastPosition;
        const regexp = RegExp(word, 'g');
        let posibleDefinitionWordList = [...txt.matchAll(regexp)];
        // refer op doesnot start with `%`
        const referReg = RegExp(refPattern);
        for (var i = 0; i < posibleDefinitionWordList.length; i++) {
            let x = document.positionAt(Number(posibleDefinitionWordList[i].index));
            const txtLine = document.lineAt(x.line).text;
            if (referReg.test(txtLine)) {
                lastPosition = new vscode.Location(vscode.Uri.file(document.fileName), x);
            }
            if (x.line === position.line) {
                return lastPosition;
            }
        }
        if (lastPosition) {
            return lastPosition;
        }
    }
}


class IRDefinitionProvider1 implements vscode.DefinitionProvider {
    constructor() {
        console.log("IRDefinitionProvider1 created");
    }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
        console.log(`provideDefinition called for position: ${position.line}, ${position.character}`);
        // 实现定义查找逻辑
        return null; // 或返回找到的定义位置
    }
}


class IRDefinitionProvider implements vscode.DefinitionProvider {
    constructor() {
        console.log("IRDefinitionProvider created");
    }
    isValidWord(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
        const curText = document.lineAt(position.line).text;
        const word = document.getText(document.getWordRangeAtPosition(position));
        const pattern = `\%${word}\\(\S`;
        console.log("pattern is: ", pattern);
        const referRegex = new RegExp(pattern);
        if (referRegex.test(curText)) {
            return false;
        }
        return true;
    }

    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
        // 获取用户点击的单词
        console.log("start find definition...");
        const word = document.getText(document.getWordRangeAtPosition(position));
        const text = document.getText();
        console.log("Get word: ", word);

        // if word is not valid, skip it
        if (!this.isValidWord(document, position, token)) {
            console.log("cur word is invalid: ", word);
            return;
        }
        // para13
        console.log("cur word is valid: ", word);
        if (/para\d+/.test(word)) {
            console.log("Search params");
            const refPattern = `^\%${word}`;

            const res = IRDefinitionUtil.findDefition(word, refPattern, text, document, position);
            // var res;
            // res = IRDefinitionUtil.findDefitionForParameter(refPattern, text, document, position);
            // if (res === null) {
            //     res = IRDefinitionUtil.findDefition(word, refPattern, text, document, position);
            // }
            return res;
        } else if (/\d+/.test(word)) {
            // console.log("Search operators such as %3 = ");
            // const oriPattern = `%${word} [=:\\(]`;
            // const refPattern = `%${word} [=:]`;
            // const res = IRDefinitionUtil.findDefition(oriPattern, refPattern, text, document, position);
            // if (res) {
            //     return res;
            // }
            console.log("Search operators");
            const opPattern = `%${word}[\\(\\),]`;
            const opRefPattern = `\%${word}\\(`;
            const opRes = IRDefinitionUtil.findDefition(opPattern, opRefPattern, text, document, position);
            if (opRes) {
                return opRes;
            }
            // console.log("Return the searched results：", res2);
        }
    }
}

class IRReferenceProvider implements vscode.ReferenceProvider {
    constructor() {
        console.log("IRReferenceProvider created");
    }

    public provideReferences(
        document: vscode.TextDocument,
        position: vscode.Position,
        options: { includeDeclaration: boolean },
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Location[]> {
        var list = [];
        console.log("Reference running:", position, token);
        const word =  document.getText(document.getWordRangeAtPosition(position));
        const txt =  document.getText();
        console.log("Get word", word);
        var regexp;
        if (/para\d+/.test(word)) {
          regexp = RegExp(`${word}`,'g');
        } else if (/\d+/.test(word)) {
          regexp = RegExp(`%${word}\\D`,'g');
        } else if (/\%\d+/.test(word)) {
          regexp = RegExp(`%${word}\\D`,'g');
        } else {
          regexp = RegExp(`${word}\\(`, 'g');
        }
        if (regexp) {
          let searced = [...txt.matchAll(regexp)];
          for (var i = 0; i < searced.length; i++ ){
            let x = document.positionAt(Number(searced[i].index));
            if (x.line !== position.line) {
              console.log(`Matchine at ${x}`);
              list.push(new vscode.Location(vscode.Uri.file(document.fileName), x));
            }
          }
        }
        return list;

    }

}

export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ir-resolver" is now active!');
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(["ir"], new IRDefinitionProvider()));

    context.subscriptions.push(
        vscode.languages.registerReferenceProvider(["ir"], new IRReferenceProvider())
    );
    
    
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('ir-resolver.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from ir-resolver!');
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
