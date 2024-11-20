import { TPerformanceTestTypes, TScalabilityTestTypes } from '../../types/DCAPT';

export const getRunForStage = (stage: TScalabilityTestTypes|TPerformanceTestTypes) => {
  switch (stage) {
    case 'baseline': return 1;
    case 'regression': return 2;
    case 'one-node': return 3;
    case 'two-node': return 4;
    case 'four-node': return 5;
  }
}