package com.testcase;

/**
 * Example Java code to test the extension
 * Calculator functions with various edge cases
 */
public class Calculator {
    
    /**
     * Add two numbers
     */
    public static int add(int a, int b) {
        return a + b;
    }
    
    /**
     * Divide two numbers
     */
    public static double divide(int a, int b) {
        if (b == 0) {
            throw new IllegalArgumentException("Cannot divide by zero");
        }
        return (double) a / b;
    }
    
    /**
     * Find maximum in array
     */
    public static int findMax(int[] numbers) {
        if (numbers == null || numbers.length == 0) {
            throw new IllegalArgumentException("Array cannot be null or empty");
        }
        
        int max = numbers[0];
        for (int i = 1; i < numbers.length; i++) {
            if (numbers[i] > max) {
                max = numbers[i];
            }
        }
        return max;
    }
    
    /**
     * Check if email is valid
     */
    public static boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        
        if (!email.contains("@") || !email.contains(".")) {
            return false;
        }
        
        String[] parts = email.split("@");
        if (parts.length != 2) {
            return false;
        }
        
        return parts[1].contains(".");
    }
    
    /**
     * Calculate factorial
     */
    public static long factorial(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("Factorial not defined for negative numbers");
        }
        if (n == 0 || n == 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
}
