
export const isRecursiveBuild = (lastBuildCompleted: number) =>
  lastBuildCompleted > (new Date().getTime() - 5 * 1000)
