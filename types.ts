
export interface PCPData {
  data: string;
  producao: number;
  gasNatural: number;
  energiaEletrica: number;
  setupMinutos: number;
  utilizacaoPercentual: number;
  produtividade: number;
  [key: string]: any;
}

export interface MetaData {
  mes: string;
  metaProducao?: number;
  metaGas?: number; // GN
  metaEnergia?: number; // EE
  rm?: number; // RM
  [key: string]: any;
}

export interface ForecastResult {
  data: string;
  producaoPrevista: number;
  gasPrevisto: number;
  energiaPrevista: number;
  produtividadePrevista: number;
  utilizacaoPrevista: number;
  setupPrevisto: number;
  insights: string;
}

export type MetricType = 'producao' | 'gas' | 'energia' | 'produtividade' | 'utilizacao' | 'setup';
