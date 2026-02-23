
export interface MonthlyBudget {
    month: number; // 0-11
    producao: number;
    rendimento: number;
    energia: number;
    gas: number;
}

// Orçamento extraído da planilha 'orçamento.xlsx', aba 'TL1', tabela 'BUD_V2' (Fev/2026)
export const TL1_BUDGET_2026: MonthlyBudget[] = [
    { month: 0, producao: 17118.27, rendimento: 96.31, energia: 80.76, gas: 45.40 }, // JAN (Real)
    { month: 1, producao: 20400, rendimento: 96.3, energia: 75.00, gas: 41.95 },   // FEV
    { month: 2, producao: 23000, rendimento: 96.34, energia: 75.00, gas: 41.83 },  // MAR
    { month: 3, producao: 21800, rendimento: 96.34, energia: 75.00, gas: 42.08 },  // ABR
    { month: 4, producao: 22300, rendimento: 96.34, energia: 75.00, gas: 41.83 },  // MAI
    { month: 5, producao: 11200, rendimento: 96.34, energia: 75.00, gas: 41.50 },  // JUN
    { month: 6, producao: 11400, rendimento: 96.34, energia: 75.00, gas: 42.43 },  // JUL
    { month: 7, producao: 22500, rendimento: 96.34, energia: 75.00, gas: 41.00 },  // AGO
    { month: 8, producao: 21500, rendimento: 96.34, energia: 75.00, gas: 40.00 },  // SET
    { month: 9, producao: 22000, rendimento: 96.41, energia: 75.00, gas: 39.00 },  // OUT
    { month: 10, producao: 21300, rendimento: 96.42, energia: 73.00, gas: 38.00 }, // NOV
    { month: 11, producao: 22000, rendimento: 96.42, energia: 72.00, gas: 38.00 }  // DEZ
];

export const getBudgetForDate = (dateStr: string): MonthlyBudget | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    const month = date.getMonth();
    return TL1_BUDGET_2026.find(b => b.month === month);
};
