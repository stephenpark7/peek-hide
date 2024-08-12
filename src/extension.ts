import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext) => {
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.hideFiles', hide),
		vscode.commands.registerCommand('extension.showFiles', show),
		vscode.commands.registerCommand('extension.toggleFiles', toggle),
		vscode.commands.registerCommand('extension.addFile', add),
	);
};

export const deactivate = () => { };

const hide = () => updateConfiguration(true);
const show = () => updateConfiguration(false);
const toggle = () => updateConfiguration();

const add = (e: any) => {
	if (e === undefined) { throw new Error('No file selected'); }
	if (e.scheme !== 'file') { return; }

	const filePath = e.fsPath;
	const relativeFilePath = getRelativeFilePath(filePath);
	const generalSettings = getGeneralSettings();
	const excludedFiles = generalSettings[0].excludes;

	if (isFileExcluded(excludedFiles, relativeFilePath)) { return; }

	const settings: { uri?: vscode.Uri, excludes: any, target: vscode.ConfigurationTarget }[] = [...generalSettings];
	addFileToConfig(settings[0].uri, configKey, { ...excludedFiles, [relativeFilePath]: true }, settings[0].target);
};

const getRelativeFilePath = (filePath: string) => {
	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	return filePath.replace(rootPath || '', '').replace(/^\//, '');
};

const isFileExcluded = (excludedFiles: any, relativeFilePath: string) => {
	return Object.keys(excludedFiles).includes(relativeFilePath);
};

const addFileToConfig = (uri: vscode.Uri | undefined, key: string, value: any, target: vscode.ConfigurationTarget) => {
	vscode.workspace.getConfiguration(undefined, uri).update(key, value, target);
};

const configKey = 'files.exclude';

const updateConfiguration = (value?: boolean) => {
	const settings: { uri?: vscode.Uri, excludes: any, target: vscode.ConfigurationTarget }[] = [...getGeneralSettings(), ...getFoldersSettings()];

	if (value === undefined) {
		value = !getCurrentState(settings);
	}

	settings.forEach(setting => {
		vscode.workspace.getConfiguration(undefined, setting.uri)
			.update(configKey, setState(setting.excludes, value), setting.target);
	});
};

const getGeneralSettings = () => {
	const config = vscode.workspace.getConfiguration().inspect(configKey);
	const settings = [];

	if (config?.globalValue) {
		settings.push({
			excludes: config.globalValue,
			target: vscode.ConfigurationTarget.Global
		});
	}

	if (config?.workspaceValue) {
		settings.push({
			excludes: config.workspaceValue,
			target: vscode.ConfigurationTarget.Workspace
		});
	}

	return settings;
};

const getFoldersSettings = () => {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders) { return []; }

	return folders.map(folder => {
		const config = vscode.workspace.getConfiguration(undefined, folder.uri).inspect(configKey);
		if (!config?.workspaceFolderValue) { return null; }

		return {
			uri: folder.uri,
			excludes: config.workspaceFolderValue,
			target: vscode.ConfigurationTarget.WorkspaceFolder
		};
	}).filter(setting => setting !== null);
};

const getCurrentState = (settings: { uri?: vscode.Uri, excludes: any, target: vscode.ConfigurationTarget }[]) => {
	return settings.some(s => Object.values(s.excludes).some(v => v === true));
};

const setState = (excludes: any, value: boolean) => {
	Object.keys(excludes).forEach(key => {
		if (typeof excludes[key] === 'boolean') {
			excludes[key] = value;
		}
	});
	return excludes;
};
