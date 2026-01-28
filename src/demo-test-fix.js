#!/usr/bin/env node

/**
 * Demo Script: Shows the test generation fix in action
 */

const fs = require('fs');
const path = require('path');
const { TestFileFixer } = require('./test-validator-fixer');

console.log('='.repeat(80));
console.log('TEST GENERATION FIX - DEMONSTRATION');
console.log('='.repeat(80));
console.log();

// Simulated broken test (what AI generates)
const brokenTest = `const { } = require('./OrderProcessor');

test('should place a basic order successfully without a coupon', () => {
    const order = {
    orderId: 'ORD001',
    items: [{
    name: 'Laptop',
    price: 1200,
    quantity: 1
    }, {
    name: 'Mouse',
    price: 25,
    quantity: 2
    }],
    orderDate: '2023-01-15T10:00:00Z',
    };
    const placedOrder = processor.placeOrder(order);
    expect(placedOrder).toBeDefined();
    expect(placedOrder.orderId).toBe('ORD001');
  });

const { } = require('./OrderProcessor');

test('should apply SAVE20 coupon correctly to subtotal', () => {
    const subtotal = 100;
    expect(processor.applyCoupon(subtotal, 'SAVE20')).toBe(80);
  });

const { } = require('./OrderProcessor');

test('should calculate tax correctly for a given amount', () => {
    expect(processor.calculateTax(100)).toBe(18);
  });`;

console.log('📋 BROKEN TEST (AI Generated):');
console.log('-'.repeat(80));
console.log(brokenTest.substring(0, 500) + '...\n');

console.log('❌ PROBLEMS IDENTIFIED:');
console.log('  1. Empty destructuring: const { } = require(...)');
console.log('  2. Repeated imports before each test');
console.log('  3. No describe() block structure');
console.log('  4. Undefined variable "processor"');
console.log();

console.log('🔧 APPLYING FIX...');
console.log();

// Apply the fix
const sourceFile = path.join(__dirname, 'OrderProcessor.js');
const fixer = new TestFileFixer(sourceFile, brokenTest);

fixer.fix().then(result => {
  if (result.success) {
    console.log('✅ FIX SUCCESSFUL!');
    console.log();
    console.log('📋 FIXED TEST (Ready to Run):');
    console.log('-'.repeat(80));
    console.log(result.content);
    console.log('-'.repeat(80));
    console.log();
    
    console.log('🎯 FIXES APPLIED:');
    console.log('  ✓ Proper import at top: const OrderProcessor = require(...)');
    console.log('  ✓ Wrapped in describe() block');
    console.log('  ✓ Created processor instance in beforeEach()');
    console.log('  ✓ Removed duplicate imports');
    console.log('  ✓ Proper Jest structure');
    console.log();
    
    console.log('📊 ANALYSIS:');
    console.log('  - Classes found:', result.exports.classes.join(', '));
    console.log('  - Default export:', result.exports.defaultExport);
    console.log();
    
    console.log('💾 To save and run:');
    console.log('  1. Save to file: result.content → test.js');
    console.log('  2. Run: npx jest test.js');
    console.log();
    
    // Save demo output
    const outputFile = path.join(__dirname, 'demo-fixed-test.js');
    fs.writeFileSync(outputFile, result.content);
    console.log(`✅ Demo saved to: ${outputFile}`);
    
  } else {
    console.log('❌ FIX FAILED:');
    console.log('  Error:', result.error);
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('For full implementation guide, see: IMPLEMENTATION_GUIDE.md');
  console.log('For before/after comparison, see: BEFORE_AFTER_COMPARISON.md');
  console.log('='.repeat(80));
});
