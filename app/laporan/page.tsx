'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LaporanPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/laporan/stok')
  }, [router])

  return null
}
