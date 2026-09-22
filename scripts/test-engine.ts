/**
 * @file test-engine.ts
 * @description Comprehensive test runner for the LMPC 2011 Statutory Rule Engine.
 * Tests each statutory provision against edge cases and real-world failure modes.
 */

import { SAMPLE_PACKAGES } from '../frontend/src/lib/engine/sampleData';
import { evaluateAllLMPCRules, generateLegalNoticeDraft } from '../frontend/src/lib/engine/rules';
import { calibratePhysicalMetrics } from '../frontend/src/lib/engine/calibration';
import { queryGS1DataKart, validateEAN13Checksum } from '../frontend/src/lib/datakart';

console.log('================================================================');
console.log('  LMPC 2011 & LEGAL METROLOGY ACT STATUTORY TEST SUITE');
console.log('================================================================\n');

let allPassed = true;

// TEST 1: GS1 EAN-13 Checksum Verification
console.log('[TEST 1] Testing GS1 EAN-13 Checksum & Prefix Verification:');
const validBarcodes = ['8901063012011', '8901262010054', '8901719101014'];
for (const bc of validBarcodes) {
  const res = validateEAN13Checksum(bc);
  if (!res.isValid || !res.isIndianPrefix) {
    console.error(`  FAIL: ${bc} expected valid Indian barcode, got ${JSON.stringify(res)}`);
    allPassed = false;
  } else {
    console.log(`  ✓ Valid Indian GS1 Barcode verified: ${bc}`);
  }
}

// Invalid checksum test (8901063012019 has check digit 9 instead of true 1)
const invalidBc = '8901063012019'; // tampered check digit
const invalidRes = validateEAN13Checksum(invalidBc);
if (invalidRes.isValid) {
  console.error(`  FAIL: ${invalidBc} expected invalid check digit, but passed!`);
  allPassed = false;
} else {
  console.log(`  ✓ Successfully caught counterfeit/invalid barcode: ${invalidBc}`);
}

// TEST 2: Optical Calibration for Rule 7 Table-I
console.log('\n[TEST 2] Testing Optical Scale & Rule 7 Table-I Font Height Calibration:');
// Case A: PDP Area = 120 cm² (Table-I requires min 2.5 mm). Image has 380px barcode, 32px numeral.
const calibPass = calibratePhysicalMetrics(380, 260, 32, 16, 1200, 1600, 120);
console.log(`  Case A (Pass): Area=120cm² | Mandate=≥${calibPass.mandatedMinHeightMm}mm | Measured=${calibPass.measuredNumeralHeightMm}mm | Compliant=${calibPass.isFontHeightCompliant}`);
if (!calibPass.isFontHeightCompliant) {
  console.error('  FAIL: Expected font height to be compliant!');
  allPassed = false;
}

// Case B: PDP Area = 180 cm² (Table-I requires min 2.5 mm). Image has 370px barcode, 12px numeral (1.21 mm).
const calibFail = calibratePhysicalMetrics(370, 250, 12, 5, 1200, 1600, 180);
console.log(`  Case B (Deficient): Area=180cm² | Mandate=≥${calibFail.mandatedMinHeightMm}mm | Measured=${calibFail.measuredNumeralHeightMm}mm | Compliant=${calibFail.isFontHeightCompliant}`);
if (calibFail.isFontHeightCompliant) {
  console.error('  FAIL: Expected font height to be deficient and caught!');
  allPassed = false;
}

// TEST 3: Full Sample Packages Evaluation
console.log('\n[TEST 3] Evaluating Curated Sample Packaging Scenarios:');
for (const sample of SAMPLE_PACKAGES) {
  const result = evaluateAllLMPCRules(sample.declarations, sample.calibration);
  const match = result.overallStatus === sample.expectedOutcome;

  console.log(`\n  Scenario: ${sample.name}`);
  console.log(`  Expected: ${sample.expectedOutcome} | Outcome: ${result.overallStatus} | Critical Fails: ${result.criticalViolationsCount}`);

  if (!match) {
    console.error(`  FAIL: Mismatch on scenario ${sample.id}!`);
    allPassed = false;
  } else {
    console.log(`  ✓ Rule Engine determination matches statutory expectation.`);
  }

  // Print violations if any
  const fails = result.evaluations.filter((e) => e.status === 'FAIL');
  if (fails.length > 0) {
    console.log(`    Caught Violations:`);
    fails.forEach((f) => console.log(`      - [${f.statutoryReference}] ${f.title}: ${f.observedValue}`));
  }
}

// TEST 4: Legal Panchnama Seizure Notice Generation
console.log('\n[TEST 4] Testing Form VIII Panchnama Notice Generator:');
const sampleViolation = SAMPLE_PACKAGES[1];
const evalResult = evaluateAllLMPCRules(sampleViolation.declarations, sampleViolation.calibration);
const legalNotice = generateLegalNoticeDraft(
  'AUD-TEST-999',
  'Retail Store, Connaught Place, New Delhi',
  'INS-DL-402',
  evalResult.evaluations,
  sampleViolation.declarations
);

if (legalNotice.includes('INSPECTION MEMORANDUM') && legalNotice.includes('Section 15') && legalNotice.includes('Section 36')) {
  console.log('  ✓ Form VIII Panchnama Legal Notice generated with statutory references and penalty clauses.');
} else {
  console.error('  FAIL: Legal notice missing required statutory boilerplate!');
  allPassed = false;
}

console.log('\n================================================================');
if (allPassed) {
  console.log('  ALL STATUTORY COMPLIANCE TESTS PASSED (100% SUCCESS)');
} else {
  console.log('  SOME STATUTORY COMPLIANCE TESTS FAILED');
  process.exit(1);
}
console.log('================================================================\n');
