import { z } from 'zod';

export const getZodDefault = <Schema extends z.AnyZodObject>(schema: Schema, key: keyof z.infer<Schema>) => {
  const defaults = getZodDefaults(schema);
  return defaults[key];
}

// Code snippet by Jacob Weisenburger (https://github.com/JacobWeisenburger)
// Taken from https://github.com/colinhacks/zod/discussions/1953#discussioncomment-4811588
export const getZodDefaults = <Schema extends z.AnyZodObject>(schema: Schema): z.infer<Schema> => {
  return Object.fromEntries(
    Object.entries(schema.shape).filter(([ , value ]) => {
      if (value instanceof z.ZodDefault) {
        const defaultValue = value._def.defaultValue();
        return defaultValue !== null && typeof defaultValue !== 'undefined';
      }
      return false;
    }).map(([key, value]) => ([key, (value as z.ZodDefault<never>)._def.defaultValue()]))
  )
}