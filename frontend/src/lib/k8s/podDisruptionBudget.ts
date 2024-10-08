import { apiFactoryWithNamespace } from './apiProxy';
import { KubeObjectInterface, makeKubeObject } from './cluster';

export interface KubePDB extends KubeObjectInterface {
  spec: {
    selector: {
      matchLabels: {
        [key: string]: string;
      };
      matchExpressions?: {
        key: string;
        operator: string;
        values: string[];
      };
    };
    minAvailable?: number;
    maxUnavailable?: number;
  };
  status: {
    currentHealthy: number;
    desiredHealthy: number;
    disruptionsAllowed: number;
    expectedPods: number;
    observedGeneration: number;
    disruptedPods?: {
      [key: string]: string;
    };
    conditions: {
      type: string;
      status: string;
      reason: string;
      observedGeneration: number;
      message: string;
      lastTransitionTime: string;
    }[];
  };
}

class PDB extends makeKubeObject<KubePDB>() {
  static kind = 'PodDisruptionBudget';
  static apiName = 'poddisruptionbudgets';
  static apiVersion = 'policy/v1';
  static isNamespaced = true;

  static apiEndpoint = apiFactoryWithNamespace(['policy', 'v1', 'poddisruptionbudgets']);

  get spec(): KubePDB['spec'] {
    return this.jsonData!.spec;
  }

  get status(): KubePDB['status'] {
    return this.jsonData!.status;
  }

  get selectors(): string[] {
    const selectors: string[] = [];
    Object.keys(this.spec.selector.matchLabels).forEach(key => {
      selectors.push(`${key}: ${this.spec.selector.matchLabels[key]}`);
    });
    return selectors;
  }
}

export default PDB;
