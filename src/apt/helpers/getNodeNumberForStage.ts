import { TScalabilityTestTypes } from '../../types/DCAPT';

export const getNodeNumberForStage = (stage: TScalabilityTestTypes) => {
  switch (stage) {
    case 'one-node': return 1;
    case 'two-node': return 2;
    case 'four-node': return 4;
  }
}