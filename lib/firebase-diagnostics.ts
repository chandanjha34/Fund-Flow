/**
 * FIREBASE DIAGNOSTICS TEST SUITE
 *
 * Run these tests to verify Firebase connection, read/write operations,
 * and diagnose any issues with group creation and storage.
 */

import { ref, set, get, remove } from 'firebase/database'
import { db } from './firebase'
import {
  saveGroupToFirebase,
  getGroupFromFirebase,
  getAllGroupsFromFirebase,
  getPublicGroupsFromFirebase
} from './firebase-group-storage'
import type { GroupData } from './group-data'

export interface DiagnosticResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

/**
 * TEST 1: Firebase Connection Test
 */
export async function testFirebaseConnection(): Promise<DiagnosticResult> {
  console.log('🧪 [Diagnostic] Testing Firebase connection...')

  try {
    const testRef = ref(db, 'diagnostic_test/connection')
    const testData = {
      timestamp: new Date().toISOString(),
      test: 'connection_test'
    }

    await set(testRef, testData)
    console.log('✅ [Diagnostic] Write test successful')

    const snapshot = await get(testRef)
    if (!snapshot.exists()) {
      return {
        test: 'Firebase Connection',
        status: 'FAIL',
        message: 'Failed to read back test data',
        details: { written: testData, read: null }
      }
    }

    const readData = snapshot.val()
    console.log('✅ [Diagnostic] Read test successful')

    // Cleanup
    await remove(testRef)
    console.log('✅ [Diagnostic] Cleanup successful')

    return {
      test: 'Firebase Connection',
      status: 'PASS',
      message: 'Firebase read/write operations working correctly',
      details: { written: testData, read: readData }
    }
  } catch (error) {
    return {
      test: 'Firebase Connection',
      status: 'FAIL',
      message: `Firebase connection failed: ${error instanceof Error ? error.message : String(error)}`,
      details: { error }
    }
  }
}

/**
 * TEST 2: Firebase Rules Test (Check if we have write permissions)
 */
export async function testFirebaseRules(): Promise<DiagnosticResult> {
  console.log('🧪 [Diagnostic] Testing Firebase rules...')

  try {
    // Try to write to groups path
    const testGroupRef = ref(db, 'groups/DIAGNOSTIC_TEST')
    const testGroup = {
      name: 'Diagnostic Test Group',
      createdAt: new Date().toISOString()
    }

    await set(testGroupRef, testGroup)
    console.log('✅ [Diagnostic] Groups path write successful')

    // Try to read it back
    const snapshot = await get(testGroupRef)
    if (!snapshot.exists()) {
      return {
        test: 'Firebase Rules',
        status: 'FAIL',
        message: 'Can write to groups path but cannot read back',
        details: { path: 'groups/DIAGNOSTIC_TEST' }
      }
    }

    // Cleanup
    await remove(testGroupRef)

    return {
      test: 'Firebase Rules',
      status: 'PASS',
      message: 'Firebase rules allow read/write on groups path',
      details: { path: 'groups/', permissions: 'read/write' }
    }
  } catch (error: any) {
    return {
      test: 'Firebase Rules',
      status: 'FAIL',
      message: `Permission denied or rules blocking: ${error.message}`,
      details: {
        error,
        code: error.code,
        hint: 'Check Firebase Console → Realtime Database → Rules'
      }
    }
  }
}

/**
 * TEST 3: Group Creation Test
 */
export async function testGroupCreation(): Promise<DiagnosticResult> {
  console.log('🧪 [Diagnostic] Testing group creation...')

  const testGroup: GroupData = {
    id: 'DIAG_TEST_' + Date.now(),
    name: 'Diagnostic Test Group',
    creator: 'DiagnosticWalletAddress123',
    recurringPeriod: 'weekly',
    amountPerRecurrence: 0.1,
    riskLevel: 'low',
    totalDuration: '3 Months',
    fundingGoal: 10,
    isPublic: true,
    createdAt: new Date().toISOString(),
    members: ['DiagnosticWalletAddress123'],
    totalCollected: 0,
    groupWalletAddress: 'DiagnosticGroupWallet123'
  }

  try {
    // Try to save group
    console.log('📝 [Diagnostic] Saving test group:', testGroup.id)
    const groupId = await saveGroupToFirebase(testGroup)
    console.log('✅ [Diagnostic] Group saved with ID:', groupId)

    // Try to retrieve it
    console.log('📖 [Diagnostic] Retrieving test group:', groupId)
    const retrievedGroup = await getGroupFromFirebase(groupId)

    if (!retrievedGroup) {
      return {
        test: 'Group Creation',
        status: 'FAIL',
        message: 'Group saved but could not be retrieved',
        details: { savedId: groupId }
      }
    }

    console.log('✅ [Diagnostic] Group retrieved successfully')

    // Verify data integrity
    if (retrievedGroup.name !== testGroup.name) {
      return {
        test: 'Group Creation',
        status: 'WARN',
        message: 'Group retrieved but data integrity issue',
        details: {
          expected: testGroup.name,
          received: retrievedGroup.name
        }
      }
    }

    // Cleanup
    const testRef = ref(db, `groups/${groupId}`)
    await remove(testRef)
    console.log('🧹 [Diagnostic] Test group cleaned up')

    return {
      test: 'Group Creation',
      status: 'PASS',
      message: 'Group creation and retrieval working correctly',
      details: {
        groupId,
        saved: testGroup,
        retrieved: retrievedGroup
      }
    }
  } catch (error) {
    return {
      test: 'Group Creation',
      status: 'FAIL',
      message: `Group creation failed: ${error instanceof Error ? error.message : String(error)}`,
      details: { error }
    }
  }
}

