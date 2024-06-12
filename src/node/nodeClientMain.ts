import { access, readFile } from "fs/promises";
import * as vscode from "vscode";
import {
    Executable,
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from "vscode-languageclient/node";
import * as common from "../common/common";
import { dirname, join } from "path";

export async function activate(context: vscode.ExtensionContext) {
    showStartupMessage();

    await common.activate(context, createLanguageClient);

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("nemo.languageServerExecutablePath")) {
            vscode.commands.executeCommand("nemo.restartLanguageServer");
        }
    });
}

export async function showStartupMessage() {
    if (
        vscode.workspace
            .getConfiguration()
            .get<boolean>("nemo.hideStartupMessage") === true
    ) {
        return;
    }

    let showMessage = false;

    try {
        const product: any = JSON.parse(
            (
                await readFile(
                    join(
                        dirname(process.execPath),
                        "resources",
                        "app",
                        "product.json"
                    )
                )
            ).toString()
        );

        if (
            product.nameLong.includes("Visual Studio Code") ||
            product.extensionsGallery.serviceUrl.startsWith(
                "https://marketplace.visualstudio.com"
            )
        ) {
            showMessage = true;
        }
    } catch {
        if (process.execPath.endsWith("code")) {
            showMessage = true;
        }
    }

    if (!showMessage) {
        return;
    }

    const items = [
        "Alternatives: VSCodium",
        "Microsoft hurting the open source editor community (1)",
        "Microsoft hurting the open source editor community (2)",
        "Microsoft hurting the open source editor community (3)",
    ];
    const result = await vscode.window.showWarningMessage(
        "Consider switching to an open-source variant of VS Code, please!",
        {
            modal: true,
            detail: "It seems that you are using a proproietary variant of VS Code. Please switch to an open source variant and let us regain control over the software we use. This message can be disabled in the settings.",
        },
        ...items
    );

    switch (items.indexOf(result!)) {
        case 0:
            vscode.env.openExternal(vscode.Uri.parse("https://vscodium.com/"));
            break;
        case 1:
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://github.com/microsoft/vscode/issues/31168"
                )
            );
            break;
        case 2:
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://github.com/microsoft/vscode-cpptools/issues/6388"
                )
            );
            break;
        case 3:
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://www.eclipse.org/community/eclipse_newsletter/2020/march/1.php"
                )
            );
            break;
        default:
            break;
    }
}

export function deactivate() {
    common.deactivate();
}

async function getLanguageServerExecutablePath(
    context: vscode.ExtensionContext
): Promise<string | undefined> {
    let executablePath = vscode.workspace
        .getConfiguration()
        .get<string>("nemo.languageServerExecutablePath");

    if (typeof executablePath !== "string" || executablePath === "") {
        const chosenOption = await vscode.window.showInformationMessage(
            "Nemo language server could not be found",
            "Setup path to executable"
        );

        if (chosenOption === "Setup path to executable") {
            await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "nemo.languageServerExecutablePath"
            );
        }
        return undefined;
    }

    try {
        await access(executablePath);
        return executablePath;
    } catch (error: any) {
        vscode.window.showErrorMessage(
            "Error while starting Nemo language server: Executable could not be accessed!",
            {
                detail:
                    `Error while accessing file at path ${executablePath}:\n` +
                    error.toString(),
            }
        );
        return undefined;
    }
}

async function createLanguageClient(
    context: vscode.ExtensionContext
): Promise<LanguageClient | undefined> {
    const command = await getLanguageServerExecutablePath(context);

    if (command === undefined) {
        return undefined;
    }

    const executable: Executable = {
        command,
    };

    const serverOptions: ServerOptions = {
        run: executable,
        debug: executable,
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "nemo" }],
        outputChannel: common.outputChannel,
        traceOutputChannel: common.traceOutputChannel,
    };

    return new LanguageClient(
        "nemo",
        "Nemo Language Client",
        serverOptions,
        clientOptions
    );
}
