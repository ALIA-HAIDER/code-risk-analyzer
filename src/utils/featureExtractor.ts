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

    const HALSTEAD_DIFFICULTY=
         (NUM_UNIQUE_OPERATORS/2) * (NUM_OPERATORS/NUM_UNIQUE_OPERATORS ||1);

    const HALSTEAD_EFFORT = HALSTEAD_LENGTH * HALSTEAD_DIFFICULTY;
    const HALSTEAD_ERROR_EST = HALSTEAD_EFFORT / 3000;
    const HALSTEAD_LEVEL = 1 / (HALSTEAD_DIFFICULTY || 1);
    const HALSTEAD_PROG_TIME = HALSTEAD_EFFORT / 18;


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
        HALSTEAD_DIFFICULTY,
        HALSTEAD_EFFORT,
        HALSTEAD_ERROR_EST,
        HALSTEAD_LEVEL,
        HALSTEAD_PROG_TIME,
        BRANCH_COUNT

    };

}