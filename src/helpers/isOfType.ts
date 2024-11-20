
export const isOfType = <T>(obj: T | unknown, property: keyof T): obj is T => {
  return obj !== null && typeof obj === 'object' && property in (obj as Record<string, unknown>);
};
