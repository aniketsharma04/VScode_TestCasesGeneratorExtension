// Example JavaScript code to test the extension

/**
 * Add two numbers
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Sum of a and b
 */
function add(a, b) {
    return a + b;
}

/**
 * Divide two numbers
 * @param {number} a - Numerator
 * @param {number} b - Denominator
 * @returns {number} Result of division
 * @throws {Error} If b is zero
 */
function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero is not allowed');
    }
    return a / b;
}

/**
 * Find maximum number in array
 * @param {number[]} arr - Array of numbers
 * @returns {number} Maximum value
 */
function findMax(arr) {
    if (!arr || arr.length === 0) {
        return null;
    }
    return Math.max(...arr);
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = { add, divide, findMax, isValidEmail };
