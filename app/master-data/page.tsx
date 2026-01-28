'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterDataPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/master-data/barang')
  }, [router])

  return null
}
