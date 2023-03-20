import { apiFactoryWithNamespace } from './apiProxy';
import { KubeObjectInterface, makeKubeObject } from './cluster';

export interface LimitRangeSpec {
  limits: {
    default: {
      cpu: string;
      memory: string;
    };
    defaultRequest: {
      cpu: string;
      memory: string;
    };
    max: {
      cpu: string;
      memory: string;
    };
    min: {
      cpu: string;
      memory: string;
    };
    type: string;
  }[];
}

export interface KubeObject extends KubeObjectInterface {
  spec: LimitRangeSpec;
}

export class LimitRange extends makeKubeObject<KubeObject>('limitrange') {
  static apiEndpoint = apiFactoryWithNamespace('', 'v1', 'limitranges');

  get spec() {
    return this.jsonData!.spec;
  }
}
