'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TransaksiPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/transaksi/barang-masuk')
  }, [router])

  return null
}
