export function extractMetrics(code:string) {
    const lines=code.split('\n');

    const LOC_TOTAL=lines.length;
    const LOC_BANK=lines.filter(l=> l.trim()=== "").length;
    const LOC_COMMENTS=lines.filter(l=>
        l.trim().startsWith("//") ||
        l.trim().startsWith("/*") ||
        l.trim().startsWith("*") ||
        l.trim().startsWith("*/")
    ).length;

    const LOC_EXECUTABLE=LOC_TOTAL-LOC_BANK-LOC_COMMENTS;
    const LOC_CODE_AND_COMMENTS=LOC_TOTAL-LOC_BANK;

    const branchkeywords=/if|for|while|switch|case|catch|else/g;
    const BRANCH_COUNT=(code.match(branchkeywords)||[]).length;

    const CYCLOMATIC_COMPLEXITY=BRANCH_COUNT+1;
    const DESIGN_COMPLEXITY=CYCLOMATIC_COMPLEXITY;
    const ESSENTIAL_COMPLEXITY=Math.max(1,Math.floor(CYCLOMATIC_COMPLEXITY*0.7));

    const operatorRegex= /[\+\-\*\/%=&|!<>]+/g;
    const operators=code.match(operatorRegex) || [];

    const NUM_OPERATORS=operators.length;
    const NUM_UNIQUE_OPERATORS=new Set(operators).size;

    const operandRegex = /\b[a-zA-Z_][a-zA-Z0-9_]*\b|\b\d+\b/g;
    const operands = code.match(operandRegex) || [];

    const NUM_OPERANDS = operands.length;
    const NUM_UNIQUE_OPERANDS = new Set(operands).size;

    const HALSTEAD_LENGTH=NUM_OPERATORS+NUM_UNIQUE_OPERATORS;
    const HALSTEAD_VOLUME = HALSTEAD_LENGTH * Math.log2(NUM_UNIQUE_OPERATORS + NUM_UNIQUE_OPERANDS || 1);

    const HALSTEAD_DIFFICULTY=
         (NUM_UNIQUE_OPERATORS/2) * (NUM_OPERATORS/NUM_UNIQUE_OPERATORS ||1);

    const HALSTEAD_EFFORT = HALSTEAD_LENGTH * HALSTEAD_DIFFICULTY;
    const HALSTEAD_ERROR_EST = HALSTEAD_EFFORT / 3000;
    const HALSTEAD_LEVEL = 1 / (HALSTEAD_DIFFICULTY || 1);
    const HALSTEAD_PROG_TIME = HALSTEAD_EFFORT / 18;

    // Target Variables
    // 1. Complexity Level
    let complexity_level = 0;
    if (CYCLOMATIC_COMPLEXITY < 5) {
        complexity_level = 0;
    } else if (CYCLOMATIC_COMPLEXITY < 10) {
        complexity_level = 1;
    } else {
        complexity_level = 2;
    }

    // 2. Maintainability Score
    // 171 - 5.2 * ln(Halstead Volume) - 0.23 * Cyclomatic Complexity - 16.2 * ln(LOC)
    const locSafe = Math.max(1, LOC_EXECUTABLE);
    const volumeSafe = Math.max(1, HALSTEAD_VOLUME);
    const maintainability_score = 171 - 5.2 * Math.log(volumeSafe) - 0.23 * CYCLOMATIC_COMPLEXITY - 16.2 * Math.log(locSafe);

    // 3. Code Smell Risk Level
    let code_smell_risk = 0;
    if (CYCLOMATIC_COMPLEXITY > 12 || LOC_EXECUTABLE > 300) {
        code_smell_risk = 2;  // High smell
    } else if (CYCLOMATIC_COMPLEXITY > 6 || LOC_EXECUTABLE > 150) {
        code_smell_risk = 1;  // Medium
    } else {
        code_smell_risk = 0;  // Low
    }

    // 4. Technical Debt
    // Technical Debt = Cyclomatic Complexity + Halstead Effort * 0.001 + LOC
    const technical_debt = CYCLOMATIC_COMPLEXITY + HALSTEAD_EFFORT * 0.001 + LOC_EXECUTABLE;

    return{
        LOC_TOTAL,
        LOC_BANK,
        LOC_COMMENTS,
        LOC_EXECUTABLE,
        LOC_CODE_AND_COMMENTS,
        CYCLOMATIC_COMPLEXITY,
        DESIGN_COMPLEXITY,
        ESSENTIAL_COMPLEXITY,
        NUM_OPERATORS,
        NUM_UNIQUE_OPERATORS,
        NUM_OPERANDS,
        NUM_UNIQUE_OPERANDS,
        HALSTEAD_LENGTH,
        HALSTEAD_VOLUME,
        HALSTEAD_DIFFICULTY,
        HALSTEAD_EFFORT,
        HALSTEAD_ERROR_EST,
        HALSTEAD_LEVEL,
        HALSTEAD_PROG_TIME,
        BRANCH_COUNT,
        // Target Variables
        complexity_level,
        maintainability_score,
        code_smell_risk,
        technical_debt
    };

}