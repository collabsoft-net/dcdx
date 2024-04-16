
export const showRecursiveBuildWarning = (outputDirectory: string) => {
  console.log(`
===============================================================================================================
Recursive build trigger detected. The last build completed last than 5 seconds ago
This may indicate that the build changes files outside of the output directory
Alternatively, Maven is using a different output directory than configured:
'${outputDirectory}'

Please make sure to check your build process and/or specify a different output directory using the '-o' option
===============================================================================================================
  `);
}
