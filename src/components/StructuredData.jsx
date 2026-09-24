import { useEffect } from 'react'
import { setStructuredData } from '../seo'

/**
 * Mounts a JSON-LD block for the lifetime of a page and removes it on unmount,
 * so a route change can't leave another page's schema behind.
 *
 * Schema.org markup is the highest-leverage thing on this site for AI answer
 * engines: FAQPage in particular is what lets an assistant quote the youth
 * program rules or the CPR class minimum directly.
 */
export default function StructuredData({ id, data }) {
  useEffect(() => {
    setStructuredData(id, data)
    return () => setStructuredData(id, null)
    // `data` is a literal rebuilt each render; serialise for a stable dep.
  }, [id, JSON.stringify(data)])

  return null
}
