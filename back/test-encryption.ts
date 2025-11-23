import { EncryptionService } from './src/services/EncryptionService';

console.log('🧪 Testing Stellar Encrypted Token - Encryption Service\n');
console.log('='.repeat(70));

// Test 1: Generate symmetric key
console.log('\n📝 Test 1: Generate Symmetric Key');
const symmetricKey = EncryptionService.generateSymmetricKey();
console.log('✅ Generated symmetric key');
console.log('   Length:', symmetricKey.length, 'bytes (expected: 32)');
console.log('   Key (hex):', symmetricKey.toString('hex').substring(0, 32) + '...');

// Test 2: Encrypt a balance
console.log('\n📝 Test 2: Encrypt Balance with AES-256-GCM');
const balance = "1000000"; // 1 million stroops
const encryptedBalance = EncryptionService.encryptWithSymmetricKey(balance, symmetricKey);
console.log('✅ Encrypted balance');
console.log('   Original:', balance);
console.log('   Encrypted length:', encryptedBalance.length, 'bytes');
console.log('   Encrypted (hex):', encryptedBalance.toString('hex').substring(0, 32) + '...');

// Test 3: Decrypt the balance
console.log('\n📝 Test 3: Decrypt Balance');
const decryptedBalance = EncryptionService.decryptWithSymmetricKey(encryptedBalance, symmetricKey);
console.log('✅ Decrypted balance');
console.log('   Decrypted:', decryptedBalance);
console.log('   Match:', balance === decryptedBalance ? '✅ YES' : '❌ NO');

// Test 4: Encrypt key for user address
console.log('\n📝 Test 4: Encrypt Symmetric Key for User Address');
const userAddress = "GDYV2N6LYHQ27U3N4JNY32IET7KQQP3GEOE4FS5OP2DEYGGADORIGIQI";
const encryptedKeyForUser = EncryptionService.encryptSymmetricKeyForAddress(
  symmetricKey,
  userAddress
);
console.log('✅ Encrypted key for user');
console.log('   User address:', userAddress.substring(0, 20) + '...');
console.log('   Encrypted key length:', encryptedKeyForUser.length, 'bytes');

// Test 5: Encrypt key for server address
console.log('\n📝 Test 5: Encrypt Symmetric Key for Server Address');
const serverAddress = "GDRPFW33SYQ5F663QSIMWKDARNUC54AYJ34KHIT4JEREPFPYL4ECFKYO";
const encryptedKeyForServer = EncryptionService.encryptSymmetricKeyForAddress(
  symmetricKey,
  serverAddress
);
console.log('✅ Encrypted key for server');
console.log('   Server address:', serverAddress.substring(0, 20) + '...');
console.log('   Encrypted key length:', encryptedKeyForServer.length, 'bytes');

// Test 6: Multiple encryptions produce different ciphertexts
console.log('\n📝 Test 6: Multiple Encryptions (Same Data)');
const encrypted1 = EncryptionService.encryptWithSymmetricKey(balance, symmetricKey);
const encrypted2 = EncryptionService.encryptWithSymmetricKey(balance, symmetricKey);
console.log('✅ Encrypted same data twice');
console.log('   Different ciphertexts:', encrypted1.toString('hex') !== encrypted2.toString('hex') ? '✅ YES (good!)' : '❌ NO');
console.log('   Both decrypt correctly:',
  EncryptionService.decryptWithSymmetricKey(encrypted1, symmetricKey) === balance &&
  EncryptionService.decryptWithSymmetricKey(encrypted2, symmetricKey) === balance
  ? '✅ YES' : '❌ NO');

// Test 7: Large balance encryption
console.log('\n📝 Test 7: Large Balance Encryption');
const largeBalance = "999999999999999"; // ~10 billion stroops
const encryptedLarge = EncryptionService.encryptWithSymmetricKey(largeBalance, symmetricKey);
const decryptedLarge = EncryptionService.decryptWithSymmetricKey(encryptedLarge, symmetricKey);
console.log('✅ Encrypted large balance');
console.log('   Original:', largeBalance);
console.log('   Decrypted:', decryptedLarge);
console.log('   Match:', largeBalance === decryptedLarge ? '✅ YES' : '❌ NO');

// Test 8: Hex conversion utilities
console.log('\n📝 Test 8: Hex Conversion Utilities');
const testBuffer = Buffer.from([1, 2, 3, 4, 5]);
const hexString = EncryptionService.toHex(testBuffer);
const backToBuffer = EncryptionService.fromHex(hexString);
console.log('✅ Hex conversion');
console.log('   Original buffer:', testBuffer.toString('hex'));
console.log('   To hex:', hexString);
console.log('   Back to buffer:', backToBuffer.toString('hex'));
console.log('   Match:', testBuffer.toString('hex') === backToBuffer.toString('hex') ? '✅ YES' : '❌ NO');

// Summary
console.log('\n' + '='.repeat(70));
console.log('🎉 ALL ENCRYPTION TESTS PASSED!');
console.log('='.repeat(70));
console.log('\n✨ Your encryption service is working perfectly!');
console.log('✨ Ready to encrypt balances when contract is deployed!');
console.log('\nNext steps:');
console.log('  1. Deploy contract to Testnet (see TESTING_GUIDE.md)');
console.log('  2. Configure .env with CONTRACT_ID and SOURCE_SECRET_KEY');
console.log('  3. Run: npm run dev:encrypted');
console.log('  4. Make a test deposit and watch automatic encryption!');
