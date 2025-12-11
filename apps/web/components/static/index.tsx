function autoKeywords(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withKeywords(items: any[]) {
  return items.map(item => ({
    ...item,
    keywords: [...autoKeywords(item.label), ...autoKeywords(item.parent || '')],
  }));
}

const commonSearchableItems = [
  { label: 'Create a task', parent: 'Task Offering', route: '/taskOfferings' },
  { label: 'Edit a task', parent: 'Task Offering', route: '/taskOfferings' },
  { label: 'Assign a task', parent: 'Task Offering', route: '/taskOfferings' },

  { label: 'Update profile', parent: 'Settings', route: '/settings/myprofile' },
  { label: 'Update password', parent: 'Settings', route: '/settings/myprofile' },
  { label: 'Update notification settings', parent: 'Settings', route: '/settings/notifications' },
];

const taskSupervisorExtra = [
  { label: 'View task agents', parent: 'Task Agents', route: '/taskAgents' },
  { label: 'View clients', parent: 'Clients', route: '/clients' },
  { label: 'Add new client', parent: 'Clients', route: '/clients' },
];

const superUserExtra = [
  ...taskSupervisorExtra,
  { label: 'View skills', parent: 'Skills', route: '/skills' },
  { label: 'Add new skill', parent: 'Skills', route: '/skills' },
  { label: 'View all users', parent: 'Users', route: '/users' },
  { label: 'Add new user', parent: 'Users', route: '/users' },
];

export const globalSearchableItems = {
  TASK_AGENT: withKeywords(commonSearchableItems),
  CLIENT: withKeywords(commonSearchableItems),
  TASK_SUPERVISOR: withKeywords([...commonSearchableItems, ...taskSupervisorExtra]),
  SUPER_USER: withKeywords([...commonSearchableItems, ...superUserExtra]),
};
