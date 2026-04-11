import { handleCollectionGet, handleCollectionPost } from '@/lib/master-data/routes'

export async function GET(request: Request) {
  return handleCollectionGet(request, 'bankReviews')
}

export async function POST(request: Request) {
  return handleCollectionPost(request, 'bankReviews')
}
