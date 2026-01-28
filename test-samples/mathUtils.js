/**
 * Math Utilities - Sample function exports for testing
 */

/**
 * Add two numbers
 */
function add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Both arguments must be numbers');
    }
    return a + b;
}

/**
 * Subtract two numbers
 */
function subtract(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Both arguments must be numbers');
    }
    return a - b;
}

/**
 * Multiply two numbers
 */
function multiply(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Both arguments must be numbers');
    }
    return a * b;
}

/**
 * Divide two numbers
 */
function divide(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error('Both arguments must be numbers');
    }
    if (b === 0) {
        throw new Error('Cannot divide by zero');
    }
    return a / b;
}

/**
 * Calculate percentage
 */
function percentage(value, percent) {
    if (typeof value !== 'number' || typeof percent !== 'number') {
        throw new Error('Both arguments must be numbers');
    }
    if (percent < 0 || percent > 100) {
        throw new Error('Percent must be between 0 and 100');
    }
    return (value * percent) / 100;
}

module.exports = {
    add,
    subtract,
    multiply,
    divide,
    percentage
};
