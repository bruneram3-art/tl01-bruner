
export interface MonthlyBudget {
    month: number; // 0-11
    producao: number;
    rendimento: number;
    energia: number;
    gas: number;
}

// Orçamento extraído da planilha 'orçamento.xlsx', aba 'TL1', tabela 'BUD_V1.2'
export const TL1_BUDGET_2026: MonthlyBudget[] = [
    { month: 0, producao: 22000, rendimento: 96.3, energia: 75.19, gas: 41.83 }, // JAN
    { month: 1, producao: 19900, rendimento: 96.3, energia: 75.24, gas: 41.95 }, // FEV
    { month: 2, producao: 22000, rendimento: 96.34, energia: 75.19, gas: 41.83 }, // MAR
    { month: 3, producao: 21300, rendimento: 96.34, energia: 75.71, gas: 42.08 }, // ABR
    { month: 4, producao: 22000, rendimento: 96.34, energia: 75.19, gas: 41.83 }, // MAI
    { month: 5, producao: 10700, rendimento: 96.34, energia: 73.44, gas: 41.50 }, // JUN
    { month: 6, producao: 11400, rendimento: 96.34, energia: 78.42, gas: 42.43 }, // JUL
    { month: 7, producao: 22000, rendimento: 96.34, energia: 75.19, gas: 41.83 }, // AGO
    { month: 8, producao: 21300, rendimento: 96.34, energia: 75.79, gas: 41.83 }, // SET
    { month: 9, producao: 22000, rendimento: 96.34, energia: 75.19, gas: 41.83 }, // OUT
    { month: 10, producao: 21300, rendimento: 96.38, energia: 75.19, gas: 42.30 }, // NOV
    { month: 11, producao: 22000, rendimento: 96.38, energia: 75.19, gas: 41.83 }  // DEZ
];

export const getBudgetForDate = (dateStr: string): MonthlyBudget | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    const month = date.getMonth();
    return TL1_BUDGET_2026.find(b => b.month === month);
};
