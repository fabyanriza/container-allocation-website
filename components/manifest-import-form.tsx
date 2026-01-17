"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ManifestRow {
  vessel_name: string
  voyage_number: string
  container_number: string
  size_teu: number
  consignee_name: string
}

export function ManifestImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ManifestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const parseXLSX = async (file: File): Promise<ManifestRow[]> => {
    const { read, utils } = await import("xlsx")
    const arrayBuffer = await file.arrayBuffer()
    const workbook = read(arrayBuffer, { type: "array" })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = utils.sheet_to_json(worksheet) as ManifestRow[]
    return rows
  }

  const parseCSV = async (file: File): Promise<ManifestRow[]> => {
    const text = await file.text()
    const lines = text.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

    const rows: ManifestRow[] = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const row: Record<string, any> = {}
      headers.forEach((header, index) => {
        row[header] = values[index]
      })
      return {
        vessel_name: row.vessel_name || row["vessel name"] || "",
        voyage_number: row.voyage_number || row["voyage number"] || "",
        container_number: row.container_number || row["container number"] || "",
        size_teu: Number.parseInt(row.size_teu || row["size teu"] || "0", 10),
        consignee_name: row.consignee_name || row["consignee name"] || "",
      }
    })
    return rows
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setError("")
    setLoading(true)

    try {
      const fileType = uploadedFile.type
      const fileName = uploadedFile.name.toLowerCase()

      let parsedData: ManifestRow[] = []

      if (
        fileName.endsWith(".xlsx") ||
        fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        parsedData = await parseXLSX(uploadedFile)
      } else if (fileName.endsWith(".csv") || fileType === "text/csv") {
        parsedData = await parseCSV(uploadedFile)
      } else {
        setError("Format file tidak didukung. Gunakan XLSX atau CSV.")
        setLoading(false)
        return
      }

      if (!parsedData || parsedData.length === 0) {
        setError("File kosong atau tidak memiliki data yang valid.")
        setLoading(false)
        return
      }

      setFile(uploadedFile)
      setData(parsedData)
      setShowPreview(true)
    } catch (err) {
      setError(`Error parsing file: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/manifest/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containers: data }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Import gagal")
        return
      }

      setSuccess(true)
      setData([])
      setFile(null)
      setShowPreview(false)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Import Manifest Kapal</h3>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Manifest berhasil diimport! {data.length} container ditambahkan.
              </AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Upload file manifest (XLSX atau CSV)</p>
              <p className="text-xs text-gray-500 mt-1">Drag and drop atau klik untuk memilih</p>
            </label>
          </div>

          {file && (
            <div className="text-sm">
              <p className="text-gray-600">
                File: <span className="font-semibold">{file.name}</span>
              </p>
              <p className="text-gray-600">
                Jumlah container: <span className="font-semibold">{data.length}</span>
              </p>
            </div>
          )}

          {data.length > 0 && (
            <Button onClick={() => setShowPreview(true)} variant="outline" className="w-full">
              Preview Data
            </Button>
          )}
        </div>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Data Manifest</DialogTitle>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Kapal</th>
                  <th className="px-4 py-2 text-left">Voyage</th>
                  <th className="px-4 py-2 text-left">Container</th>
                  <th className="px-4 py-2 text-left">TEU</th>
                  <th className="px-4 py-2 text-left">Consignee</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{row.vessel_name}</td>
                    <td className="px-4 py-2">{row.voyage_number}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.container_number}</td>
                    <td className="px-4 py-2">{row.size_teu}</td>
                    <td className="px-4 py-2 text-sm">{row.consignee_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleImport} disabled={loading} className="flex-1">
              {loading ? "Importing..." : "Import Semua"}
            </Button>
            <Button onClick={() => setShowPreview(false)} variant="outline" className="flex-1">
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ManifestImportForm
