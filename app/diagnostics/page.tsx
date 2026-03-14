"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  runAllDiagnostics,
  quickDiagnostic,
  type DiagnosticResult as FirebaseResult
} from '@/lib/firebase-diagnostics'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

type DiagnosticResult = FirebaseResult

interface StarknetTestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: unknown
}

export default function DiagnosticsPage() {
  const [running, setRunning] = useState(false)
  const [firebaseResults, setFirebaseResults] = useState<FirebaseResult[]>([])
  const [starknetResults, setStarknetResults] = useState<StarknetTestResult[]>([])
  const [quickResult, setQuickResult] = useState<string>('')

  const handleRunFirebaseDiagnostics = async () => {
    setRunning(true)
    setFirebaseResults([])
    setQuickResult('')

    try {
      const diagnosticResults = await runAllDiagnostics()
      setFirebaseResults(diagnosticResults)
    } catch (error) {
      console.error('Firebase diagnostic error:', error)
      alert(`Firebase diagnostic failed: ${error}`)
    } finally {
      setRunning(false)
    }
  }

  const handleRunStarknetDiagnostics = async () => {
    setRunning(true)
    setStarknetResults([])

    try {
      const { CARTRIDGE_RPC_URL, EXPLORER_BASE, FAUCET_URL, STARKNET_RPC_URL, getSDK } = await import('@/lib/starkzap')
      const results: StarknetTestResult[] = []

      try {
        const sdk = getSDK()
        results.push({
          test: 'StarkZap SDK',
          status: sdk ? 'PASS' : 'FAIL',
          message: sdk ? 'StarkZap initialized for Starknet Sepolia' : 'SDK initialization returned no instance',
        })
      } catch (error) {
        results.push({
          test: 'StarkZap SDK',
          status: 'FAIL',
          message: `SDK initialization failed: ${error}`,
        })
      }

      try {
        const resp = await fetch(STARKNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'starknet_blockNumber', params: [] }),
        })
        const payload = await resp.json()
        results.push({
          test: 'Sepolia RPC Connection',
          status: 'PASS',
          message: `Connected to Starknet Sepolia. Latest block: ${payload.result}`,
          details: { rpcUrl: STARKNET_RPC_URL },
        })
      } catch (error) {
        results.push({
          test: 'Sepolia RPC Connection',
          status: 'FAIL',
          message: `Failed to connect: ${error}`,
        })
      }

      results.push({
        test: 'Cartridge Paymaster Config',
        status: CARTRIDGE_RPC_URL ? 'PASS' : 'FAIL',
        message: CARTRIDGE_RPC_URL ? `Configured for gasless flow via ${CARTRIDGE_RPC_URL}` : 'Missing Cartridge RPC configuration',
      })

      results.push({
        test: 'Explorer and Faucet Links',
        status: EXPLORER_BASE && FAUCET_URL ? 'PASS' : 'WARN',
        message: 'Voyager explorer and Starknet Sepolia faucet links are configured',
        details: { explorer: EXPLORER_BASE, faucet: FAUCET_URL },
      })

      setStarknetResults(results)
    } catch (error) {
      console.error('Starknet diagnostic error:', error)
      alert(`Starknet diagnostic failed: ${error}`)
    } finally {
      setRunning(false)
    }
  }

  const handleTestTransaction = async () => {
    setRunning(true)
    setStarknetResults(prev => [...prev, {
      test: 'Transaction Test',
      status: 'WARN',
      message: 'Sponsored transaction testing requires a live Starknet wallet with Sepolia funds. Connect through the wallet menu and retry.'
    }])
    setRunning(false)
  }

  const handleQuickTest = async () => {
    setQuickResult('Running...')
    const originalLog = console.log
    const logs: string[] = []

    // Capture console logs
    console.log = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      logs.push(message)
      originalLog(...args)
    }

    try {
      await quickDiagnostic()
      setQuickResult(logs.join('\n'))
    } catch (error) {
      setQuickResult(`Error: ${error}`)
    } finally {
      console.log = originalLog
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'FAIL':
        return <XCircle className="h-6 w-6 text-red-500" />
      case 'WARN':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'border-green-500 bg-green-50 dark:bg-green-950'
      case 'FAIL':
        return 'border-red-500 bg-red-50 dark:bg-red-950'
      case 'WARN':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      default:
        return 'border-gray-500'
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Verify Firebase persistence and the Starknet Sepolia runtime configuration used by FundFlow.
          </p>
        </div>

        {/* Quick Test Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Test</h2>
          <p className="text-muted-foreground mb-4">
            Run a quick Firebase smoke test and print the current storage state.
          </p>
          <Button onClick={handleQuickTest} disabled={running}>
            Run Quick Test
          </Button>

          {quickResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {quickResult}
              </pre>
            </div>
          )}
        </Card>

        {/* Full Diagnostic Section */}
        <Tabs defaultValue="firebase" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="firebase">Firebase Tests</TabsTrigger>
            <TabsTrigger value="starknet">Starknet Tests</TabsTrigger>
          </TabsList>

          <TabsContent value="firebase">
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Firebase Diagnostic Suite</h2>
              <p className="text-muted-foreground mb-4">
                Run all diagnostic tests to identify any issues with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Firebase configuration</li>
                <li>Firebase connection</li>
                <li>Firebase rules and permissions</li>
                <li>Group creation and storage</li>
                <li>Group listing and retrieval</li>
              </ul>

              <Button onClick={handleRunFirebaseDiagnostics} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  'Run Firebase Diagnostics'
                )}
              </Button>
            </Card>

            {/* Firebase Results */}
            {firebaseResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Firebase Test Results</h2>

                {/* Summary */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border border-green-500 rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="text-3xl font-bold text-green-600">
                        {firebaseResults.filter(r => r.status === 'PASS').length}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-400">Passed</div>
                    </div>
                    <div className="text-center p-4 border border-red-500 rounded-lg bg-red-50 dark:bg-red-950">
                      <div className="text-3xl font-bold text-red-600">
                        {firebaseResults.filter(r => r.status === 'FAIL').length}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-400">Failed</div>
                    </div>
                    <div className="text-center p-4 border border-yellow-500 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                      <div className="text-3xl font-bold text-yellow-600">
                        {firebaseResults.filter(r => r.status === 'WARN').length}
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">Warnings</div>
                    </div>
                  </div>
                </Card>

                {/* Detailed Results */}
                {firebaseResults.map((result, index) => (
                  <Card
                    key={index}
                    className={`p-6 border-2 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getStatusIcon(result.status)}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          Test {index + 1}: {result.test}
                        </h3>
                        <p className="mb-4">{result.message}</p>

                        {result.details && (
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-semibold mb-2">
                              View Details
                            </summary>
                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="starknet">
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Starknet Diagnostic Suite</h2>
              <p className="text-muted-foreground mb-4">
                Test StarkZap initialization, Starknet Sepolia RPC reachability, and gasless wallet configuration.
              </p>

              <div className="space-y-3">
                <Button onClick={handleRunStarknetDiagnostics} disabled={running} className="w-full">
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Diagnostics...
                    </>
                  ) : (
                    'Run Starknet Diagnostics'
                  )}
                </Button>

                <Button onClick={handleTestTransaction} disabled={running} variant="outline" className="w-full">
                  Test Simple Transaction
                </Button>
              </div>
            </Card>

            {/* Starknet Results */}
            {starknetResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Starknet Test Results</h2>

                {starknetResults.map((result, index) => (
                  <Card
                    key={index}
                    className={`p-6 border-2 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getStatusIcon(result.status)}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          Test {index + 1}: {result.test}
                        </h3>
                        <p className="mb-4">{result.message}</p>

                        {result.details && (
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-semibold mb-2">
                              View Details
                            </summary>
                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Console Instructions */}
        <Card className="p-6 mt-8 bg-blue-50 dark:bg-blue-950 border-blue-200">
          <h3 className="text-lg font-semibold mb-2">💡 Browser Console</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Open your browser console (F12) to see detailed logs while tests run.
            Look for messages with [Diagnostic] prefix.
          </p>
          <p className="text-sm text-muted-foreground">
            You can also run diagnostics from console:
          </p>
          <code className="block mt-2 p-2 bg-muted rounded text-xs">
            import &#123; runAllDiagnostics, quickDiagnostic &#125; from '@/lib/firebase-diagnostics'<br />
            await quickDiagnostic() // Quick test<br />
            await runAllDiagnostics() // Full suite
          </code>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
