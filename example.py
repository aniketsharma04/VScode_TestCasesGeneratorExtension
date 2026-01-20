# Example Python code to test the extension
# Calculator functions with various edge cases

def add(a, b):
    """Add two numbers"""
    return a + b

def divide(a, b):
    """Divide two numbers"""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def find_max(numbers):
    """Find maximum in a list"""
    if not numbers:
        raise ValueError("List cannot be empty")
    return max(numbers)

def is_valid_email(email):
    """Check if email is valid"""
    if not email or '@' not in email or '.' not in email:
        return False
    parts = email.split('@')
    if len(parts) != 2:
        return False
    return '.' in parts[1]

def factorial(n):
    """Calculate factorial"""
    if n < 0:
        raise ValueError("Factorial not defined for negative numbers")
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

class Calculator:
    """Simple calculator class"""
    
    def __init__(self):
        self.result = 0
    
    def add(self, value):
        """Add to result"""
        self.result += value
        return self.result
    
    def subtract(self, value):
        """Subtract from result"""
        self.result -= value
        return self.result
    
    def reset(self):
        """Reset result to zero"""
        self.result = 0
        return self.result
