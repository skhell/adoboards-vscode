import * as crypto from 'crypto';
import matter from 'gray-matter';
import { WorkItemFrontmatter, RefEntry } from './state';

const TSHIRT_MAP: Record<number, string> = { 1: 'XS', 3: 'S', 5: 'M', 8: 'L', 13: 'XL' };

export type ItemStatus = 'staged' | 'modified' | 'pending' | 'conflict' | 'clean';

export function isModified(
  frontmatter: WorkItemFrontmatter,
  refFields: Record<string, any>,
  refHash?: string,
  fileContent?: string
): boolean {
  // Hash comparison: catches ALL changes (whitespace, body, any byte)
  if (refHash && fileContent) {
    const currentHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    return currentHash !== refHash;
  }

  // Fallback: semantic field comparison (for old refs without hash)
  if (frontmatter.title !== refFields['System.Title']) { return true; }
  if (frontmatter.state !== refFields['System.State']) { return true; }
  if ((frontmatter.area || '') !== (refFields['System.AreaPath'] || '')) { return true; }
  if ((frontmatter.iteration || '') !== (refFields['System.IterationPath'] || '')) { return true; }
  if (
    frontmatter.storyPoints != null &&
    frontmatter.storyPoints !== refFields['Microsoft.VSTS.Scheduling.StoryPoints']
  ) { return true; }
  if (
    frontmatter.businessValue != null &&
    frontmatter.businessValue !== refFields['Microsoft.VSTS.Common.BusinessValue']
  ) { return true; }

  const localAssignee = frontmatter.assignee || '';
  const remoteAssignee = extractAssignee(refFields['System.AssignedTo']);
  if (localAssignee !== remoteAssignee) { return true; }

  const localTags = formatTags(frontmatter.tags);
  const remoteTags = refFields['System.Tags'] || '';
  if (localTags !== remoteTags) { return true; }

  return false;
}

function extractAssignee(assignedTo: any): string {
  if (!assignedTo) { return ''; }
  if (typeof assignedTo === 'object' && assignedTo.uniqueName) { return assignedTo.uniqueName; }
  if (typeof assignedTo === 'string') {
    const match = assignedTo.match(/<([^>]+)>/);
    return match ? match[1] : assignedTo;
  }
  return '';
}

function formatTags(tags: string[] | string | undefined): string {
  if (!tags) { return ''; }
  if (Array.isArray(tags)) { return tags.join('; '); }
  return tags;
}

/**
 * Reconstruct the markdown exactly as the CLI's adoToMarkdown() would produce it.
 * Uses matter.stringify() so field quoting and ordering match the written file.
 */
export function reconstructMarkdown(id: string, entry: { fields: Record<string, any>; parent?: number }): string {
  const { fields, parent } = entry;
  const type = fields['System.WorkItemType'] || 'Unknown';
  const storyPoints = fields['Microsoft.VSTS.Scheduling.StoryPoints'];

  // Build frontmatter object in the same order as adoToFrontmatter() in the CLI
  const fm: Record<string, any> = {
    id: parseInt(id, 10),
    type: type === 'User Story' ? 'Story' : type,
    title: fields['System.Title'] || '',
    area: fields['System.AreaPath'] || '',
    state: fields['System.State'] || '',
  };

  if (fields['System.IterationPath']) {
    fm.iteration = fields['System.IterationPath'];
  }
  if (storyPoints != null) {
    fm.storyPoints = storyPoints;
    fm.tshirt = TSHIRT_MAP[storyPoints as number] ?? null;
  }
  if (fields['Microsoft.VSTS.Common.BusinessValue'] != null) {
    fm.businessValue = fields['Microsoft.VSTS.Common.BusinessValue'];
  }
  if (fields['System.AssignedTo']?.uniqueName) {
    fm.assignee = fields['System.AssignedTo'].uniqueName;
  }
  if (parent != null) {
    fm.parent = parent;
  }
  if (fields['System.Tags']) {
    fm.tags = fields['System.Tags'].split('; ').map((t: string) => t.trim()).filter(Boolean);
  }

  // Build body sections - same logic as adoToMarkdown() in the CLI
  const sections: string[] = [];

  if (type === 'Bug') {
    const repro = htmlToSimpleMarkdown(fields['Microsoft.VSTS.TCM.ReproSteps'] || '');
    sections.push(`## Repro Steps\n\n${repro || '_No repro steps_'}`);
    const sysInfo = htmlToSimpleMarkdown(fields['Microsoft.VSTS.TCM.SystemInfo'] || '');
    if (sysInfo) { sections.push(`## System Info\n\n${sysInfo}`); }
  } else {
    const desc = htmlToSimpleMarkdown(fields['System.Description'] || '');
    sections.push(`## Description\n\n${desc || '_No description_'}`);
    if (type === 'Feature' || type === 'User Story') {
      const ac = htmlToSimpleMarkdown(fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '');
      if (ac) { sections.push(`## Acceptance Criteria\n\n${ac}`); }
    }
  }

  const body = sections.join('\n\n');
  // matter.stringify produces identical YAML serialization to the CLI
  return matter.stringify('\n' + body + '\n', fm);
}

function htmlToSimpleMarkdown(html: string): string {
  if (!html) { return ''; }
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div)>/gi, '\n')
    .replace(/<\/?(b|strong)>/gi, '**')
    .replace(/<\/?(i|em)>/gi, '_')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?(ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