/**
 * TEST 4: Group Listing Test
 */
export async function testGroupListing(): Promise<DiagnosticResult> {
  console.log('🧪 [Diagnostic] Testing group listing...')

  try {
    // Get all groups
    console.log('📋 [Diagnostic] Fetching all groups...')
    const allGroups = await getAllGroupsFromFirebase()
    console.log('✅ [Diagnostic] Found', allGroups.length, 'total groups')

    // Get public groups
    console.log('📋 [Diagnostic] Fetching public groups...')
    const publicGroups = await getPublicGroupsFromFirebase()
    console.log('✅ [Diagnostic] Found', publicGroups.length, 'public groups')

    return {
      test: 'Group Listing',
      status: 'PASS',
      message: `Found ${allGroups.length} total groups, ${publicGroups.length} public`,
      details: {
        totalGroups: allGroups.length,
        publicGroups: publicGroups.length,
        groups: allGroups.map(g => ({ id: g.id, name: g.name, isPublic: g.isPublic }))
      }
    }
  } catch (error) {
    return {
      test: 'Group Listing',
      status: 'FAIL',
      message: `Failed to fetch groups: ${error instanceof Error ? error.message : String(error)}`,
      details: { error }
    }
  }
}

/**
 * TEST 5: Firebase Configuration Check
 */
export function testFirebaseConfig(): DiagnosticResult {
  console.log('🧪 [Diagnostic] Checking Firebase configuration...')

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  }

  const missingKeys = []
  if (!config.apiKey) missingKeys.push('NEXT_PUBLIC_FIREBASE_API_KEY')
  if (!config.projectId) missingKeys.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
  if (!config.databaseURL) missingKeys.push('NEXT_PUBLIC_FIREBASE_DATABASE_URL')

  if (missingKeys.length > 0) {
    return {
      test: 'Firebase Configuration',
      status: 'FAIL',
      message: `Missing environment variables: ${missingKeys.join(', ')}`,
      details: { missingKeys }
    }
  }

  return {
    test: 'Firebase Configuration',
    status: 'PASS',
    message: 'All Firebase environment variables are set',
    details: {
      projectId: config.projectId,
      databaseURL: config.databaseURL,
      hasApiKey: !!config.apiKey
    }
  }
}

/**
 * RUN ALL DIAGNOSTICS
 */
export async function runAllDiagnostics(): Promise<DiagnosticResult[]> {
  console.log('🔬 ========================================')
  console.log('🔬 FIREBASE DIAGNOSTIC TEST SUITE')
  console.log('🔬 ========================================\n')

  const results: DiagnosticResult[] = []

  // Test 1: Configuration
  console.log('TEST 1: Firebase Configuration')
  const configResult = testFirebaseConfig()
  results.push(configResult)
  console.log(`${configResult.status === 'PASS' ? '✅' : '❌'} ${configResult.message}\n`)

  if (configResult.status === 'FAIL') {
    console.log('❌ Configuration failed, skipping other tests\n')
    return results
  }

  // Test 2: Connection
  console.log('TEST 2: Firebase Connection')
  const connectionResult = await testFirebaseConnection()
  results.push(connectionResult)
  console.log(`${connectionResult.status === 'PASS' ? '✅' : '❌'} ${connectionResult.message}\n`)

  if (connectionResult.status === 'FAIL') {
    console.log('❌ Connection failed, skipping other tests\n')
    return results
  }

  // Test 3: Rules
  console.log('TEST 3: Firebase Rules')
  const rulesResult = await testFirebaseRules()
  results.push(rulesResult)
  console.log(`${rulesResult.status === 'PASS' ? '✅' : '❌'} ${rulesResult.message}\n`)

  if (rulesResult.status === 'FAIL') {
    console.log('❌ Rules check failed, check Firebase Console → Database → Rules\n')
  }

  // Test 4: Group Creation
  console.log('TEST 4: Group Creation')
  const creationResult = await testGroupCreation()
  results.push(creationResult)
  console.log(`${creationResult.status === 'PASS' ? '✅' : '❌'} ${creationResult.message}\n`)

  // Test 5: Group Listing
  console.log('TEST 5: Group Listing')
  const listingResult = await testGroupListing()
  results.push(listingResult)
  console.log(`${listingResult.status === 'PASS' ? '✅' : '❌'} ${listingResult.message}\n`)

  // Summary
  console.log('🔬 ========================================')
  console.log('🔬 DIAGNOSTIC SUMMARY')
  console.log('🔬 ========================================')
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warned = results.filter(r => r.status === 'WARN').length
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️  Warned: ${warned}`)
  console.log('🔬 ========================================\n')

  return results
}

/**
 * Quick diagnostic for console
 */
export async function quickDiagnostic() {
  console.log('🚀 Running quick Firebase diagnostic...\n')

  try {
    // Test connection
    const testRef = ref(db, 'diagnostic_test/quick')
    await set(testRef, { test: 'quick', time: Date.now() })
    const snapshot = await get(testRef)
    await remove(testRef)

    if (snapshot.exists()) {
      console.log('✅ Firebase is working!')

      // Show existing groups
      const groups = await getAllGroupsFromFirebase()
      console.log(`📊 Found ${groups.length} groups in database`)
      if (groups.length > 0) {
        console.log('📋 Groups:')
        groups.forEach(g => {
          console.log(`   - ${g.name} (${g.id}) - ${g.isPublic ? 'Public' : 'Private'}`)
        })
      }
    } else {
      console.log('❌ Firebase write succeeded but read failed')
    }
  } catch (error) {
    console.log('❌ Firebase error:', error)
  }
}
