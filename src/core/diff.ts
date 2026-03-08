import { WorkItemFrontmatter, RefEntry } from './state';

export type ItemStatus = 'staged' | 'modified' | 'pending' | 'conflict' | 'clean';

// Extract email from ADO AssignedTo field
// ADO returns "Display Name <email>" or just "email"
function extractAssignee(assignedTo: any): string {
  if (!assignedTo) {
    return '';
  }
  if (typeof assignedTo === 'object' && assignedTo.uniqueName) {
    return assignedTo.uniqueName;
  }
  if (typeof assignedTo === 'string') {
    const match = assignedTo.match(/<([^>]+)>/);
    return match ? match[1] : assignedTo;
  }
  return '';
}

// Normalize tags to "tag1; tag2" format matching ADO
function formatTags(tags: string[] | string | undefined): string {
  if (!tags) {
    return '';
  }
  if (Array.isArray(tags)) {
    return tags.join('; ');
  }
  return tags;
}

export function isModified(
  frontmatter: WorkItemFrontmatter,
  refFields: Record<string, any>
): boolean {
  if (frontmatter.title !== refFields['System.Title']) {
    return true;
  }
  if (frontmatter.state !== refFields['System.State']) {
    return true;
  }
  if ((frontmatter.area || '') !== (refFields['System.AreaPath'] || '')) {
    return true;
  }
  if ((frontmatter.iteration || '') !== (refFields['System.IterationPath'] || '')) {
    return true;
  }
  if (
    frontmatter.storyPoints != null &&
    frontmatter.storyPoints !== refFields['Microsoft.VSTS.Scheduling.StoryPoints']
  ) {
    return true;
  }
  if (
    frontmatter.businessValue != null &&
    frontmatter.businessValue !== refFields['Microsoft.VSTS.Common.BusinessValue']
  ) {
    return true;
  }

  const localAssignee = frontmatter.assignee || '';
  const remoteAssignee = extractAssignee(refFields['System.AssignedTo']);
  if (localAssignee !== remoteAssignee) {
    return true;
  }

  const localTags = formatTags(frontmatter.tags);
  const remoteTags = refFields['System.Tags'] || '';
  if (localTags !== remoteTags) {
    return true;
  }

  return false;
}

// Reconstruct a markdown file from refs.json data for diff view
export function reconstructMarkdown(
  id: string,
  fields: Record<string, any>
): string {
  const frontmatter: Record<string, any> = {
    id: parseInt(id, 10),
    type: fields['System.WorkItemType'] || 'Unknown',
    title: fields['System.Title'] || '',
    state: fields['System.State'] || '',
  };

  if (fields['System.AreaPath']) {
    frontmatter.area = fields['System.AreaPath'];
  }
  if (fields['System.IterationPath']) {
    frontmatter.iteration = fields['System.IterationPath'];
  }
  if (fields['Microsoft.VSTS.Scheduling.StoryPoints'] != null) {
    frontmatter.storyPoints = fields['Microsoft.VSTS.Scheduling.StoryPoints'];
  }
  if (fields['Microsoft.VSTS.Common.BusinessValue'] != null) {
    frontmatter.businessValue = fields['Microsoft.VSTS.Common.BusinessValue'];
  }

  const assignee = extractAssignee(fields['System.AssignedTo']);
  if (assignee) {
    frontmatter.assignee = assignee;
  }
  if (fields['System.Tags']) {
    frontmatter.tags = fields['System.Tags'].split('; ').map((t: string) => t.trim());
  }

  // Build YAML frontmatter
  const yamlLines = Object.entries(frontmatter).map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.join(', ')}]`;
    }
    return `${key}: ${value}`;
  });

  let md = `---\n${yamlLines.join('\n')}\n---\n`;

  // Add body sections based on type
  const type = (fields['System.WorkItemType'] || '').toLowerCase();
  if (type === 'bug') {
    const repro = fields['Microsoft.VSTS.TCM.ReproSteps'] || '';
    const sysInfo = fields['Microsoft.VSTS.TCM.SystemInfo'] || '';
    md += `\n## Repro Steps\n\n${repro}\n`;
    if (sysInfo) {
      md += `\n## System Info\n\n${sysInfo}\n`;
    }
  } else {
    const desc = fields['System.Description'] || '';
    md += `\n## Description\n\n${desc}\n`;
    if (type === 'feature' || type === 'user story') {
      const ac = fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';
      if (ac) {
        md += `\n## Acceptance Criteria\n\n${ac}\n`;
      }
    }
  }

  return md;
}
