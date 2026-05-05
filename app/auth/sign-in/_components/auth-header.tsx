import { Building2 } from "lucide-react"

export function AuthHeader() {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">PT. Bintang Makmur</h1>
            <p className="text-sm text-gray-600">Enterprise Resource Planning (ERP)</p>
            <p className="text-sm text-gray-600">Toko Retail Bahan Bangunan</p>
          </div>
        </div>
      </div>
    </div>
  )
}
