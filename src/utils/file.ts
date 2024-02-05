import fs from 'fs';
import { Comment } from './comment';

class ConstructIdentifier {
    public getExportsConstructName(line: string): string | null {
        const exportsRegex = /^exports\.(\w+)\s*=\s*function\s*\(.*\)|exports.(\w+)\s*=\s*\([\s\S]*?\)\s*=>|exports.(\w+)\s*=\s*async\s*\([\s\S]*?\)\s*=>/;

        const match = line.match(exportsRegex);

        return match ? match.slice(1).find(group => group !== undefined && group !== null) || null : null;
    }

    public getFunctionConstructName(line: string): string | null {
        const functionRegex = /(async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*async\s*\(.*\)\s*=>|\(([\s\S]*?)\)\s*=>|(\w+)\s*=\s*function\s*\(([\s\S]*?)\)|(\w+)\s*=\s*\(([\s\S]*?)\)\s*=>|\w+\s*=\s*async\s*\(([\s\S]*?)\)\s*=>|\w+\s*=\s*function\s*[\s\S]*?\((([\s\S]*?))\)|\w+\s*=\s*\(([\s\S]*?)\)\s*=>/;

        const match = line.match(functionRegex);

        if (match) {
            const functionName = match.slice(2).find(group => group !== undefined && group !== null) || null;

            const exportRegex = /exports\.(\w+)\s*=\s*function\s*\(.*\)|exports.(\w+)\s*=\s*\([\s\S]*?\)\s*=>|exports.(\w+)\s*=\s*async\s*\([\s\S]*?\)\s*=>/;
            const exportMatch = line.match(exportRegex);
            if (exportMatch) {
                return exportMatch.slice(1).find(group => group !== undefined && group !== null) || null;
            }

            const arrowFunctionRegex = /\(([\s\S]*?)\)\s*=>/;
            const arrowFunctionMatch = line.match(arrowFunctionRegex);
            return arrowFunctionMatch ? arrowFunctionMatch[1] || null : functionName || null;
        }

        return null;
    }

    public getVariableConstructName(line: string): string | null {
        const variableRegex = /\b(const|let|var)\s+(\w+)/;

        const match = line.match(variableRegex);

        return match ? match[2] || null : null;
    }

    public getClassConstructName(line: string): string | null {
        const classRegex = /\bclass\s+(\w+)/;

        const match = line.match(classRegex);

        return match ? match[1] || null : null;
    }
}

export default class File {
    public fileContent: string;
    private constructIdentifier: ConstructIdentifier;

    constructor(filePath: string) {
        this.fileContent = fs.readFileSync(filePath, 'utf8');
        this.constructIdentifier = new ConstructIdentifier();
    }

    public getLinkedCodeConstructInfo(comment: Comment) {
        const { startLocation, endLocation } = comment;

        if (startLocation && endLocation) {
            const { line: startLine, column: startColumn } = startLocation;
            const { line: endLine, column: endColumn } = endLocation;

            if (typeof startLine === 'number' && typeof endLine === 'number') {
                const lines = this.fileContent.split('\n');
                const lastLineIndex = endLine - 1;

                if (lastLineIndex < lines.length - 1) {
                    const lastLine = lines[lastLineIndex].trim();
                    const nextLines = lines.slice(lastLineIndex + 1, lastLineIndex + 6).map(line => line.trim());

                    const type = this.getConstructType(nextLines.join(''));
                    const name = this.getConstructName(nextLines.join(''));

                    return { type, name, nextLines };
                } else {
                    return { type: 'other', name: 'other' };
                }
            }
        }

        return { type: null, name: null };
    }

    private getConstructName(text: string) {
        const type = this.getConstructType(text);

        switch (type) {
            case 'function':
                return this.constructIdentifier.getFunctionConstructName(text);
            case 'variable':
                return this.constructIdentifier.getVariableConstructName(text);
            case 'class':
                return this.constructIdentifier.getClassConstructName(text);
            case 'module':
                return this.constructIdentifier.getExportsConstructName(text);
            default:
                return null;
        }
    }

    private getConstructType(text: string) {
        // Check if the remaining code contains a function declaration
        const functionRegex = /(\basync\s+)?\bfunction\b|^exports\.\w+\s*=\s*async\s*\(.*\)\s*=>|\bconst\b\s*\w+\s*=\s*async\s*\(.*\)\s*=>|\b\w+\s*=\s*function\s*\(|\b\w+\s*=\s*\([\s\S]*?\)\s*=>|\b\w+\s*=\s*async\s*\([\s\S]*?\)\s*=>|\b\w+\s*=\s*function\s*[\s\S]*?\(|\b\w+\s*=\s*\([\s\S]*?\)\s*=>/;
        const functionMatch = functionRegex.test(text);
        if (functionMatch) {
            return 'function';
        }

        const moduleRegex = /@module\s+(.*)/g;
        const moduleMatch = moduleRegex.exec(text);
        if (moduleMatch) {
            return 'module';
        }

        // Check if the remaining code contains a variable declaration
        const variableRegex = /\b(const\b|\blet\b|\bvar\b)\s+(\w+)/;
        const variableMatch = variableRegex.test(text);

        if (variableMatch) {
            return 'variable';
        }

        // Check if the remaining code contains a class declaration
        const classRegex = /\bclass\s+(\w+)/;
        const classMatch = classRegex.test(text);

        if (classMatch) {
            return 'class';
        }

        return 'other';
    }
}
