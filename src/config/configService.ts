import * as vscode from 'vscode';
import { TagGroupConfig } from '../models/dto';
import { IConfigService } from '../models/interfaces';

interface TagGroupDefinition {
	name: string;
	tags: string[];
	defaultColor: string;
}

const TAG_GROUP_DEFINITIONS: TagGroupDefinition[] = [
	{ name: 'critical', tags: ['ERROR', 'ERR', 'FIX', 'FIXME'], defaultColor: '#FF2A3D' },
	{ name: 'warning', tags: ['WARNING', 'WARN'], defaultColor: '#FFAA33' },
	{ name: 'ideas', tags: ['TODO', 'IDEA', 'OPTIMIZE'], defaultColor: '#1AA9F5' },
	{ name: 'info', tags: ['NOTE', 'INFO'], defaultColor: '#6FEA2D' },
];

interface CustomTagGroupConfig {
	name?: unknown;
	tags?: unknown;
	color?: unknown;
	backgroundColor?: unknown;
	fontWeight?: unknown;
}

const DEFAULT_FONT_WEIGHT = 'normal';
const DEFAULT_CUSTOM_COLOR = '#FFFFFF';

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const normalizeTags = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
		.filter(isNonEmptyString);
};

const normalizeCustomGroups = (value: unknown): TagGroupConfig[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const result: TagGroupConfig[] = [];

	for (const rawGroup of value) {
		if (!rawGroup || typeof rawGroup !== 'object') {
			continue;
		}

		const group = rawGroup as CustomTagGroupConfig;
		const name = isNonEmptyString(group.name) ? group.name.trim() : '';
		const tags = normalizeTags(group.tags);

		if (!name || tags.length === 0) {
			continue;
		}

		const color = isNonEmptyString(group.color) ? group.color.trim() : DEFAULT_CUSTOM_COLOR;
		const backgroundColor = isNonEmptyString(group.backgroundColor)
			? group.backgroundColor.trim()
			: '';
		const fontWeight = isNonEmptyString(group.fontWeight)
			? group.fontWeight.trim()
			: DEFAULT_FONT_WEIGHT;

		result.push({
			name,
			tags,
			defaultColor: color,
			color,
			backgroundColor,
			fontWeight,
		});
	}

	return result;
};

const mergeGroups = (baseGroups: TagGroupConfig[], customGroups: TagGroupConfig[]): TagGroupConfig[] => {
	if (customGroups.length === 0) {
		return baseGroups;
	}

	const merged = new Map<string, TagGroupConfig>();

	for (const group of baseGroups) {
		merged.set(group.name, group);
	}

	for (const group of customGroups) {
		merged.set(group.name, group);
	}

	const ordered: TagGroupConfig[] = [];
	for (const group of baseGroups) {
		const mergedGroup = merged.get(group.name);
		if (mergedGroup) {
			ordered.push(mergedGroup);
			merged.delete(group.name);
		}
	}

	for (const group of customGroups) {
		if (merged.has(group.name)) {
			ordered.push(group);
			merged.delete(group.name);
		}
	}

	return ordered;
};

export class ConfigService implements IConfigService {
	public getTagGroups(): TagGroupConfig[] {
		const config = vscode.workspace.getConfiguration('betterCommentTags');
		const customGroups = normalizeCustomGroups(config.get('groups', []));

		const legacyGroups = TAG_GROUP_DEFINITIONS.map((group) => ({
			name: group.name,
			tags: group.tags,
			defaultColor: group.defaultColor,
			color: config.get<string>(`${group.name}.color`, group.defaultColor),
			backgroundColor: config.get<string>(`${group.name}.backgroundColor`, ''),
			fontWeight: config.get<string>(`${group.name}.fontWeight`, DEFAULT_FONT_WEIGHT),
		}));

		return mergeGroups(legacyGroups, customGroups);
	}
}
